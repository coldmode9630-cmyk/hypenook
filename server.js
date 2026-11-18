'use strict';
/**
 * Zero-dependency Node server for local testing and for Node hosts
 * (Render, Railway, a VPS…). On Vercel/Netlify you don't need this file.
 *
 *   node server.js            → http://localhost:3000
 *   PORT=8080 node server.js
 * Environment variables are read from the process (or a .env file next to this file).
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

// tiny .env loader (KEY=VALUE lines)
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(function (line) {
    var m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
} catch (e) { /* no .env */ }

var ROOT = __dirname;
var ROUTES = {
  '/api/order': require('./api/order.js'),
  '/api/review': require('./api/review.js'),
  '/api/payment/status': require('./api/payment/status.js'),
  '/api/payment/webhook': require('./api/payment/webhook.js')
};
var TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml'
};
var BLOCK = /^\/(api|lib|node_modules|\.env|server\.js|package\.json|vercel\.json|netlify\.toml|README)/i;

var SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

http.createServer(function (req, res) {
  Object.keys(SECURITY).forEach(function (k) { res.setHeader(k, SECURITY[k]); });
  var url = new URL(req.url, 'http://localhost');
  var p = decodeURIComponent(url.pathname);
  if (ROUTES[p]) {
    Promise.resolve(ROUTES[p](req, res)).catch(function (e) {
      console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end('{"ok":false}'); }
    });
    return;
  }
  if (p === '/') p = '/index.html';
  if (!path.extname(p) && fs.existsSync(path.join(ROOT, p + '.html'))) p += '.html';
  var file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || BLOCK.test(p)) return notFound(res);
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) return notFound(res);
    var ext = path.extname(file).toLowerCase();
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', /\.(webp|jpg|png|svg)$/.test(ext) ? 'public, max-age=2592000' : 'no-cache');
    fs.createReadStream(file).pipe(res);
  });
}).listen(process.env.PORT || 3000, function () {
  console.log('HypeNook running on http://localhost:' + (process.env.PORT || 3000));
});

function notFound(res) {
  res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8');
  fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
}
