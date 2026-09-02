const http = require('http');

const PORT = 8888;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('🧪 HAZOOM OS Test Suite\n');
  
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✅ ${t.name}`);
      passed++;
    } catch (e) {
      console.log(`  ❌ ${t.name}: ${e.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${tests.length} total`);
  process.exit(failed > 0 ? 1 : 0);
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

test('Server responds with 200', async () => {
  const { status } = await get('/');
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
});

test('Index page contains HAZOOM', async () => {
  const { body } = await get('/');
  if (!body.includes('HAZOOM')) throw new Error('Missing HAZOOM in page');
});

test('Index page is > 100KB', async () => {
  const { body } = await get('/');
  if (body.length < 100000) throw new Error(`Page too small: ${body.length} bytes`);
});

test('Health check returns healthy', async () => {
  const { status } = await get('/health');
  if (status !== 200) throw new Error(`Health check failed: ${status}`);
});

test('Static assets accessible', async () => {
  const { status } = await get('/index.html');
  if (status !== 200) throw new Error(`Static asset failed: ${status}`);
});

run();
