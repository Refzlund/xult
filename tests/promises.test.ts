import {
	describe,
	test,
	expect,
	expectTypeOf
} from 'bun:test'
import Result, { ok, err, func } from 'xult'

/*
	This test file covers Promise-related behaviors in `func`,
	particularly around async generators and how Promises are handled
	when returned or yielded.
*/

/* oxlint-disable eslint/require-yield -- Testing async generators that return without yielding */

describe('Result.func - Promise handling in async generators', () => {
	describe('Returning Promises from async generators', () => {
		test('returned Promise<value> should be awaited', async () => {
			const inner = func(async () => {
				return { data: 'resolved' }
			})

			const outer = func(async function*() {
				return inner()
			})

			const result = await outer()

			expect(result.isOk()).toBe(true)
			expect(result.value).not.toBeInstanceOf(Promise)
			expect(result.value).toEqual({ data: 'resolved' })
		})

		test('returned Promise<Result.Ok> should be awaited and unwrapped', async () => {
			const inner = func(async () => {
				return ok({ id: 42 })
			})

			const outer = func(async function*() {
				return inner()
			})

			const result = await outer()

			expect(result.isOk()).toBe(true)
			expect(result.value).not.toBeInstanceOf(Promise)
			expect(result.value).toEqual({ id: 42 })
		})

		test('returned Promise<Result.Err> should be awaited and propagate error', async () => {
			const inner = func(async () => {
				return err('INNER_ERROR', 'Something went wrong')
			})

			const outer = func(async function*() {
				return inner()
			})

			const result = await outer()

			expect(result.isErr()).toBe(true)
			expect(result.code).toBe('INNER_ERROR')
			expect(result.message).toBe('Something went wrong')
		})

		test('chained async func calls should resolve correctly', async () => {
			const step1 = func(async () => ({ step: 1 }))
			const step2 = func(async () => ({ step: 2 }))
			const step3 = func(async () => ({ step: 3 }))

			const pipeline = func(async function*() {
				yield* await step1()
				yield* await step2()
				return step3()
			})

			const result = await pipeline()

			expect(result.isOk()).toBe(true)
			expect(result.value).toEqual({ step: 3 })
		})

		test('nested async generators returning Promises', async () => {
			const innerMost = func(async () => 'innermost value')

			const middle = func(async function*() {
				return innerMost()
			})

			const outer = func(async function*() {
				return middle()
			})

			const result = await outer()

			expect(result.isOk()).toBe(true)
			expect(result.value).toBe('innermost value')
		})
	})

	describe('Promise rejection handling', () => {
		test('rejected Promise in return should be caught', async () => {
			const failing = async () => {
				throw new Error('Async failure')
			}

			const outer = func(async function*() {
				return failing()
			})

			const result = await outer()

			expect(result.isErr()).toBe(true)
			expect(result.code).toBe('THROWN_ERROR')
		})

		test('func returning rejected Promise should be caught', async () => {
			const inner = func(async () => {
				throw new Error('Inner failure')
			})

			const outer = func(async function*() {
				return inner()
			})

			const result = await outer()

			expect(result.isErr()).toBe(true)
			expect(result.code).toBe('THROWN_ERROR')
		})
	})

	describe('Mixed async patterns', () => {
		test('yield* await followed by Promise return', async () => {
			const getData = func(async () => ({ fetched: true }))
			const processData = func(async () => ({ processed: true }))

			const workflow = func(async function*() {
				const data = yield* await getData()
				if (!data.fetched) return err('FETCH_FAILED', 'Failed to fetch')
				return processData()
			})

			const result = await workflow()

			expect(result.isOk()).toBe(true)
			expect(result.value).toEqual({ processed: true })
		})

		test('multiple yields before Promise return', async () => {
			const step1 = func(async () => ok(1))
			const step2 = func(async () => ok(2))
			const step3 = func(async () => ok(3))
			const final = func(async () => ({ total: 6 }))

			const workflow = func(async function*() {
				const a = yield* await step1()
				const b = yield* await step2()
				const c = yield* await step3()
				if (a + b + c !== 6) return err('SUM_WRONG', 'Sum check failed')
				return final()
			})

			const result = await workflow()

			expect(result.isOk()).toBe(true)
			expect(result.value).toEqual({ total: 6 })
		})

		test('conditional Promise return', async () => {
			const successPath = func(async () => ({ success: true }))
			const failurePath = func(async () => ({ success: false }))

			const conditional = func(async function*(condition: boolean) {
				if (condition) {
					return successPath()
				}
				return failurePath()
			})

			const successResult = await conditional(true)
			expect(successResult.isOk()).toBe(true)
			expect(successResult.value).toEqual({ success: true })

			const failResult = await conditional(false)
			expect(failResult.isOk()).toBe(true)
			expect(failResult.value).toEqual({ success: false })
		})
	})

	describe('Promise handling in sync generators', () => {
		test('sync generator cannot directly return Promise (expected behavior)', () => {
			const asyncFn = async () => ({ data: 'async' })

			const syncGen = func(function*() {
				// In sync generators, returning a Promise wraps it directly
				// This is expected behavior - sync generators don't await
				return asyncFn()
			})

			const result = syncGen()

			expect(result.isOk()).toBe(true)
			// Sync generators wrap the Promise as-is, which is correct
			expect(result.value).toBeInstanceOf(Promise)
		})
	})

	describe('Delayed Promise resolution', () => {
		test('Promise that resolves after delay', async () => {
			const delayed = func(async () => {
				await new Promise(resolve => setTimeout(resolve, 50))
				return { delayed: true }
			})

			const outer = func(async function*() {
				return delayed()
			})

			const result = await outer()

			expect(result.isOk()).toBe(true)
			expect(result.value).toEqual({ delayed: true })
		})

		test('multiple delayed Promises in sequence', async () => {
			const delay = (ms: number, value: number) => func(async () => {
				await new Promise(resolve => setTimeout(resolve, ms))
				return value
			})

			const sequence = func(async function*() {
				const a = yield* await delay(10, 1)()
				const b = yield* await delay(10, 2)()
				return delay(10, a + b)()
			})

			const result = await sequence()

			expect(result.isOk()).toBe(true)
			expect(result.value).toBe(3)
		})
	})
})

