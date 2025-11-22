# Serialization Strategies

<br>
<br>

## SvelteKit
Some frontend serving frameworks like SvelteKit provides a [Transport Hook](https://svelte.dev/docs/kit/hooks#Universal-hooks-transport) (or similar) to serialize and deserialize class instances over the network.

This provides an effective way of communicating 

```ts
// src/hooks.ts
import type { Transport } from '@sveltejs/kit'
import Result from 'xult'

export const transport: Transport = {
	Result: {
		encode: (value) => value instanceof Result && Result.toJSON(),
		decode: (json) => Result.maybe(json)!
	}
}
```

<br>
<br>

## Cloudflare Durable Objects (RPC)

In the Cloudflare RPC world `toJSON` is not called during serialization (i.e. structured clone).
Instead it will throw `[wrangler:error] DataCloneError: Could not serialize object of type "Result". This type does not support serialization.`.

Therefore we have `Result.func.rpc` (Remote Procedure Call) which returns results as a serialized JSON object, and `Result.maybe` which
rehydrates results passing `Result.isJSON` or converts non-result values into a `Result.ok`.

(P.S. `Result.maybe(() => ...)` as a function can also catch exceptions, providing a `Result.err`).

`Result.maybe` is like `Result.tryJSON` but gurantees a `Result`.

<br>

### RPC functions

```typescript
import Result, { func, maybe } from 'xult'

export class MyDO extends DurableObject {
    // This returns a Result object
    sayHello = func.rpc(async (name: string) => {
        if (!name) return Result.err('NAME_REQUIRED', 'Name argument is required to pass into the function.')
        return `Hello, ${name}!`
    })

    processHello = func.rpc(async (this: MyDO, name: string) => {
        // extract `Result.ok` like normal
        const helloString = yield* this.sayHello('Shiba')
        
        // or convert to Result and ex. handle the error
        const result = maybe(this.sayHello('Shiba'))
            .mapErr(() => Result.err('UNHELLOABLE', 'Could not say hello'))

        ...
    })
}
```

<br>

### Stub Wrapper

You can wrap the Durable Object stub in a Proxy that automatically rehydrates the `Result` objects using `Result.tryJSON`.

```typescript
import Result from 'xult' // Adjust import path

export function wrapStub<T extends DurableObject>(stub: DurableObjectStub<T>): DurableObjectStub<T> {
    return new Proxy(stub, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver)
            // Wrap methods
            if (typeof value === 'function') {
                return async (...args: any[]) => {
                    // Call the original method
                    const result = await value.apply(target, args)
                    // Rehydrate the result
                    return Result.isJSON(result) ? Result.tryJSON(result) : result
                }
            }

            return value
        }
    })
}
```

<br>

### Usage

```typescript
const stub = wrapStub(env.MY_DO.get(id))

const result = await stub.sayHello("World")
// Now result is a real Result instance!
if (result.isOk()) {
    console.log(result.value)
}
```

