
<div align='center'>
    <img src='./XULT.png' width=500 alt='XULT logo' />
    <br>
    <a href='https://www.npmjs.com/package/xult'><img src='https://img.shields.io/npm/v/xult.svg' /></a>
    <a href='https://github.com/your-repo/xult/actions/workflows/ci.yml'><img src='https://github.com/refzlund/xult/actions/workflows/ci.yml/badge.svg' /></a>
</div>


$${\color{lightblue}To \space be \space reliable, \newline you \space need \space to \space fail \space deliberately, \newline and \space handle \space it \space intentionally. }$$


You do that with a **robust**, **type-safe**, and expressive Result-type for TypeScript, inspired by Rust's `Result` enum. `xult` provides a simple and powerful way to handle operations that can either succeed (`Ok`) or fail (`Err`), without resorting to throwing exceptions.

<br><br>

## Why xult?

In many programming languages, errors are handled using exceptions. While exceptions can be useful, they can also make code harder to reason about, especially in asynchronous contexts. `xult` offers a different approach: representing the result of an operation as a value, which can be either a success (`Ok`) or a failure (`Err`).

This makes error handling explicit, predictable, and type-safe.

<br>

## Features

- ✅  **Type-Safe**  —  Leverage TypeScript's type system to ensure you handle both success and error cases.
- ⏳  **Async Ready**  —  First-class support for promises and async functions.
- 🌯  **Function Wrapping**  —  Easily wrap existing functions to return `Result` types.
- 👍  **Validation**  —  Built-in support for input validation using any library that implements the [`@standard-schema/spec`](https://github.com/standard-schema/standard-schema).
- ❤️  **Expressive API**  —  A clean and intuitive API that is a joy to use.
- 🌤️  **Lightweight**  —  `xult` is a tiny library with zero runtime dependencies.

<br>

## Core Concepts

The core of `xult` is the `Result<TValue, TError>` type, which can be one of two things:

- `Ok<TValue, never>`  
  Represents a successful result, containing a value of type `TValue`.
  <br><br>
- `Err<never, TError>`  
  Represents an error, containing an error of type `TError` which extends the error-shape of  
  ```ts
  Result.ErrorShape = { code: string, message: string, details?: unknown }
  ```

<br>

`xult` differs itself from other similar libraries via an intuitive API, types that can be narrowed, simplified and expressed elegantly.  
Please see how in [Quickstart](#quickstart)!

<br>
<br>


## Quickstart

<div align='center'>
    <code lang='bash'>bun add xult</code>
    <span>  </span>
    <code lang='bash'>pnpm add xult</code>
    <span>  </span>
    <code lang='bash'>npm add xult</code>
</div>

<br>

> [!TIP] Type-narrowing errors
> When we handle errors, narrowing becomes crucial to providing the best UX/DX feedback:
> 
> ```ts
> const result: Result<never, { code: 'INVALID'; details: { issue: unknown } } | { code: 'UNKNOWN' }>
> 
> if (result.isErr('INVALID')) {
>     // ^? Err<never, { code: 'INVALID'; details: { issue: unknown } }>
>     console.log(result.details.issue)
> }
> ```

<br>

> [!TIP] The Power of Generators
> Say goodbye to nested `if` statements and embrace clean, linear logic. `xult` brings the power of do-notation to TypeScript through generator functions.
>
> ```ts
> import { func, err, ok } from 'xult'
>
> const isEven = func((num: number) => {
>     if (num === 0) {
>         return err('ZERO', 'Zero is neither even nor odd.')
>     }
>     return ok(num % 2 === 0)
> })
> //    ^? Result<boolean, { code: 'ZERO' }>
>
> const processNumber = func(function*(num: number) {
>     // Yield a result. If it's an Err, the function returns it immediately.
>     // If it's an Ok, the value is unwrapped and assigned.
>     const isNumEven = yield* isEven(num)
>     //    ^? boolean
>
>     if (isNumEven) {
>         return `The number ${num} is even.`
>     }
>
>     return `The number ${num} is odd.`
> })
> //    ^? Result<string, { code: 'ZERO' }>
> ```
> When you `yield*` a `Result`, `xult` handles the boilerplate: it unwraps the success value or short-circuits the execution with the error. This makes complex, multi-step operations a joy to write.
>
> You can even combine it with validation:
>
> ```ts
> import { s } from '@standard-schema/spec'
>
> const validatedProcess = func(s.number(), function*(num) {
>     const isNumEven = yield* isEven(num)
>     //    ^? boolean
>
>     if (isNumEven) {
>         return `The number ${num} is even.`
>     }
>
>     return `The number ${num} is odd.`
> })
> //    ^? Result<string, { code: 'ZERO' } | Result.ValidationError>
> ```


<br>

## Basic Usage

Depending on your <img src='./personality.gif' alt='personality' height=25 align='middle'>, you can import <code>xult</code> by:

```ts
import Result from 'xult'

Result.ok(...)
Result.err(...)
Result.validate(...)
Result.func(...)
Result.async(...)
```

or <small align='middle'>(my preference)</small>

```ts
import { ok, err, validate, func, async } from 'xult'
import type { Result } from 'xult'
```

<br>

### Creating Results

You can create `Ok` and `Err` results using the static methods on `Result`:

```typescript
import { err, ok } from 'xult'

function divide(a: number, b: number) {
    if (b === 0) {
        return err('DIVISION_BY_ZERO', 'Cannot divide by zero')
    }
    return ok(a / b)
}
```

<br>

### Checking Results

Use the `isOk()` and `isErr()` methods to check the type of a result. These methods act as type guards, allowing TypeScript to narrow the type of the result.

```typescript
const result = divide(10, 2)

if (result.isOk()) {
    // result is of type Ok<number, never>
    console.log(`Result: ${result.value}`) // Output: Result: 5
}

const errorResult = divide(10, 0)

if (errorResult.isErr()) {
    // errorResult is of type Err<never, { code: 'DIVISION_BY_ZERO' }>
    console.error(`Error: ${errorResult.message}`) // Output: Error: Cannot divide by zero
}
```

You can also check for specific error codes with `isErr()`:

```typescript
if (errorResult.isErr('DIVISION_BY_ZERO')) {
    // This block will run
}
```

<br>

## Working with Promises

`Result.async` makes it easy to work with promises. It wraps a promise and returns a `Promise<Result<...>>`. If the promise resolves, it returns an `Ok` with the resolved value. If the promise rejects, it returns an `Err`.

```typescript
import { async, err } from 'xult'
import type { Result } from 'xult'

interface UserDTO {
    id: number
    name: string
}

async function fetchUser(id: number): Promise<Result<UserDTO, { code: 'FETCH_ERROR' }>> {
    const request = fetch(`https://api.example.com/users/${id}`).then(res => res.json() as Promise<UserDTO>)

    return async(
        request,
        thrown => err('FETCH_ERROR', 'Could not retrieve user data.', thrown.details)
    )
}

const userResult = await fetchUser(1)

if (userResult.isOk()) {
    console.log(userResult.value.name)
} else {
    console.error(userResult.message)
}
```

<br>

## Wrapping Functions with `Result.func`

`Result.func` is a powerful utility for wrapping existing functions to return `Result` types. It can automatically handle errors, promises, and even input validation.

<br>

### Simple Function

```typescript
import { func, err } from 'xult'

const safeParse = func(
    JSON.parse,
    // optional: handle Result.ThrownError
    error => err('INVALID_JSON_STRING', 'Malformatted JSON string', error.details)
)

const result = safeParse('{"name": "John"}') // Result<any, { code: 'INVALID_JSON_STRING', details: unknown }>

if (result.isOk()) {
    console.log(result.value.name) // Output: John
}

const errorResult = safeParse('not json')

if (errorResult.isErr()) {
    console.error(errorResult.message) // Malformatted JSON string
}
```

<br>

### Function with Validation

`Result.func` can also validate the arguments of a function using `@standard-schema/spec`.

```typescript
import { func } from 'xult'
import v from 'validation-library'

const createUser = func(
    [v.string().min(3), v.number().min(18)],
    (name: string, age: number) => {
        // This code only runs if validation passes
        return { name, age }
    }
)

const userResult = await createUser('John', 30)

if (userResult.isOk()) {
    console.log(userResult.value) // Output: { name: 'John', age: 30 }
}

const validationErrorResult = await createUser('Jo', 17)

if (validationErrorResult.isErr('FUNC_VALIDATION_ERROR')) {
    console.error(validationErrorResult.details.issues)
}
```

> [!NOTE] Standard Schema
> [`@standard-schema/spec`](https://github.com/standard-schema/standard-schema) is a shared interface designed by the authors of Zod, Valibot, and ArkType. Any schema library that implements it can plug into `xult.func` with zero adapters.

<br>

### Elegant Workflows with Generators

This is where `xult` shines. Generator functions let you write sequential, business-friendly logic without the `if (result.isErr())` pyramid.

```ts
// Without generators – lots of branching
const processOrder = (input: OrderInput) => {
    const validated = validateOrder(input)
    if (validated.isErr()) return validated

    const payment = chargeCustomer(validated.value)
    if (payment.isErr()) return payment

    return createOrderRecord(validated.value, payment.value)
}
```

```ts
// With generators – linear, expressive, type-safe
import { func } from 'xult'

const processOrder = func(function*(input: OrderInput) {
    const payload = yield* validateOrder(input)
    const receipt = yield* chargeCustomer(payload)
    const order = yield* createOrderRecord(payload, receipt)

    return order
})
//    ^? Result<Order, ErrorOf<validateOrder> | ErrorOf<chargeCustomer> | ErrorOf<createOrderRecord>>
```

Each `yield*` unwraps an `Ok` value or exits early with the originating `Err`, preserving the original error shape and stack trace.

<br><br>

## Unwrapping Results

The safest strategy is to keep values wrapped until you're ready to handle the error. Either branch explicitly or lean on `yield*` inside a generator.

```ts
import { err, ok } from 'xult'

const divide = (a: number, b: number) => (b === 0 ? err('DIVISION_BY_ZERO', 'Cannot divide by zero') : ok(a / b))

const result = divide(10, 2)
if (result.isErr()) {
    return result // short-circuit with the original error
}

// result is Ok here
const value = result.value
```

When you truly know a result is `Ok` (for example inside tests), `_unsafeUnwrap()` is available. It rethrows the error with the original metadata if the result is an `Err`.

```ts
import { ok, err } from 'xult'

const okResult = ok(42)
const value = okResult._unsafeUnwrap() // value is 42

const fatal = err('ERROR', 'Something went wrong')
try {
    fatal._unsafeUnwrap()
} catch (error) {
    if (error instanceof Error) {
        console.error(error.message)
    }
}
```

Prefer the safe pattern whenever possible—`Result` makes it ergonomic to avoid exceptions altogether.

<br>
<br>

## API Overview

**Static helpers**
- `Result.ok(value)` – wrap any value in an `Ok`
- `Result.err(code, message, details?)` – build structured errors consistently
- `Result.async(promise, handleError?)` – convert promises into `Result`
- `Result.func([schemas?], fn, handleError?)` – wrap sync, async, or generator functions (with optional validation)
- `Result.validate(schema | schemas, input)` – validate inputs using any [`@standard-schema/spec`](https://github.com/standard-schema/standard-schema) implementation
- `Result.fromJSON(json)` – restore a result from its serialised shape

**Instance helpers**
- `result.isOk()` / `result.isErr(code?)` – type-guarding checks with optional error-code narrowing
- `result._unsafeUnwrap()` – throw if `Err`, otherwise return the inner value
- `result.toJSON()` – serialise a result for transport or storage

**Utilities & types**
- `Result.ValidationError(issues)` – standardised validation failure shape
- `Result.ThrownError(details)` – wraps unknown thrown errors
- Type exports: `Result.Ok`, `Result.Err`, `Result.Any`, `Result.ValueOf<T>`, `Result.ErrorOf<T>` for advanced typing needs