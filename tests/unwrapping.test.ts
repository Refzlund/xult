import { describe, test, expect } from 'bun:test'
import { ok, err, func } from 'xult'

describe('Unwrapping & Iteration', () => {
	test('_unsafeUnwrap should return value for Ok', () => {
		const r = ok(10)
		expect(r._unsafeUnwrap()).toBe(10)
	})

	test('_unsafeUnwrap should throw for Err', () => {
		const r = err('UNWRAP_FAIL', 'Cannot unwrap')
		expect(() => r._unsafeUnwrap()).toThrow()
		try {
			r._unsafeUnwrap()
		} catch (e: any) {
			expect(e.name).toBe('UNWRAP_FAIL')
			expect(e.message).toBe('Cannot unwrap')
		}
	})

	test('Symbol.iterator allows for yielding with yield*', () => {
		const wrapped = func(function* () {
			const val = yield* ok(5)
			expect(val).toBe(5)
			return ok('done')
		})

		const r = wrapped()
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('done')
	})
})
