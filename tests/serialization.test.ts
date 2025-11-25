import {
	describe,
	test,
	expect,
	expectTypeOf
} from 'bun:test'
import Result, { ok, err } from 'xult'

describe('toJSON - Serializing Results', () => {
	test('serializes an Ok result correctly', () => {
		const r = ok({ data: 'payload' })
		const json = r.toJSON()
		expect(json.ok).toBe(true)
		expect(json.value).toBeDefined()
		expect(json.value).toEqual({ data: 'payload' })
		expect(json).not.toContainAnyKeys(['code', 'message', 'details', 'stack'] as never[])
	})

	test('serializes an Err result correctly', () => {
		const r = err('SERIALIZE_ERROR', 'Cannot serialize', { reason: 42 })
		const json = r.toJSON()
		expect(json.ok).toBe(false)
		expect(json).not.toContainKey('value' as never)
		expect(json.code).toBe('SERIALIZE_ERROR')
		expect(json.message).toBe('Cannot serialize')
		expect(json.details).toEqual({ reason: 42 })
		expect(json.stack).toBeString()
	})
})

describe('fromJSON - Deserializing Results', () => {
	test('parses valid Ok JSON', () => {
		const json = { ok: true, value: 'success' }
		const parseResult = Result.fromJSON(json)

		expect(parseResult.isOk()).toBe(true)
		const innerResult = parseResult._unsafeUnwrap()
		expect(innerResult).toBeInstanceOf(Result)
		expect(innerResult.isOk()).toBe(true)
		expect(innerResult.value).toBe('success')
	})

	test('parses valid Err JSON', () => {
		const json = { ok: false, code: 'PARSED_ERR', message: 'Parsed from JSON' }
		const parseResult = Result.fromJSON(json)

		expect(parseResult.isOk()).toBe(true)
		const innerResult = parseResult._unsafeUnwrap()
		expect(innerResult).toBeInstanceOf(Result)
		expect(innerResult.isErr()).toBe(true)
		expect(innerResult.code).toBe('PARSED_ERR')
	})

	test('returns BAD_TYPE error for non-object input', () => {
		const r = Result.fromJSON(null)
		expect(r.isErr('BAD_TYPE')).toBe(true)
	})

	test('returns NOT_RESULT_JSON error for objects missing "ok" property', () => {
		const r = Result.fromJSON({ value: 123 })
		expect(r.isErr('NOT_RESULT_JSON')).toBe(true)
	})

	test('returns BAD_ERR_JSON error for invalid error JSON with non-string code', () => {
		const r = Result.fromJSON({ ok: false, code: 123, message: 'test' })
		expect(r.isErr('BAD_ERR_JSON')).toBe(true)
		if (r.isErr('BAD_ERR_JSON')) {
			expect(r.details).toHaveProperty('code')
			expect(r.details).toHaveProperty('message')
		}
	})

	test('returns BAD_ERR_JSON error for invalid error JSON with non-string message', () => {
		const r = Result.fromJSON({ ok: false, code: 'TEST', message: 456 })
		expect(r.isErr('BAD_ERR_JSON')).toBe(true)
	})

	test('preserves stack from error JSON', () => {
		const customStack = 'Error\n  at file.ts:10:5'
		const json = { ok: false, code: 'ERR', message: 'Test error', stack: customStack }
		const parseResult = Result.fromJSON(json)

		expect(parseResult.isOk()).toBe(true)
		const innerResult = parseResult._unsafeUnwrap()
		expect(innerResult.stack).toBe(customStack)
	})

	test('parses valid JSON string', () => {
		const jsonString = JSON.stringify({ ok: true, value: 123 })
		const r = Result.fromJSON(jsonString)
		expect(r.isOk()).toBe(true)
		if (r.isOk()) {
			expect(r.value.isOk()).toBe(true)
			expect(r.value.value).toBe(123)
		}
	})

	test('returns JSON_PARSE_ERROR for invalid JSON string', () => {
		const r = Result.fromJSON('not valid json{')
		expect(r.isErr('JSON_PARSE_ERROR')).toBe(true)
		if (r.isErr('JSON_PARSE_ERROR')) {
			expect(r.details).toHaveProperty('input')
			expect(r.details).toHaveProperty('error')
		}
	})

	test('handles Promise input', async () => {
		const promise = Promise.resolve({ ok: true, value: 'async' })
		const r = await Result.fromJSON(promise)
		expect(r.isOk()).toBe(true)
		if (r.isOk()) {
			expect(r.value.isOk()).toBe(true)
			expect(r.value.value).toBe('async')
		}
	})
})

