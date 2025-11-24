import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import Result, { ok, err, func } from 'xult'
import { inspect } from 'util'

// Note: Browser DevTools formatter code (lines 1080-1190) is tested in dom.test.ts
// using happy-dom to simulate the browser environment.

const inspectSymbol = Symbol.for('nodejs.util.inspect.custom')

describe('Coverage: Node.js inspect custom symbol (direct call)', () => {
	// Directly call the [Symbol.for('nodejs.util.inspect.custom')] method
	// to ensure all #log branches are covered
	
	test('direct inspect Ok with symbol value', () => {
		const result = ok(Symbol('test-symbol'))
		const fn = result[inspectSymbol as keyof typeof result] as (depth: number) => string
		const output = fn.call(result, 4)
		expect(output).toContain('<symbol>')
	})

	test('direct inspect Ok with bigint value', () => {
		const result = ok(BigInt(9007199254740991))
		const fn = result[inspectSymbol as keyof typeof result] as (depth: number) => string
		const output = fn.call(result, 4)
		expect(output).toContain('<bigint>')
	})

	test('direct inspect Ok with null value', () => {
		const result = ok(null)
		const fn = result[inspectSymbol as keyof typeof result] as (depth: number) => string
		const output = fn.call(result, 4)
		expect(output).toContain('null')
	})

	test('direct inspect Ok with function value', () => {
		const result = ok(function namedFn() {})
		const fn = result[inspectSymbol as keyof typeof result] as (depth: number) => string
		const output = fn.call(result, 4)
		expect(output).toContain('<function>')
	})

	test('direct inspect Err with symbol details', () => {
		const result = err('ERROR', 'message', Symbol('test'))
		const fn = result[inspectSymbol as keyof typeof result] as (depth: number) => string
		const output = fn.call(result, 4)
		expect(output).toContain('<symbol>')
	})

	test('direct inspect Err with bigint details', () => {
		const result = err('ERROR', 'message', BigInt(123))
		const fn = result[inspectSymbol as keyof typeof result] as (depth: number) => string
		const output = fn.call(result, 4)
		expect(output).toContain('<bigint>')
	})

	test('direct inspect Err with null details', () => {
		// Note: Due to how Result.err handles null (it's falsy), 
		// null details are not stored. This tests that the inspect works
		// without errors when details would be null
		const result = err('ERROR', 'message', null)
		const fn = result[inspectSymbol as keyof typeof result] as (depth: number) => string
		const output = fn.call(result, 4)
		// Since null is falsy, details is undefined, so no "null" in output
		expect(output).toContain('ERROR')
	})

	test('direct inspect Err with function details', () => {
		// @ts-expect-error - testing function as details
		const result = err('ERROR', 'message', function testFn() {})
		const fn = result[inspectSymbol as keyof typeof result] as (depth: number) => string
		const output = fn.call(result, 4)
		expect(output).toContain('<function>')
	})
})

