const { AUTOWRITER_SERVICE_URL, AUTOWRITER_TIMEOUT_MS } = require('./config');

async function postJson(url, body) {
  if (global.fetch) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTOWRITER_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Autowriter service error: ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  const { request } = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: AUTOWRITER_TIMEOUT_MS,
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Autowriter service error: ${res.statusCode}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function retrieveEvidence(payload) {
  return postJson(`${AUTOWRITER_SERVICE_URL}/v1/retrieve`, payload);
}

async function generateWithService(payload) {
  return postJson(`${AUTOWRITER_SERVICE_URL}/v1/generate`, payload);
}

module.exports = {
  retrieveEvidence,
  generateWithService,
};