describe('isJSON - Detecting Result JSON', () => {
	test('returns false for non-object values', () => {
		expect(Result.isJSON(null)).toBe(false)
		expect(Result.isJSON('string')).toBe(false)
		expect(Result.isJSON(123)).toBe(false)
		expect(Result.isJSON(undefined)).toBe(false)
	})

	test('returns false for object without ok property', () => {
		expect(Result.isJSON({ value: 123 })).toBe(false)
	})

	test('returns false for object with non-boolean ok', () => {
		expect(Result.isJSON({ ok: 'true' })).toBe(false)
		expect(Result.isJSON({ ok: 1 })).toBe(false)
	})

	test('returns true for ok: true', () => {
		expect(Result.isJSON({ ok: true })).toBe(true)
		expect(Result.isJSON({ ok: true, value: 123 })).toBe(true)
	})

	test('returns false for ok: false without code', () => {
		expect(Result.isJSON({ ok: false })).toBe(false)
	})

	test('returns false for ok: false with non-string code', () => {
		expect(Result.isJSON({ ok: false, code: 123 })).toBe(false)
	})

	test('returns false for ok: false without message', () => {
		expect(Result.isJSON({ ok: false, code: 'ERR' })).toBe(false)
	})

	test('returns false for ok: false with non-string message', () => {
		expect(Result.isJSON({ ok: false, code: 'ERR', message: 123 })).toBe(false)
	})

	test('returns true for valid error JSON', () => {
		expect(Result.isJSON({ ok: false, code: 'ERR', message: 'Error' })).toBe(true)
	})
})

describe('tryJSON - Safe Result JSON parsing', () => {
	test('returns Result for valid input', () => {
		const json = { ok: true, value: 123 }
		const r = Result.tryJSON(json)
		expect(r).toBeDefined()
		expect(r?.isOk()).toBe(true)
		expect(r?.value).toBe(123)
	})

	test('returns undefined for invalid input', () => {
		expect(Result.tryJSON(null)).toBeUndefined()
		expect(Result.tryJSON({ invalid: true })).toBeUndefined()
	})

	test('returns Result as-is for Result input', () => {
		const original = ok(123)
		const r = Result.tryJSON(original)
		expect(r).toBe(original)
	})

	test('handles Promise input', async () => {
		const promise = Promise.resolve({ ok: true, value: 'async' })
		const r = await Result.tryJSON(promise)
		expect(r).toBeDefined()
		expect(r?.isOk()).toBe(true)
	})
})

