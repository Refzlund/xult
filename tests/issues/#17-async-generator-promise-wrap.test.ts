import { describe, test, expect } from 'bun:test'
import { func } from '../../src'

/*
	https://github.com/Refzlund/xult/issues/8

	Bug: Returning a Promise from an async generator in `func` wraps the Promise
	instead of awaiting it.

	When using `func` with an async generator (`async function*`) and returning
	a Promise at the end (e.g., from another function call), the returned value
	becomes `Result<Promise<T>>` instead of `Result<T>`. The Promise is not
	awaited before being wrapped in the Result.
*/

/* oxlint-disable eslint/require-yield -- Testing async generators that return without yielding */

describe('issue #8: async generator returns Promise instead of awaiting it', () => {
	test('returning a Promise from async generator should await it', async () => {
		const inner = func(async () => {
			return { id: 1 }
		})

		const outer = func(async function*() {
			return inner()
		})

		const result = await outer()

		expect(result.isOk()).toBe(true)

		// BUG: result.value is Promise<Result<{ id: 1 }>> instead of { id: 1 }
		expect(result.value).not.toBeInstanceOf(Promise)
		expect(result.value).toEqual({ id: 1 })
	})

	test('minimal reproduction: Promise wrapped instead of awaited', async () => {
		const fetchData = func(async () => {
			return { name: 'Alice', age: 30 }
		})

		const processData = func(async function*() {
			return fetchData()
		})

		const result = await processData()

		expect(result.isOk()).toBe(true)

		// These assertions should pass once the bug is fixed
		expect(result.value instanceof Promise).toBe(false)
		expect(result.value).toEqual({ name: 'Alice', age: 30 })
	})

	test('workaround using yield* await works correctly', async () => {
		const fetchData = func(async () => {
			return { name: 'Alice', age: 30 }
		})

		// Workaround: use yield* await instead of returning the Promise directly
		const processData = func(async function*() {
			const data = yield* await fetchData()
			return data
		})

		const result = await processData()

		expect(result.isOk()).toBe(true)
		expect(result.value).toEqual({ name: 'Alice', age: 30 })
	})
})
