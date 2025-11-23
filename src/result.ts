import type { StandardSchemaV1 } from '@standard-schema/spec'
import { inspect } from 'util'



type InferInputs<T extends readonly StandardSchemaV1[]> = {
	-readonly [K in keyof T]: StandardSchemaV1.InferInput<T[K] extends StandardSchemaV1 ? T[K] : never>
}

type InferOutputs<T extends readonly StandardSchemaV1[]> = {
	-readonly [K in keyof T]: StandardSchemaV1.InferOutput<T[K] extends StandardSchemaV1 ? T[K] : never>
}

type Assign<TNamesAndShape extends [...any[]], TTypes extends [...any[]]> = {
	[K in keyof TNamesAndShape]: K extends keyof TTypes ? TTypes[K] : TNamesAndShape[K]
} extends infer X ? X extends Array<any> ? X : never : never

type Suggestible<T extends string> = T | (string & { __suggest?: never })

type DistributiveOmit<T, K extends keyof any> = T extends any
  ? Omit<T, K> extends infer X ? { [K in keyof X]: X[K] } : never
  : never

type Fallback<T, TFallback> = [T] extends [never] ? TFallback : T

type IsAny<T> = 0 extends (1 & T) ? true : false

export class Result<TValue, TError extends Result.LooseErrorShape> {
	private constructor() {}

	value?: TValue
	code?: TError['code']
	message?: TError['message']
	details?: TError['details']
	stack?: string

	log() { console.log(this) }

	#log(depth: number = 4) {
		const OK = this instanceof Ok
		const value = OK ? this.value : this.details
		const type = typeof value

		let result = ''

		if(OK) {
			result = '' 
				+ `\x1b[32;1m​🇷​​🇪​​🇸​​🇺​​🇱​​🇹​ 🇴​🇰​\x1b[31;0m  `
				+ `\x1b[37;2m<${type}>\x1b[37;0m`
		}
		else {
			result = ''
				+ `\x1b[31;1m​🇷​​🇪​​🇸​​🇺​​🇱​​🇹​ ​🇪​​🇷​​🇷​​​\x1b[37;0m`
				+ `  \x1b[31;3m${this.code}\x1b[37;0m`
				+ `  ${this.message}`
		}

		let spacing = 0
		let valueResult: undefined | string
		if(type === 'string') {
			spacing = 4
			valueResult = inspect(value, { colors: true, depth })
		}
		else if(type === 'number') {
			spacing = 4
			valueResult = inspect(value, { colors: true, depth })
		}
		else if(type === 'boolean') {
			spacing = 3
			valueResult = inspect(value, { colors: true, depth })
		}
		else if(type === 'symbol') {
			spacing = 4
			valueResult = inspect(value, { colors: true, depth })
		}
		else if(type === 'bigint') {
			spacing = 4
			valueResult = inspect(value, { colors: true, depth })
		}
		else if(value === null) {
			spacing = 4
			valueResult = inspect(value, { colors: true, depth })
		}
		else if(type === 'function') {
			spacing = 2
			valueResult = inspect(value, { colors: true, depth })
		}
		else if(type === 'object') {
			const inspected = inspect(value, {
				colors: true,
				depth,
				maxArrayLength: 10,
				compact: 1,
				numericSeparator: true
			})
			if(value.constructor.name !== 'Object') {
				spacing = 4
				valueResult = `${inspected}`
			}
			else {
				valueResult = ` ${inspected}`
			}
		}

		if(OK && valueResult !== undefined) {
			result += Array(spacing).fill(' ').join('') + valueResult
		}

		if(!OK && valueResult !== undefined) {
			result += `\n    \x1b[30;2mdetails  \x1b[37;2m<${typeof this.details}>\x1b[37;0m`
			result += Array(Math.max(spacing - 2, 1)).fill(' ').join('') + valueResult.replaceAll('\n', '\n    ')
			result += '\n'
		}