describe('Result.from - Universal Result conversion', () => {
	test('wraps a plain value in Ok', () => {
		const r = Result.from(123)
		expectTypeOf(r).toEqualTypeOf<Result<number, never>>()
		expect(r.isOk()).toBe(true)
		expect(r._unsafeUnwrap()).toBe(123)
	})

	test('preserves literal types', () => {
		const r = Result.from(123 as const)
		expectTypeOf(r).toEqualTypeOf<Result<123, never>>()
		expect(r.isOk()).toBe(true)
		expect(r._unsafeUnwrap()).toBe(123)
	})

	test('returns Promise<Result> for Promise input', async () => {
		const promise = Result.from(Promise.resolve(123))
		expectTypeOf(promise).toEqualTypeOf<Promise<Result<number, never>>>()
		expect(promise).toBeInstanceOf(Promise)
		const r = await promise
		expectTypeOf(r).toEqualTypeOf<Result<number, never>>()
		expect(r.isOk()).toBe(true)
		expect(r._unsafeUnwrap()).toBe(123)
	})

	test('passes through Result.ok unchanged', () => {
		const original = Result.ok(123 as const)
		const r = Result.from(original)
		expectTypeOf(r).toEqualTypeOf<Result<123, never>>()
		expect(r).toBe(original)
		expect(r.isOk()).toBe(true)
		expect(r._unsafeUnwrap()).toBe(123)
	})

	test('passes through Result.err unchanged', () => {
		const original = Result.err('SOME_ERROR', 'An error occurred')
		const r = Result.from(original)
		expectTypeOf(r).toEqualTypeOf<Result<never, { code: 'SOME_ERROR' }>>()
		expect(r).toBe(original)
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('SOME_ERROR')
	})

	test('deserializes Ok JSON', () => {
		const r = Result.from({ ok: true as const, value: 123 })
		expectTypeOf(r).toEqualTypeOf<Result<number, never>>()
		expect(r.isOk()).toBe(true)
		expect(r._unsafeUnwrap()).toBe(123)
	})

	test('deserializes Err JSON', () => {
		const r = Result.from({ ok: false as const, code: 'SOME_ERROR' as const, message: 'An error occurred' })
		expectTypeOf(r).toEqualTypeOf<Result<never, { code: 'SOME_ERROR' }>>()
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('SOME_ERROR')
		expect(r.message).toBe('An error occurred')
	})

	test('handles ok roundtrip serialization', () => {
		const originalOk = Result.ok({ data: 'test' })
		const jsonOk = originalOk.toJSON()
		const parsedOk = Result.from(jsonOk)
		expectTypeOf(parsedOk).toEqualTypeOf<Result<{ data: string }, never>>()
		expect(parsedOk.isOk()).toBe(true)
		expect(parsedOk._unsafeUnwrap().data).toBe('test')
	})

	test('handles err roundtrip serialization', () => {
		const originalErr = Result.err('ROUNDTRIP_ERROR', 'Roundtrip failed', { info: 42 })
		const jsonErr = originalErr.toJSON()
		const parsedErr = Result.from(jsonErr)
		expectTypeOf(parsedErr).toEqualTypeOf<Result<never, { details: { info: number }, code: 'ROUNDTRIP_ERROR' }>>()
		expect(parsedErr.isErr()).toBe(true)
		expect(parsedErr.code).toBe('ROUNDTRIP_ERROR')
		expect(parsedErr.details).toEqual({ info: 42 })
	})

	test('merges union types from multiple Results', () => {
		const r1 = Result.ok(123)
		const r2 = Result.ok('hello')
		const r3 = Result.err('ERROR_CODE', 'Error 1')
		const r4 = Result.err('ANOTHER_CODE', 'Error 2')

		const moreResults = Math.random() > 0.5 ? (Math.random() > 0.5 ? r1 : r2) : (Math.random() > 0.5 ? r3 : r4)
		const r = Result.from(moreResults)

		expectTypeOf(r).toEqualTypeOf<Result<number | string, { code: 'ERROR_CODE' } | { code: 'ANOTHER_CODE' }>>()
		expect(r).toBeInstanceOf(Result)
		if (r.isOk()) {
			expect(typeof r.value === 'number' || typeof r.value === 'string').toBe(true)
		} else if (r.isErr()) {
			expect(['ERROR_CODE', 'ANOTHER_CODE'].includes(r.code)).toBe(true)
		}
	})
})

