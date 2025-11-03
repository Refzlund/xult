import { describe, test, expect, expectTypeOf } from 'bun:test'
import Result, { ok, err } from 'xult'

describe('Result Core Functionality', () => {
	test('ok() should create a success result', () => {
		const r = ok(42)
		expect(r.isOk()).toBe(true)
		expect(r.isErr()).toBe(false)
		expect(r.value).toBe(42)
		expect(r).toBeInstanceOf(Result)
	})

	test('ok() with no arguments should represent void success', () => {
		const r = ok()
		expect(r.isOk()).toBe(true)
		expect(r.value).toBeUndefined()
	})

	test('err() should create a failure result using arguments', () => {
		const r = err('TEST_ERROR', 'A test error occurred', { detail: 'info' })
		expect(r.isOk()).toBe(false)
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('TEST_ERROR')
		expect(r.message).toBe('A test error occurred')
		expect(r.details).toEqual({ detail: 'info' })
		expect(r.value).toBeUndefined()
		expect(r).toBeInstanceOf(Result)
	})

	test('err() should create a failure result using an object', () => {
		const r = err({ code: 'OBJ_ERROR', message: 'From object' })
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('OBJ_ERROR')
		expect(r.message).toBe('From object')
	})

	test('err() should accept a stack parameter', () => {
		const customStack = 'Custom stack trace'
		const r = err('STACK_ERROR', 'Error with stack', undefined, customStack)
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('STACK_ERROR')
		expect(r.stack).toBe(customStack)
	})

	test('err() should accept an object with stack', () => {
		const customStack = 'Custom stack from object'
		const r = err({ code: 'OBJ_STACK_ERROR', message: 'From object with stack', stack: customStack })
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('OBJ_STACK_ERROR')
		expect(r.stack).toBe(customStack)
	})

	test('err() should accept details in object form', () => {
		const r = err({ code: 'WITH_DETAILS', message: 'Has details', details: { extra: 'info' } })
		expect(r.isErr()).toBe(true)
		expect(r.details).toEqual({ extra: 'info' })
	})

	test('err() should handle truthy details parameter', () => {
		const r1 = err('WITH_STRING', 'Has string details', 'string detail')
		expect(r1.isErr()).toBe(true)
		expect(r1.details).toBe('string detail')

		const r2 = err('WITH_OBJ', 'Has object details', { key: 'value' })
		expect(r2.isErr()).toBe(true)
		expect(r2.details).toEqual({ key: 'value' })
	})

	test('isOk() and isErr() should narrow types', () => {
		const r: Result<number, { code: 'E' }> = ok(1)

		if (r.isOk()) {
			// r is Ok<number, never> here
			expect(r.value + 1).toBe(2)
		} else {
			// This block should not be reached
			expect(true).toBe(false)
		}
	})

	test('isOk() should return false for Err', () => {
		const r: Result<number, { code: 'E' }> = err('E', 'Error')

		if (r.isOk()) {
			expect(true).toBe(false)
		} else {
			// This branch is reached for Err
			expect(r.isErr()).toBe(true)
		}
	})

	test('isErr() should narrow types in else branch', () => {
		const r: Result<number, { code: 'E' }> = err('E', 'Error occurred')

		if (r.isOk()) {
			// This block should not be reached
			expect(true).toBe(false)
		} else {
			// r is Err here
			expect(r.code).toBe('E')
		}
	})

	test('isOk() should return true for Ok in error context', () => {
		const r: Result<number, { code: 'E' }> = ok(42)

		if (r.isOk()) {
			// This branch is reached for Ok
			expect(r.value).toBe(42)
		} else {
			expect(true).toBe(false)
		}
	})

	test('isErr() should narrow types with specific error codes', () => {
		type MyError = { code: 'A' } | { code: 'B' }
		const r: Result<never, MyError> = err('A', 'Error A')

		if (r.isErr('A')) {
			// r is narrowed to Err<never, { code: 'A', ... }>
			expect(r.code).toBe('A')
		} else if (r.isErr('B')) {
			// This block should not be reached
			expect(true).toBe(false)
		}
	})

	test('isErr() with specific code on wrong error type', () => {
		type MyError = { code: 'A' } | { code: 'B' }
		const r: Result<never, MyError> = err('B', 'Error B')

		if (r.isErr('A')) {
			expect(true).toBe(false)
		} else if (r.isErr('B')) {
			// This branch is reached when first check fails
			expect(r.code).toBe('B')
		}
	})

	test('isErr() should narrow types with else branch for specific codes', () => {
		type MyError = { code: 'A' } | { code: 'B' }
		const r: Result<never, MyError> = err('B', 'Error B')

		if (r.isErr('A')) {
			// This block should not be reached
			expect(true).toBe(false)
		} else if (r.isErr('B')) {
			// r is narrowed to Err<never, { code: 'B', ... }>
			expect(r.code).toBe('B')
		}
	})

	test('isErr() with different code should reach else branch', () => {
		type MyError = { code: 'A' } | { code: 'B' }
		const r: Result<never, MyError> = err('A', 'Error A')

		if (r.isErr('A')) {
			expect(r.code).toBe('A')
		} else if (r.isErr('B')) {
			expect(true).toBe(false)
		}
	})
})

describe('[type] Result Core', () => {
	test('basic result types', () => {
		const okResult = ok(42)
		expectTypeOf(okResult).toEqualTypeOf<Result.Ok<number, never>>()
		expect(okResult.isOk()).toBe(true)
		expect(okResult.value).toBe(42)

		const errResult = err('ERROR', 'An error occurred')
		expectTypeOf(errResult).toEqualTypeOf<Result.Err<never, { code: 'ERROR' }>>()
		expect(errResult.isErr()).toBe(true)
		expect(errResult.code).toBe('ERROR')
	})
})