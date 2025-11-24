import {
	describe,
	test,
	expect
} from 'bun:test'
import { ok, err, func } from 'xult'

describe('_unsafeUnwrap - Extracting values unsafely', () => {
	test('returns value for Ok result', () => {
		const r = ok(10)
		expect(r._unsafeUnwrap()).toBe(10)
	})

	test('throws for Err result', () => {
		const r = err('UNWRAP_FAIL', 'Cannot unwrap')
		expect(() => r._unsafeUnwrap()).toThrow()
	})

	test('thrown error preserves error details', () => {
		const r = err('TEST_ERR', 'Test message', { extra: 'info' })

		try {
			r._unsafeUnwrap()
			expect(true).toBe(false)
		} catch (e: any) {
			expect(e.name).toBe('TEST_ERR')
			expect(e.message).toBe('Test message')
			expect(e.cause).toEqual({ extra: 'info' })
		}
	})

	test('thrown error preserves stack trace', () => {
		const r = err('UNWRAP_FAIL', 'Cannot unwrap')

		try {
			r._unsafeUnwrap()
		} catch (e: any) {
			expect(e.stack).toBeDefined()
			expect(typeof e.stack).toBe('string')
		}
	})
})

describe('Symbol.iterator - Generator-based unwrapping', () => {
	test('allows yielding values with yield*', () => {
		const wrapped = func(function* () {
			const val = yield* ok(5)
			expect(val).toBe(5)
			return ok('done')
		})

		const r = wrapped()
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('done')
	})

	test('short-circuits on Err', () => {
		let reachedAfterYield = false

		const wrapped = func(function* () {
			const val = yield* err('FAIL', 'Failed')
			reachedAfterYield = true
			return ok(val)
		})

		const r = wrapped()
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('FAIL')
		expect(reachedAfterYield).toBe(false)
	})

	test('allows chaining multiple yields', () => {
		const getNum = () => ok(5)
		const getString = (n: number) => ok(`Number: ${n}`)

		const wrapped = func(function* () {
			const num = yield* getNum()
			const str = yield* getString(num)
			return ok(str.toUpperCase())
		})

		const r = wrapped()
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('NUMBER: 5')
	})

	test('stops at first error in chain', () => {
		const step1 = () => ok(1)
		const step2 = () => err('STEP2_FAIL', 'Step 2 failed')
		const step3 = () => ok(3)

		const wrapped = func(function* () {
			const v1 = yield* step1()
			const v2 = yield* step2()
			const v3 = yield* step3()
			return ok(v1 + v2 + v3)
		})

		const r = wrapped()
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('STEP2_FAIL')
	})
})

describe('toJSON iterator - JSON result iteration', () => {
	test('toJSON result has Symbol.iterator', () => {
		const r = ok(42)
		const json = r.toJSON()

		expect(typeof json[Symbol.iterator]).toBe('function')
	})

	test('iteration yields the json object and returns value', () => {
		const r = ok(42)
		const json = r.toJSON()

		const iterator = json[Symbol.iterator]()
		const first = iterator.next()

		expect(first.done).toBe(false)
		expect(first.value).toBe(json)

		const second = iterator.next()
		expect(second.done).toBe(true)
		expect(second.value).toBe(42)
	})
})
