import { describe, test } from 'bun:test'
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
	i: BigInt('9007199254741991'),
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

describe('Pretty log', () => {
	test(`pretty print tests`, async () => {
		console.log('')
		console.log('')
		ok('Test').log()
		ok(123).log()
		ok(BigInt('9007199254741991')).log()
		ok(true).log()
		ok(Symbol('Sym')).log()
		ok(null).log()
		ok(function example() {}).log()
		ok(() => {}).log()
		ok(undefined).log()
		ok(large_obj).log()
		ok(new Example(42)).log()
		ok(Example).log()
		ok(ok('Nested ok')).log()
		ok(err('ERR_CODE', 'An error inside ok')).log()
		console.log('')
		console.log('')
		err('ERR_CODE', 'This is the message explaining the error.', 'Test').log()
		err('ERR_CODE', 'This is the message explaining the error.', 123).log()
		err('ERR_CODE', 'This is the message explaining the error.', BigInt('9007199254741991')).log()
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
		err('ERR_CODE', 'This is the message explaining the error.', ok('A nested ok')).log()
		err('ERR_CODE', 'This is the message explaining the error.', err('NESTED_ERR', 'A nested error')).log()
		console.log('')
		console.log('')
	})
})