		return result
	}

	toString() {
		return JSON.stringify(this.toJSON())
	}

	[Symbol.toStringTag]() {
		if (this instanceof Ok) {
			return `Result.Ok<${typeof this.value}>`
		} else {
			return `Result.Err[${this.code}]` + (this.details !== undefined ? `<${typeof this.details}>` : '')
		}
	}
	[Symbol.for('nodejs.util.inspect.custom')](depth: number = 4) {
		return this.#log(depth)
	}

	static async<
		T,
		TErr extends Result.Err | Result.ErrorShape = never
	>(
		promise: Promise<T>,
		handleError?: (error: Result.Err<never, Result.ThrownError>) => TErr
	):
		IsAny<T> extends true 
			? Promise<Result<unknown, Result.ErrorOf<TErr, Result.ThrownError>>>
			: Promise<Result<
				Fallback<Result.ValueOf<T>, unknown>,
				Result.ErrorOf<T> | Result.ErrorOf<TErr, Result.ThrownError>
			>> 
	{
		return promise.then(v => {
			if(v instanceof Result) return v
			return Result.ok(v)
		})
		.catch(err => {
			const thrown = (err instanceof Err && err.code === 'THROWN_ERROR'
				? err as Result.Err<never, Result.ThrownError>
				: Result.err(Result.ThrownError(err)) as Result.Err<never, Result.ThrownError>
			)
			if(handleError) return handleError(thrown)
			return thrown
		}) as any
	}

	isOk<
		TThis extends Result.Any
	>(this: TThis):
		this is (
			Extract<TThis, Ok<any, never>> extends infer X 
			? [X] extends [never] ? Ok<Result.ValueOf<TThis>, never> : X 
			: never
		)
	
	isOk() {
		return this instanceof Ok
	}

	isErr<
		TThis extends Result.Any,
		TCode extends Suggestible<Result.ErrorCodeOf<TThis>>
	>(
		this: TThis,
		code?: TCode
	):
	// We do type-gymnastics here to ensure `(Err<...> | Err<...> | Ok<...>).isErr(...)` AND `Result<...>` can be narrowed down.
	this is Err<never, (
		Result.ErrorOf<TThis> extends infer TErr 
			? TCode extends undefined 
				? Result.SimplifyError<TErr extends { code: string } ? TErr : never>
				: Result.SimplifyError<Extract<TErr, { code: TCode }>>
			: never
	)>

	isErr(code?: string) {
		if (!(this instanceof Err)) return false
		if (code === undefined) return true
		return this.code === code
	}

	map<TResult extends Result.Any, TNewValue>(this: TResult, fn: (value: TValue) => TNewValue): Result<TNewValue, Result.ErrorOf<TResult>> {
		if (this.isOk()) {
			return Result.ok(fn(this.value!))
		}
		return this as any
	}

	catch<TNewValue>(fn: (error: TError) => TNewValue): Result<TValue | TNewValue, never> {
		if (this.isErr()) {
			return Result.ok(fn(this as any))
		}
		return this as any
	}

	ifOk(fn: (value: TValue) => void): this {
		if (this.isOk()) {
			fn(this.value!)
		}
		return this
	}

	ifErr<TResult extends Result.Any>(this: TResult, fn: (error: Result.Err<never, Result.ErrorOf<TResult>>) => void): this {
		if (this.isErr()) {
			fn(this as any)
		}
		return this as any
	}

	static ok(): Ok<void, never>
	static ok<TValue>(value: TValue): Ok<TValue, never>
	static ok(value?: any): Ok<any, never> {
		const ok = new Ok()
		ok.value = value
		return ok as any
	}

	static err<
		TCode extends string,
		TDetails = undefined
	>(
		code: TCode,
		message: string,
		details?: TDetails,
		stack?: string
	): 
		Err<
			never, 
			Result.SimplifyError<{ code: TCode, message: string, details: TDetails }>
		>
	
	static err<TCode extends string, TError extends Omit<Result.ErrorShape, 'code'> & { code: TCode }>(error: TError): 
		Err<
			never, 
			Result.SimplifyError<TError & { code: TCode }>
		>
	
	static err<
		TCode extends string,
		TDetails = undefined
	>(arg0: string | Result.ErrorShape, arg1?: string, arg2?: unknown, arg3?: string): 
		Err<
			never, 
			TDetails extends undefined 
			? { code: TCode, message: string, } 
			: { code: TCode, message: string, details: TDetails }
		>
	{
		let code: string | undefined, message: string | undefined, details: unknown, stack: string | undefined
		if(arg3) stack = arg3
		if(arg2) details = arg2
		if(arg1) {
			message = arg1
			code = arg0 as string
		} else {
			type T = Result.ErrorShape & { stack?: string }
			code = (<T>arg0).code
			message = (<T>arg0).message
			details = (<T>arg0).details
			stack = (<T>arg0).stack
		}

		const err = new Err()
		err.code = code
		err.message = message
		err.details = details
		err.stack = stack ?? new Error().stack
		return err as any
	}

	// #region validate overloads
	static async validate<const TSchemas extends readonly StandardSchemaV1[]>(
		schemas: TSchemas,
		data: InferInputs<TSchemas>
	): Promise<Result<InferOutputs<TSchemas>, Result.ValidationError>>

	static async validate<const TSchemas extends readonly StandardSchemaV1[]>(
		schemas: TSchemas,
		data: unknown[]
	): Promise<Result<InferOutputs<TSchemas>, Result.ValidationError>>

	static async validate<TSchema extends StandardSchemaV1>(
		schema: TSchema,
		data: StandardSchemaV1.InferInput<TSchema>
	): Promise<Result<StandardSchemaV1.InferOutput<TSchema>, Result.ValidationError>>

	static async validate<TSchema extends StandardSchemaV1>(
		schema: TSchema,
		data: unknown
	): Promise<Result<StandardSchemaV1.InferOutput<TSchema>, Result.ValidationError>>
	// #endregion

	static async validate(schemas: StandardSchemaV1 | StandardSchemaV1[], data: unknown): Promise<unknown> {
		const isArray = Array.isArray(schemas)
		const _schemas = isArray ? schemas : [schemas]
		const _data = (isArray ? data : [data]) as unknown[]

		const validationResults = await Promise.all(
			_schemas.map((schema, index) => schema['~standard'].validate(_data[index]))
		)

		const issues: StandardSchemaV1.Issue[] = []
		const validatedArgs: unknown[] = []

		for (const result of validationResults) {
			if (result.issues?.length) issues.push(...result.issues)
			else validatedArgs.push((<{ value?: unknown }>result).value)
		}
		
		if (issues.length > 0) return Result.err(Result.ValidationError(issues))
		return Result.ok(isArray ? validatedArgs : validatedArgs[0])
	}

	*[Symbol.iterator](): Generator<typeof this, TValue> {
		yield this
		return this.value!
	}

	// #region func overloads

	// * Validated Func Generators
	static func<
		const TSchema extends StandardSchemaV1[] | readonly StandardSchemaV1[],
		const TArgs extends InferOutputs<TSchema>,
		TGen extends Generator<unknown,unknown,unknown> | AsyncGenerator<unknown,unknown,unknown>,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		schema: TSchema,
		fn: (...args: TArgs) => TGen,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): (
		...args: Assign<TArgs, InferInputs<TSchema>>
	) =>
		[TGen] extends [never] ? Promise<Result.Unknown> :
		TGen extends (Generator<infer T, infer Y, any> | AsyncGenerator<infer T, infer Y, any>)
			? Promise<Result<
				Result.ValuableOf<Y>,
				| Result.ErrorOf<T> 
				| Result.ErrorOf<Y>
				| Result.ValidationError
				| Result.ErrorOf<TException, Result.ThrownError>
			>>
			: never
	
	static func<
		const TSchema extends StandardSchemaV1,
		const TArgs extends InferOutputs<[TSchema]>,
		TGen extends Generator<unknown,unknown,unknown> | AsyncGenerator<unknown,unknown,unknown>,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		schema: TSchema,
		fn: (...args: TArgs) => TGen,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): (
		...args: Assign<TArgs, InferInputs<[TSchema]>>
	) => 
		[TGen] extends [never] ? Promise<Result.Unknown> :
		TGen extends (Generator<infer T, infer Y, any> | AsyncGenerator<infer T, infer Y, any>)
			? Promise<Result<
				Result.ValuableOf<Y>, 
				| Result.ErrorOf<T>
				| Result.ErrorOf<Y>
				| Result.ValidationError
				| Result.ErrorOf<TException, Result.ThrownError>
			>
			>
			: never

	// * Validated Func

	static func<
		const TSchema extends StandardSchemaV1[] | readonly StandardSchemaV1[],
		const TArgs extends InferOutputs<TSchema>,
		TOut,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		schema: TSchema,
		fn: (...args: TArgs) => TOut,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): (
		...args: Assign<TArgs, InferInputs<TSchema>>
	) =>
		[TOut] extends [never] ? Promise<Result.Unknown> :
		Promise<Result.FuncOut<Awaited<TOut>> extends infer X ? Result<
			Result.ValueOf<X>,
			| Result.ErrorOf<X>
			| Result.ValidationError
			| Result.ErrorOf<TException, Result.ThrownError>
		> : never>

	static func<
		const TSchema extends StandardSchemaV1,
		const TArgs extends InferOutputs<[TSchema]>,
		TOut,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		schema: TSchema,
		fn: (...args: TArgs) => TOut,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): (
		...args: Assign<TArgs, InferInputs<[TSchema]>>
	) =>
		[TOut] extends [never] ? Promise<Result.Unknown> :
		Promise<Result.FuncOut<Awaited<TOut>> extends infer X ? Result<
			Result.ValueOf<X>, 
			| Result.ErrorOf<X>
			| Result.ValidationError
			| Result.ErrorOf<TException, Result.ThrownError>
		> : never>
	
	// * Unsafe Func Gen

	static func<
		const TArgs extends Array<any>,
		TGen extends Generator<unknown,unknown,unknown>,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		fn: (...args: TArgs) => TGen,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): (
		...args: TArgs
	) =>
		[TGen] extends [never] ? Result.Unknown :
		TGen extends Generator<infer T, infer Y, any> ? Result<
			Result.ValuableOf<Y>,
			| Result.ErrorOf<T>
			| Result.ErrorOf<Y>
			| Result.ErrorOf<TException, Result.ThrownError>
		> : never
	
	static func<
		const TArgs extends Array<any>,
		TGen extends AsyncGenerator<unknown,unknown,unknown>,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		fn: (...args: TArgs) => TGen,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): (
		...args: TArgs
	) =>
		[TGen] extends [never] ? Promise<Result.Unknown> :
		TGen extends AsyncGenerator<infer T, infer Y, any> ? Promise<Result<
			Result.ValuableOf<Y>,
			| Result.ErrorOf<T>
			| Result.ErrorOf<Y>
			| Result.ErrorOf<TException, Result.ThrownError>
		>> : never

	// * Unsafe Func

	static func<
		const TArgs extends Array<any>,
		TOut extends Promise<any>,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		fn: (...args: TArgs) => TOut,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): (
		...args: TArgs
	) => 
		[TOut] extends [never] ? Promise<Result.Unknown> :
		Promise<Result.FuncOut<Awaited<TOut>> extends infer X ? Result<
			Result.ValueOf<X>,
			| Result.ErrorOf<X>
			| Result.ErrorOf<TException, Result.ThrownError>
		> : never>

	static func<
		const TArgs extends Array<any>,
		TOut,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		fn: (...args: TArgs) => TOut,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): (
		...args: TArgs
	) => 
		[TOut] extends [never] ? Result.Unknown :
		Result.FuncOut<TOut> extends infer X ? Result<
			Result.ValueOf<X>,
			| Result.ErrorOf<X>
			| Result.ErrorOf<TException, Result.ThrownError>
		> : never
	
	// #endregion

	static func(arg0: unknown, arg1?: unknown, arg2?: unknown): (...args: any[]) => Result.Any | Promise<Result.Any> {
		let schemas: StandardSchemaV1[] | undefined
		let fn: (...args: any[]) => any
		let handleException: ((error: Result.Err<never, Result.ThrownError>) => Result.Err | Result.ErrorShape) | undefined

		const isStandardSchema = (s: any): s is StandardSchemaV1 => {
			return !!(s && s['~standard'] && typeof s['~standard'].validate === 'function')
		}

		// Argument handling (strict):
		// 1 arg: (fn)
		// 2 args: (fn, handleException) OR (schemas, fn)
		// 3 args: (schemas, fn, handleException)
		if (typeof arg0 === 'function') {
			// (fn) or (fn, handleException)
			fn = arg0 as typeof fn
			if (typeof arg1 === 'function') {
				handleException = arg1 as typeof handleException
			}
		} else {
			// (schemas, fn[, handleException])
			const maybeSchemas = Array.isArray(arg0) ? arg0 : [arg0]
			if (!maybeSchemas.every(isStandardSchema)) {
				throw new Error('Expected StandardSchemaV1 schema(s) as first argument to `Result.func`', {
					cause: { argumentTypes: [typeof arg0, typeof arg1, typeof arg2] }
				})
			}
			schemas = maybeSchemas as StandardSchemaV1[]
			if (typeof arg1 !== 'function') {
				throw new Error('Expected a function as the second argument to `Result.func` when schemas are provided', {
					cause: { argumentTypes: [typeof arg0, typeof arg1, typeof arg2] }
				})
			}
			fn = arg1 as typeof fn
			if (typeof arg2 === 'function') {
				handleException = arg2 as typeof handleException
			}
		}

		if(typeof fn! !== 'function') {
			throw new Error('Expected a function as a parameter to `Result.func`', { cause: {
				argumentTypes: [
					typeof arg0,
					typeof arg1,
					typeof arg2,
				]
			}})
		}

		function handleIteration(iteration: IteratorResult<unknown>) {
			if (iteration.done) {
				return {
					done: true,
					value: iteration.value instanceof Result ? iteration.value : Result.ok(iteration.value),
					nextArg: undefined
				}
			}
			
			const yieldedValue = iteration.value
			if (yieldedValue instanceof Err) {
				if(yieldedValue.code === 'THROWN_ERROR' && handleException) {
					const handled = handleException(yieldedValue as Result.Err<never, Result.ThrownError>)
					return {
						done: true,
						value: handled instanceof Result ? handled : Result.err(handled),
						nextArg: undefined
					}
				}
				return {
					done: true,
					value: yieldedValue,
					nextArg: undefined
				} // Short-circuit
			}

			return {
				done: false,
				value: null,
				nextArg: yieldedValue instanceof Ok ? yieldedValue.value : undefined
			}
		}

		const toThrownError = (error: unknown) => {
			if(error instanceof Err && error.code !== 'THROWN_ERROR') {
				return error
			}
			const err = (
				error instanceof Err 
					? error
					: Result.err(Result.ThrownError(error))
			) as Result.Err<never, Result.ThrownError>
			if(handleException) {
				const handled = handleException(err)
				return handled instanceof Result ? handled : Result.err(handled)
			}
			return err
		}

		// Core logic for executing the function and processing its output.
		// This is also async to handle all cases (promises, async generators).
		const execute = (fnArgs: any[], out?: ReturnType<typeof fn>, isInitialCall = true, thisContext?: any): Result.Any | Promise<Result.Any> => {
			try {
				// only set out if missing AND this is the initial call
				if (isInitialCall) {
					out = fn.call(thisContext, ...fnArgs)
				}
				
				// Await promises that are not generators
				if (out instanceof Promise && typeof (<{ next?: unknown }>out).next !== 'function') {
					return out
						.then(o => execute(fnArgs, o, false, thisContext))
						.catch(toThrownError)
				}

				// Return a `MaybePromise` for Generators
				if (out && typeof out.next === 'function' && (out[Symbol.iterator] || out[Symbol.asyncIterator])) {
					let nextArg: any = undefined
					const iterate = out[Symbol.iterator]
						? () => {
							while (true) {
								try {
									const iteration = handleIteration(out.next(nextArg))
									if(iteration.done) return iteration.value!
									nextArg = iteration.nextArg
								} catch (error) {
									return toThrownError(error)
								}
							}
						} 
						: async () => {
							while (true) {
								try {
									const iteration = handleIteration(await out.next(nextArg))
									if(iteration.done) return iteration.value!
									nextArg = iteration.nextArg
								} catch (error) {
									return toThrownError(error)
								}
							}
						}
					return iterate()
				}

				// Wrap the final result
				return out instanceof Result ? out : Result.ok(out)
			} catch (error) {
				return toThrownError(error)
			}
		}

		if(schemas && schemas.length > 0) {
			return function(this: any, ...args: any[]) {
				return Result.validate(schemas, args).then(res => {
					if(res.isErr()) return res
					return execute(res.value!, undefined, true, this)
				})
			}
		}

		return function(this: any, ...args: any[]) {
			return execute(args, undefined, true, this)
		}
	}

	/** Throws an error if `this.isErr` otherwise, it returns the `result.value` */
	_unsafeUnwrap<TThis extends Result.Any>(this: TThis): Result.ValueOf<TThis> {
		if(this.isErr()) {
			const err = new Error()
			err.stack = this.stack!
			err.message = this.message!
			err.name = this.code!
			err.cause = this.details
			throw err
		}
		return this.value! as any
	}

	// note: does not extend `Result.Any` due to circulary errors with fromJSON
	toJSON<TThis>(this: TThis): (
		| (Result.ValueOf<TThis> extends infer X ? [X] extends [never] ? never : { value: X, ok: true } : never)
		| (Result.ErrorOf<TThis> extends infer X ? [X] extends [never] ? never : X & { ok: false, stack?: string} & (X extends { message: any } ? {} : { message: string }) : never)
	) extends infer X ? [X] extends [never] ? Result.JSONShape : { [K in keyof X]: X[K] } : never
	{
		const self = this as Result.Any
		const obj = { ok: self instanceof Ok } as {
			ok: boolean
			value?: any
			code?: string
			message?: string
			details?: any
			stack?: string
		}

		if(self instanceof Ok) {
			obj.value = self.value
		} else {
			obj.code = self.code
			obj.message = self.message
			obj.details = self.details
			obj.stack = self.stack
		}
		return obj as any
	}
	
	static isJSON(value: unknown): value is Result.JSONShape {
		if(typeof value !== 'object' || value === null) return false
		if(!('ok' in value)) return false
		if(typeof value.ok !== 'boolean') return false
		if(value.ok) return true
		if(!('code' in value)) return false
		if(typeof value.code !== 'string') return false
		if(!('message' in value)) return false
		if(typeof value.message !== 'string') return false
		return true
	}

	static fromJSON<TResult>(result: TResult): 
		TResult extends Promise<infer U> 
			? Promise<Result<Result.JSONShapeToResult<U>, Result.FromJSONError>>
			: Result<Result.JSONShapeToResult<TResult>, Result.FromJSONError> 
	{
		if (result instanceof Promise) {
			return result.then(r => Result.fromJSON(r)) as any
		}

		let parsed: any = result
		if (typeof result === 'string') {
			try {
				parsed = JSON.parse(result)
			} catch (e) {
				return Result.err('JSON_PARSE_ERROR', 'Failed to parse JSON string', { input: result, error: e }) as any
			}
		}

		if(typeof parsed !== 'object' || parsed === null) {
			return Result.err('BAD_TYPE', 'Type is not of expected type', {
				expected: Result.jsonShape,
				got: typeof parsed
			}) as any
		}

		const validResult = (
			typeof parsed === 'object'
			&& parsed
			&& 'ok' in parsed
			&& typeof parsed.ok === 'boolean'
		)

		if(!validResult) {
			return Result.err('NOT_RESULT_JSON', 'The input was not a result JSON', {
				input: parsed,
				expected: Result.jsonShape
			}) as any
		}

		const res = parsed as Result.JSONShape
		// oxlint-disable-next-line no-extra-boolean-cast
		if(res.ok) {
			const ok = Result.ok(res.value)
			return Result.ok(ok) as any
		}
		if(typeof res.code !== 'string' || typeof res.message !== 'string') {
			return Result.err('BAD_ERR_JSON', 'Expected result.code and result.message to be a string', { code: typeof res.code, message: typeof res.message }) as any
		}
		const err = Result.err(res.code, res.message, res.details)
		err.stack = res.stack
		return Result.ok(err) as any
	}

	static tryJSON<TResult>(result: TResult): 
		TResult extends Promise<infer U>
			? Promise<Result.JSONShapeToResult<U> | undefined>
			: Result.JSONShapeToResult<TResult> | undefined
	{
		if(result instanceof Result) {
			return result as any
		}
		if (result instanceof Promise) {
			return result.then(r => Result.tryJSON(r)) as any
		}

		const res = Result.fromJSON(result) as Result.Any
		if (res.isErr()) return undefined as any
		return res.value
	}

	/**
	 * Converts a value or a promise of a value into a Result.
	 * If the value is already a Result, it is returned as-is.
	 *
	 * @example
	 * ```ts
	 * from(123) // Result<number, never>
	 * from(123 as const) // Result<123, never>
	 * from(Promise.resolve(123)) // Promise<Result<number, never>>
	 * from(Result.ok(123)) // Result<number, never>
	 * from(moreResults) // Result<number | string, { code: 'ERROR_CODE' | 'ANOTHER_CODE' }>
	 * from({ ok: true, value: 123 }) // Result<number, never>
	 * from({ ok: false, code: 'SOME_ERROR', message: 'An error occurred' }) // Result<never, { code: 'SOME_ERROR' }>
	 * from(Result.err('SOME_ERROR', 'An error occurred')) // Result<never, { code: 'SOME_ERROR' }>
	 * ```
	*/
	static from<TResult>(result: TResult):
		Result<
			Awaited<TResult> extends { ok: true, value: infer V } ? V : Result.ValueOf<Exclude<Awaited<TResult>, { ok: false, code: string }>>, 
			Result.SimplifyError<Result.ErrorOf<Awaited<TResult>>>
		> extends infer X
		? TResult extends Promise<any>
			? Promise<X>
			: X
		: never
	{
		if(result instanceof Promise) {
			return result.then(r => Result.from(r)) as any
		}
		if(result instanceof Result) {
			return result as any
		}
		if(Result.isJSON(result)) {
			return Result.tryJSON(result) as any
		}
		return Result.ok(result) as any
	}

	/**
	 * Converts a value or a promise of a value into a Result.
	 * If the value is already a Result, it is returned as-is.
	 * 
	 * If an error is thrown during the execution of the function, it is caught and returned as an Err.
	 * 
	 * Unlike `Result.func`, the callback function is run immediately, returning a Result.
	 * 
	 * @example
	 * ```ts
	 * fromSafe(() => 123) // Result<number, Result.ThrownError>
	 * fromSafe(async () => 123) // Promise<Result<number, Result.ThrownError>>
	 * fromSafe(() => { throw new Error('Oops') }) // Result<never, Result.ThrownError>
	 * fromSafe(async () => { throw new Error('Oops') }) // Promise<Result<never, Result.ThrownError>>
	 * fromSafe(() => someFunc()) // Result<string | number, Result.ThrownError | { code: 'SOME_ERROR' | 'ANOTHER_CODE' }>
	 * ```
	*/
	static fromSafe<
		TResult,
		TException extends Result.Err | Result.ErrorShape = never
	>(
		result: () => TResult,
		handleException?: (error: Result.Err<never, Result.ThrownError>) => TException
	): 
		[TResult] extends [never] ? Result<unknown, Result.ErrorOf<TException, Result.ThrownError>> :
		TResult extends Promise<infer U>
			? Promise<Result<
				Result.ValueOf<U>,
				Result.ErrorOf<U> | Result.ErrorOf<TException, Result.ThrownError>
			>>
			: Result<
				Result.ValueOf<TResult>,
				Result.ErrorOf<TResult> | Result.ErrorOf<TException, Result.ThrownError>
			>
	{
		const toThrownError = (error: unknown) => {
			const err = (
				error instanceof Err 
					? error
					: Result.err(Result.ThrownError(error))
			) as Result.Err<never, Result.ThrownError>
			
			if(handleException) {
				const handled = handleException(err)
				return handled instanceof Result ? handled : Result.err(handled)
			}
			return err
		}

		try {
			const r = result()
			if(r instanceof Promise) {
				return r
					.then(value => this.from(value))
					.catch(toThrownError) as any
			}
			return this.from(r) as any
		} catch (error) {
			return toThrownError(error) as any
		}
	}
}

