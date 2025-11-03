import { describe, test, expect, expectTypeOf } from 'bun:test'
import Result, { ok, err } from 'xult'

describe('Serialization (toJSON / fromJSON)', () => {
	test('toJSON should correctly serialize an Ok result', () => {
		const r = ok({ data: 'payload' })
		const json = r.toJSON()
		expect(json.ok).toBe(true)
		expect(json.value).toBeDefined()
		expect(json.value).toEqual({ data: 'payload' })
		expect(json.code).toBeUndefined()
		expect(json.message).toBeUndefined()
		expect(json.details).toBeUndefined()
		expect(json.stack).toBeUndefined()
	})

	test('toJSON should correctly serialize an Err result', () => {
		const r = err('SERIALIZE_ERROR', 'Cannot serialize', { reason: 42 })
		const json = r.toJSON()
		expect(json.ok).toBe(false)
		expect(json.value).toBeUndefined()
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