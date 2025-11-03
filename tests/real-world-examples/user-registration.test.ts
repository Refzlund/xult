import { describe, test, expect, beforeEach } from 'bun:test'
import { z } from 'zod'
import Result, { func, ok, err } from 'xult'

const RegistrationSchema = z.object({
	username: z.string().min(3, 'Username must be at least 3 characters long.'),
	email: z.string().email('Invalid email address.'),
	password: z.string().min(8, 'Password must be at least 8 characters long.')
})
type RegistrationData = z.infer<typeof RegistrationSchema>

interface User {
	id: string
	username: string
	email: string
}

const store = {
	users: [] as User[]
}

const registerUser = func(
	RegistrationSchema,
	async (data: RegistrationData) => {
		if (store.users.some((user) => user.email === data.email)) {
			return err('EMAIL_IN_USE', 'This email address is already registered.')
		}

		if (store.users.some((user) => user.username === data.username)) {
			return err('USERNAME_IN_USE', 'This username is already taken.')
		}

		try {
			const newUser: User = {
				id: crypto.randomUUID(),
				username: data.username,
				email: data.email
			}
			store.users.push(newUser)
			return ok(newUser)
		} catch (cause) {
			return err('DATABASE_ERROR', 'Failed to save user to the database.', cause)
		}
	}
)

const expectErr = (result: Result.Any, code: Result.LooseErrorShape['code']) => {
	expect(result.isErr(code)).toBe(true)
	return result.isErr(code) ? result : undefined
}

describe('Real World: User Registration', () => {
	beforeEach(() => {
		store.users = []
	})

	test('registers a new user when the payload is valid', async () => {
		const input = {
			username: 'johndoe',
			email: 'john.doe@example.com',
			password: 'password123'
		}

		const result = await registerUser(input)

		expect(result.isOk()).toBe(true)
		if (result.isOk()) {
			expect(result.value.username).toBe('johndoe')
			expect(store.users).toHaveLength(1)
		}
	})

	test('reports validation failures before touching persistence', async () => {
		const invalidInput = {
			username: 'jo',
			email: 'not-an-email',
			password: '123'
		}

		const result = await registerUser(invalidInput)

		expect(result.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
		if (result.isErr('FUNC_VALIDATION_ERROR')) {
			const issueFields = (result.details.issues as z.ZodIssue[]).map((issue) => issue.path.join('.'))
			expect(issueFields).toEqual(expect.arrayContaining(['username', 'email', 'password']))
		}
		expect(store.users).toHaveLength(0)
	})

	test('rejects duplicate emails', async () => {
		store.users.push({ id: '1', username: 'jane', email: 'jane.doe@example.com' })

		const result = await registerUser({
			username: 'johndoe',
			email: 'jane.doe@example.com',
			password: 'password123'
		})

		const error = expectErr(result, 'EMAIL_IN_USE')
		if (error?.isErr('EMAIL_IN_USE')) {
			expect(error.message).toBe('This email address is already registered.')
		}
		expect(store.users).toHaveLength(1)
	})

	test('rejects duplicate usernames', async () => {
		store.users.push({ id: '1', username: 'johndoe', email: 'jane.doe@example.com' })

		const result = await registerUser({
			username: 'johndoe',
			email: 'john.doe@example.com',
			password: 'password123'
		})

		const error = expectErr(result, 'USERNAME_IN_USE')
		if (error?.isErr('USERNAME_IN_USE')) {
			expect(error.message).toBe('This username is already taken.')
		}
		expect(store.users).toHaveLength(1)
	})
})
