import {
	describe,
	test,
	expect
} from 'bun:test'
import Result, { ok, err, func } from 'xult'
import { inspect } from 'util'

const inspectSymbol = Symbol.for('nodejs.util.inspect.custom')

describe('Node.js inspect custom symbol', () => {
	describe('Ok results', () => {
		test('inspects string value', () => {
			const result = ok('test string')
			const output = inspect(result)
			expect(output).toContain('<string>')
			expect(output).toContain('test string')
		})

		test('inspects number value', () => {
			const result = ok(42)
			const output = inspect(result)
			expect(output).toContain('<number>')
		})

		test('inspects boolean value', () => {
			const result = ok(true)
			const output = inspect(result)
			expect(output).toContain('<boolean>')
		})

		test('inspects symbol value', () => {
			const result = ok(Symbol('test-symbol'))
			const output = inspect(result)
			expect(output).toContain('<symbol>')
			expect(output).toContain('Symbol')
		})

		test('inspects bigint value', () => {
			const result = ok(BigInt(9007199254740991))
			const output = inspect(result)
			expect(output).toContain('<bigint>')
		})

		test('inspects null value', () => {
			const result = ok(null)
			const output = inspect(result)
			expect(output).toContain('<object>')
			expect(output).toContain('null')
		})

		test('inspects function value', () => {
			const result = ok(function namedFn() {})
			const output = inspect(result)
			expect(output).toContain('<function>')
			expect(output).toContain('Function')
		})

		test('inspects anonymous function value', () => {
			const result = ok(() => {})
			const output = inspect(result)
			expect(output).toContain('<function>')
		})

		test('inspects object value', () => {
			const result = ok({ nested: 'obj' })
			const output = inspect(result)
			expect(output).toContain('<object>')
		})

		test('inspects array value', () => {
			const result = ok([1, 2, 3])
			const output = inspect(result)
			expect(output).toContain('<object>')
		})

		test('inspects class instance value', () => {
			class TestClass { x = 1 }
			const result = ok(new TestClass())
			const output = inspect(result)
			expect(output).toContain('<object>')
		})

		test('inspects undefined value', () => {
			const result = ok(undefined)
			const output = inspect(result)
			expect(output).toContain('<undefined>')
		})

		test('supports custom depth option', () => {
			const result = ok({ nested: { deep: { value: 'test' } } })
			const output = inspect(result, { depth: 10 })
			expect(output).toContain('<object>')
		})
	})

	describe('Err results', () => {
		test('inspects error with string details', () => {
			const result = err('ERROR', 'message', 'string details')
			const output = inspect(result)
			expect(output).toContain('ERROR')
			expect(output).toContain('message')
		})

		test('inspects error with number details', () => {
			const result = err('ERROR', 'message', 42)
			const output = inspect(result)
			expect(output).toContain('<number>')
		})

		test('inspects error with boolean details', () => {
			const result = err('ERROR', 'message', true)
			const output = inspect(result)
			expect(output).toContain('<boolean>')
		})

		test('inspects error with symbol details', () => {
			const result = err('ERROR', 'message', Symbol('test'))
			const output = inspect(result)
			expect(output).toContain('<symbol>')
		})

		test('inspects error with bigint details', () => {
			const result = err('ERROR', 'message', BigInt(123))
			const output = inspect(result)
			expect(output).toContain('<bigint>')
		})

		test('inspects error with null details', () => {
			const result = err('ERROR', 'message', null)
			const output = inspect(result)
			expect(output).toContain('ERROR')
			expect(output).toContain('message')
		})

		test('inspects error with function details', () => {
			// @ts-expect-error - testing function as details
			const result = err('ERROR', 'message', function testFn() {})
			const output = inspect(result)
			expect(output).toContain('<function>')
		})

		test('inspects error with object details', () => {
			const result = err('ERROR', 'message', { detail: 'info' })
			const output = inspect(result)
			expect(output).toContain('<object>')
		})

		test('inspects error with array details', () => {
			const result = err('ERROR', 'message', [1, 2, 3])
			const output = inspect(result)
			expect(output).toContain('<object>')
		})

		test('inspects error with class instance details', () => {
			class TestClass { x = 1 }
			const result = err('ERROR', 'message', new TestClass())
			const output = inspect(result)
			expect(output).toContain('<object>')
		})

		test('inspects error with undefined details', () => {
			const result = err('ERROR', 'message', undefined)
			const output = inspect(result)
			expect(output).toContain('ERROR')
		})
	})

	describe('Direct inspect symbol call', () => {
		test('direct inspect Ok with symbol value', () => {
			const result = ok(Symbol('test-symbol'))
			const fn = (result as any)[inspectSymbol] as (depth: number) => string
			const output = fn.call(result, 4)
			expect(output).toContain('<symbol>')
		})

		test('direct inspect Ok with bigint value', () => {
			const result = ok(BigInt(9007199254740991))
			const fn = (result as any)[inspectSymbol] as (depth: number) => string
			const output = fn.call(result, 4)
			expect(output).toContain('<bigint>')
		})

		test('direct inspect Ok with null value', () => {
			const result = ok(null)
			const fn = (result as any)[inspectSymbol] as (depth: number) => string
			const output = fn.call(result, 4)
			expect(output).toContain('null')
		})

		test('direct inspect Ok with function value', () => {
			const result = ok(function namedFn() {})
			const fn = (result as any)[inspectSymbol] as (depth: number) => string
			const output = fn.call(result, 4)
			expect(output).toContain('<function>')
		})

		test('direct inspect Err with symbol details', () => {
			const result = err('ERROR', 'message', Symbol('test'))
			const fn = (result as any)[inspectSymbol] as (depth: number) => string
			const output = fn.call(result, 4)
			expect(output).toContain('<symbol>')
		})

		test('direct inspect Err with bigint details', () => {
			const result = err('ERROR', 'message', BigInt(123))
			const fn = (result as any)[inspectSymbol] as (depth: number) => string
			const output = fn.call(result, 4)
			expect(output).toContain('<bigint>')
		})

		test('direct inspect Err with null details', () => {
			const result = err('ERROR', 'message', null)
			const fn = (result as any)[inspectSymbol] as (depth: number) => string
			const output = fn.call(result, 4)
			expect(output).toContain('ERROR')
		})

		test('direct inspect Err with function details', () => {
			// @ts-expect-error - testing function as details
			const result = err('ERROR', 'message', function testFn() {})
			const fn = (result as any)[inspectSymbol] as (depth: number) => string
			const output = fn.call(result, 4)
			expect(output).toContain('<function>')
		})
	})
})