describe('Result.fromSafe - Safe function execution', () => {
	test('wraps a sync return value in Ok', () => {
		const r = Result.fromSafe(() => 123)
		expectTypeOf(r).toEqualTypeOf<Result<number, Result.ThrownError>>()
		expect(r.isOk()).toBe(true)
		expect(r._unsafeUnwrap()).toBe(123)
	})

	test('returns Promise<Result> for async function', async () => {
		const promise = Result.fromSafe(async () => 123)
		expectTypeOf(promise).toEqualTypeOf<Promise<Result<number, Result.ThrownError>>>()
		expect(promise).toBeInstanceOf(Promise)
		const r = await promise
		expect(r.isOk()).toBe(true)
		expect(r._unsafeUnwrap()).toBe(123)
	})

	test('catches sync errors and returns Err', () => {
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

	test('catches async errors and returns Err', async () => {
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

	test('unwraps returned Results', () => {
		const r1 = Result.fromSafe(() => Result.ok(123))
		expectTypeOf(r1).toEqualTypeOf<Result<number, Result.ThrownError>>()
		expect(r1.isOk()).toBe(true)
		expect(r1._unsafeUnwrap()).toBe(123)

		const r2 = Result.fromSafe(() => Result.err('SOME_ERROR', 'An error'))
		expectTypeOf(r2).toEqualTypeOf<Result<never, Result.ThrownError | { code: 'SOME_ERROR' }>>()
		expect(r2.isErr()).toBe(true)
		expect(r2.code).toBe('SOME_ERROR')
	})

	test('merges error types from Result unions', () => {
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

	test('uses handleException to create Err', () => {
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

describe('[type] Serialization type inference', () => {
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

describe('toJSON - iterator parameter', () => {
	test('toJSON() returns Result.JSON with iterator by default', () => {
		const r = ok({ name: 'Alice' })
		const json = r.toJSON()

		expect(json.ok).toBe(true)
		expect(json.value).toEqual({ name: 'Alice' })
		expect(typeof json[Symbol.iterator]).toBe('function')

		// type tests
		expectTypeOf(json).toEqualTypeOf<Result.JSON<{ name: string }, never>>()
		expectTypeOf(json).toMatchTypeOf<{ ok: true, value: { name: string } }>()
	})

	test('toJSON(true) returns Result.JSON with iterator', () => {
		const r = ok(42)
		const json = r.toJSON(true)

		expect(json.ok).toBe(true)
		expect(json.value).toBe(42)
		expect(typeof json[Symbol.iterator]).toBe('function')

		expect(Object.getOwnPropertySymbols(json)).toHaveLength(1)

		// type tests
		expectTypeOf(json).toEqualTypeOf<Result.JSON<number, never>>()
	})

	test('toJSON(false) returns Result.PlainJSON without iterator', () => {
		const r = ok({ id: 123 })
		const json = r.toJSON(false)

		expect(json.ok).toBe(true)
		expect(json.value).toEqual({ id: 123 })
		expect((json as any)[Symbol.iterator]).toBeUndefined()

		expect(Object.getOwnPropertySymbols(json)).toHaveLength(0)

		// type tests
		expectTypeOf(json).toEqualTypeOf<Result.PlainJSON<{ id: number }, never>>()
		expectTypeOf(json).toMatchTypeOf<{ ok: true, value: { id: number } }>()
	})

	test('toJSON(false) on Err returns plain error object', () => {
		const r = err('NOT_FOUND', 'User not found', { userId: 'abc' })
		const json = r.toJSON(false)

		expect(json.ok).toBe(false)
		expect(json.code).toBe('NOT_FOUND')
		expect(json.message).toBe('User not found')
		expect(json.details).toEqual({ userId: 'abc' })
		expect(json.stack).toBeString()
		expect((json as any)[Symbol.iterator]).toBeUndefined()

		// type tests
		expectTypeOf(json).toEqualTypeOf<Result.PlainJSON<never, { code: 'NOT_FOUND', details: { userId: string } }>>()
	})

	test('PlainJSON type is a clean union type', () => {
		const okResult = ok('success')
		const errResult = err('FAIL', 'failed')

		const okJson = okResult.toJSON(false)
		const errJson = errResult.toJSON(false)

		// Ok case: should be exactly { ok: true, value: string }
		expectTypeOf(okJson).toEqualTypeOf<{ ok: true, value: string }>()

		// Err case: should be { ok: false, code: 'FAIL', message: string, stack?: string }
		expectTypeOf(errJson).toMatchTypeOf<{ ok: false, code: 'FAIL', message: string }>()
	})

	test('JSON type includes Symbol.iterator and Result.symbol', () => {
		const r = ok(123)
		const json = r.toJSON(true)

		// Should have Symbol.iterator
		expectTypeOf(json[Symbol.iterator]).toBeFunction()
		expectTypeOf(json[Symbol.iterator]).returns.toMatchTypeOf<Generator<any, number, unknown>>()

		// Should have Result.symbol key
		expectTypeOf(json[Result.symbol]).toEqualTypeOf<true>()
	})

	test('iterator on Result.JSON works correctly', () => {
		const r = ok({ count: 5 })
		const json = r.toJSON()

		const iterator = json[Symbol.iterator]()
		const first = iterator.next()

		expect(first.done).toBe(false)
		expect(first.value).toBe(json)

		const second = iterator.next()
		expect(second.done).toBe(true)
		expect(second.value).toEqual({ count: 5 })
	})
})
