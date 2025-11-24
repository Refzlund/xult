import { Result } from './result'

/**
 * Wraps a function to automatically handle Results and exceptions.
 * 
 * Supports regular functions, generators, and optional schema validation.
 * When using generators, `yield*` a Result to early-return on errors.
 * 
 * @see {@link Result.func} for full documentation
 * 
 * @example
 * ```ts
 * const getUser = func((id: string) => {
 *   const user = db.find(id)
 *   if (!user) return err('NOT_FOUND', 'User not found')
 *   return user
 * })
 * 
 * // With generators
 * const createOrder = func(function*(userId: string) {
 *   const user = yield* getUser(userId)
 *   return { user }
 * })
 * ```
 */
const func: typeof Result.func = Result.func.bind(Result)

/**
 * Same as `func`, but returns a JSON-serializable result.
 * Useful for API endpoints that need to serialize responses.
 * 
 * @see {@link Result.funcJSON} for full documentation
 * 
 * @example
 * ```ts
 * const handler = funcJSON(async (req) => {
 *   const user = yield* getUser(req.params.id)
 *   return user
 * })
 * // Returns: { ok: true, value: {...} } or { ok: false, code: '...', message: '...' }
 * ```
 */
const funcJSON: typeof Result.funcJSON = Result.funcJSON.bind(Result)

/**
 * Converts a value or Promise into a Result.
 * If the value is already a Result, it is returned as-is.
 * Also handles Result.JSON shapes.
 * 
 * @see {@link Result.from} for full documentation
 * 
 * @example
 * ```ts
 * from(123) // Result<number, never>
 * from(Promise.resolve(123)) // Promise<Result<number, never>>
 * from(Result.ok(123)) // Result<number, never>
 * from({ ok: true, value: 123 }) // Result<number, never>
 * ```
 */
const from: typeof Result.from = Result.from.bind(Result)

/**
 * Creates a successful Result containing the given value.
 * 
 * @example
 * ```ts
 * ok(42) // Result<number, never>
 * ok({ name: 'Alice' }) // Result<{ name: string }, never>
 * ok() // Result<void, never>
 * ```
 */
const ok = Result.ok.bind(Result)

/**
 * Creates a failed Result with the given error information.
 * 
 * @prefer `err(code, message, details)` over `err({...})`
 * 
 * @example
 * ```ts
 * err('NOT_FOUND', 'User not found')
 * err('VALIDATION_ERROR', 'Invalid email', { field: 'email' })
 * err({ code: 'CUSTOM_ERROR', message: 'Something went wrong' })
 * ```
 */
const err = Result.err.bind(Result)

/**
 * Wraps a Promise and converts it to a Promise<Result>.
 * Catches any thrown errors and converts them to Result.Err with THROWN_ERROR code.
 * 
 * @see {@link Result.async} for full documentation
 * 
 * @example
 * ```ts
 * const result = await async(fetch('/api/user'))
 * if (result.isErr()) {
 *   console.error('Request failed:', result.message)
 * }
 * ```
 */
const async = Result.async.bind(Result)

/**
 * Validates data against one or more StandardSchema validators.
 * Supports any schema library implementing the Standard Schema spec.
 * 
 * @see {@link Result.validate} for full documentation
 * 
 * @example
 * ```ts
 * import { z } from 'zod'
 * 
 * const result = await validate(z.string().email(), userInput)
 * const results = await validate(
 *   [z.string().email(), z.number().min(0)],
 *   [email, age]
 * )
 * ```
 */
const validate = Result.validate.bind(Result)

export default Result
export {
	func,
	funcJSON,
	ok,
	err,
	async,
	validate,
	from
}