describe('Result.func - Promise edge cases', () => {
	test('returning Promise.resolve with undefined', async () => {
		const inner = func(async () => undefined)

		const outer = func(async function*() {
			return inner()
		})

		const result = await outer()

		expect(result.isOk()).toBe(true)
		expect(result.value).toBeUndefined()
	})

	test('returning Promise.resolve with null', async () => {
		const inner = func(async () => null)

		const outer = func(async function*() {
			return inner()
		})

		const result = await outer()

		expect(result.isOk()).toBe(true)
		expect(result.value).toBeNull()
	})

	test('returning Promise.resolve with false', async () => {
		const inner = func(async () => false)

		const outer = func(async function*() {
			return inner()
		})

		const result = await outer()

		expect(result.isOk()).toBe(true)
		expect(result.value).toBe(false)
	})

	test('returning Promise.resolve with 0', async () => {
		const inner = func(async () => 0)

		const outer = func(async function*() {
			return inner()
		})

		const result = await outer()

		expect(result.isOk()).toBe(true)
		expect(result.value).toBe(0)
	})

	test('returning Promise.resolve with empty string', async () => {
		const inner = func(async () => '')

		const outer = func(async function*() {
			return inner()
		})

		const result = await outer()

		expect(result.isOk()).toBe(true)
		expect(result.value).toBe('')
	})

	test('deeply nested Promise resolution', async () => {
		const level3 = func(async () => 'deep')
		const level2 = func(async function*() {
			return level3()
		})
		const level1 = func(async function*() {
			return level2()
		})
		const level0 = func(async function*() {
			return level1()
		})

		const result = await level0()

		expect(result.isOk()).toBe(true)
		expect(result.value).toBe('deep')
	})

	test('Promise returning another Promise (nested Promise)', async () => {
		const inner = func(async () => {
			return Promise.resolve({ nested: 'promise' })
		})

		const outer = func(async function*() {
			return inner()
		})

		const result = await outer()

		expect(result.isOk()).toBe(true)
		expect(result.value).toEqual({ nested: 'promise' })
	})
})

