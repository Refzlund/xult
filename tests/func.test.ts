import {
	describe,
	test,
	expect,
	expectTypeOf
} from 'bun:test'
import Result, { ok, err, func } from 'xult'
import z from 'zod'

describe('Result.func - Standard Functions', () => {
	describe('Synchronous functions', () => {
		test('wraps a successful synchronous function', () => {
			const add = (a: number, b: number) => a + b
			const wrapped = func(add)
			const r = wrapped(2, 3)
			expect(r.isOk()).toBe(true)
			expect(r.value).toBe(5)
		})

		test('wraps a synchronous function that returns an Err', () => {
			const returnsErr = () => err('KNOWN_ERROR', 'This is expected')
			const wrapped = func(returnsErr)
			const r = wrapped()
			expect(r.isErr('KNOWN_ERROR')).toBe(true)
		})

		test('catches thrown errors from a synchronous function', () => {
			const throws = () => { throw new Error('Crashed') }
			const wrapped = func(throws)
			const r = wrapped()
			expect(r.isErr('THROWN_ERROR')).toBe(true)
			expect((r.details as Error).message).toBe('Crashed')
		})

		test('throws when called with non-function argument', () => {
			expect(() => func('not a function' as any)).toThrow()
		})
	})

	describe('Asynchronous functions', () => {
		test('wraps a successful async function', async () => {
			const addAsync = async (a: number, b: number) => a + b
			const wrapped = func(addAsync)
			const r = await wrapped(5, 5)
			expect(r.isOk()).toBe(true)
			expect(r.value).toBe(10)
		})

		test('catches thrown errors from an async function', async () => {
			const throwsAsync = async () => { throw 'async crash' }
			const wrapped = func(throwsAsync)
			const r = await wrapped()
			expect(r.isErr('THROWN_ERROR')).toBe(true)
			expect(r.details).toBe('async crash')
		})

		test('handles thrown Err in async function', async () => {
			const throwsErr = async () => { throw err('CUSTOM_ERR', 'Custom error thrown') }
			const wrapped = func(throwsErr)
			const r = await wrapped()
			expect(r.isErr('CUSTOM_ERR')).toBe(true)
			expect(r.message).toBe('Custom error thrown')
		})
	})
})

describe('Result.func - Generator Functions (Do-Notation)', () => {
	const getUser = (id: number) =>
		id === 1 ? ok({ name: 'Alice' }) : err('NOT_FOUND', 'User not found')

	describe('Sync generators', () => {
		test('executes a successful sync generator', () => {
			const wrapped = func(function* (id: number) {
				const user = yield* getUser(id)
				return ok(`Hello, ${user.name}`)
			})
			const r = wrapped(1)
			expect(r.isOk()).toBe(true)
			expect(r.value).toBe('Hello, Alice')
		})

		test('short-circuits on yielded Err', () => {
			const wrapped = func(function* (id: number) {
				const user = yield* getUser(id)
				return ok(`Hello, ${user.name}`)
			})
			const r = wrapped(2)
			expect(r.isErr('NOT_FOUND')).toBe(true)
		})

		test('catches thrown errors', () => {
			const wrapped = func(function* () {
				yield ok(1)
				throw new Error('Generator crashed')
			})

			const r = wrapped()
			expect(r.isErr('THROWN_ERROR')).toBe(true)
		})

		test('handles non-THROWN_ERROR Err being thrown', () => {
			const wrapped = func(function* () {
				yield ok(1)
				throw err('CUSTOM_ERR', 'Custom error')
			})

			const r = wrapped()
			expect(r.isErr('CUSTOM_ERR')).toBe(true)
		})
	})

	describe('Async generators', () => {
		test('executes a successful async generator', async () => {
			const wrapped = func(async function* (id: number) {
				const user = yield* getUser(id)
				return ok(`Hello, ${user.name}`)
			})
			const r = await wrapped(1)
			expect(r.isOk()).toBe(true)
			expect(r.value).toBe('Hello, Alice')
		})

		test('short-circuits on yielded Err', async () => {
			const wrapped = func(async function* (id: number) {
				const user = yield* getUser(id)
				return ok(`Hello, ${user.name}`)
			})
			const r = await wrapped(2)
			expect(r.isErr('NOT_FOUND')).toBe(true)
		})

		test('catches thrown errors', async () => {
			const wrapped = func(async function* () {
				yield ok(1)
				throw new Error('Async generator crashed')
			})

			const r = await wrapped()
			expect(r.isErr('THROWN_ERROR')).toBe(true)
		})
	})
})

