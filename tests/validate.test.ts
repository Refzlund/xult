import {
	describe,
	test,
	expect
} from 'bun:test'
import Result from 'xult'
import z from 'zod'

describe('Result.validate - Schema validation', () => {
	describe('Schema array validation', () => {
		test('returns Ok with parsed data when all schemas pass', async () => {
			const schemas = [z.string().toUpperCase(), z.number()] as const
			const data = ['hello', 123]
			const result = await Result.validate([...schemas], data)

			expect(result.isOk()).toBe(true)
			expect(result.value).toEqual(['HELLO', 123])
		})

		test('returns Err when any schema fails', async () => {
			const schemas = [z.string().toUpperCase(), z.number()] as const
			const data = [123, 123]
			const result = await Result.validate([...schemas], data)

			expect(result.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
		})

		test('aggregates all validation errors', async () => {
			const schemas = [z.string(), z.number(), z.boolean()] as const
			const data = [123, 'not a number', 'not a boolean']
			const result = await Result.validate([...schemas], data)

			expect(result.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
			if (result.isErr('FUNC_VALIDATION_ERROR')) {
				expect(result.details.issues.length).toBeGreaterThan(1)
			}
		})
	})

	describe('Single schema validation', () => {
		test('returns Ok with parsed data when valid', async () => {
			const schema = z.string().toUpperCase()
			const data = 'Text'
			const result = await Result.validate(schema, data)

			expect(result.isOk()).toBe(true)
			expect(result.value).toBe('TEXT')
		})

		test('returns Err when invalid', async () => {
			const schema = z.string().toUpperCase()
			const data = 123
			const result = await Result.validate(schema, data)

			expect(result.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
		})

		test('transforms data according to schema', async () => {
			const schema = z.coerce.number()
			const result = await Result.validate(schema, '42')

			expect(result.isOk()).toBe(true)
			expect(result.value).toBe(42)
		})

		test('validates complex objects', async () => {
			const schema = z.object({
				name: z.string().min(1),
				age: z.number().min(0),
				email: z.string().email()
			})

			const validData = { name: 'Alice', age: 30, email: 'alice@example.com' }
			const result = await Result.validate(schema, validData)

			expect(result.isOk()).toBe(true)
			expect(result.value).toEqual(validData)
		})

		test('validates arrays', async () => {
			const schema = z.array(z.number())
			const result = await Result.validate(schema, [1, 2, 3])

			expect(result.isOk()).toBe(true)
			expect(result.value).toEqual([1, 2, 3])
		})
	})

	describe('Standard Schema compatibility', () => {
		test('works with any Standard Schema V1 compliant validator', async () => {
			const customSchema = {
				'~standard': {
					version: 1 as const,
					vendor: 'custom',
					validate: async (input: unknown) => {
						if (typeof input === 'string' && input.length > 0) {
							return { value: input.toUpperCase() }
						}
						return { issues: [{ message: 'Expected non-empty string' }] }
					}
				}
			}

			const result = await Result.validate(customSchema, 'hello')
			expect(result.isOk()).toBe(true)
			expect(result.value).toBe('HELLO')

			const errorResult = await Result.validate(customSchema, '')
			expect(errorResult.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
		})
	})
})
