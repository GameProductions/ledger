import { app } from './src/index';

const mockEnv = {
    ENVIRONMENT: 'development',
    JWT_SECRET: 'test-secret',
    DISCORD_CLIENT_ID: 'test-client-id',
    DB: {
        prepare: (sql) => ({
            bind: (...args) => ({
                all: async () => ({ results: [] }),
                first: async () => null,
                run: async () => ({ success: true })
            }),
            all: async () => ({ results: [] }),
            first: async () => null,
            run: async () => ({ success: true })
        }),
        batch: async (queries) => [{ results: [] }]
    },
    RATE_LIMITER: {
        idFromName: () => ({ id: 'mock-id' }),
        get: () => ({
            fetch: async () => ({ status: 200 })
        })
    }
};

const runTest = async (path, method = 'GET', expectedStatus = 200) => {
    console.log(`Testing ${method} ${path}...`);
    const req = new Request(`http://localhost${path}`, { method });
    try {
        const res = await app.request(req, {
            headers: {
                'Host': 'localhost'
            }
        }, mockEnv);
        console.log(`  Result: ${res.status} (Expected: ${expectedStatus})`);
        if (res.status === 500) {
            const body = await res.text();
            console.error(`  500 ERROR DETECTED:`, body);
        }
    } catch (e) {
        console.error(`  EXCEPTION:`, e.message);
    }
};

async function runSuite() {
    console.log('--- Diagnostic Discord Login Trace ---');
    await runTest('/auth/login/discord', 'GET', 302); // Should redirect
    console.log('--- Trace Complete ---');
}

runSuite();