describe('Coverage: Node.js inspect custom symbol', () => {
	// The #log method is called via [Symbol.for('nodejs.util.inspect.custom')]
	// We test all type branches here
	
	test('inspect Ok with string value', () => {
		const result = ok('test string')
		const output = inspect(result)
		expect(output).toContain('<string>')
		expect(output).toContain('test string')
	})

	test('inspect Ok with number value', () => {
		const result = ok(42)
		const output = inspect(result)
		expect(output).toContain('<number>')
	})

	test('inspect Ok with boolean value', () => {
		const result = ok(true)
		const output = inspect(result)
		expect(output).toContain('<boolean>')
	})

	test('inspect Ok with symbol value', () => {
		const result = ok(Symbol('test-symbol'))
		const output = inspect(result)
		expect(output).toContain('<symbol>')
		expect(output).toContain('Symbol')
	})

	test('inspect Ok with bigint value', () => {
		const result = ok(BigInt(9007199254740991))
		const output = inspect(result)
		expect(output).toContain('<bigint>')
	})

	test('inspect Ok with null value', () => {
		const result = ok(null)
		const output = inspect(result)
		expect(output).toContain('<object>')
		expect(output).toContain('null')
	})

	test('inspect Ok with function value', () => {
		const result = ok(function namedFn() {})
		const output = inspect(result)
		expect(output).toContain('<function>')
		expect(output).toContain('Function')
	})

	test('inspect Ok with anonymous function value', () => {
		const result = ok(() => {})
		const output = inspect(result)
		expect(output).toContain('<function>')
	})

	test('inspect Ok with object value', () => {
		const result = ok({ nested: 'obj' })
		const output = inspect(result)
		expect(output).toContain('<object>')
	})

	test('inspect Ok with array value', () => {
		const result = ok([1, 2, 3])
		const output = inspect(result)
		expect(output).toContain('<object>')
	})

	test('inspect Ok with class instance value', () => {
		class TestClass { x = 1 }
		const result = ok(new TestClass())
		const output = inspect(result)
		expect(output).toContain('<object>')
	})

	test('inspect Ok with undefined value', () => {
		const result = ok(undefined)
		const output = inspect(result)
		expect(output).toContain('<undefined>')
	})

	test('inspect Err with string details', () => {
		const result = err('ERROR', 'message', 'string details')
		const output = inspect(result)
		expect(output).toContain('ERROR')
		expect(output).toContain('message')
	})

	test('inspect Err with number details', () => {
		const result = err('ERROR', 'message', 42)
		const output = inspect(result)
		expect(output).toContain('<number>')
	})

	test('inspect Err with boolean details', () => {
		const result = err('ERROR', 'message', true)
		const output = inspect(result)
		expect(output).toContain('<boolean>')
	})

	test('inspect Err with symbol details', () => {
		const result = err('ERROR', 'message', Symbol('test'))
		const output = inspect(result)
		expect(output).toContain('<symbol>')
	})

	test('inspect Err with bigint details', () => {
		const result = err('ERROR', 'message', BigInt(123))
		const output = inspect(result)
		expect(output).toContain('<bigint>')
	})

	test('inspect Err with null details', () => {
		const result = err('ERROR', 'message', null)
		const output = inspect(result)
		// null details still produces output with the error code and message
		expect(output).toContain('ERROR')
		expect(output).toContain('message')
	})

	test('inspect Err with function details', () => {
		// @ts-expect-error - testing function as details
		const result = err('ERROR', 'message', function testFn() {})
		const output = inspect(result)
		expect(output).toContain('<function>')
	})

	test('inspect Err with object details', () => {
		const result = err('ERROR', 'message', { detail: 'info' })
		const output = inspect(result)
		expect(output).toContain('<object>')
	})

	test('inspect Err with array details', () => {
		const result = err('ERROR', 'message', [1, 2, 3])
		const output = inspect(result)
		expect(output).toContain('<object>')
	})

	test('inspect Err with class instance details', () => {
		class TestClass { x = 1 }
		const result = err('ERROR', 'message', new TestClass())
		const output = inspect(result)
		expect(output).toContain('<object>')
	})

	test('inspect Err with undefined details', () => {
		const result = err('ERROR', 'message', undefined)
		const output = inspect(result)
		expect(output).toContain('ERROR')
	})

	test('inspect with custom depth', () => {
		const result = ok({ nested: { deep: { value: 'test' } } })
		const output = inspect(result, { depth: 10 })
		expect(output).toContain('<object>')
	})
})