if(typeof window !== 'undefined') {
	const getTypeLabel = (value: unknown) => {
		if(value === null) return 'null'
		if(Array.isArray(value)) return `Array(${value.length})`
		if(value instanceof Map) return `Map(${value.size})`
		if(value instanceof Set) return `Set(${value.size})`
		if(value instanceof Date) return 'Date'
		return typeof value
	}

	const sanitizeString = (value: string) => (
		value
			.replace(/\\/g, '\\\\')
			.replace(/\r/g, '\\r')
			.replace(/\n/g, '\\n')
			.replace(/\t/g, '\\t')
			.replace(/'/g, "\\'")
	)

	const quoteString = (value: string) => `'${sanitizeString(value)}'`

	const formatInlineValue = (value: unknown): any => {
		if(value === undefined) return null
		if(value instanceof Result) {
			return ['span', { style: 'color: #9ca3af; font-style: italic; white-space: pre;' }, '[Result]']
		}
		if(value === null) {
			return ['span', { style: 'color: #f9fafb; font-weight: 700; white-space: pre;' }, 'null']
		}
		if(typeof value === 'string') {
			return ['span', { style: 'color: #22c55e; white-space: pre;' }, quoteString(value)]
		}
		if(typeof value === 'number' || typeof value === 'boolean') {
			return ['span', { style: 'color: #facc15; white-space: pre;' }, String(value)]
		}
		if(typeof value === 'bigint') {
			return ['span', { style: 'color: #facc15; white-space: pre;' }, `${value}n`]
		}
		if(typeof value === 'symbol') {
			return ['span', { style: 'color: #22c55e; white-space: pre;' }, String(value)]
		}
		if(typeof value === 'function') {
			const name = value.name ? `: ${value.name}` : ''
			return ['span', { style: 'color: #06b6d4; white-space: pre;' }, `[Function${name}]`]
		}
		if(value instanceof Date) {
			return ['span', { style: 'color: #22c55e; white-space: pre;' }, value.toISOString()]
		}
		if(Array.isArray(value) || value instanceof Map || value instanceof Set || (value && typeof value === 'object')) {
			return ['object', { object: value }]
		}
		return null
	}

	const appendStyle = (current: string | undefined, addition: string) => current ? `${current} ${addition}` : addition

	const globalWindow = window as any
	globalWindow.devtoolsFormatters = globalWindow.devtoolsFormatters || []
	const formatterFlag = Symbol.for('xult.result.devtoolsFormatter')
	const formatter = {
		header(obj: unknown) {
			if(!(obj instanceof Result)) return null
			const isOk = obj instanceof Ok
			const typeLabel = isOk ? getTypeLabel(obj.value) : getTypeLabel(obj.details)
			if(isOk) {
				const parts: any[] = [
					['span', { style: 'color: #22c55e; font-weight: 700;' }, '​🇷​​🇪​​🇸​​🇺​​🇱​​🇹​ 🇴​🇰​​'],
					['span', { style: 'color: #9ca3af; font-style: italic; margin-left: 8px; margin-right: 12px;' }, `<${typeLabel}>`]
				]
				const inlineValue = formatInlineValue(obj.value)
				if(inlineValue) {
					if(inlineValue[0] !== 'object') {
						const props = inlineValue[1] ?? {}
						inlineValue[1] = props
						props.style = appendStyle(props.style, 'margin-left: 0;')
					}
					parts.push(inlineValue)
				}
				return ['div', { style: 'display: flex; align-items: baseline; gap: 0;' }, ...parts]
			}

			const err = obj as Err
			const headerParts: any[] = [
				['span', { style: 'color: #ef4444; font-weight: 800;' }, '​🇷​​🇪​​🇸​​🇺​​🇱​​🇹​ ​🇪​​🇷​​🇷​​​']
			]
			if(err.code) {
				headerParts.push(['span', { style: 'color: #fca5a5; font-weight: 600; margin-left: 16px;' }, err.code])
			}
			if(err.message) {
				headerParts.push(['span', { style: 'color: #e5e7eb; margin-left: 16px;' }, err.message])
			}
            if(typeLabel !== 'undefined') {
                headerParts.push(['div'])
                headerParts.push(['span', { style: 'color: #9ca3af; opacity: .5; font-style: italic; margin-left: 30px;' }, `details`])
			    headerParts.push(['span', { style: 'color: #9ca3af; font-style: italic; margin-left: 12px; margin-right: 12px;' }, `<${typeLabel}>`])
            }
			const inlineDetails = formatInlineValue(err.details)
			if(inlineDetails) {
				if(inlineDetails[0] !== 'object') {
					const props = inlineDetails[1] ?? {}
					inlineDetails[1] = props
					props.style = appendStyle(props.style, 'margin-left: 0;')
				}
				headerParts.push(inlineDetails)
			}
			return ['div', {}, ...headerParts]
		},
		hasBody(obj: unknown) {
			return obj instanceof Err && typeof obj.stack === 'string' && obj.stack.length > 0
		},
		body(obj: unknown) {
			if(!(obj instanceof Err) || !obj.stack) return null
			return ['div', { style: 'color: #6b7280; white-space: pre-wrap; font-family: monospace; font-size: 12px;' }, obj.stack]
		}
	}

	const devtools = globalWindow.devtoolsFormatters
	const existingFormatter = globalWindow[formatterFlag]
	if(existingFormatter) {
		const index = devtools.indexOf(existingFormatter)
		if(index !== -1) devtools.splice(index, 1, formatter)
		else devtools.push(formatter)
	} else {
		devtools.push(formatter)
	}
	globalWindow[formatterFlag] = formatter
}

class Ok<
	TValue = unknown,
	TError extends Result.LooseErrorShape = never
	// @ts-expect-error Cannot extend class with a private constructor
> extends Result<TValue, TError> {
	ok = true as const
	declare value: TValue
}

class Err<
	TValue = never,
	TError extends Result.LooseErrorShape = Result.LooseErrorShape
	// @ts-expect-error Cannot extend class with a private constructor
> extends Result<TValue, TError> {
	ok = false as const
	declare code: TError['code']
	declare message: NonNullable<TError['message']>
	details = undefined as TError['details']
}

type _Exclude<T, U> = Exclude<T, U>
type _Ok<TValue = unknown, TError extends Result.LooseErrorShape = never> = Ok<TValue, TError>
type _Err<TValue = never, TError extends Result.LooseErrorShape =  Result.LooseErrorShape> = Err<TValue, TError>

export namespace Result {
	export type Any = Result<any, any>
	export type Unknown = Result<unknown, ErrorShape>
	export type Ok<TValue = unknown, TError extends Result.LooseErrorShape = never> = _Ok<TValue, TError>
	export type Err<TValue = never, TError extends Result.LooseErrorShape = Result.LooseErrorShape> = _Err<TValue, TError>
	export type AnyOk = Ok<any, never>
	export type AnyErr = Err<never, any>

	export const jsonShape = '{ ok: boolean, value?: unknown, code?: string, message?: string, details?: unknown, stack?: string }'
	export interface JSONShape {
		ok: boolean
		value?: unknown
		code?: string
		message?: string
		details?: unknown
		stack?: string
	}

	export type JSONShapeToResult<T> =
		Extract<T, JSONShape> extends infer X ? [X] extends [never] ? Result<unknown, ErrorShape> : Result<
			// @ts-expect-error
			Extract<X, { ok: true } | { value: unknown }>['value'],
			Result.AsErrorShape<DistributiveOmit<Extract<X, { ok: false } | { code: string }>, 'ok'>>
		> : never

	export interface ErrorShape {
		code: string
		message: string
		details?: unknown
	}
	export interface LooseErrorShape {
		code: string
		message?: string
		details?: unknown
	}

	/**
	 * The return type of the functions. 
	 * Wraps non-Result returns with `Ok<T, never>`.
	*/
	export type FuncOut<T, TErr extends ErrorShape = never> = 
		Result<
			[T] extends [never] ? unknown : ValuableOf<T>,
			[T] extends [never] ? Result.ErrorShape : ErrorOf<T> | TErr
		>

	export type AsErrorShape<T, TFallback = never> = T extends ErrorShape ? T : TFallback
	export type AsLooseErrorShape<T, TFallback = never> = T extends LooseErrorShape ? T : TFallback

	/**
	 * An error always has a `message`,
	 * so if the type does not include a literal message string,
	 * it will be omitted from the resulting type.
	 * 
	 * Details will only be included if the `details` key exists
	 * and is not `undefined`.
	*/
	export type SimplifyError<TErr extends ErrorShape | LooseErrorShape> = [TErr] extends [never] ? never : ({
		code: TErr['code']
	} & (
		// Include message only if it's a specific string literal (not the general 'string' type)
		TErr['message'] extends string
			? string extends TErr['message']
				? {}
				: { message: TErr['message'] }
			: {}
	) & (
		// Include details if the 'details' key exists and its type is not 'undefined'
		'details' extends keyof TErr
			? TErr['details'] extends undefined
				? {}
				: Pick<TErr, 'details'>
			: {}
	)) extends infer X
		? { [K in keyof X]: X[K] } extends infer Y
			? Y extends LooseErrorShape
				? Y
				: never
			: never
		: never

	/** Extract the TErr of any Result type (or LooseErrorShape) */
	export type ErrorOf<
		/** Result | Err | LooseErrorShape */
		T,
		TFallback = never
	> = [T] extends [never] ? TFallback : (
		| (_Exclude<T, Err<never, any> | Ok<any, never>> extends infer Y ? [Y] extends [never] ? never : Y extends Result<any, infer E> ? E : never : never)
		| (Extract<T, Err<never, any>> extends infer Y ? [Y] extends [never] ? never : Y extends Err<never, infer E> ? E : never : never)
		| (Exclude<T> extends infer Y ? [Y] extends [never] ? never : Y extends LooseErrorShape ? Y : never : never)
	) extends infer X ? [X] extends [never] ? TFallback : X extends LooseErrorShape ? X : TFallback : TFallback

	export type ErrorOnly<T, TFallback = never> = Err<never, AsLooseErrorShape<ErrorOf<T, TFallback>>>

	/**
	 * Extract the TValue of any Result type (or returns the non-Result type)
	 * @example Result.ValueOf<Result<1, never>> => 1
	 * @example Result.ValueOf<Result.Ok<2, never> | 3> => 2 | 3
	*/
	export type ValueOf<T, TFallback = never> = (
		| (_Exclude<T, Err<never, any> | Ok<any, never>> extends infer Y ? [Y] extends [never] ? never : Y extends Result<infer O, any> ? O : never : never)
		| (Extract<T, Ok<any, never>> extends infer Y ? [Y] extends [never] ? never : Y extends Ok<infer O, never> ? O : never : never)
		| (Exclude<T> extends infer Y ? [Y] extends [never] ? never : Y : never)
	) extends infer X ? [X] extends [never] ? TFallback : X : TFallback

	/**
	 * Extract the TValue of any Result-type, and if `never` — will try return any non-result type
	 * @example Result.ValuableOf<Ok<1> | 2> => 1 | 2
	*/
	export type ValuableOf<T, TFallback = never> = (
		| ValueOf<T, never> 
		| (Exclude<T> extends infer X ? [X] extends [never] ? never : X : never)
	) extends infer X ? [X] extends [never] ? TFallback : X : TFallback
		

	/** Exclude any result-type */
	export type Exclude<T> = _Exclude<T, Result<any, any> | Ok<any, never> | Err<never, any>>

	export type ErrorCodeOf<T> =
  		Result.ErrorOf<T> extends { code: infer C } ? (C extends string ? C : string) : string

	export const ValidationError = (issues: StandardSchemaV1.Issue[]) => ({
		code: 'FUNC_VALIDATION_ERROR' as const,
		message: 'Input to function failed validation.',
		details: { issues }
	})

	export interface ValidationError {
		code: 'FUNC_VALIDATION_ERROR'
		message: 'Input to function failed validation.'
		details: { issues: unknown[] }
	}

	export const ThrownError = <T>(details?: T) => ({
		code: 'THROWN_ERROR' as const,
		message: 'An error was thrown, but not handled',
		details: details
	})

	export interface ThrownError {
		code: 'THROWN_ERROR'
		message: string
		details: unknown
	}

	export interface BadType<TExpected extends string = string, TGot extends string = string> {
		code: 'BAD_TYPE'
		message: 'Type is not of expected type'
		details: {
			expected: TExpected
			got: TGot
		}
	}

	export type FromJSONError = 
		| { code: 'NOT_RESULT_JSON', message: string, details: { input: unknown, expected: string } }
		| { code: 'BAD_ERR_JSON', message: string, details: { code: string, message: string } }
		| { code: 'JSON_PARSE_ERROR', message: string, details: { input: string, error: unknown } }
		| Result.BadType<string>
}