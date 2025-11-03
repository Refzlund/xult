# xult

## 1.0.0

### Major Changes

- feat: func - input validation via [StandardSchemaV1](https://github.com/standard-schema/standard-schema)

- feat: add `result.toJSON()`/`Result.fromJSON()` with stack preservation and typed failures for malformed payloads.

- feat: `Result.func` covers sync/async/generator flows, short-circuits on `Err`, unwraps `Ok`, and lets handlers rewrite `THROWN_ERROR` cases.

- feat: `Result.validate` runs Standard Schema inputs (single or tuple) and returns aggregated `FUNC_VALIDATION_ERROR`s.

- feat: expose typed `ok`/`err`, full error metadata, `isOk`/`isErr` narrowing, and `_unsafeUnwrap` for test-only escapes.

- feat: `Result.async` wraps promises, flattens nested results, and lets handlers remap thrown values into domain errors.

- `xult` 1.0.0 🥳✨
