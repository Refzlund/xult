import { describe, test, expect, beforeEach } from 'bun:test'
import { z } from 'zod'
import { async, err, func, ok } from 'xult'

type Config = { version: number; features: string[] }


type LoadOptions = { allowStale?: boolean }
type LoadedConfig = Config & { source: 'remote' | 'cache' }
type RemoteFetchResult = Awaited<ReturnType<typeof RemoteConfigService.fetch>>

const LoadOptionsSchema = z.object({
	allowStale: z.boolean().optional()
})

const RemoteConfigService = {
	healthy: true,
	latest: { version: 1, features: ['core'] } as Config,
	async fetch() {
		return async(
			Promise.resolve().then<Config>(() => {
				if (!this.healthy) {
					throw new Error('service offline')
				}
				return this.latest
			}),
			(thrown) => err('REMOTE_UNAVAILABLE', 'Failed to download configuration.', { cause: thrown.details ?? thrown })
		)
	}
}

const ConfigCache = {
	snapshot: undefined as Config | undefined,
	reset() {
		this.snapshot = undefined
	},
	read() {
		if (!this.snapshot) {
			return err('CACHE_MISS', 'No cached configuration available.')
		}
		return ok(this.snapshot)
	},
	write(config: Config) {
		this.snapshot = config
		return ok(config)
	}
}

const loadConfiguration = func(
	LoadOptionsSchema,
	async (options: LoadOptions) => {
		const remote = await RemoteConfigService.fetch()
		if (remote.isOk()) {
			ConfigCache.write(remote.value)
			const loaded: LoadedConfig = { ...remote.value, source: 'remote' }
			return ok<LoadedConfig>(loaded)
		}
		else if(!options.allowStale && remote.isErr()) {
			return remote
		}

		const cached = ConfigCache.read()
		if (cached.isErr()) {
			return err('CONFIG_UNAVAILABLE', 'No configuration could be retrieved.', {
				remote: { code: remote.code, message: remote.message },
				cache: { code: cached.code, message: cached.message }
			})
		}

		const loaded: LoadedConfig = { ...cached.value, source: 'cache' }
		return ok<LoadedConfig>(loaded)
	}
)

describe('Real World: Config Loading', () => {
	beforeEach(() => {
		RemoteConfigService.healthy = true
		RemoteConfigService.latest = { version: 1, features: ['core'] }
		ConfigCache.reset()
	})

	test('prefers the remote snapshot when the service is healthy', async () => {
		RemoteConfigService.latest = { version: 3, features: ['core', 'billing'] }

		const result = await loadConfiguration({ allowStale: false })

		expect(result.isOk()).toBe(true)
		if (result.isOk()) {
			expect(result.value.source).toBe('remote')
			expect(result.value.version).toBe(3)
		}
		const cached = ConfigCache.read()
		if (cached.isOk()) {
			expect(cached.value.version).toBe(3)
		}
	})

	test('falls back to the cache when remote fetch fails', async () => {
		RemoteConfigService.healthy = false
		ConfigCache.write({ version: 2, features: ['core', 'reports'] })

		const result = await loadConfiguration({ allowStale: true })

		expect(result.isOk()).toBe(true)
		if (result.isOk()) {
			expect(result.value.source).toBe('cache')
			expect(result.value.version).toBe(2)
		}
	})

	test('bubbles an error when both remote and cache miss', async () => {
		RemoteConfigService.healthy = false

		const result = await loadConfiguration({ allowStale: true })

		expect(result.isErr('CONFIG_UNAVAILABLE')).toBe(true)
		if (result.isErr('CONFIG_UNAVAILABLE')) {
			expect(result.details.remote.code).toBe('REMOTE_UNAVAILABLE')
			expect(result.details.cache.code).toBe('CACHE_MISS')
		}
	})
})