describe('Coverage: Symbol.toStringTag', () => {
	test('Symbol.toStringTag returns correct string for Ok result', () => {
		const okResult = ok(42)
		// Access the method via the symbol
		const toStringTag = okResult[Symbol.toStringTag as keyof typeof okResult] as () => string
		expect(toStringTag.call(okResult)).toBe('Result.Ok<number>')
	})

	test('Symbol.toStringTag returns correct string for Ok result with string value', () => {
		const okResult = ok('hello')
		const toStringTag = okResult[Symbol.toStringTag as keyof typeof okResult] as () => string
		expect(toStringTag.call(okResult)).toBe('Result.Ok<string>')
	})

	test('Symbol.toStringTag returns correct string for Err result without details', () => {
		const errResult = err('TEST_ERROR', 'Test error message')
		const toStringTag = errResult[Symbol.toStringTag as keyof typeof errResult] as () => string
		expect(toStringTag.call(errResult)).toBe('Result.Err[TEST_ERROR]')
	})

	test('Symbol.toStringTag returns correct string for Err result with details', () => {
		const errResult = err('TEST_ERROR', 'Test error message', { detail: 'info' })
		const toStringTag = errResult[Symbol.toStringTag as keyof typeof errResult] as () => string
		expect(toStringTag.call(errResult)).toBe('Result.Err[TEST_ERROR]<object>')
	})

	test('Symbol.toStringTag returns correct string for Err result with string details', () => {
		const errResult = err('TEST_ERROR', 'Test error message', 'string detail')
		const toStringTag = errResult[Symbol.toStringTag as keyof typeof errResult] as () => string
		expect(toStringTag.call(errResult)).toBe('Result.Err[TEST_ERROR]<string>')
	})
})

describe('Coverage: Result.func error handling', () => {
	test('Result.func throws when first arg is non-standard schema and not function', () => {
		// Pass an object that looks like it might be a schema but isn't
		const fakeSchema = { notStandard: true }
		
		expect(() => {
			// @ts-expect-error intentionally passing invalid argument
			func(fakeSchema, () => 'value')
		}).toThrow('Expected StandardSchemaV1 schema(s) as first argument to `Result.func`')
	})

	test('Result.func throws when first arg is array of non-standard schemas', () => {
		const fakeSchemas = [{ notStandard: true }, { alsoNotStandard: true }]
		
		expect(() => {
			// @ts-expect-error intentionally passing invalid argument
			func(fakeSchemas, () => 'value')
		}).toThrow('Expected StandardSchemaV1 schema(s) as first argument to `Result.func`')
	})

	test('Result.func throws when schema provided but second arg is not a function', () => {
		// Create a minimal valid standard schema
		const validSchema = {
			'~standard': {
				validate: async (input: unknown) => ({ value: input })
			}
		}
		
		expect(() => {
			// @ts-expect-error intentionally passing invalid argument
			func(validSchema, 'not a function')
		}).toThrow('Expected a function as the second argument to `Result.func` when schemas are provided')
	})

	test('Result.func throws when array of valid schemas provided but second arg is not a function', () => {
		const validSchema1 = {
			'~standard': {
				validate: async (input: unknown) => ({ value: input })
			}
		}
		const validSchema2 = {
			'~standard': {
				validate: async (input: unknown) => ({ value: input })
			}
		}
		
		expect(() => {
			// @ts-expect-error intentionally passing invalid argument
			func([validSchema1, validSchema2], 'not a function')
		}).toThrow('Expected a function as the second argument to `Result.func` when schemas are provided')
	})

	test('Result.func throws when called with completely invalid arguments', () => {
		expect(() => {
			// @ts-expect-error intentionally passing invalid arguments
			func(null, null)
		}).toThrow()
	})
})

