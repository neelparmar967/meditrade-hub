import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seed } from './data/seedData.js';
import { config } from './config.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(serverRoot, '.data');
const dataFile = path.join(dataDir, 'memory-store.json');
const legacyDataFile = path.resolve(process.cwd(), '.data', 'memory-store.json');

const keyFor = (collection, item) => {
  if (collection === 'users' && item.email) return `email:${String(item.email).toLowerCase()}`;
  return String(item.id || item._id || '');
};

const mergeData = (base, extra) => {
  const merged = clone(base);
  for (const [collection, rows] of Object.entries(extra || {})) {
    if (!Array.isArray(rows)) continue;
    merged[collection] ||= [];
    const seen = new Set(merged[collection].map((item) => keyFor(collection, item)).filter(Boolean));
    for (const row of rows) {
      const key = keyFor(collection, row);
      if (key && seen.has(key)) continue;
      merged[collection].push(row);
      if (key) seen.add(key);
    }
  }
  return merged;
};

class MemoryStore {
  constructor() {
    this.data = this.load();
    this.persist();
  }

  load() {
    try {
      let data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : clone(seed);
      if (legacyDataFile !== dataFile && fs.existsSync(legacyDataFile)) {
        data = mergeData(data, JSON.parse(fs.readFileSync(legacyDataFile, 'utf8')));
      }
      return data;
    } catch (error) {
      console.warn(`Could not load memory store, using seed data: ${error.message}`);
    }
    return clone(seed);
  }

  persist() {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.warn(`Could not persist memory store: ${error.message}`);
    }
  }

  list(collection, filter = {}) {
    return this.data[collection].filter((item) =>
      Object.entries(filter).every(([key, value]) => value === undefined || item[key] === value)
    );
  }

  find(collection, id) {
    return this.data[collection].find((item) => item.id === id || item._id === id);
  }

  findOne(collection, predicate) {
    return this.data[collection].find(predicate);
  }

  create(collection, payload) {
    const item = { id: `${collection}_${Date.now()}`, ...payload };
    this.data[collection].push(item);
    this.persist();
    return item;
  }

  createMany(collection, rows) {
    const created = rows.map((payload, index) => ({ id: `${collection}_${Date.now()}_${index}`, ...payload }));
    this.data[collection].push(...created);
    this.persist();
    return created;
  }

  update(collection, id, payload) {
    const index = this.data[collection].findIndex((item) => item.id === id || item._id === id);
    if (index < 0) return null;
    this.data[collection][index] = { ...this.data[collection][index], ...payload };
    this.persist();
    return this.data[collection][index];
  }

  remove(collection, id) {
    const before = this.data[collection].length;
    this.data[collection] = this.data[collection].filter((item) => item.id !== id && item._id !== id);
    if (this.data[collection].length !== before) this.persist();
    return this.data[collection].length !== before;
  }
}

export const memoryStore = new MemoryStore();
export const dbState = { connected: false, mode: 'memory' };

export async function connectDatabase() {
  if (!config.mongoUri) return dbState;
  await mongoose.connect(config.mongoUri);
  dbState.connected = true;
  dbState.mode = 'mongo';
  return dbState;
}