describe('Result.func - Validation with Schemas', () => {
	const userSchema = z.object({ name: z.string().min(1) })
	const processUser = (user: z.infer<typeof userSchema>) => `Processed ${user.name}`

	test('succeeds with valid input for a single schema', async () => {
		const wrapped = func(userSchema, processUser)
		const r = await wrapped({ name: 'Bob' })
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('Processed Bob')
	})

	test('fails with invalid input for a single schema', async () => {
		const wrapped = func(userSchema, processUser)
		const r = await wrapped({ name: '' })
		expect(r.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
		expect(r.details).toHaveProperty('issues')
		expect((r.details as any).issues[0].code).toBe('too_small')
	})

	test('succeeds with multiple schemas', async () => {
		const schemas = [z.string(), z.number()] as const
		const combine = (str: string, num: number) => `${str}:${num}`
		const wrapped = func(schemas, combine)
		const r = await wrapped('data', 123)
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe('data:123')
	})

	test('fails if any of multiple schemas are invalid', async () => {
		const schemas = [z.string(), z.number()] as const
		const combine = (str: string, num: number) => `${str}:${num}`
		const wrapped = func(schemas, combine)
		const r = await wrapped(
			'data',
			// @ts-expect-error Not a number
			'not a number'
		)
		expect(r.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
	})

	test('works with a custom standard schema', async () => {
		const doubleSchema = {
			'~standard': {
				version: 1 as const,
				vendor: 'test',
				validate: async (input: unknown) => {
					if (typeof input !== 'number') {
						return { issues: [{ message: 'Expected number' }] }
					}
					return { value: input * 2 }
				}
			}
		}

		const wrapped = func(doubleSchema, (doubled: number) => doubled + 1)

		const r1 = await wrapped(5)
		expect(r1.isOk()).toBe(true)
		expect(r1.value).toBe(11)

		const r2 = await wrapped('not a number' as any)
		expect(r2.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
	})
})

describe('Result.func - Exception Handling', () => {
	test('uses handler for thrown sync Error', () => {
		const wrapped = func(
			() => { throw new Error('boom') },
			(e) => ({ code: 'HANDLED_SYNC', message: (e.details as Error).message })
		)
		const r = wrapped()
		expect(r.isErr('HANDLED_SYNC')).toBe(true)
	})

	test('uses handler for thrown async primitive', async () => {
		const wrapped = func(
			async () => { throw 'async oops' },
			(e) => err('HANDLED_ASYNC', String(e.details))
		)
		const r = await wrapped()
		expect(r.isErr('HANDLED_ASYNC')).toBe(true)
	})

	test('does NOT call handler if a Result.Err is thrown', () => {
		let called = false
		const wrapped = func(
			() => { throw err('ALREADY_ERR', 'original') },
			() => { called = true; return err('HANDLED', 'should not happen') }
		)
		const r = wrapped()
		expect(r.isErr('ALREADY_ERR')).toBe(true)
		expect(called).toBe(false)
	})

	test('maps yielded THROWN_ERROR in sync generator via handler', () => {
		const wrapped = func(function* () {
			yield Result.err(Result.ThrownError('gen-crash'))
			return ok('unreached')
		}, (e) => ({ code: 'HANDLED_GEN', message: String(e.details) }))
		const r = wrapped()
		expect(r.isErr('HANDLED_GEN')).toBe(true)
	})

	test('maps yielded THROWN_ERROR in async generator via handler', async () => {
		const wrapped = func(async function* () {
			yield Promise.resolve(Result.err(Result.ThrownError('agen-crash')))
			return ok('unreached')
		}, (e) => err('HANDLED_AGEN', String(e.details)))
		const r = await wrapped()
		expect(r.isErr('HANDLED_AGEN')).toBe(true)
	})

	test('does not invoke handler for validation failures', async () => {
		let called = false
		const stringToNumber = func(
			z.number(),
			(n) => n,
			() => { called = true; return err('HANDLED_VALIDATION', 'no') }
		)
		const r = await stringToNumber('not a number' as any)
		expect(r.isErr('FUNC_VALIDATION_ERROR')).toBe(true)
		expect(called).toBe(false)
	})

	test('schema with handleException', async () => {
		const schema = {
			'~standard': {
				version: 1 as const,
				vendor: 'test',
				validate: async (input: unknown) => ({ value: input })
			}
		}

		const wrapped = func(
			schema,
			(_input: unknown) => { throw new Error('boom') },
			(_e) => ({ code: 'HANDLED' as const, message: 'Handled error' })
		)

		const r = await wrapped('input')
		expect(r.isErr('HANDLED')).toBe(true)
	})
})

describe('Result.func - Class Methods', () => {
	class Example {
		baseValue = 10

		multiply = func((x: number, y: number) => x * y)

		squared = func(function(this: Example, num: number) {
			return `Example says: ${this.multiply(num, num).value}`
		})

		asyncAdd = func(async function(this: Example, n: number) {
			return this.baseValue + n
		})

		genAdd = func(function*(this: Example, n: number) {
			yield
			return this.baseValue + n
		})

		asyncGenAdd = func(async function*(this: Example, n: number) {
			yield
			return this.baseValue + n
		})
	}

	test('preserves this context in sync functions', () => {
		const ex = new Example()
		const r1 = ex.multiply(3, 4)
		expect(r1.isOk()).toBe(true)
		expect(r1.value).toBe(12)

		const r2 = ex.squared(5)
		expect(r2.isOk()).toBe(true)
		expect(r2.value).toBe('Example says: 25')
	})

	test('preserves this context in async functions', async () => {
		const ex = new Example()
		const r = await ex.asyncAdd(5)
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe(15)
	})

	test('preserves this context in generator functions', () => {
		const ex = new Example()
		const r = ex.genAdd(5)
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe(15)
	})

	test('preserves this context in async generator functions', async () => {
		const ex = new Example()
		const r = await ex.asyncGenAdd(5)
		expect(r.isOk()).toBe(true)
		expect(r.value).toBe(15)
	})
})

describe('Result.func - Error Handling Edge Cases', () => {
	test('throws when first arg is non-standard schema and not function', () => {
		const fakeSchema = { notStandard: true }

		expect(() => {
			// @ts-expect-error intentionally passing invalid argument
			func(fakeSchema, () => 'value')
		}).toThrow('Expected StandardSchemaV1 schema(s) as first argument to `Result.func`')
	})

	test('throws when first arg is array of non-standard schemas', () => {
		const fakeSchemas = [{ notStandard: true }, { alsoNotStandard: true }]

		expect(() => {
			// @ts-expect-error intentionally passing invalid argument
			func(fakeSchemas, () => 'value')
		}).toThrow('Expected StandardSchemaV1 schema(s) as first argument to `Result.func`')
	})

	test('throws when schema provided but second arg is not a function', () => {
		const validSchema = {
			'~standard': {
				validate: async (input: unknown) => ({ value: input })
			}
		}

		expect(() => {
			// @ts-expect-error intentionally passing invalid argument
			func(validSchema, 'not a function')
		}).toThrow('Expected a function as the second argument to `Result.func` when schemas are provided')
	})

	test('throws when array of valid schemas provided but second arg is not a function', () => {
		const validSchema1 = {
			'~standard': {
				validate: async (input: unknown) => ({ value: input })
			}
		}
		const validSchema2 = {
			'~standard': {
				validate: async (input: unknown) => ({ value: input })
			}
		}

		expect(() => {
			// @ts-expect-error intentionally passing invalid argument
			func([validSchema1, validSchema2], 'not a function')
		}).toThrow('Expected a function as the second argument to `Result.func` when schemas are provided')
	})

	test('throws when called with completely invalid arguments', () => {
		expect(() => {
			// @ts-expect-error intentionally passing invalid arguments
			func(null, null)
		}).toThrow()
	})
})

describe('[type] Result.func type inference', () => {
	test('validated function with single schema', async () => {
		const simpleValidated = func(z.coerce.date(), (d) => d)
		expectTypeOf(simpleValidated).toEqualTypeOf<(d: unknown) => Promise<
			Result<Date, Result.ValidationError | Result.ThrownError>>
		>()
		const r1 = await simpleValidated('2024-01-01')
		expect(r1.isOk()).toBe(true)
	})

	test('validated function with multiple schemas', async () => {
		const simpleValidateds = func([z.coerce.date(), z.number()], (d, n) => ({ d, n }))
		expectTypeOf(simpleValidateds).toEqualTypeOf<(d: unknown, n: number) => Promise<
			Result<{ d: Date, n: number }, Result.ValidationError | Result.ThrownError>>
		>()
		const r2 = await simpleValidateds('2024-01-01', 42)
		expect(r2.isOk()).toBe(true)
	})

	test('unsafe function returning error', () => {
		const simpleUnsafe = func((value: number) => {
			if (value > 100) {
				return err('UNLUCKY', 'You are unfortunate :C')
			}
			return value
		})
		expectTypeOf(simpleUnsafe).toEqualTypeOf<(value: number) =>
			Result<number, { code: 'UNLUCKY' } | Result.ThrownError>
		>()
		const r3 = simpleUnsafe(100)
		expect(r3.isOk()).toBe(true)
		const r3b = simpleUnsafe(101)
		expect(r3b.isErr('UNLUCKY')).toBe(true)
	})

	test('async unsafe function', async () => {
		const simpleAsyncUnsafe = func(async (value: number) => {
			if (value > 100) {
				return err('UNLUCKY', 'You are unfortunate :C')
			}
			return value
		})
		expectTypeOf(simpleAsyncUnsafe).toEqualTypeOf<(value: number) => Promise<
			Result<number, { code: 'UNLUCKY' } | Result.ThrownError>
		>>()
		const r4 = await simpleAsyncUnsafe(100)
		expect(r4.isOk()).toBe(true)
		const r4b = await simpleAsyncUnsafe(101)
		expect(r4b.isErr('UNLUCKY')).toBe(true)
	})

	test('sync generator function', () => {
		const simpleUnsafe = func((value: number) => {
			if (value > 100) return err('UNLUCKY', 'You are unfortunate :C')
			return value
		})
		const simpleGen = func(function*(v: string) {
			const val = yield* simpleUnsafe(1)
			return v
		})
		expectTypeOf(simpleGen).toEqualTypeOf<(v: string) =>
			Result<string, { code: 'UNLUCKY' } | Result.ThrownError>
		>()
		const r5 = simpleGen('test')
		expect(r5.isOk()).toBe(true)
	})

	test('async generator function', async () => {
		const simpleUnsafe = func((value: number) => {
			if (value > 100) return err('UNLUCKY', 'You are unfortunate :C')
			return value
		})
		const simpleAsyncGen = func(async function*(v: string) {
			const val = yield* simpleUnsafe(1)
			return v
		})
		expectTypeOf(simpleAsyncGen).toEqualTypeOf<(v: string) => Promise<
			Result<string, { code: 'UNLUCKY' } | Result.ThrownError>
		>>()
		const r6 = await simpleAsyncGen('test')
		expect(r6.isOk()).toBe(true)
	})

	test('complex func and result narrowing', async () => {
		const example = func([z.coerce.date(), z.number()], async (date, num) => {
			if (num === 1) return err('BAD', ':(')
			if (num === 2) return err('BAD_TWO', ':(')
			if (num === 3) return err('EXAMPLE_ERR', 'C:') as Result.Err<never, { code: 'EXAMPLE_ERR', message: 'C:' }>
			if (num === 4) return { normal: true }
			return ok({ date })
		})

		const result1 = await example(0, 1)
		expect(result1.isErr('BAD')).toBe(true)
		if (result1.isErr('BAD')) {
			expectTypeOf(result1.code).toBeString()
			expect(result1.code).toBe('BAD')
		}

		const result2 = await example(0, 2)
		expect(result2.isErr('BAD_TWO')).toBe(true)
		if (result2.isErr('BAD_TWO')) {
			expectTypeOf(result2.code).toBeString()
			expect(result2.code).toBe('BAD_TWO')
		}

		const result3 = await example(0, 3)
		expect(result3.isErr('EXAMPLE_ERR')).toBe(true)
		if (result3.isErr('EXAMPLE_ERR')) {
			expectTypeOf(result3.code).toBeString()
			expect(result3.code).toBe('EXAMPLE_ERR')
		}

		const result4 = await example(0, 4)
		expect(result4.isOk()).toBe(true)
		if (result4.isOk()) {
			expectTypeOf(result4.value).toMatchTypeOf<
				| { normal: boolean }
				| { date: Date }
				| { example: boolean }
			>()
			expect(result4.value).toEqual({ normal: true })
		}

		const result5 = await example(0, 0)
		expect(result5.isOk()).toBe(true)
		if (result5.isOk()) {
			expectTypeOf(result5.value).toMatchTypeOf<
				| { normal: boolean }
				| { date: Date }
				| { example: boolean }
			>()
			expect(result5.value).toHaveProperty('date')
		}

		const resultErr = await example('invalid', 0)
		expect(resultErr.isErr()).toBe(true)
		if (resultErr.isErr() && !resultErr.isErr('BAD') && !resultErr.isErr('BAD_TWO') && !resultErr.isErr('EXAMPLE_ERR')) {
			expect(resultErr.code).toBeDefined()
			expect(['FUNC_VALIDATION_ERROR', 'THROWN_ERROR']).toContain(resultErr.code!)
		}
	})
})