describe('Coverage: Result.func with valid custom schema', () => {
	test('Result.func works with a custom standard schema', async () => {
		// Create a minimal valid standard schema that transforms input
		const doubleSchema = {
			'~standard': {
				version: 1 as const,
				vendor: 'test',
				validate: async (input: unknown) => {
					if (typeof input !== 'number') {
						return { issues: [{ message: 'Expected number' }] }
					}
					return { value: input * 2 }
				}
			}
		}
		
		const wrapped = func(doubleSchema, (doubled: number) => doubled + 1)
		
		// Valid input
		const r1 = await wrapped(5)
		expect(r1.isOk()).toBe(true)
		expect(r1.value).toBe(11) // (5 * 2) + 1
		
		// Invalid input
		const r2 = await wrapped('not a number' as any)
		expect(r2.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
	})

	test('Result.func with schema and handleException', async () => {
		const schema = {
			'~standard': {
				version: 1 as const,
				vendor: 'test',
				validate: async (input: unknown) => ({ value: input })
			}
		}
		
		const wrapped = func(
			schema,
			(_input: unknown) => { throw new Error('boom') },
			(_e) => ({ code: 'HANDLED' as const, message: 'Handled error' })
		)
		
		const r = await wrapped('input')
		expect(r.isErr('HANDLED')).toBe(true)
	})
})

describe('Coverage: toString method', () => {
	test('toString returns JSON string for Ok result', () => {
		const okResult = ok({ test: 123 })
		const str = okResult.toString()
		const parsed = JSON.parse(str)
		expect(parsed.ok).toBe(true)
		expect(parsed.value).toEqual({ test: 123 })
	})

	test('toString returns JSON string for Err result', () => {
		const errResult = err('ERROR', 'Error message', { detail: 'info' })
		const str = errResult.toString()
		const parsed = JSON.parse(str)
		expect(parsed.ok).toBe(false)
		expect(parsed.code).toBe('ERROR')
		expect(parsed.message).toBe('Error message')
		expect(parsed.details).toEqual({ detail: 'info' })
	})
})

describe('Coverage: map and catch methods', () => {
	test('map transforms Ok value', () => {
		const r = ok(5).map(v => v * 2)
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe(10)
	})

	test('map does not transform Err', () => {
		const r = err('ERROR', 'msg').map(v => v * 2)
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('ERROR')
	})

	test('catch transforms Err to Ok', () => {
		const r = err('ERROR', 'msg').catch(e => 'recovered')
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('recovered')
	})

	test('catch does not transform Ok', () => {
		const r = ok(5).catch(e => 'recovered')
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe(5)
	})
})

describe('Coverage: ifOk and ifErr methods', () => {
	test('ifOk calls callback for Ok result', () => {
		let called = false
		let receivedValue: number | undefined
		const r = ok(42).ifOk(v => {
			called = true
			receivedValue = v
		})
		expect(called).toBe(true)
		expect(receivedValue).toBe(42)
		expect(r.isOk()).toBe(true) // Returns this
	})

	test('ifOk does not call callback for Err result', () => {
		let called = false
		const r = err('ERROR', 'msg').ifOk(v => {
			called = true
		})
		expect(called).toBe(false)
		expect(r.isErr()).toBe(true) // Returns this
	})

	test('ifErr calls callback for Err result', () => {
		let called = false
		let receivedCode: string | undefined
		const r = err('ERROR', 'msg').ifErr(e => {
			called = true
			receivedCode = e.code
		})
		expect(called).toBe(true)
		expect(receivedCode).toBe('ERROR')
		expect(r.isErr()).toBe(true) // Returns this
	})

	test('ifErr does not call callback for Ok result', () => {
		let called = false
		const r = ok(42).ifErr(e => {
			called = true
		})
		expect(called).toBe(false)
		expect(r.isOk()).toBe(true) // Returns this
	})
})

describe('Coverage: Result.fromJSON with string input', () => {
	test('fromJSON parses valid JSON string for Ok', () => {
		const jsonString = JSON.stringify({ ok: true, value: 123 })
		const r = Result.fromJSON(jsonString)
		expect(r.isOk()).toBe(true)
		if (r.isOk()) {
			expect(r.value.isOk()).toBe(true)
			expect(r.value.value).toBe(123)
		}
	})

	test('fromJSON parses valid JSON string for Err', () => {
		const jsonString = JSON.stringify({ ok: false, code: 'ERR', message: 'Error' })
		const r = Result.fromJSON(jsonString)
		expect(r.isOk()).toBe(true)
		if (r.isOk()) {
			expect(r.value.isErr()).toBe(true)
			expect(r.value.code).toBe('ERR')
		}
	})

	test('fromJSON returns JSON_PARSE_ERROR for invalid JSON string', () => {
		const r = Result.fromJSON('not valid json{')
		expect(r.isErr('JSON_PARSE_ERROR')).toBe(true)
		if (r.isErr('JSON_PARSE_ERROR')) {
			expect(r.details).toHaveProperty('input')
			expect(r.details).toHaveProperty('error')
		}
	})

	test('fromJSON handles Promise input', async () => {
		const promise = Promise.resolve({ ok: true, value: 'async' })
		const r = await Result.fromJSON(promise)
		expect(r.isOk()).toBe(true)
		if (r.isOk()) {
			expect(r.value.isOk()).toBe(true)
			expect(r.value.value).toBe('async')
		}
	})
})

describe('Coverage: Result.tryJSON', () => {
	test('tryJSON returns undefined for invalid JSON', () => {
		const r = Result.tryJSON({ invalid: true })
		expect(r).toBeUndefined()
	})

	test('tryJSON handles Promise input', async () => {
		const promise = Promise.resolve({ ok: true, value: 'async' })
		const r = await Result.tryJSON(promise)
		expect(r).toBeDefined()
		expect(r?.isOk()).toBe(true)
	})

	test('tryJSON returns Result as-is', () => {
		const original = ok(123)
		const r = Result.tryJSON(original)
		expect(r).toBe(original)
	})
})

describe('Coverage: Result.isJSON', () => {
	test('isJSON returns false for non-object', () => {
		expect(Result.isJSON(null)).toBe(false)
		expect(Result.isJSON('string')).toBe(false)
		expect(Result.isJSON(123)).toBe(false)
		expect(Result.isJSON(undefined)).toBe(false)
	})

	test('isJSON returns false for object without ok property', () => {
		expect(Result.isJSON({ value: 123 })).toBe(false)
	})

	test('isJSON returns false for object with non-boolean ok', () => {
		expect(Result.isJSON({ ok: 'true' })).toBe(false)
		expect(Result.isJSON({ ok: 1 })).toBe(false)
	})

	test('isJSON returns true for ok: true', () => {
		expect(Result.isJSON({ ok: true })).toBe(true)
		expect(Result.isJSON({ ok: true, value: 123 })).toBe(true)
	})

	test('isJSON returns false for ok: false without code', () => {
		expect(Result.isJSON({ ok: false })).toBe(false)
	})

	test('isJSON returns false for ok: false with non-string code', () => {
		expect(Result.isJSON({ ok: false, code: 123 })).toBe(false)
	})

	test('isJSON returns false for ok: false without message', () => {
		expect(Result.isJSON({ ok: false, code: 'ERR' })).toBe(false)
	})

	test('isJSON returns false for ok: false with non-string message', () => {
		expect(Result.isJSON({ ok: false, code: 'ERR', message: 123 })).toBe(false)
	})

	test('isJSON returns true for valid error JSON', () => {
		expect(Result.isJSON({ ok: false, code: 'ERR', message: 'Error' })).toBe(true)
	})
})

describe('Coverage: Generator error handling in func', () => {
	test('sync generator catches thrown errors', () => {
		const wrapped = func(function* () {
			yield ok(1) // Need yield for generator
			throw new Error('Generator crashed')
		})
		
		const r = wrapped()
		expect(r.isErr('THROWN_ERROR')).toBe(true)
	})

	test('async generator catches thrown errors', async () => {
		const wrapped = func(async function* () {
			yield ok(1) // Need yield for async generator
			throw new Error('Async generator crashed')
		})
		
		const r = await wrapped()
		expect(r.isErr('THROWN_ERROR')).toBe(true)
	})

	test('sync generator handles non-THROWN_ERROR Err being thrown', () => {
		const wrapped = func(function* () {
			yield ok(1) // Need yield for generator
			throw err('CUSTOM_ERR', 'Custom error')
		})
		
		const r = wrapped()
		expect(r.isErr('CUSTOM_ERR')).toBe(true)
	})
})

describe('Coverage: _unsafeUnwrap error details', () => {
	test('_unsafeUnwrap preserves error details as cause', () => {
		const errResult = err('TEST_ERR', 'Test message', { extra: 'info' })
		
		try {
			errResult._unsafeUnwrap()
			expect(true).toBe(false) // Should not reach here
		} catch (e: any) {
			expect(e.name).toBe('TEST_ERR')
			expect(e.message).toBe('Test message')
			expect(e.cause).toEqual({ extra: 'info' })
		}
	})
})
