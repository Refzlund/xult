import { describe, test, expect, expectTypeOf } from 'bun:test'
import Result, { ok, err } from 'xult'

describe('Serialization (toJSON / fromJSON)', () => {
	test('toJSON should correctly serialize an Ok result', () => {
		const r = ok({ data: 'payload' })
		const json = r.toJSON()
		expect(json.ok).toBe(true)
		expect(json.value).toBeDefined()
		expect(json.value).toEqual({ data: 'payload' })
		expect(json).not.toContainAnyKeys(['code', 'message', 'details', 'stack'] as never[])
	})

	test('toJSON should correctly serialize an Err result', () => {
		const r = err('SERIALIZE_ERROR', 'Cannot serialize', { reason: 42 })
		const json = r.toJSON()
		expect(json.ok).toBe(false)
		expect(json).not.toContainKey('value' as never)
		expect(json.code).toBe('SERIALIZE_ERROR')
		expect(json.message).toBe('Cannot serialize')
		expect(json.details).toEqual({ reason: 42 })
		expect(json.stack).toBeString()
	})

	test('fromJSON should successfully parse valid Ok JSON', () => {
		const json = { ok: true, value: 'success' }
		const parseResult = Result.fromJSON(json)

		expect(parseResult.isOk()).toBe(true)
		const innerResult = parseResult._unsafeUnwrap()
		expect(innerResult).toBeInstanceOf(Result)
		expect(innerResult.isOk()).toBe(true)
		expect(innerResult.value).toBe('success')
	})

	test('fromJSON should successfully parse valid Err JSON', () => {
		const json = { ok: false, code: 'PARSED_ERR', message: 'Parsed from JSON' }
		const parseResult = Result.fromJSON(json)

		expect(parseResult.isOk()).toBe(true)
		const innerResult = parseResult._unsafeUnwrap()
		expect(innerResult).toBeInstanceOf(Result)
		expect(innerResult.isErr()).toBe(true)
		expect(innerResult.code).toBe('PARSED_ERR')
	})

	test('fromJSON should return an Err for non-object input', () => {
		const r = Result.fromJSON(null)
		expect(r.isErr('BAD_TYPE')).toBe(true)
	})

	test('fromJSON should return an Err for objects missing the "ok" property', () => {
		const r = Result.fromJSON({ value: 123 })
		expect(r.isErr('NOT_RESULT_JSON')).toBe(true)
	})

	test('fromJSON should return an Err for invalid error JSON with non-string code', () => {
		const r = Result.fromJSON({ ok: false, code: 123, message: 'test' })
		expect(r.isErr('BAD_ERR_JSON')).toBe(true)
		if (r.isErr('BAD_ERR_JSON')) {
			expect(r.details).toHaveProperty('code')
			expect(r.details).toHaveProperty('message')
		}
	})

	test('fromJSON should return an Err for invalid error JSON with non-string message', () => {
		const r = Result.fromJSON({ ok: false, code: 'TEST', message: 456 })
		expect(r.isErr('BAD_ERR_JSON')).toBe(true)
	})

	test('fromJSON should preserve stack from error JSON', () => {
		const customStack = 'Error\n  at file.ts:10:5'
		const json = { ok: false, code: 'ERR', message: 'Test error', stack: customStack }
		const parseResult = Result.fromJSON(json)
		
		expect(parseResult.isOk()).toBe(true)
		const innerResult = parseResult._unsafeUnwrap()
		expect(innerResult.stack).toBe(customStack)
	})

	describe('Result.from', () => {
		test('from(value) should wrap a plain value in Ok', () => {
			const r = Result.from(123)
			expectTypeOf(r).toEqualTypeOf<Result<number, never>>()
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap()).toBe(123)
		})

		test('from(const) should preserve literal types', () => {
			const r = Result.from(123 as const)
			expectTypeOf(r).toEqualTypeOf<Result<123, never>>()
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap()).toBe(123)
		})

		test('from(Promise) should return a Promise<Result>', async () => {
			const promise = Result.from(Promise.resolve(123))
			expectTypeOf(promise).toEqualTypeOf<Promise<Result<number, never>>>()
			expect(promise).toBeInstanceOf(Promise)
			const r = await promise
			expectTypeOf(r).toEqualTypeOf<Result<number, never>>()
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap()).toBe(123)
		})

		test('from(Result.ok()) should pass through Result unchanged', () => {
			const original = Result.ok(123 as const)
			const r = Result.from(original)
			expectTypeOf(r).toEqualTypeOf<Result<123, never>>()
			expect(r).toBe(original)
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap()).toBe(123)
		})

		test('from(Result.err()) should pass through Err Result unchanged', () => {
			const original = Result.err('SOME_ERROR', 'An error occurred')
			const r = Result.from(original)
			expectTypeOf(r).toEqualTypeOf<Result<never, { code: 'SOME_ERROR' }>>()
			expect(r).toBe(original)
			expect(r.isErr()).toBe(true)
			expect(r.code).toBe('SOME_ERROR')
		})

		test('from({ ok: true, value }) should deserialize Ok JSON', () => {
			const r = Result.from({ ok: true as const, value: 123 })
			expectTypeOf(r).toEqualTypeOf<Result<number, never>>()
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap()).toBe(123)
		})

		test('from({ ok: false, code, message }) should deserialize Err JSON', () => {
			const r = Result.from({ ok: false as const, code: 'SOME_ERROR' as const, message: 'An error occurred' })
			expectTypeOf(r).toEqualTypeOf<Result<never, { code: 'SOME_ERROR' }>>()
			expect(r.isErr()).toBe(true)
			expect(r.code).toBe('SOME_ERROR')
			expect(r.message).toBe('An error occurred')
		})

		test('from(ok) roundtrip serialization', () => {
			const originalOk = Result.ok({ data: 'test' })
			const jsonOk = originalOk.toJSON()
			const parsedOk = Result.from(jsonOk)
			expectTypeOf(parsedOk).toEqualTypeOf<Result<{ data: string }, never>>()
			expect(parsedOk.isOk()).toBe(true)
			expect(parsedOk._unsafeUnwrap().data).toBe('test')
		})

		test('from(err) roundtrip serialization', () => {
			const originalErr = Result.err('ROUNDTRIP_ERROR', 'Roundtrip failed', { info: 42 })
			const jsonErr = originalErr.toJSON()
			const parsedErr = Result.from(jsonErr)
			expectTypeOf(parsedErr).toEqualTypeOf<Result<never, { details: { info: number }, code: 'ROUNDTRIP_ERROR' }>>()
			expect(parsedErr.isErr()).toBe(true)
			expect(parsedErr.code).toBe('ROUNDTRIP_ERROR')
			expect(parsedErr.details).toEqual({ info: 42 })
		})

		test('from(multiple Results) should merge union types', () => {
			const r1 = Result.ok(123)
			const r2 = Result.ok('hello')
			const r3 = Result.err('ERROR_CODE', 'Error 1')
			const r4 = Result.err('ANOTHER_CODE', 'Error 2')
			
			const moreResults = Math.random() > 0.5 ? (Math.random() > 0.5 ? r1 : r2) : (Math.random() > 0.5 ? r3 : r4)
			const r = Result.from(moreResults)
			
			expectTypeOf(r).toEqualTypeOf<Result<number | string, { code: 'ERROR_CODE' | 'ANOTHER_CODE' }>>()
			expect(r).toBeInstanceOf(Result)
			// Value could be number or string, error could be ERROR_CODE or ANOTHER_CODE
			if (r.isOk()) {
				expect(typeof r.value === 'number' || typeof r.value === 'string').toBe(true)
			} else if(r.isErr()) {
				expect(['ERROR_CODE', 'ANOTHER_CODE'].includes(r.code)).toBe(true)
			}
		})
	})

	describe('Result.fromSafe', () => {
		test('fromSafe(() => value) should wrap a sync return value in Ok', () => {
			const r = Result.fromSafe(() => 123)
			expectTypeOf(r).toEqualTypeOf<Result<number, Result.ThrownError>>()
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap()).toBe(123)
		})

		test('fromSafe(async () => value) should return a Promise<Result>', async () => {
			const promise = Result.fromSafe(async () => 123)
			expectTypeOf(promise).toEqualTypeOf<Promise<Result<number, Result.ThrownError>>>()
			expect(promise).toBeInstanceOf(Promise)
			const r = await promise
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap()).toBe(123)
		})

		test('fromSafe(() => throw) should catch sync errors and return Err', () => {
			const r = Result.fromSafe(() => {
				throw new Error('Oops')
			})
			expectTypeOf(r).toEqualTypeOf<Result<unknown, Result.ThrownError>>()
			expect(r.isErr()).toBe(true)
			expect(r.isErr('THROWN_ERROR')).toBe(true)
			if (r.isErr('THROWN_ERROR')) {
				expect(r.details).toBeInstanceOf(Error)
				expect((<Error>r.details)?.message).toBe('Oops')
			}
		})

		test('fromSafe(async () => throw) should catch async errors and return Err', async () => {
			const promise = Result.fromSafe(async () => {
				throw new Error('Oops')
			})
			expectTypeOf(promise).toEqualTypeOf<Promise<Result<never, Result.ThrownError>>>()
			const r = await promise
			expect(r.isErr()).toBe(true)
			expect(r.isErr('THROWN_ERROR')).toBe(true)
			if (r.isErr('THROWN_ERROR')) {
				expect(r.details).toBeInstanceOf(Error)
				expect((<Error>r.details)?.message).toBe('Oops')
			}
		})

		test('fromSafe(() => Result) should unwrap returned Results', () => {
			const r1 = Result.fromSafe(() => Result.ok(123))
			expectTypeOf(r1).toEqualTypeOf<Result<number, Result.ThrownError>>()
			expect(r1.isOk()).toBe(true)
			expect(r1._unsafeUnwrap()).toBe(123)

			const r2 = Result.fromSafe(() => Result.err('SOME_ERROR', 'An error'))
			expectTypeOf(r2).toEqualTypeOf<Result<never, Result.ThrownError | { code: 'SOME_ERROR' }>>()
			expect(r2.isErr()).toBe(true)
			expect(r2.code).toBe('SOME_ERROR')
		})

		test('fromSafe(() => Result union) should merge error types', () => {
			const someFunc = (): Result<string | number, { code: 'SOME_ERROR' | 'ANOTHER_CODE' }> => {
				return Math.random() > 0.5 ? Result.ok(123) : Result.err('SOME_ERROR', 'Error')
			}
			
			const r = Result.fromSafe(() => someFunc())
			expectTypeOf(r).toEqualTypeOf<Result<string | number, Result.ThrownError | { code: 'SOME_ERROR' | 'ANOTHER_CODE' }>>()
			expect(r).toBeInstanceOf(Result)
			if (r.isOk()) {
				expect(typeof r.value === 'number' || typeof r.value === 'string').toBe(true)
			} else if (r.isErr()) {
				expect(['THROWN_ERROR', 'SOME_ERROR', 'ANOTHER_CODE'].includes(r.code)).toBe(true)
			}
		})

		test('fromSafe(throw, handleException) should use handler to create Err', () => {
			const r = Result.fromSafe(() => {
				throw new Error('Oops')
			}, (e) => {
				return Result.err('HANDLED_ERROR', 'Handled an error', { original: e })
			})
			expectTypeOf(r).toEqualTypeOf<Result<unknown, {
				code: 'HANDLED_ERROR', 
				details: { original: Result.Err<never, Result.ThrownError> }
			}>>()
			expect(r.isErr()).toBe(true)
			expect(r.isErr('HANDLED_ERROR')).toBe(true)
			if (r.isErr('HANDLED_ERROR')) {
				expect(r.details).toHaveProperty('original')
				expect(r.details.original.isErr()).toBe(true)
				expect(r.details.original.message).toBe('An error was thrown, but not handled')
			}
		})
	})
})

describe('[type] Serialization', () => {
	test('toJSON and fromJSON types', () => {
		const r1 = ok({ data: 1 })
		const json1 = r1.toJSON()
		expectTypeOf(json1).toExtend<{ ok: true, value: { data: number } }>()

		const r2 = err('E', 'msg')
		const json2 = r2.toJSON()
		expectTypeOf(json2).toExtend<{ ok: false, code: 'E', message: string, stack?: string }>()

		const fromJson1 = Result.fromJSON(json1)
		if (fromJson1.isOk()) {
			expectTypeOf(fromJson1.value).toEqualTypeOf<Result<{ data: number }, never>>()
		}
	})
})