// Testing file: ignore

/* oxlint-disable no-unused-expressions, require-yield, no-unused-vars */
import { describe, test, expect } from 'bun:test'
import Result, { func, err, ok, async, validate } from 'xult'
import z from 'zod'


const validated = validate(z.object({
	test: z.string()
}), {
	test: 'value'
})

const valid = validate(z.number(), 5)


const simpleValidated = func(z.coerce.date(), (d) => {
	return d
})

const simpleValidateds = func([z.coerce.date(), z.number()], (d, n) => {
	return {d,n}
})

const simpleUnsafe = func((value: number) => {
	if(Math.random() > 0.5) {
		return err('UNLUCKY', 'You are unfortunate :C')
	}
	return value
})

const simpleAsyncUnsafe = func(async (value: number) => {
	if(Math.random() > 0.5) {
		return err('UNLUCKY', 'You are unfortunate :C')
	}
	return value
})

const simpleGen = func(function*(v: string) {
	const val = yield* simpleUnsafe(1)
	return v
})

const simpleAsyncGen = func(async function*(v: string) {
	yield* simpleUnsafe(1)
	return v
})




// #region example

const example = func([z.coerce.date(), z.number()], async (date, _num) => {
	if(Math.random() > 0.5) {
		return err('BAD', ':(')
	}
	if(Math.random() > 0.5) {
		return err('BAD_TWO', ':(')
	}
	if(Math.random() > 0.5) {
		return {} as Result<{ example: boolean }, { code: 'EXAMPLE_ERR', message: 'C:' }>
	}
	if(Math.random() > 0.5) {
		return {
			normal: true
		}
	}
	return ok({ date })
})

const result = await example(0, 0)
const json = result.toJSON()
const res = Result.fromJSON(json)
if(res.isErr('BAD_TYPE')) {
	res
}
const resUnwrapped = res._unsafeUnwrap()

const res2 = Result.fromJSON({})
const res2Unwrapped = res2._unsafeUnwrap()

if(result.isErr()) {
	result
}

if(result.isOk()) {
	result
	const json = result.toJSON()
}

if(result.isErr('BAD') || result.isErr('BAD_TWO') || result.isErr('EXAMPLE_ERR')) {
	result
	if(result.isErr('BAD')) {
		result
	}
}

// #endregion


// #region example2

const example2 = () => {
	if(Math.random() > 0.5) {
		return Result.err('BAD', ':(')
	}
	if(Math.random() > 0.5) {
		return Result.err('BAD_TWO', ':(')
	}
	if(Math.random() > 0.5) {
		return {} as Result<{ example: boolean }, { code: 'EXAMPLE_ERR', message: 'C:' }>
	}
	return Result.ok({ date: new Date() })
}

const result2 = example2()
//   ^? const result2: Err<never, { code: "BAD", message: string, details: unknown, }> | Err<never, { code: "BAD_TWO", message: string, details: unknown, }> | Ok<{ date: Date, }, never>

if(result2.isErr('EXAMPLE_ERR')) {
	result2
}

if(result2.isErr('BAD')) {
	result2
	//   ^? const result2: Err<never, never>
}

// #endregion


// #region exmaple3

const example3Validate = func([z.coerce.date(), z.number()], async function(date, _num) {
	if(Math.random() > 0.5) {
		return err('BAD', ':(')
	}
	if(Math.random() > 0.5) {
		return 'Decent? :I'
	}
	return 'Good c:'
})


const example3 = func([z.coerce.date(), z.number()], async function*(date, num) {
	
	const result = yield* await example3Validate(date, num)

	if(Math.random() > 0.5) {
		return err('EX3_BAD', ':(')
	}

	return ok({ date, result })
})

const resulted = await example3(1,1)

if(resulted.isOk()) {
	resulted
}

// #endregion



async function throwable() {
	if(Math.random() > 0.5) {
		throw new Error('err')
	}
	return true
}

const r = Result.async(throwable())
const r2 = Result.async(throwable(), error => err('FAILED', ':C'))
const r3 = Result.async(throwable(), error => ({ code: 'FAILED', message: ':C' }))

async function throwable2() {
	if(Math.random() > 0.5) {
		return err('NAH', 'Ya')
	}
	return ok('yay' as const)
}

const r4 = Result.async(throwable2())
const r5 = Result.async(throwable2(), error => err('FAILED', ':C'))