import { Result } from './result'

const func: typeof Result.func = Result.func.bind(Result)
const ok = Result.ok.bind(Result)
/**
 * Create a Result.Err
 * @prefer `err(code, message, details)` over `err({...})`
*/
const err = Result.err.bind(Result)
const async = Result.async.bind(Result)
const validate = Result.validate.bind(Result)

export default Result
export { func, ok, err, async, validate }