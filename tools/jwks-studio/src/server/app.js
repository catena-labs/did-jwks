/**
 * Catena Labs did:jwks Web Studio Server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { JWKS_CONFIG } from '../config.js';
import { defaultDidResolver } from '../core/did-resolver.js';
import { defaultJwksGenerator } from '../core/jwks-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.join(__dirname, '../../web');

const app = express();
const PORT = process.env.PORT || 3421;

app.use(cors());
app.use(express.json());
app.use(express.static(WEB_ROOT));

// 1. Get Spec & Samples Config
app.get('/api/config', (req, res) => {
  res.json({
    spec: JWKS_CONFIG.spec,
    samples: JWKS_CONFIG.sampleDids,
  });
});

// 2. Resolve did:jwks Identifier
app.post('/api/did/resolve', (req, res) => {
  try {
    const { did } = req.body;
    const result = defaultDidResolver.resolve(did);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Generate JWKS & did:jwks Key Pair
app.post('/api/jwks/generate', (req, res) => {
  try {
    const result = defaultJwksGenerator.generateJwks(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Resolution History
app.get('/api/history', (req, res) => {
  res.json(defaultDidResolver.getHistory());
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🆔 Catena Labs did:jwks DID Resolver Studio Running!`);
    console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);
    console.log(`📜 Spec: W3C Decentralized Identifiers (did:jwks)`);
    console.log(`======================================================\n`);
  });
}

export default app;
