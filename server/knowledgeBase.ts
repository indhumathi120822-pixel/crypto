import fs from 'fs';
import path from 'path';
import { CryptoAlgorithmDef } from './types.js';

let cachedKB: CryptoAlgorithmDef[] | null = null;
let kbById = new Map<string, CryptoAlgorithmDef>();

export function getKnowledgeBase(): CryptoAlgorithmDef[] {
  if (cachedKB) {
    return cachedKB;
  }

  const kbPath = path.resolve(process.cwd(), 'data/crypto_algorithms.json');
  if (!fs.existsSync(kbPath)) {
    throw new Error(`Knowledge base file not found at ${kbPath}`);
  }

  const raw = fs.readFileSync(kbPath, 'utf-8');
  cachedKB = JSON.parse(raw) as CryptoAlgorithmDef[];

  kbById.clear();
  for (const algo of cachedKB) {
    kbById.set(algo.id, algo);
  }

  return cachedKB;
}

export function getAlgorithmById(id: string): CryptoAlgorithmDef | undefined {
  if (!cachedKB) {
    getKnowledgeBase();
  }
  return kbById.get(id);
}
