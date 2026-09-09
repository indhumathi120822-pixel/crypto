import fs from 'fs';
import path from 'path';
import {
  Finding,
  ScanStats,
  FileTreeNode,
  DependencyGraph,
  StoredScanSummary,
  ScanComparisonResult,
  ScanSession,
} from './types.js';

interface StoredScanRecord {
  id: string;
  userId?: string;
  repoName: string;
  repoUrl?: string;
  uploadedAt: string;
  fileCount: number;
  totalSizeBytes: number;
  findings: Finding[];
  stats: ScanStats;
  fileTree: FileTreeNode[];
  dependencyGraph: DependencyGraph;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'scans_history.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadHistory(): StoredScanRecord[] {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw) as StoredScanRecord[];
  } catch (err) {
    console.error('Failed to read scans history file:', err);
    return [];
  }
}

function writeHistory(records: StoredScanRecord[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write scans history file:', err);
  }
}

export const historyStore = {
  saveScan(session: {
    id: string;
    userId?: string;
    repoName: string;
    repoUrl?: string;
    uploadedAt: string;
    fileCount: number;
    totalSizeBytes: number;
    findings: Finding[];
    stats: ScanStats;
    fileTree: FileTreeNode[];
    dependencyGraph: DependencyGraph;
  }): StoredScanSummary {
    const records = loadHistory();
    // Prepend or replace existing with same ID
    const existingIndex = records.findIndex((r) => r.id === session.id);
    const newRecord: StoredScanRecord = {
      id: session.id,
      userId: session.userId || 'system-local-user',
      repoName: session.repoName,
      repoUrl: session.repoUrl,
      uploadedAt: session.uploadedAt,
      fileCount: session.fileCount,
      totalSizeBytes: session.totalSizeBytes,
      findings: session.findings,
      stats: session.stats,
      fileTree: session.fileTree,
      dependencyGraph: session.dependencyGraph,
    };

    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.unshift(newRecord);
    }

    // Keep up to 100 scans
    if (records.length > 100) {
      records.length = 100;
    }

    writeHistory(records);

    return {
      id: newRecord.id,
      userId: newRecord.userId,
      repoName: newRecord.repoName,
      repoUrl: newRecord.repoUrl,
      uploadedAt: newRecord.uploadedAt,
      fileCount: newRecord.fileCount,
      totalFindings: newRecord.stats.totalFindings,
      averageRiskScore: newRecord.stats.averageRiskScore,
      overallQuantumPosture: newRecord.stats.overallQuantumPosture,
      criticalRisks: newRecord.stats.criticalRisks,
      highRisks: newRecord.stats.highRisks,
      mediumRisks: newRecord.stats.mediumRisks,
      lowRisks: newRecord.stats.lowRisks,
      p1Candidates: newRecord.stats.p1Candidates,
      p2Candidates: newRecord.stats.p2Candidates,
      p3Candidates: newRecord.stats.p3Candidates,
      p4Candidates: newRecord.stats.p4Candidates,
    };
  },

  listScans(filters?: { query?: string; riskLevel?: string; priority?: string }): StoredScanSummary[] {
    const records = loadHistory();
    let summaries: StoredScanSummary[] = records.map((r) => ({
      id: r.id,
      userId: r.userId,
      repoName: r.repoName,
      repoUrl: r.repoUrl,
      uploadedAt: r.uploadedAt,
      fileCount: r.fileCount,
      totalFindings: r.stats.totalFindings,
      averageRiskScore: r.stats.averageRiskScore,
      overallQuantumPosture: r.stats.overallQuantumPosture,
      criticalRisks: r.stats.criticalRisks,
      highRisks: r.stats.highRisks,
      mediumRisks: r.stats.mediumRisks,
      lowRisks: r.stats.lowRisks,
      p1Candidates: r.stats.p1Candidates,
      p2Candidates: r.stats.p2Candidates,
      p3Candidates: r.stats.p3Candidates,
      p4Candidates: r.stats.p4Candidates,
    }));

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      summaries = summaries.filter(
        (s) =>
          s.repoName.toLowerCase().includes(q) ||
          (s.repoUrl && s.repoUrl.toLowerCase().includes(q))
      );
    }

    return summaries;
  },

  getScan(id: string): StoredScanRecord | null {
    const records = loadHistory();
    return records.find((r) => r.id === id) || null;
  },

  deleteScan(id: string): boolean {
    const records = loadHistory();
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length !== records.length) {
      writeHistory(filtered);
      return true;
    }
    return false;
  },

  compareScans(oldScanId: string, newScanId: string): ScanComparisonResult | null {
    const oldScan = this.getScan(oldScanId);
    const newScan = this.getScan(newScanId);

    if (!oldScan || !newScan) {
      return null;
    }

    const oldFindingsMap = new Map<string, Finding>();
    for (const f of oldScan.findings) {
      const key = `${f.file}:${f.line}:${f.algorithmId}`;
      oldFindingsMap.set(key, f);
    }

    const newFindingsMap = new Map<string, Finding>();
    const newFindings: Finding[] = [];
    let unchangedCount = 0;

    for (const f of newScan.findings) {
      const key = `${f.file}:${f.line}:${f.algorithmId}`;
      newFindingsMap.set(key, f);
      if (!oldFindingsMap.has(key)) {
        newFindings.push(f);
      } else {
        unchangedCount++;
      }
    }

    const resolvedFindings: Finding[] = [];
    for (const [key, f] of oldFindingsMap) {
      if (!newFindingsMap.has(key)) {
        resolvedFindings.push(f);
      }
    }

    const oldScore = oldScan.stats.averageRiskScore;
    const newScore = newScan.stats.averageRiskScore;
    const riskReduction = Math.max(0, oldScore - newScore);
    const riskReductionPercent = oldScore > 0 ? Math.round((riskReduction / oldScore) * 100) : 0;

    // Count findings resolved that were P1
    const resolvedP1Count = resolvedFindings.filter((f) => f.priority === 'P1').length;
    const pendingP1Count = newScan.stats.p1Candidates;
    const totalP1Initial = (oldScan.stats.p1Candidates || 0) + resolvedP1Count;
    const progressPercent =
      totalP1Initial > 0
        ? Math.min(100, Math.round((resolvedP1Count / totalP1Initial) * 100))
        : 100;

    return {
      oldScanId: oldScan.id,
      newScanId: newScan.id,
      oldRepoName: oldScan.repoName,
      newRepoName: newScan.repoName,
      oldDate: oldScan.uploadedAt,
      newDate: newScan.uploadedAt,
      oldRiskScore: oldScore,
      newRiskScore: newScore,
      riskReduction,
      riskReductionPercent,
      oldTotalFindings: oldScan.stats.totalFindings,
      newTotalFindings: newScan.stats.totalFindings,
      newFindings,
      resolvedFindings,
      unchangedFindingsCount: unchangedCount,
      migrationProgress: {
        migratedToPqcCount: resolvedFindings.length,
        pendingP1Count,
        progressPercent,
      },
    };
  },
};
