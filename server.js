const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 8888;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf'
};

const ALLOWED_DOMAINS = [
  'en.wikipedia.org', 'fr.wikipedia.org', 'ar.wikipedia.org',
  'news.google.com', 'feeds.bbci.co.uk', 'rss.cnn.com',
  'news.yahoo.com', 'www.aljazeera.com', 'feeds.reuters.com',
  'lite.cnn.com', 'www.theguardian.com', 'rss.nytimes.com',
  'feeds.skynews.com', 'www.npr.org', 'apnews.com',
  'newsroom.fb.com', 'blog.google', 'github.com',
  'developer.mozilla.org', 'stackoverflow.com',
  'www.bbc.com', 'www.bbc.co.uk', 'www.france24.com',
  'www.dw.com', 'www.trtworld.com', 'www.middleeasteye.net'
];

function fetchURL(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      timeout,
      headers: {
        'User-Agent': 'HAZOOM-Browser/2.6',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchURL(res.headers.location, timeout).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const titleRegex = /<title[^>]*>([\s\S]*?)<\/title>/i;
  const linkRegex = /<link[^>]*>([\s\S]*?)<\/link>/i;
  const descRegex = /<description[^>]*>([\s\S]*?)<\/description>/i;
  const pubRegex = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i;
  const imgRegex = /<media:content[^>]*url="([^"]*)"/i;
  const encRegex = /<enclosure[^>]*url="([^"]*)"/i;

  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
    const block = match[1];
    const title = (block.match(titleRegex) || [])[1] || '';
    const link = (block.match(linkRegex) || [])[1] || '';
    const desc = (block.match(descRegex) || [])[1] || '';
    const pub = (block.match(pubRegex) || [])[1] || '';
    const img = (block.match(imgRegex) || block.match(encRegex) || [])[1] || '';
    if (title) {
      items.push({
        title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        link: link.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        description: desc.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim().slice(0, 300),
        pubDate: pub.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        image: img.trim()
      });
    }
  }
  return items;
}

function proxyHTML(html, originalUrl) {
  let base = '';
  try { base = new URL(originalUrl).origin; } catch(e) {}

  let fixed = html;

  // Remove X-Frame-Options and CSP frame-ancestors
  fixed = fixed.replace(/<meta[^>]*http-equiv="X-Frame-Options"[^>]*>/gi, '');
  fixed = fixed.replace(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi, '');

  // Fix relative URLs
  if (base) {
    fixed = fixed.replace(/(src|href|action)=["'](\/[^"']*)["']/g, `$1="${base}$2"`);
    fixed = fixed.replace(/(src|href|action)=["'](\.\.\/[^"']*)["']/g, (_, attr, p) => {
      return `${attr}="${base}/${p.replace(/^\.\.\//, '')}"`;
    });
  }

  // Add base tag
  if (base) {
    fixed = fixed.replace(/<head([^>]*)>/i, `<head$1><base href="${base}/" target="_blank">`);
  }

  return fixed;
}

function proxyCSS(css, originalUrl) {
  let base = '';
  try { base = new URL(originalUrl).origin; } catch(e) {}
  if (!base) return css;
  return css.replace(/url\(["']?(\/[^)"']*)["']?\)/g, `url("${base}$1")`);
}

function getContentType(headers) {
  const ct = headers['content-type'] || '';
  if (ct.includes('html')) return 'text/html';
  if (ct.includes('css')) return 'text/css';
  if (ct.includes('javascript')) return 'text/javascript';
  if (ct.includes('json')) return 'application/json';
  if (ct.includes('image')) return ct.split(';')[0];
  return 'text/plain';
}

const RSS_FEEDS = {
  'bbc': { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml', icon: '🇬🇧' },
  'cnn': { name: 'CNN', url: 'http://rss.cnn.com/rss/edition.rss', icon: '🇺🇸' },
  'aljazeera': { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', icon: '🇶🇦' },
  'reuters': { name: 'Reuters', url: 'https://www.reutersagency.com/feed/', icon: '🌐' },
  'guardian': { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', icon: '🇬🇧' },
  'nytimes': { name: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', icon: '🇺🇸' },
  'dw': { name: 'Deutsche Welle', url: 'https://rss.dw.com/rdf/rss-en-all', icon: '🇩🇪' },
  'france24': { name: 'France 24', url: 'https://www.france24.com/en/rss', icon: '🇫🇷' },
  'trt': { name: 'TRT World', url: 'https://www.trtworld.com/rss', icon: '🇹🇷' },
  'npr': { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', icon: '🇺🇸' }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }

  // Proxy endpoint: /proxy?url=ENCODED_URL
  if (url.pathname === '/proxy') {
    const target = url.searchParams.get('url');
    if (!target) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return;
    }
    try {
      const decoded = decodeURIComponent(target);
      const u = new URL(decoded);

      // Domain whitelist check
      const host = u.hostname;
      const isAllowed = ALLOWED_DOMAINS.some(d => host.includes(d)) || host.endsWith('.wikipedia.org');
      if (!isAllowed && !url.searchParams.get('force')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Domain not whitelisted', host, hint: 'Add ?force=true to bypass' }));
        return;
      }

      const result = await fetchURL(decoded);
      const ct = getContentType(result.headers);

      if (ct === 'text/html') {
        const proxied = proxyHTML(result.body, decoded);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': 'frame-ancestors *'
        });
        res.end(proxied);
      } else if (ct === 'text/css') {
        const proxied = proxyCSS(result.body, decoded);
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(proxied);
      } else {
        res.writeHead(200, { 'Content-Type': ct });
        res.end(result.body);
      }
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy fetch failed', message: e.message }));
    }
    return;
  }

  // RSS feed endpoint: /rss/:source
  if (url.pathname.startsWith('/rss/')) {
    const source = url.pathname.split('/rss/')[1];
    const feed = RSS_FEEDS[source];
    if (!feed) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown feed', available: Object.keys(RSS_FEEDS) }));
      return;
    }
    try {
      const result = await fetchURL(feed.url);
      const items = parseRSS(result.body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ source: feed.name, icon: feed.icon, count: items.length, items }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Feed fetch failed', message: e.message }));
    }
    return;
  }

  // All RSS feeds
  if (url.pathname === '/rss') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.entries(RSS_FEEDS).map(([k, v]) => ({ id: k, ...v }))));
    return;
  }

  // Static files
  let fp = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end('Not Found'); return; }
  const ext = path.extname(fp);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'text/plain',
    'Cache-Control': 'no-cache',
    'X-Frame-Options': 'ALLOWALL',
    'Content-Security-Policy': 'frame-ancestors *'
  });
  fs.createReadStream(fp).pipe(res);
});

server.listen(PORT, () => {
  console.log(`🐂 HAZOOM OS v2.7 running at http://localhost:${PORT}`);
  console.log(`📡 Proxy: http://localhost:${PORT}/proxy?url=URL`);
  console.log(`📰 RSS: http://localhost:${PORT}/rss`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
});