describe('[type] Promise handling type inference', () => {
	test('async generator returning Promise<Result<T>>', async () => {
		const inner = func(async () => {
			return { typed: 'value' as const }
		})

		const outer = func(async function*() {
			return inner()
		})

		const result = await outer()

		if (result.isOk()) {
			expectTypeOf(result.value).toEqualTypeOf<{ typed: 'value' }>()
		}
	})

	test('async generator with mixed yields and Promise return', async () => {
		const getNumber = func(async () => 42)
		const getString = func(async () => 'hello')

		const mixed = func(async function*() {
			const num = yield* await getNumber()
			const str = yield* await getString()
			return func(async () => ({ num, str }))()
		})

		const result = await mixed()

		if (result.isOk()) {
			expectTypeOf(result.value).toEqualTypeOf<{ num: number; str: string }>()
		}
	})

	test('type narrowing with Promise-returning async generator', async () => {
		const mayFail = func(async (shouldFail: boolean) => {
			if (shouldFail) return err('FAILED', 'Operation failed')
			return { success: true as const }
		})

		const wrapper = func(async function*(shouldFail: boolean) {
			return mayFail(shouldFail)
		})

		const successResult = await wrapper(false)
		const failResult = await wrapper(true)

		if (successResult.isOk()) {
			expectTypeOf(successResult.value).toEqualTypeOf<{ success: true }>()
		}

		if (failResult.isErr('FAILED')) {
			expectTypeOf(failResult.code).toEqualTypeOf<'FAILED'>()
		}
	})
})

describe('Result.func - Complex Promise workflows', () => {
	test('error recovery with Promise return', async () => {
		const mayFail = func(async (fail: boolean) => {
			if (fail) return err('RECOVERABLE', 'Can be recovered')
			return { data: 'success' }
		})

		const fallback = func(async () => ({ data: 'fallback' }))

		const workflow = func(async function*() {
			const result = await mayFail(true)
			if (result.isErr()) {
				return fallback()
			}
			return ok(result.value)
		})

		const result = await workflow()

		expect(result.isOk()).toBe(true)
		expect(result.value).toEqual({ data: 'fallback' })
	})

	test('Promise chain with error in middle', async () => {
		const step1 = func(async () => ok(1))
		const step2 = func(async () => err('STEP2_ERROR', 'Step 2 failed'))
		const step3 = func(async () => ok(3))

		const chain = func(async function*() {
			yield* await step1()
			yield* await step2()
			return step3()
		})

		const result = await chain()

		expect(result.isErr('STEP2_ERROR')).toBe(true)
	})

	test('parallel Promise handling before return', async () => {
		const fetch1 = func(async () => ({ source: 'api1' }))
		const fetch2 = func(async () => ({ source: 'api2' }))

		const aggregate = func(async function*() {
			const [r1, r2] = await Promise.all([fetch1(), fetch2()])

			const v1 = yield* r1
			const v2 = yield* r2

			return func(async () => ({
				combined: [v1.source, v2.source]
			}))()
		})

		const result = await aggregate()

		expect(result.isOk()).toBe(true)
		expect(result.value).toEqual({ combined: ['api1', 'api2'] })
	})

	test('retry pattern with Promise return', async () => {
		let attempts = 0

		const unreliable = func(async () => {
			attempts++
			if (attempts < 3) return err('TEMPORARY_FAILURE', 'Try again')
			return { success: true, attempts }
		})

		const withRetry = func(async function*() {
			for (let i = 0; i < 5; i++) {
				const result = await unreliable()
				if (result.isOk()) return ok(result.value)
			}
			return err('MAX_RETRIES', 'Exceeded maximum retry attempts')
		})

		const result = await withRetry()

		expect(result.isOk()).toBe(true)
		expect(result.value).toEqual({ success: true, attempts: 3 })
	})
})
