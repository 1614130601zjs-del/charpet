const http = require('node:http');

const HOST = process.env.CHARPET_RELAY_HOST || '127.0.0.1';
const PORT = Number(process.env.CHARPET_RELAY_PORT || 8787);
const TOKEN = process.env.CHARPET_RELAY_TOKEN || '';
const clients = new Set();
const history = [];
const MAX_HISTORY = 100;

const ACTIONS = new Set(['idle', 'talk', 'tap', 'drag', 'sleep', 'wake']);
const EMOTIONS = new Set(['idle', 'happy', 'sad', 'angry', 'surprised', 'shy', 'sleep']);

function normalize(value) {
  const event = value && value.type === 'charpet.event'
    ? value
    : value && value.type === 'charpet.mcp'
      ? (value.event || value.payload)
      : null;
  if (!event || event.type !== 'charpet.event') return null;
  if (!ACTIONS.has(event.action)) return null;
  const emotion = event.emotion || 'idle';
  if (!EMOTIONS.has(emotion)) return null;
  const intensity = Number(event.intensity ?? 1);
  if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) return null;
  return {
    type: 'charpet.event',
    action: event.action,
    emotion,
    intensity,
    ...(typeof event.text === 'string' && event.text ? { text: event.text } : {}),
    timestamp: Number(event.timestamp) || Date.now(),
  };
}

function authorized(req) {
  if (!TOKEN) return true;
  return req.headers.authorization === `Bearer ${TOKEN}` || req.headers['x-charpet-token'] === TOKEN;
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(data);
}

function publish(event) {
  history.unshift(event);
  if (history.length > MAX_HISTORY) history.pop();
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(payload);
}

const server = http.createServer((req, res) => {
  if (!authorized(req)) return sendJson(res, 401, { error: 'unauthorized' });

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { ok: true, service: 'charpet-relay', clients: clients.size, events: history.length });
  }

  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-store',
      connection: 'keep-alive',
      'access-control-allow-origin': '*',
    });
    res.write(': charpet relay connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'GET' && req.url === '/history') {
    return sendJson(res, 200, history);
  }

  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 64 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const event = normalize(JSON.parse(body));
        if (!event) return sendJson(res, 400, { error: 'invalid charpet.event' });
        publish(event);
        return sendJson(res, 202, event);
      } catch {
        return sendJson(res, 400, { error: 'invalid json' });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`CharPet MCP Relay listening on http://${HOST}:${PORT}`);
  console.log('POST /event   publish a semantic charpet.event');
  console.log('GET  /events  subscribe via Server-Sent Events');
  console.log('GET  /health  health check');
});
