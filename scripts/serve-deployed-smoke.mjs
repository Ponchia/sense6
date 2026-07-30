import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.argv[2] ?? 4175);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`Invalid port: ${port}`);

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));

// Refuse to serve a half-built or missing dist. Playwright reports a server
// that starts but cannot serve as a wall of unrelated test timeouts, so the
// diagnosis has to happen here.
for (const required of ['index.html', '404.html', '_headers', 'en/index.html']) {
  if (!(await isFile(resolve(root, required)))) {
    throw new Error(`dist/${required} is missing. Run \`npm run build\` before starting this server.`);
  }
}

const headerRules = parseHeaderRules(await readFile(resolve(root, '_headers'), 'utf8'));
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const requested = resolve(root, `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`);
    const insideRoot = requested === root || requested.startsWith(`${root}/`);
    const available = insideRoot && (await isFile(requested));
    const file = available ? requested : resolve(root, '404.html');
    const statusCode = available ? 200 : 404;
    const headers = {
      'Content-Type': contentTypes.get(extname(file)) ?? 'application/octet-stream',
      ...headersFor(pathname, headerRules),
    };
    response.writeHead(statusCode, headers);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    // An unhandled stream 'error' event takes the whole process down, so a
    // missing dist/404.html turned one bad request into a dead server and every
    // subsequent test into an unexplained timeout. Fail the request instead.
    const stream = createReadStream(file);
    stream.on('error', (streamError) => {
      response.destroy(streamError instanceof Error ? streamError : new Error(String(streamError)));
    });
    stream.pipe(response);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, '127.0.0.1');

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function parseHeaderRules(source) {
  const rules = [];
  let current = null;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) {
      current = null;
      continue;
    }
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    const separator = line.indexOf(':');
    if (!current || separator < 0) continue;
    current.headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return rules;
}

function headersFor(pathname, rules) {
  const headers = {};
  for (const rule of rules) {
    if (rule.pattern.startsWith('http')) continue;
    const prefix = rule.pattern.endsWith('*') ? rule.pattern.slice(0, -1) : rule.pattern;
    if (rule.pattern === '/*' || pathname.startsWith(prefix)) Object.assign(headers, rule.headers);
  }
  return headers;
}
