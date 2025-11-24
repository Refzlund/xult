import {
	describe,
	test,
	expect,
	expectTypeOf
} from 'bun:test'
import Result from 'xult'
import z from 'zod'

describe('Result.funcJSON - JSON-returning function wrapper', () => {
	describe('Basic Usage', () => {
		test('wraps sync function and returns JSON', async () => {
			const fn = Result.funcJSON((a: number, b: number) => a + b)
			const res = await fn(1, 2)

			expect(res).toMatchObject({ ok: true, value: 3 })
			expectTypeOf(res).toEqualTypeOf<Result.JSON<number, Result.ThrownError>>()
		})

		test('wraps async function and returns JSON', async () => {
			const fn = Result.funcJSON(async (a: number, b: number) => {
				await new Promise(r => setTimeout(r, 1))
				return a + b
			})
			const res = await fn(1, 2)

			expect(res).toMatchObject({ ok: true, value: 3 })
			expectTypeOf(res).toEqualTypeOf<Result.JSON<number, Result.ThrownError>>()
		})
	})

	describe('Generator Functions', () => {
		test('wraps generator and returns JSON on success', async () => {
			const fn = Result.funcJSON(function* (a: number) {
				yield Result.ok('step 1')
				return a * 2
			})
			const res = await fn(5)

			expect(res).toMatchObject({ ok: true, value: 10 })
			expectTypeOf(res).toEqualTypeOf<Result.JSON<number, Result.ThrownError>>()
		})

		test('wraps generator and returns JSON on error', async () => {
			const fn = Result.funcJSON(function* () {
				yield Result.err('STEP_ERROR', 'Failed at step')
				return 'should not reach here'
			})
			const res = await fn()

			expect(res).toMatchObject({ ok: false, code: 'STEP_ERROR', message: 'Failed at step' })
			expectTypeOf(res).toEqualTypeOf<Result.JSON<string, Result.ThrownError | { code: 'STEP_ERROR' }>>()
		})
	})

	describe('Validation', () => {
		test('validates input and returns JSON on success', async () => {
			const schema = z.object({ name: z.string() })
			const fn = Result.funcJSON(schema, (input) => `Hello, ${input.name}`)

			const res = await fn({ name: 'World' })
			expect(res).toMatchObject({ ok: true, value: 'Hello, World' })
			expectTypeOf(res).toEqualTypeOf<Result.JSON<string, Result.ValidationError | Result.ThrownError>>()
		})

		test('validates input and returns JSON on failure', async () => {
			const schema = z.object({ name: z.string() })
			const fn = Result.funcJSON(schema, (input) => `Hello, ${input.name}`)

			// @ts-expect-error - Invalid input type
			const resErr = await fn({ name: 123 })
			expect(resErr.ok).toBe(false)
			if (!resErr.ok) {
				expect(resErr.code).toBe('FUNC_VALIDATION_ERROR')
			}
		})
	})

	describe('Exception Handling', () => {
		test('handles thrown errors and returns JSON', async () => {
			const fn = Result.funcJSON(() => {
				throw new Error('Oops')
			})
			const res = await fn()

			expect(res.ok).toBe(false)
			if (!res.ok) {
				expect(res.code).toBe('THROWN_ERROR')
				expect(res.message).toBe('An error was thrown, but not handled')
			}
			expectTypeOf(res).toEqualTypeOf<Result.JSON<unknown, Result.ErrorShape>>()
		})

		test('uses custom exception handler and returns JSON', async () => {
			const fn = Result.funcJSON(
				() => { throw new Error('Oops') },
				(err) => Result.err('CUSTOM_ERROR', 'Custom message')
			)
			const res = await fn()

			expect(res).toMatchObject({ ok: false, code: 'CUSTOM_ERROR', message: 'Custom message' })
			expectTypeOf(res).toEqualTypeOf<Result.JSON<unknown, Result.ErrorShape>>()
		})
	})

	describe('Comparison with Result.func', () => {
		test('funcJSON returns JSON while func returns Result', () => {
			// oxlint-disable-next-line require-yield
			const divide = Result.funcJSON(function * (a: number, b: number) {
				if (b === 0) {
					return Result.err('DIVIDE_BY_ZERO', 'Cannot divide by zero', { a, b })
				}
				return a / b
			})

			const math = Result.funcJSON(function* () {
				const result = yield* divide(10, 2)
				return Result.ok(result * 3)
			})

			// oxlint-disable-next-line require-yield
			const divide2 = Result.func(function * (a: number, b: number) {
				if (b === 0) {
					return Result.err('DIVIDE_BY_ZERO', 'Cannot divide by zero')
				}
				return a / b
			})

			const math2 = Result.func(function* () {
				const result = yield* divide2(10, 2)
				return result * 3
			})

			const result = math()
			const result2 = math2()
			const json2 = result2.toJSON()

			if (result.ok) {
				expect(result.value).toBe(15)
			} else if (result.code === 'DIVIDE_BY_ZERO') {
				expect(result.details).toEqual({ a: 10, b: 0 })
			}

			expectTypeOf(result).toEqualTypeOf<Result.JSON<
				number,
				Result.ThrownError | { code: 'DIVIDE_BY_ZERO', details: { a: number, b: number } }
			>>()
		})
	})
})
