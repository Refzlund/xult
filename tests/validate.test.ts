import { describe, test, expect } from 'bun:test'
import Result from 'xult'
import z from 'zod'

describe('Result.validate', () => {

	describe('Schema array', () => {
		test('should return Result.Ok with parsed data when valid', async () => {
			const schemas = [z.string().toUpperCase(), z.number()] as const
			const data = ['hello', 123]
			const result = await Result.validate([...schemas], data)
			
			expect(result.isOk()).toBe(true)
			expect(result.value).toEqual(['HELLO', 123])
		})
		test('should return Result.Err when invalid', async () => {
			const schemas = [z.string().toUpperCase(), z.number()] as const
			const data = [123, 123]
			const result = await Result.validate([...schemas], data)
			
			expect(result.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
		})
	})

	describe('Single schema', () => {
		test('should return Result.Ok with parsed data when valid', async () => {
			const schema = z.string().toUpperCase()
			const data = 'Text'
			const result = await Result.validate(schema, data)

			expect(result.isOk()).toBe(true)
			expect(result.value).toBe('TEXT')
		})
		test('should return Result.Err when invalid', async () => {
			const schema = z.string().toUpperCase()
			const data = 123 // invalid
			const result = await Result.validate(schema, data)

			expect(result.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
		})
	})
})
