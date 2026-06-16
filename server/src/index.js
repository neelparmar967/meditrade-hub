import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { connectDatabase } from './store.js';
import router from './routes.js';

const app = express();
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fatalLog = path.join(serverRoot, 'fatal.log');

const writeFatal = (label, error) => {
  const detail = error?.stack || error?.message || String(error);
  fs.appendFileSync(fatalLog, `[${new Date().toISOString()}] ${label}\n${detail}\n\n`);
};

process.on('uncaughtException', (error) => {
  writeFatal('uncaughtException', error);
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  writeFatal('unhandledRejection', error);
  console.error(error);
  process.exit(1);
});

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use('/api', router);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong', detail: process.env.NODE_ENV === 'production' ? undefined : err.message });
});

connectDatabase()
  .catch((error) => {
    console.warn(`MongoDB unavailable, using seeded memory mode: ${error.message}`);
  })
  .finally(() => {
    app.listen(config.port, () => {
      console.log(`MediTrade Hub API running on http://localhost:${config.port}/api`);
    });
  });
