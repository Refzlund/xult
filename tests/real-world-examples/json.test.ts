import { describe, expect, test } from 'bun:test'
import Result, { err, ok } from 'xult'

const expectOk = <T, E extends Result.LooseErrorShape>(result: Result<T, E>) => {
	expect(result.isOk()).toBe(true)
	return result.isOk() ? result.value : undefined
}

const expectErr = <C extends string>(result: Result.Any, code: C) => {
	expect(result.isErr(code)).toBe(true)
	return result.isErr(code) ? result : undefined
}

describe('Real World: Transport Layer', () => {
	test('round-trips a success result through a message bus payload', () => {
		const original = ok({ jobId: '42', status: 'COMPLETE' })
		const wirePayload = JSON.stringify(original.toJSON())

		const outer = expectOk(Result.fromJSON(JSON.parse(wirePayload)))
		const inner = outer ? expectOk(outer) : undefined

		if (inner) {
			expect(inner.jobId).toBe('42')
			expect(inner.status).toBe('COMPLETE')
		}
	})

	test('round-trips a domain error to downstream services', () => {
		const failure = err('RETRYABLE', 'Search index unavailable', { attempt: 3 })
		const encoded = JSON.stringify(failure.toJSON())

		const outer = expectOk(Result.fromJSON(JSON.parse(encoded)))
		const inner = outer ? expectErr(outer, 'RETRYABLE') : undefined
		const details = inner?.details as { attempt: number } | undefined

		expect(details?.attempt).toBe(3)
	})

	test('rejects corrupted transport payloads', () => {
		const corrupted = { ok: false, message: 'missing code' }
		const result = Result.fromJSON(corrupted)

		const error = expectErr(result, 'BAD_ERR_JSON')
		if (error?.isErr('BAD_ERR_JSON')) {
			const errorDetails = error.details as { code: string; message: string }
			expect(errorDetails.code).toBe('undefined')
			expect(errorDetails.message).toBe('string')
		}
	})
})