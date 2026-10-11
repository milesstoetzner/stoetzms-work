import {defineConfig} from 'vitest/config'

// Day boundaries depend on the local timezone. Pin one that has DST so tests are deterministic.
process.env.TZ = 'Europe/Berlin'

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        // Never read the config of the user running the tests
        env: {STOETZMS_WORK_CONFIG: '/nonexistent/stoetzms-work.yaml'},
    },
})
