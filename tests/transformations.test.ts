import {
	describe,
	test,
	expect,
	expectTypeOf
} from 'bun:test'
import Result, { ok, err } from 'xult'

describe('map - Transforming success values', () => {
	test('transforms value when Result is Ok', () => {
		const r = ok(5).map(v => v * 2)
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe(10)
	})

	test('passes through Err unchanged', () => {
		const r = err('ERROR', 'msg').map(v => v * 2)
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('ERROR')
	})

	test('chains multiple map calls', () => {
		const r = ok(5)
			.map(v => v * 2)
			.map(v => v.toString())
			.map(v => `Result: ${v}`)
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('Result: 10')
	})

	test('type changes through map', () => {
		const r = ok(10).map(v => v.toString())
		if (r.isOk()) {
			expectTypeOf(r.value).toEqualTypeOf<string>()
			expect(typeof r.value).toBe('string')
		}
	})
})

describe('catch - Recovering from errors', () => {
	test('transforms Err to Ok', () => {
		const r = err('ERROR', 'msg').catch(e => 'recovered')
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('recovered')
	})

	test('passes through Ok unchanged', () => {
		const r = ok(5).catch(e => 'recovered')
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe(5)
	})

	test('receives error in callback', () => {
		const r = err('ERROR', 'msg').catch((e) => {
			expect(e.code).toBe('ERROR')
			return 'recovered'
		})
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('recovered')
	})

	test('can return different types', () => {
		const r: Result<number, { code: 'ERR' }> = err('ERR', 'msg')
		const recovered = r.catch(e => 'fallback')
		expectTypeOf(recovered).toEqualTypeOf<Result<number | string, never>>()
		expect(recovered.isOk()).toBe(true)
	})
})

describe('ifOk - Side effects on success', () => {
	test('calls callback for Ok result', () => {
		let called = false
		let receivedValue: number | undefined
		const r = ok(42).ifOk(v => {
			called = true
			receivedValue = v
		})
		expect(called).toBe(true)
		expect(receivedValue).toBe(42)
		expect(r.isOk()).toBe(true)
	})

	test('does not call callback for Err result', () => {
		let called = false
		const r = err('ERROR', 'msg').ifOk(v => {
			called = true
		})
		expect(called).toBe(false)
		expect(r.isErr()).toBe(true)
	})

	test('returns this for chaining', () => {
		const original = ok(42)
		const returned = original.ifOk(() => {})
		expect(returned).toBe(original)
	})
})

describe('ifErr - Side effects on error', () => {
	test('calls callback for Err result', () => {
		let called = false
		let receivedCode: string | undefined
		const r = err('ERROR', 'msg').ifErr(e => {
			called = true
			receivedCode = e.code
		})
		expect(called).toBe(true)
		expect(receivedCode).toBe('ERROR')
		expect(r.isErr()).toBe(true)
	})

	test('does not call callback for Ok result', () => {
		let called = false
		const r = ok(42).ifErr(e => {
			called = true
		})
		expect(called).toBe(false)
		expect(r.isOk()).toBe(true)
	})

	test('returns this for chaining', () => {
		const original = err('ERROR', 'msg')
		const returned = original.ifErr(() => {})
		expect(returned).toBe(original)
	})
})

describe('Method chaining', () => {
	test('combines map, catch, ifOk, ifErr', () => {
		const logs: string[] = []

		const r1 = ok(10)
			.map(v => v * 2)
			.ifOk(v => logs.push(`Success: ${v}`))
			.ifErr(e => logs.push(`Error: ${e.code}`))

		expect(r1.isOk()).toBe(true)
		expect(r1.value).toBe(20)
		expect(logs).toEqual(['Success: 20'])

		logs.length = 0

		const r2 = (err('FAIL', 'Failed') as Result<number, { code: 'FAIL' }>)
			.map(v => v * 2)
			.ifOk(v => logs.push(`Success: ${v}`))
			.ifErr(e => logs.push(`Error: ${e.code}`))
			.catch(() => -1)

		expect(r2.isOk()).toBe(true)
		expect(r2.value).toBe(-1)
		expect(logs).toEqual(['Error: FAIL'])
	})
})

describe('[type] Transformation type inference', () => {
	test('map preserves error type', () => {
		const r: Result<number, { code: 'ERR', details: string }> = ok(42)
		const mapped = r.map(v => v.toString())
		expectTypeOf(mapped).toEqualTypeOf<Result<string, { code: 'ERR', details: string }>>()
	})

	test('catch removes error type', () => {
		const r: Result<number, { code: 'ERR' }> = err('ERR', 'msg')
		const caught = r.catch(() => 0)
		expectTypeOf(caught).toEqualTypeOf<Result<number, never>>()
	})

	test('ifOk returns same type', () => {
		const r = ok(42)
		const after = r.ifOk(() => {})
		expectTypeOf(after).toEqualTypeOf<typeof r>()
	})

	test('ifErr returns same type', () => {
		const r = err('ERR', 'msg')
		const after = r.ifErr(() => {})
		expectTypeOf(after).toEqualTypeOf<typeof r>()
	})
})
