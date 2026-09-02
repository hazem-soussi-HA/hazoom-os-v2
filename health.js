const http = require('http');

const PORT = process.env.PORT || 8888;
const HEALTH_URL = `http://127.0.0.1:${PORT}`;

function check() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(HEALTH_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: 'healthy',
          statusCode: res.statusCode,
          responseTime: Date.now() - start,
          contentLength: data.length,
          timestamp: new Date().toISOString(),
          uptime: process.uptime ? Math.round(process.uptime()) : 'N/A'
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        status: 'unhealthy',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 'unhealthy',
        error: 'Health check timed out',
        timestamp: new Date().toISOString()
      });
    });
  });
}

if (require.main === module) {
  check().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.status === 'healthy' ? 0 : 1);
  });
}

module.exports = { check };
