const PATH = {
  upload: './uploads',
  logs: './logs',
};

const FILE = {
  static: {
    homepage: './index.html',
  },
  dynamic: {
    defaultUpload: (timestamp = Date.now()) => `file-${timestamp}`,
  },
};

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Formatters
const [
  jsonFormatter,
  textFormatter,
  htmlFormatter,
] = [
  (data) => JSON.stringify(data),
  (message) => message,
  (message) => `
    <!DOCTYPE html>
    <html><head><title>Response</title></head>
    <body><h1>${message}</h1></body></html>
  `,
];

// Dynamic Send Functions
const sendRes = (...types) =>
  types.map(([contentType, formatter]) => (res, status, payload) => {
    res.writeHead(status, { 'Content-Type': contentType });
    res.end(formatter(payload));
  });

const [sendJSON, sendHTML, sendText] = sendRes(
  ['application/json', jsonFormatter],
  ['text/html', htmlFormatter],
  ['text/plain', textFormatter]
);

// Utility for Event Responses
const handleStreamEvents = (stream, events) => {
  Object.entries(events).forEach(([event, { res, status, payload }]) => {
    stream.on(event, () => res && sendJSON(res, status, payload));
  });
};

// File Streaming Function
const sendFile = (res, filePath, status = 200) => {
  const stream = fs.createReadStream(path.resolve(filePath));
  res.writeHead(status, { 'Content-Type': 'text/html' });
  handleStreamEvents(stream, {
    error: { res, status: 500, payload: { status: 'error', description: 'File not found' } },
  });
  stream.pipe(res);
};

// File Upload Function
const handleFileUpload = (req, res) => {
  const uploadDir = './uploads';
  fs.mkdirSync(uploadDir, { recursive: true });

  const filename = req.headers['filename'] || `file-${Date.now()}`;
  const fileStream = fs.createWriteStream(path.join(uploadDir, filename));

  handleStreamEvents(fileStream, {
    error: { res, status: 500, payload: { status: 'error', description: 'File upload failed' } },
    finish: { res, status: 200, payload: { status: 'success', filename } },
  });

  req.pipe(fileStream);
};

// Handlers
const handlers = {
  json: (res, payload, status = 200) => sendJSON(res, status, payload),
  html: (res, payload, status = 200) => sendHTML(res, status, payload),
  text: (res, payload, status = 200) => sendText(res, status, payload),
  staticFile: (res, filePath, status = 200) => sendFile(res, filePath, status),
  fileUpload: (req, res) => handleFileUpload(req, res),
};

const routeConfig = [
  ['GET', '/', handlers.staticFile, FILE.static.homepage],
  ['POST', '/fileUpload', handlers.fileUpload],
];

// Build Routes
const buildRoutes = (config, defaultHandler) => {
  const routes = config.reduce((acc, [method, path, handler, payload]) => {
    acc[method] = acc[method] || {};
    acc[method][path] = payload !== undefined
      ? (req, res) => handler(res, payload)
      : handler;
    return acc;
  }, {});
  routes.default = defaultHandler;
  return routes;
};

// Default Handler
const defaultHandler = (req, res) => {
  sendHTML(res, 404, '<h1>404 - Page Not Found</h1>');
};

// Build Routes Object
const routes = buildRoutes(routeConfig, defaultHandler);

// HTTP Server
const PORT = 3000;
http
  .createServer((req, res) => {
    const { method, url } = req;
    const routeHandler = routes[method]?.[url] || routes.default;
    routeHandler(req, res);
  })
  .listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/`));

