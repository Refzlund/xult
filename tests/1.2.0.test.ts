import { describe, test, expect, expectTypeOf, jest } from 'bun:test'
import Result, { ok, err, async } from 'xult'

describe('New Result Features', () => {
	describe('toString', () => {
		test('should return JSON string representation', () => {
			const r = ok({ foo: 'bar' })
			const str = r.toString()
			expect(str).toBe(JSON.stringify(r.toJSON()))
			expect(JSON.parse(str)).toEqual(r.toJSON())
		})
	})

	describe('isJSON', () => {
		test('should return true for valid Result JSON objects', () => {
			expect(Result.isJSON({ ok: true, value: 1 })).toBe(true)
			expect(Result.isJSON({ ok: false, code: 'ERR', message: 'msg' })).toBe(true)
		})

		test('should return false for invalid objects', () => {
			expect(Result.isJSON(null)).toBe(false)
			expect(Result.isJSON({})).toBe(false)
			expect(Result.isJSON({ ok: 'yes' })).toBe(false) // ok must be boolean
		})
	})

	describe('tryJSON', () => {
		test('should return Result for valid input', () => {
			const json = { ok: true, value: 123 }
			const r = Result.tryJSON(json)
			expect(r).toBeDefined()
			expect(r?.isOk()).toBe(true)
			expect(r?.value).toBe(123)
		})

		test('should return undefined for invalid input', () => {
			expect(Result.tryJSON(null)).toBeUndefined()
			expect(Result.tryJSON({ invalid: true })).toBeUndefined()
		})

		test('should handle string input', () => {
			const jsonStr = JSON.stringify({ ok: true, value: 'parsed' })
			const r = Result.tryJSON(jsonStr)
			expect(r).toBeDefined()
			expect(r?.value).toBe('parsed')
		})

		test('should handle Promise input', async () => {
			const promise = Promise.resolve({ ok: true, value: 'async' })
			const r = await Result.tryJSON(promise)
			expect(r).toBeDefined()
			expect(r?.value).toBe('async')
		})
	})

	describe('fromJSON (Enhanced)', () => {
		test('should handle string input', () => {
			const jsonStr = JSON.stringify({ ok: true, value: 'parsed' })
			const r = Result.fromJSON(jsonStr)
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap().value).toBe('parsed')
		})

		test('should handle malformed JSON string', () => {
			const r = Result.fromJSON('{ invalid json }')
			expect(r.isErr('JSON_PARSE_ERROR')).toBe(true)
		})

		test('should handle Promise input', async () => {
			const promise = Promise.resolve({ ok: true, value: 'async' })
			const r = await Result.fromJSON(promise)
			expect(r.isOk()).toBe(true)
			expect(r._unsafeUnwrap().value).toBe('async')
		})
	})

	describe('catch', () => {
		test('should execute handler if Result is Err', () => {
			const r = err('ERR', 'msg')
			const recovered = r.catch((e) => {
				expect(e.code).toBe('ERR')
				return 'recovered'
			})
			expect(recovered.isOk()).toBe(true)
			expect(recovered.value).toBe('recovered')
		})

		test('should pass through if Result is Ok', () => {
			const r = ok('original')
			const recovered = r.catch(() => 'changed')
			expect(recovered.isOk()).toBe(true)
			expect(recovered.value).toBe('original')
		})
	})

	describe('map', () => {
		test('should transform value if Result is Ok', () => {
			const r = ok(10)
			const mapped = r.map(v => v.toString())
			expect(mapped.isOk()).toBe(true)
			expect(mapped.value).toBe('10')
		})

		test('should pass through if Result is Err', () => {
			const r = err('ERR', 'msg')
			const mapped = r.map(v => 'changed')
			expect(mapped.isErr()).toBe(true)
			expect(mapped.code).toBe('ERR')
		})
	})

	describe('ifErr / ifOk', () => {
		test('ifErr should execute side effect only on Err', () => {
			let called = false
			const rErr = err('ERR', 'msg')
			rErr.ifErr(e => {
				called = true
				expect(e.code).toBe('ERR')
			})
			expect(called).toBe(true)

			called = false
			const rOk = ok('val')
			rOk.ifErr(() => { called = true })
			expect(called).toBe(false)
		})

		test('ifOk should execute side effect only on Ok', () => {
			let called = false
			const rOk = ok('val')
			rOk.ifOk(v => {
				called = true
				expect(v).toBe('val')
			})
			expect(called).toBe(true)

			called = false
			const rErr = err('ERR', 'msg')
			rErr.ifOk(() => { called = true })
			expect(called).toBe(false)
		})
	})

	describe('Result.ErrorOnly<T>', () => {
		test('should extract only the error type from Result', () => {
			type R = Result<number, { code: 'E1' } | { code: 'E2' }>
			type EOnly = Result.ErrorOnly<R>
			expectTypeOf<EOnly>().toEqualTypeOf<Result.Err<never, { code: 'E1' } | { code: 'E2' }>>()
		})
	})
})
