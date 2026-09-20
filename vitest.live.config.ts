import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Live checks against the real Supabase project (needs .env). Run on demand:
 *   npx vitest run --config vitest.live.config.ts
 */
export default defineConfig({
    test: {
        include: ['lib/**/__tests__/**/*.live.ts'],
        environment: 'node',
        env: Object.fromEntries(
            require('node:fs')
                .readFileSync(path.resolve(__dirname, '.env'), 'utf8')
                .split(/\r?\n/)
                .filter((line: string) => line && !line.startsWith('#') && line.includes('='))
                .map((line: string) => {
                    const i = line.indexOf('=')
                    return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, '')]
                }),
        ),
        testTimeout: 60_000,
        hookTimeout: 60_000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname),
            // The modules under test are Next server modules; outside Next
            // the guard package must resolve to a no-op.
            'server-only': path.resolve(__dirname, 'lib/referrals/__tests__/server-only-stub.ts'),
        },
    },
})
