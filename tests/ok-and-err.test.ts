import {
	describe,
	test,
	expect,
	expectTypeOf
} from 'bun:test'
import Result, { ok, err } from 'xult'

describe('ok() - Creating success results', () => {
	test('ok(value) creates a success result with the given value', () => {
		const r = ok(42)
		expect(r.isOk()).toBe(true)
		expect(r.isErr()).toBe(false)
		expect(r.value).toBe(42)
		expect(r).toBeInstanceOf(Result)
	})

	test('ok() with no arguments represents void success', () => {
		const r = ok()
		expect(r.isOk()).toBe(true)
		expect(r.value).toBeUndefined()
	})

	test('ok() preserves literal types', () => {
		const r = ok(123 as const)
		expectTypeOf(r).toEqualTypeOf<Result.Ok<123, never>>()
		expect(r.value).toBe(123)
	})

	test('ok() with complex objects', () => {
		const data = { name: 'Alice', age: 30 }
		const r = ok(data)
		expect(r.isOk()).toBe(true)
		expect(r.value).toEqual(data)
	})
})

describe('err() - Creating error results', () => {
	test('err(code, message) creates a failure result', () => {
		const r = err('TEST_ERROR', 'A test error occurred')
		expect(r.isOk()).toBe(false)
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('TEST_ERROR')
		expect(r.message).toBe('A test error occurred')
		expect(r.value).toBeUndefined()
		expect(r).toBeInstanceOf(Result)
	})

	test('err(code, message, details) includes details', () => {
		const r = err('TEST_ERROR', 'A test error occurred', { detail: 'info' })
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('TEST_ERROR')
		expect(r.message).toBe('A test error occurred')
		expect(r.details).toEqual({ detail: 'info' })
	})

	test('err(object) creates a failure from an object', () => {
		const r = err({ code: 'OBJ_ERROR', message: 'From object' })
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('OBJ_ERROR')
		expect(r.message).toBe('From object')
	})

	test('err(object) with details in object form', () => {
		const r = err({ code: 'WITH_DETAILS', message: 'Has details', details: { extra: 'info' } })
		expect(r.isErr()).toBe(true)
		expect(r.details).toEqual({ extra: 'info' })
	})

	test('err() accepts a stack parameter', () => {
		const customStack = 'Custom stack trace'
		const r = err('STACK_ERROR', 'Error with stack', undefined, customStack)
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('STACK_ERROR')
		expect(r.stack).toBe(customStack)
	})

	test('err(object) with stack property', () => {
		const customStack = 'Custom stack from object'
		const r = err({ code: 'OBJ_STACK_ERROR', message: 'From object with stack', stack: customStack })
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('OBJ_STACK_ERROR')
		expect(r.stack).toBe(customStack)
	})

	test('err() handles various details types', () => {
		const r1 = err('WITH_STRING', 'Has string details', 'string detail')
		expect(r1.isErr()).toBe(true)
		expect(r1.details).toBe('string detail')

		const r2 = err('WITH_OBJ', 'Has object details', { key: 'value' })
		expect(r2.isErr()).toBe(true)
		expect(r2.details).toEqual({ key: 'value' })
	})
})

describe('[type] ok() and err() type inference', () => {
	test('ok() returns correctly typed Result.Ok', () => {
		const okResult = ok(42)
		expectTypeOf(okResult).toEqualTypeOf<Result.Ok<number, never>>()
		expect(okResult.isOk()).toBe(true)
		expect(okResult.value).toBe(42)
	})

	test('err() returns correctly typed Result.Err', () => {
		const errResult = err('ERROR', 'An error occurred')
		expectTypeOf(errResult).toEqualTypeOf<Result.Err<never, { code: 'ERROR' }>>()
		expect(errResult.isErr()).toBe(true)
		expect(errResult.code).toBe('ERROR')
	})

	test('err() with details includes details in type', () => {
		const errResult = err('ERROR', 'An error occurred', { info: 123 })
		expectTypeOf(errResult).toEqualTypeOf<Result.Err<never, { code: 'ERROR', details: { info: number } }>>()
		expect(errResult.details).toEqual({ info: 123 })
	})
})
