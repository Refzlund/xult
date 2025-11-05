import { describe, test, expect } from 'bun:test'
import { ok, err } from 'xult'

const large_obj = {
	a: 1,
	b: 'string',
	c: [1, 2, 3],
	d: { nested: true, arr: [4, 5, 6], deeper: { key: 'value' } },
	e: () => {},
	f: function example() {},
	g: null,
	h: undefined,
	i: BigInt(9007199254741991),
	j: Symbol('Sym'),
	k: err('NESTED', 'Nested error'),
	ok: ok({
		inner: 'object',
		num: 42,
		arr: [7, 8, 9],
		deep: {
			foo: 'bar',
			deepArr: [10, 11, 12],
			ok: ok({
				message: 'Deeply nested ok',
			})
		}
	}),
}

class Example {
	value: number
	constructor(value: number) {
		this.value = value
	}
}

describe('Section', () => {
	test(`should work`, async () => {
		console.log('')
		console.log('')
		ok('Test').log(false)
		ok(123).log(false)
		ok(BigInt(9007199254741991)).log(false)
		ok(true).log(false)
		ok(Symbol('Sym')).log(false)
		ok(null).log(false)
		ok(function example() {}).log(false)
		ok(() => {}).log(false)
		ok(undefined).log(false)
		ok(large_obj).log(false)
		ok(new Example(42)).log(false)
		ok(Example).log(false)
		console.log('')
		console.log('')
		err('ERR_CODE', 'This is the message explaining the error.', 'Test').log()
		err('ERR_CODE', 'This is the message explaining the error.', 123).log()
		err('ERR_CODE', 'This is the message explaining the error.', BigInt(9007199254741991)).log()
		err('ERR_CODE', 'This is the message explaining the error.', true).log()
		err('ERR_CODE', 'This is the message explaining the error.', Symbol('Sym')).log()
		err('ERR_CODE', 'This is the message explaining the error.', null).log()
		// @ts-ignore
		err('ERR_CODE', 'This is the message explaining the error.', function wample() {}).log()
		err('ERR_CODE', 'This is the message explaining the error.', () => {}).log()
		err('ERR_CODE', 'This is the message explaining the error.', undefined).log()
		err('ERR_CODE', 'This is the message explaining the error.', large_obj).log()
		err('ERR_CODE', 'This is the message explaining the error.', new Example(42)).log()
		err('ERR_CODE', 'This is the message explaining the error.', Example).log()
		console.log('')
		console.log('')
	})
})