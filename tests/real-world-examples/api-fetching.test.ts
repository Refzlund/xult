import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'
import Result, { func, async as resultAsync, err, ok } from 'xult'

const API_BASE = 'https://api.example.com'
const UserSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.email()
})
type User = z.infer<typeof UserSchema>

const fetchUserResponse = (userId: number) => resultAsync(
	fetch(`${API_BASE}/users/${userId}`),
	(thrown) => err('NETWORK_ERROR', 'Failed to reach the user service.', thrown.details ?? thrown)
)

const parseUserPayload = (response: Response) => resultAsync(
	response.json() as Promise<unknown>,
	(thrown) => err('JSON_PARSE_ERROR', 'User service returned malformed JSON.', thrown.details ?? thrown)
)

const validateUser = (payload: unknown) => {
	const validation = UserSchema.safeParse(payload)
	return validation.success
		? ok(validation.data)
		: err('INVALID_PAYLOAD', 'User payload did not match the contract.', validation.error)
}

const getUser = func(async function*(userId: number) {
	const response = yield* await fetchUserResponse(userId)

	if (!response.ok) {
		return err('API_ERROR', `User service responded with ${response.status}`, { status: response.status })
	}

	const body = yield* await parseUserPayload(response)

	return yield* validateUser(body)
})

const expectOk = <T, E extends Result.LooseErrorShape>(result: Result<T, E>) => {
	expect(result.isOk()).toBe(true)
	return result.isOk() ? result.value : undefined
}

describe('Real World: API Fetching', () => {
	const originalFetch = globalThis.fetch
	let fetchSpy: ReturnType<typeof mock>

	beforeEach(() => {
		fetchSpy = mock()
		globalThis.fetch = fetchSpy as unknown as typeof fetch
	})

	afterEach(() => {
		fetchSpy.mockReset()
		globalThis.fetch = originalFetch
	})

	test('retrieves and validates a user record', async () => {
		const payload: User = { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' }
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }))

		const result = await getUser(1)
		expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE}/users/1`)

		const value = expectOk(result)
		if (value) {
			expect(value).toEqual(payload)
		}
	})

	test('returns an API_ERROR when the service answers with non-2xx', async () => {
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'not found' }), { status: 404 }))

		const result = await getUser(404)

		expect(result.isErr('API_ERROR')).toBe(true)
		if (result.isErr('API_ERROR')) {
			expect(result.details.status).toBe(404)
		}
	})

	test('maps network failures into Result errors', async () => {
		const networkFailure = new TypeError('socket timeout')
		fetchSpy.mockRejectedValueOnce(networkFailure)

		const result = await getUser(2)

		expect(result.isErr('NETWORK_ERROR')).toBe(true)
		if (result.isErr('NETWORK_ERROR')) {
			expect(result.message).toBe('Failed to reach the user service.')
			expect(result.details).toBe(networkFailure)
		}
	})

	test('guards against invalid JSON payloads', async () => {
		fetchSpy.mockResolvedValueOnce(new Response('not-json', { status: 200 }))

		const result = await getUser(3)

		expect(result.isErr('JSON_PARSE_ERROR')).toBe(true)
		if (result.isErr('JSON_PARSE_ERROR')) {
			expect(result.message).toBe('User service returned malformed JSON.')
		}
	})

	test('surfaces schema validation problems', async () => {
		const invalid = { id: 4, name: 'Grace Hopper' }
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(invalid), { status: 200 }))

		const result = await getUser(4)

		expect(result.isErr('INVALID_PAYLOAD')).toBe(true)
		if (result.isErr('INVALID_PAYLOAD')) {
			expect(result.details).toBeInstanceOf(z.ZodError)
			const issues = result.details.issues.map((issue) => issue.path.join('.'))
			expect(issues).toContain('email')
		}
	})
})
