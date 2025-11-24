import {
	describe,
	test,
	expect,
	expectTypeOf
} from 'bun:test'
import Result, { ok, err, async } from 'xult'

describe('Result.async - Wrapping promises', () => {
	test('wraps a resolving promise into an Ok', async () => {
		const r = await async(Promise.resolve(123))
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe(123)
	})

	test('wraps a rejecting promise into an Err', async () => {
		const r = await async(Promise.reject('Something bad happened'))
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('THROWN_ERROR')
		expect(r.details).toBe('Something bad happened')
	})

	test('uses a custom error handler for rejections', async () => {
		const r = await async(
			Promise.reject(new Error('custom')),
			(e) => err('CUSTOM_ERROR', (<Error>e.details).message)
		)
		expect(r.isErr()).toBe(true)
		expect(r.code).toBe('CUSTOM_ERROR')
		expect(r.message).toBe('custom')
	})

	test('automatically unwraps a Result from a resolving promise', async () => {
		const r1 = await async(Promise.resolve(ok('nested ok')))
		expect(r1.isOk()).toBe(true)
		expect(r1.value).toBe('nested ok')

		const r2 = await async(Promise.resolve(err('NESTED_ERR', '...')))
		expect(r2.isErr()).toBe(true)
		expect(r2.code).toBe('NESTED_ERR')
	})
})

describe('[type] Result.async type inference', () => {
	test('infers correct type for any promise with handler', async () => {
		const json = await async(
			Promise.resolve() as Promise<any>,
			(e) => err('ERR', 'Failed to parse JSON response.', e.details)
		)
		expectTypeOf(json).toEqualTypeOf<
			Result<unknown, { code: 'ERR', details: unknown }>
		>()
	})

	test('infers ThrownError for simple throwable functions', async () => {
		async function throwable(): Promise<boolean> {
			if (Math.random() > 0.5) throw new Error('err')
			return true
		}

		const r = Result.async(throwable())
		expectTypeOf(r).resolves.toEqualTypeOf<Result<boolean, Result.ThrownError>>()
	})

	test('infers custom error type with handler', async () => {
		async function throwable(): Promise<boolean> {
			if (Math.random() > 0.5) throw new Error('err')
			return true
		}

		const r2 = Result.async(throwable(), () => err('FAILED', ':C'))
		expectTypeOf(r2).resolves.toEqualTypeOf<Result<boolean, { code: 'FAILED' }>>()
	})

	test('infers union of errors for functions returning Result', async () => {
		async function throwable2() {
			if (Math.random() > 0.5) return err('NAH', 'Ya')
			return ok('yay' as const)
		}

		const r3 = await Result.async(throwable2())
		expectTypeOf(r3).toEqualTypeOf<Result<'yay', Result.ThrownError | { code: 'NAH' }>>()

		const r4 = await Result.async(throwable2(), () => err('FAILED', ':C'))
		expectTypeOf(r4).toEqualTypeOf<Result<'yay', { code: 'NAH' } | { code: 'FAILED' }>>()
	})
})
