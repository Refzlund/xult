# xult

## 1.3.0

### Minor Changes

- feat: added `funcJSON` which returns `Result.JSON` instead of a `Result` (for environments such as Cloudflare Workers) See [this Workers SDK issue #11388](https://github.com/cloudflare/workers-sdk/issues/11388) ([#14](https://github.com/Refzlund/xult/pull/14))

- feat: added `Result.from(...)` which converts `Result.JSON` -> `Result` or non-results to a Result.Ok ([#14](https://github.com/Refzlund/xult/pull/14))

### Patch Changes

- fix: preserve `this` context for `func` functions ([#12](https://github.com/Refzlund/xult/pull/12))

## 1.2.0

### Minor Changes

- feat: add `result.ifOk(...)` method to execute a function only if the result is Ok. ([#10](https://github.com/Refzlund/xult/pull/10))

- feat: update `result.toString()` to return a JSON string representation of the result. ([#10](https://github.com/Refzlund/xult/pull/10))

- feat: add `result.ifErr(...)` method to execute a function only if the result is Err. ([#10](https://github.com/Refzlund/xult/pull/10))

- feat: add `Result.tryJSON(...)` static method to attempt parsing a JSON value into a Result, returning `undefined` on failure instead of a nested Result. ([#10](https://github.com/Refzlund/xult/pull/10))

- feat: add `result.map(...)` method to transform the value of an Ok result. ([#10](https://github.com/Refzlund/xult/pull/10))

- feat: add `result.catch(...)` method to handle errors and recover with a new value. ([#10](https://github.com/Refzlund/xult/pull/10))

- feat: add `Result.isJSON(...)` static method to check if a value matches the JSON shape of a Result. ([#10](https://github.com/Refzlund/xult/pull/10))

- feat: update `Result.fromJSON(...)` to accept strings, objects, and promises resolving to them. ([#10](https://github.com/Refzlund/xult/pull/10))

## 1.1.1

### Patch Changes

- fix: `func(async)` infinite recursion in function execution ([#8](https://github.com/Refzlund/xult/pull/8))

## 1.1.0

### Minor Changes

- feat: pretty print Result in the terminal and browser console ([#5](https://github.com/Refzlund/xult/pull/5))

### Patch Changes

- chore: README.md formatting ([#3](https://github.com/Refzlund/xult/pull/3))

## 1.0.0

### Major Changes

- feat: func - input validation via [StandardSchemaV1](https://github.com/standard-schema/standard-schema)

- feat: add `result.toJSON()`/`Result.fromJSON()` with stack preservation and typed failures for malformed payloads.

- feat: `Result.func` covers sync/async/generator flows, short-circuits on `Err`, unwraps `Ok`, and lets handlers rewrite `THROWN_ERROR` cases.

- feat: `Result.validate` runs Standard Schema inputs (single or tuple) and returns aggregated `FUNC_VALIDATION_ERROR`s.

- feat: expose typed `ok`/`err`, full error metadata, `isOk`/`isErr` narrowing, and `_unsafeUnwrap` for test-only escapes.

- feat: `Result.async` wraps promises, flattens nested results, and lets handlers remap thrown values into domain errors.

- `xult` 1.0.0 🥳✨
