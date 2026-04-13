const cors = require('cors');
const express = require('express');
const client = require('prom-client');
const {
  createNote,
  deleteNote,
  initSchema,
  listNotes,
  waitForDatabase,
} = require('./db');

const app = express();
const port = Number(process.env.PORT || 4000);

client.collectDefaultMetrics();

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: String(res.statusCode),
    });
  });
  next();
});

app.use(cors());
app.use(express.json());

function readText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

app.get('/', (_req, res) => {
  res.json({
    message: 'Notes API is running',
    endpoints: ['/health', '/api/health', '/api/notes', '/metrics'],
  });
});

app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});

app.get('/api/notes', async (_req, res, next) => {
  try {
    const notes = await listNotes();
    res.json({ notes });
  } catch (error) {
    next(error);
  }
});

app.post('/api/notes', async (req, res, next) => {
  try {
    const title = readText(req.body?.title);
    const content = readText(req.body?.content);

    if (!title || !content) {
      return res.status(400).json({
        error: 'Both title and content are required',
      });
    }

    const note = await createNote({ title, content });
    return res.status(201).json({ note });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/notes/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    const deleted = await deleteNote(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await waitForDatabase();
  await initSchema();

  app.listen(port, () => {
    console.log(`Notes API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Unable to start the API', error);
  process.exit(1);
});