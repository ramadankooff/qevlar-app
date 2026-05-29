const express = require('express');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Proxy endpoint
app.post('/api/proxy', async (req, res) => {
  const { method, url, body, headers } = req.body;

  if (!url || !method) {
    return res.status(400).json({ error: 'method and url are required' });
  }

  // Validate URL
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL: ' + e.message });
  }

  // Prevent loopback attacks
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return res.status(403).json({ error: 'Loopback addresses not allowed' });
  }

  const lib = parsed.protocol === 'https:' ? https : http;
  const mergedHeaders = {
    'User-Agent': 'example.app/1.0',
    'Content-Type': 'application/json',
    ...headers,
  };

  const options = {
    method: method.toUpperCase(),
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    headers: mergedHeaders,
    timeout: 30000,
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => {
      data += chunk;
    });
    proxyRes.on('end', () => {
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        parsedData = data;
      }
      res.json({
        ok: proxyRes.statusCode >= 200 && proxyRes.statusCode < 300,
        status: proxyRes.statusCode,
        statusText: proxyRes.statusMessage,
        data: parsedData,
      });
    });
  });

  proxyReq.on('error', (e) => {
    res.status(502).json({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      error: e.message,
    });
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).json({
      ok: false,
      status: 504,
      statusText: 'Gateway Timeout',
      error: 'Request timeout',
    });
  });

  if (body && method !== 'GET') {
    proxyReq.write(body);
  }
  proxyReq.end();
});

// 404 fallback (serve index.html for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`example.app running on port ${PORT}`);
  console.log(`API proxy available at http://localhost:${PORT}/api/proxy`);
});
