import { app } from './src/index';
const mockEnv = {
    ENVIRONMENT: 'development',
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
    // In Hono, app.request(req, env) allows passing the environment
    const res = await app.request(req, {}, mockEnv);
    console.log(`  Result: ${res.status} (Expected: ${expectedStatus})`);
    if (res.status !== expectedStatus) {
        console.error(`  FAILURE: Expected status ${expectedStatus}, got ${res.status}`);
    }
};
async function runSuite() {
    console.log('--- LEDGER v3.0.0 Endpoint Audit (In-Memory) ---');
    // 1. Root & Well-Known
    await runTest('/.well-known/microsoft-identity-association.json', 'GET', 200);
    // 2. Health Checks
    await runTest('/ping', 'GET', 200);
    await runTest('/ledger/ping', 'GET', 200);
    // 3. Auth Boundaries (Protected)
    await runTest('/api/financials/accounts', 'GET', 401);
    await runTest('/ledger/api/financials/accounts', 'GET', 401);
    // 4. Auth Exclusions
    await runTest('/ledger/auth/login', 'POST', 400); // 400 because body is missing, but should NOT be 401
    await runTest('/api/theme/broadcast', 'GET', 200);
    await runTest('/ledger/api/theme/broadcast', 'GET', 200);
    console.log('--- Audit Complete ---');
}
runSuite();
