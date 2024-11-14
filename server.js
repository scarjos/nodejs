const PORT = 3000;
const PATH = {
  dirnam: './'
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

const types = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain',
};

/*
const flag_states 
  a: req.url === '/'
  b: !extension
  c: !isPathUnderRoot
*/
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = normalize(resolve(directoryName));
// Formatters
const [
  jsonForm,
  textForm,
  htmlForm,
] = [
  (data) => JSON.stringify(data),
  (msg) => msg,
  (msg) => `<!DOCTYPE html><html><body><h1>${msg}</h1></body></html>`,
];

// Dynamic Send Functions
const sendRes = (...types) =>
  types.map(([contentType, formatter]) => (res, status, payload) => {
    res.writeHead(status, { 'Content-Type': contentType });
    res.end(formatter(payload));
  });

const [sendJSON, sendHTML, sendText] = sendRes(
  ['application/json', jsonForm],
  ['text/html', htmlForm],
  ['text/plain', textForm]
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
    error: { res, 
      status: 500, 
      payload: { status: 'error', description: 'File not found' }}});
  stream.pipe(res);
};

/* 
const dir_act = {
  asyncDir = dir => access(dir).then(() => undefined).catch(() => mkdir(dir));
  synchDir = dir => !existsSync(dir) ? mkdirSync(dir) : undefined;
}
*/
// File Upload Function
const handleFileUpload = (req, res) => {
  fs.mkdirSync(PATH.upload, { recursive: true });
  const filename = req.headers['filename'] || `file-${Date.now()}`;
  const fileStream = fs.createWriteStream(path.join(PATH.upload, filename));

  handleStreamEvents(fileStream, {
    error: { res, status: 500, 
      payload: { status: 'error', description: 'File upload failed' }}, 
    finish: { res, status: 200, 
      payload: { status: 'success', filename }}});

  req.pipe(fileStream);
};
// Higher order 
const createHandler = 
  (passFn) => 
  (res, payload, status = 200) => 
  passFn(res, status, payload);

const io= {
  io1: (sendF) => (res, payload, status = 200) => sendF(res, status, payload),
  io2: (res, filePath, status = 200) => sendFile(res, filePath, status),
  io3: (req, res) => handleFileUpload(req, res),
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
http
  .createServer((req, res) => {
    const { method, url } = req;
    const routeHandler = routes[method]?.[url] || routes.default;
    routeHandler(req, res);
  })
  .listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/`));

