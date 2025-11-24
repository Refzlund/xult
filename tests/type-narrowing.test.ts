import {
	describe,
	test,
	expect,
	expectTypeOf
} from 'bun:test'
import Result, { ok, err } from 'xult'

describe('isOk() - Type narrowing for success results', () => {
	test('isOk() returns true for Ok and narrows type', () => {
		const r: Result<number, { code: 'E' }> = ok(1)

		if (r.isOk()) {
			// r is Ok<number, never> here
			expect(r.value + 1).toBe(2)
		} else {
			expect(true).toBe(false)
		}
	})

	test('isOk() returns false for Err', () => {
		const r: Result<number, { code: 'E' }> = err('E', 'Error')

		if (r.isOk()) {
			expect(true).toBe(false)
		} else {
			expect(r.isErr()).toBe(true)
		}
	})

	test('isOk() type narrowing on union type', () => {
		const getValue = (): Result<number, { code: 'FAIL' }> =>
			Math.random() > 0.5 ? ok(42) : err('FAIL', 'Failed')

		const r = getValue()
		if (r.isOk()) {
			expectTypeOf(r.value).toBeNumber()
		}
	})
})

describe('isErr() - Type narrowing for error results', () => {
	test('isErr() returns true for Err and narrows type', () => {
		const r: Result<number, { code: 'E' }> = err('E', 'Error occurred')

		if (r.isErr()) {
			expect(r.code).toBe('E')
		} else {
			expect(true).toBe(false)
		}
	})

	test('isErr() returns false for Ok', () => {
		const r: Result<number, { code: 'E' }> = ok(42)

		if (r.isErr()) {
			expect(true).toBe(false)
		} else {
			expect(r.value).toBe(42)
		}
	})

	test('isErr(code) narrows to specific error code', () => {
		type MyError = { code: 'A' } | { code: 'B' }
		const r: Result<never, MyError> = err('A', 'Error A')

		if (r.isErr('A')) {
			expect(r.code).toBe('A')
		} else if (r.isErr('B')) {
			expect(true).toBe(false)
		}
	})

	test('isErr(code) returns false when code does not match', () => {
		type MyError = { code: 'A' } | { code: 'B' }
		const r: Result<never, MyError> = err('B', 'Error B')

		if (r.isErr('A')) {
			expect(true).toBe(false)
		} else if (r.isErr('B')) {
			expect(r.code).toBe('B')
		}
	})

	test('isErr() with multiple error codes in chain', () => {
		type MyError = { code: 'A' } | { code: 'B' } | { code: 'C' }
		const r: Result<never, MyError> = err('B', 'Error B')

		if (r.isErr('A')) {
			expect(true).toBe(false)
		} else if (r.isErr('B')) {
			expect(r.code).toBe('B')
		} else if (r.isErr('C')) {
			expect(true).toBe(false)
		}
	})
})

describe('[type] Type narrowing inference', () => {
	test('isOk() correctly narrows union types', () => {
		const r: Result<number, { code: 'E', details: string }> = ok(42)

		if (r.isOk()) {
			expectTypeOf(r).toMatchTypeOf<Result.Ok<number, never>>()
			expectTypeOf(r.value).toBeNumber()
		}
	})

	test('isErr() correctly narrows union types', () => {
		const r: Result<number, { code: 'E', details: string }> = err('E', 'msg', 'details')

		if (r.isErr()) {
			expectTypeOf(r.code).toBeString()
			expectTypeOf(r.details).toBeString()
		}
	})

	test('isErr(code) correctly narrows to specific error', () => {
		type Errors = { code: 'NOT_FOUND', details: { id: string } } | { code: 'UNAUTHORIZED' }
		const r: Result<number, Errors> = err('NOT_FOUND', 'Not found', { id: '123' })

		if (r.isErr('NOT_FOUND')) {
			expectTypeOf(r.code).toEqualTypeOf<'NOT_FOUND'>()
			expectTypeOf(r.details).toEqualTypeOf<{ id: string }>()
		}
	})

	test('Result.ErrorCodeOf extracts error codes', () => {
		type R = Result<number, { code: 'A' } | { code: 'B' }>
		type Codes = Result.ErrorCodeOf<R>
		expectTypeOf<Codes>().toEqualTypeOf<'A' | 'B'>()
	})

	test('Result.ErrorOf extracts error types', () => {
		type R = Result<number, { code: 'A', details: number } | { code: 'B' }>
		type Errors = Result.ErrorOf<R>
		expectTypeOf<Errors>().toMatchTypeOf<{ code: 'A', details: number } | { code: 'B' }>()
	})

	test('Result.ValueOf extracts value type', () => {
		type R = Result<number, { code: 'E' }>
		type Value = Result.ValueOf<R>
		expectTypeOf<Value>().toEqualTypeOf<number>()
	})

	test('Result.ErrorOnly extracts only the error portion', () => {
		type R = Result<number, { code: 'E1' } | { code: 'E2' }>
		type EOnly = Result.ErrorOnly<R>
		expectTypeOf<EOnly>().toEqualTypeOf<Result.Err<never, { code: 'E1' } | { code: 'E2' }>>()
	})
})
