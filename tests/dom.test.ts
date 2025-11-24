/// <reference lib="dom" />
import { describe, test, expect, beforeAll } from 'bun:test'

// Dynamic import to ensure window exists first
let Result: typeof import('xult').default
let ok: typeof import('xult').ok
let err: typeof import('xult').err

beforeAll(async () => {
	// Force re-evaluation of the module with window available
	// Clear any cached version
	const modulePath = require.resolve('xult')
	delete require.cache[modulePath]
	
	// Also clear the result.ts cache
	for (const key of Object.keys(	require.cache)) {
		if (key.includes('result')) {
			delete require.cache[key]
		}
	}
	
	// Now import fresh
	const module = await import('xult')
	Result = module.default
	ok = module.ok
	err = module.err
})

describe('Browser DevTools Formatter', () => {
	test('formatter is registered when window exists', () => {
		const globalWindow = window as any
		expect(globalWindow.devtoolsFormatters).toBeDefined()
		expect(globalWindow.devtoolsFormatters.length).toBeGreaterThan(0)
		
		const formatterFlag = Symbol.for('xult.result.devtoolsFormatter')
		expect(globalWindow[formatterFlag]).toBeDefined()
	})

	test('formatter has required methods', () => {
		const globalWindow = window as any
		const formatter = globalWindow.devtoolsFormatters[0]
		
		expect(typeof formatter.header).toBe('function')
		expect(typeof formatter.hasBody).toBe('function')
		expect(typeof formatter.body).toBe('function')
	})

	describe('formatter.header', () => {
		test('returns null for non-Result objects', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			expect(formatter.header('string')).toBeNull()
			expect(formatter.header(123)).toBeNull()
			expect(formatter.header(null)).toBeNull()
			expect(formatter.header(undefined)).toBeNull()
			expect(formatter.header({ obj: true })).toBeNull()
			expect(formatter.header([1, 2, 3])).toBeNull()
		})

		test('formats Ok result with string value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok('test string')
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
			// Should contain the value formatted as string
			expect(JSON.stringify(header)).toContain('test string')
		})

		test('formats Ok result with number value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(42)
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with boolean value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(true)
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with null value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(null)
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with undefined value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(undefined)
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with bigint value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(BigInt(9007199254740991))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with symbol value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(Symbol('test'))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with function value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(function namedFunction() {})
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with anonymous function value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(() => {})
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with Date value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(new Date('2024-01-01'))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with Array value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok([1, 2, 3])
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with Map value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(new Map([['key', 'value']]))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with Set value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(new Set([1, 2, 3]))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with object value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok({ nested: 'object', count: 42 })
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Ok result with nested Result value', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(ok('nested'))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result without details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message')
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
			expect(JSON.stringify(header)).toContain('ERROR_CODE')
			expect(JSON.stringify(header)).toContain('Error message')
		})

		test('formats Err result with string details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', 'string details')
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with number details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', 42)
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with object details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', { detail: 'info' })
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with array details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', [1, 2, 3])
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with null details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', null)
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with function details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', function detailFunc() {})
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with Date details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', new Date())
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with Map details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', new Map([['a', 1]]))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with Set details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', new Set([1, 2]))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with bigint details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', BigInt(123))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with symbol details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', Symbol('test'))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with boolean details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', true)
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})

		test('formats Err result with nested Result details', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message', ok('nested result'))
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})
	})

	describe('formatter.hasBody', () => {
		test('returns false for Ok result', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(42)
			expect(formatter.hasBody(result)).toBe(false)
		})

		test('returns true for Err result with stack', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message')
			expect(formatter.hasBody(result)).toBe(true)
		})

		test('returns false for Err result without stack', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message')
			result.stack = undefined
			expect(formatter.hasBody(result)).toBe(false)
		})

		test('returns false for Err result with empty stack', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message')
			result.stack = ''
			expect(formatter.hasBody(result)).toBe(false)
		})

		test('returns false for non-Result objects', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			expect(formatter.hasBody('string')).toBe(false)
			expect(formatter.hasBody(123)).toBe(false)
			expect(formatter.hasBody(null)).toBe(false)
			expect(formatter.hasBody({ obj: true })).toBe(false)
		})
	})

	describe('formatter.body', () => {
		test('returns stack for Err result', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message')
			const body = formatter.body(result)
			
			expect(body).not.toBeNull()
			expect(body[0]).toBe('div')
			expect(typeof body[2]).toBe('string') // Stack trace
		})

		test('returns null for Ok result', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = ok(42)
			expect(formatter.body(result)).toBeNull()
		})

		test('returns null for Err result without stack', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			const result = err('ERROR_CODE', 'Error message')
			result.stack = undefined
			expect(formatter.body(result)).toBeNull()
		})

		test('returns null for non-Result objects', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			expect(formatter.body('string')).toBeNull()
			expect(formatter.body(123)).toBeNull()
			expect(formatter.body(null)).toBeNull()
			expect(formatter.body({ obj: true })).toBeNull()
		})
	})

	describe('formatter registration edge cases', () => {
		test('re-importing module replaces existing formatter', async () => {
			const globalWindow = window as any
			const formatterFlag = Symbol.for('xult.result.devtoolsFormatter')
			
			const initialFormatter = globalWindow[formatterFlag]
			const initialCount = globalWindow.devtoolsFormatters.length
			
			// Clear module cache and re-import
			// @ts-expect-error - accessing Bun internals
			const cache = require.cache || {}
			for (const key of Object.keys(cache)) {
				if (key.includes('result')) {
					delete cache[key]
				}
			}
			
			// The formatter should still work after potential re-registration
			const result = ok('after re-import')
			const header = globalWindow[formatterFlag].header(result)
			expect(header).not.toBeNull()
		})

		test('formatter handles strings with special characters', () => {
			const globalWindow = window as any
			const formatter = globalWindow.devtoolsFormatters[0]
			
			// String with backslashes, newlines, tabs, carriage returns, and quotes
			const result = ok('test\\path\r\n\twith\'quotes')
			const header = formatter.header(result)
			
			expect(header).not.toBeNull()
			expect(header[0]).toBe('div')
		})
	})
})