describe('toString method', () => {
	test('returns JSON string for Ok result', () => {
		const okResult = ok({ test: 123 })
		const str = okResult.toString()
		const parsed = JSON.parse(str)
		expect(parsed.ok).toBe(true)
		expect(parsed.value).toEqual({ test: 123 })
	})

	test('returns JSON string for Err result', () => {
		const errResult = err('ERROR', 'Error message', { detail: 'info' })
		const str = errResult.toString()
		const parsed = JSON.parse(str)
		expect(parsed.ok).toBe(false)
		expect(parsed.code).toBe('ERROR')
		expect(parsed.message).toBe('Error message')
		expect(parsed.details).toEqual({ detail: 'info' })
	})

	test('toString matches toJSON stringified', () => {
		const r = ok({ foo: 'bar' })
		const str = r.toString()
		expect(str).toBe(JSON.stringify(r.toJSON()))
	})
})

describe('Symbol.toStringTag', () => {
	test('returns correct string for Ok result with number', () => {
		const okResult = ok(42)
		const toStringTag = okResult[Symbol.toStringTag as keyof typeof okResult] as () => string
		expect(toStringTag.call(okResult)).toBe('Result.Ok<number>')
	})

	test('returns correct string for Ok result with string', () => {
		const okResult = ok('hello')
		const toStringTag = okResult[Symbol.toStringTag as keyof typeof okResult] as () => string
		expect(toStringTag.call(okResult)).toBe('Result.Ok<string>')
	})

	test('returns correct string for Err result without details', () => {
		const errResult = err('TEST_ERROR', 'Test error message')
		const toStringTag = errResult[Symbol.toStringTag as keyof typeof errResult] as () => string
		expect(toStringTag.call(errResult)).toBe('Result.Err[TEST_ERROR]')
	})

	test('returns correct string for Err result with object details', () => {
		const errResult = err('TEST_ERROR', 'Test error message', { detail: 'info' })
		const toStringTag = errResult[Symbol.toStringTag as keyof typeof errResult] as () => string
		expect(toStringTag.call(errResult)).toBe('Result.Err[TEST_ERROR]<object>')
	})

	test('returns correct string for Err result with string details', () => {
		const errResult = err('TEST_ERROR', 'Test error message', 'string detail')
		const toStringTag = errResult[Symbol.toStringTag as keyof typeof errResult] as () => string
		expect(toStringTag.call(errResult)).toBe('Result.Err[TEST_ERROR]<string>')
	})
})
