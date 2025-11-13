import { describe, test, expect } from 'bun:test'
import Result, { ok, err, func } from '../../src'

/*
	https://github.com/Refzlund/xult/issues/7
*/

describe('issue #7: async generator in func causes infinite recursion', async () => {
	
	test(`async func: should not time out`, async () => {
		const test = func(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10))
			return
		})

		const result = await test()
		expect(result.isOk()).toBe(true)
	}, { timeout: 1000 })

	test(`async generator func: should not time out`, async () => {
		const test = func(async function*() {
			yield await new Promise((resolve) => setTimeout(resolve, 10))
			return
		})

		const result = await test()
		expect(result.isOk()).toBe(true)
	}, { timeout: 1000 })

	test(`normal func: should not time out`, async () => {
		const test = func(() => {
			return
		})

		const result = test()
		expect(result.isOk()).toBe(true)
	}, { timeout: 1000 })

	test(`normal generator func: should not time out`, async () => {
		const test = func(function*() {
			yield 1
			return
		})

		const result = test()
		expect(result.isOk()).toBe(true)
	}, { timeout: 1000 })

})

