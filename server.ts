import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { safeExtractZip, scanRepository, calculateStatsFromFindings } from './server/scanner.js';
import { getKnowledgeBase, getAlgorithmById } from './server/knowledgeBase.js';
import { calculateFindingRisk, DEFAULT_RISK_WEIGHTS } from './server/riskEngine.js';
import { generateCycloneDxCbom, generateCbomCsv } from './server/cbom.js';
import { getAiAdvisory } from './server/recommendations.js';
import { ScanSession, Finding } from './server/types.js';
import { historyStore } from './server/historyStore.js';
import { fetchAndScanRemoteRepo, validateRepoUrl } from './server/repoScanner.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Scan rate limiter
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scan requests, please slow down.' },
});

// Multer in-memory storage with configurable upload limit (default 35MB)
let maxUploadSizeBytes = 35 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadSizeBytes,
  },
});

// In-memory active scan session, hydrated from history if available
let currentSession: ScanSession | null = null;

// Try to hydrate last scan from persistent history store at launch
try {
  const pastScans = historyStore.listScans();
  if (pastScans.length > 0) {
    const latestRecord = historyStore.getScan(pastScans[0].id);
    if (latestRecord) {
      const fileMap = new Map<string, string>();
      const origMap = new Map<string, string>();
      for (const f of latestRecord.findings) {
        if (!fileMap.has(f.file)) {
          fileMap.set(f.file, f.code);
          origMap.set(f.file, f.code);
        }
      }
      currentSession = {
        id: latestRecord.id,
        repoName: latestRecord.repoName,
        uploadedAt: latestRecord.uploadedAt,
        fileCount: latestRecord.fileCount,
        totalSizeBytes: latestRecord.totalSizeBytes,
        files: fileMap,
        originalFiles: origMap,
        fileTree: latestRecord.fileTree,
        findings: latestRecord.findings,
        stats: latestRecord.stats,
        dependencyGraph: latestRecord.dependencyGraph,
        weights: DEFAULT_RISK_WEIGHTS,
        defaultBusinessCriticality: 'MEDIUM',
        defaultDataLifetime: 5,
        defaultMigrationTime: 2,
        threatHorizon: 10,
      };
    }
  }
} catch (e) {
  console.warn('Could not restore initial session from history:', e);
}

// ==================== API ROUTES ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Enterprise Quantum Cryptographic Risk Assessment & Post-Quantum Migration Platform',
    version: '2.0.0',
    complianceStandards: ['NIST FIPS 203', 'NIST FIPS 204', 'NIST FIPS 205', 'CNSA 2.0', 'Mosca Framework'],
  });
});

// ==================== SCAN HISTORY & COMPARISON ====================

// List past scans
app.get('/api/scans', (req, res) => {
  try {
    const query = req.query.q as string | undefined;
    const summaries = historyStore.listScans({ query });
    res.json({ scans: summaries, count: summaries.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list scans' });
  }
});

// Get specific scan detail
app.get('/api/scans/:id', (req, res) => {
  try {
    const scan = historyStore.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found in history' });
    }
    res.json(scan);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get scan' });
  }
});

// Load a past scan into active session
app.post('/api/scans/:id/load', (req, res) => {
  try {
    const scan = historyStore.getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found in history' });
    }

    const fileMap = new Map<string, string>();
    const origMap = new Map<string, string>();
    for (const f of scan.findings) {
      if (!fileMap.has(f.file)) {
        fileMap.set(f.file, f.code);
        origMap.set(f.file, f.code);
      }
    }

    currentSession = {
      id: scan.id,
      repoName: scan.repoName,
      uploadedAt: scan.uploadedAt,
      fileCount: scan.fileCount,
      totalSizeBytes: scan.totalSizeBytes,
      files: fileMap,
      originalFiles: origMap,
      fileTree: scan.fileTree,
      findings: scan.findings,
      stats: scan.stats,
      dependencyGraph: scan.dependencyGraph,
      weights: DEFAULT_RISK_WEIGHTS,
      defaultBusinessCriticality: 'MEDIUM',
      defaultDataLifetime: 5,
      defaultMigrationTime: 2,
      threatHorizon: 10,
    };

    res.json({
      success: true,
      message: `Loaded scan "${scan.repoName}" into active session`,
      session: {
        id: currentSession.id,
        repoName: currentSession.repoName,
        uploadedAt: currentSession.uploadedAt,
        fileCount: currentSession.fileCount,
        stats: currentSession.stats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load scan' });
  }
});

// Delete a past scan
app.delete('/api/scans/:id', (req, res) => {
  try {
    const deleted = historyStore.deleteScan(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Scan record not found' });
    }
    res.json({ success: true, message: 'Scan record deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete scan' });
  }
});

// Compare two scans
app.post('/api/scans/compare', (req, res) => {
  try {
    const { oldScanId, newScanId } = req.body;
    if (!oldScanId || !newScanId) {
      return res.status(400).json({ error: 'Both oldScanId and newScanId are required.' });
    }

    const comparison = historyStore.compareScans(oldScanId, newScanId);
    if (!comparison) {
      return res.status(404).json({ error: 'One or both scan records were not found.' });
    }

    res.json(comparison);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compare scans' });
  }
});

// Validate Remote Git URL
app.post('/api/scan/validate-url', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ valid: false, error: 'Repository URL is required.' });
  }
  const result = validateRepoUrl(url);
  res.json(result);
});

// Remote Git Repository Scan (GitHub / GitLab / Bitbucket)
app.post('/api/scan/remote', scanLimiter, async (req, res) => {
  try {
    const {
      url,
      branch,
      weights,
      defaultBusinessCriticality,
      defaultDataLifetime,
      defaultMigrationTime,
      threatHorizon,
      confidenceThreshold,
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Repository URL is required.' });
    }

    const result = await fetchAndScanRemoteRepo(url, {
      branch,
      weights: weights ? (typeof weights === 'string' ? JSON.parse(weights) : weights) : undefined,
      defaultBusinessCriticality,
      defaultDataLifetime: defaultDataLifetime ? Number(defaultDataLifetime) : undefined,
      defaultMigrationTime: defaultMigrationTime ? Number(defaultMigrationTime) : undefined,
      threatHorizon: threatHorizon ? Number(threatHorizon) : undefined,
      confidenceThreshold: confidenceThreshold ? Number(confidenceThreshold) : undefined,
    });

    const fileMap = new Map<string, string>();
    const originalFileMap = new Map<string, string>();
    for (const f of result.files) {
      fileMap.set(f.relativePath, f.content);
      originalFileMap.set(f.relativePath, f.content);
    }

    const sessionId = `scan-remote-${Date.now()}`;
    const uploadedAt = new Date().toISOString();

    currentSession = {
      id: sessionId,
      repoName: result.repoName,
      repoUrl: result.repoUrl,
      uploadedAt,
      fileCount: result.fileCount,
      totalSizeBytes: result.totalSizeBytes,
      files: fileMap,
      originalFiles: originalFileMap,
      fileTree: result.fileTree,
      findings: result.findings,
      stats: result.stats,
      dependencyGraph: result.dependencyGraph,
      weights: weights || DEFAULT_RISK_WEIGHTS,
      defaultBusinessCriticality: defaultBusinessCriticality || 'MEDIUM',
      defaultDataLifetime: defaultDataLifetime ? Number(defaultDataLifetime) : 5,
      defaultMigrationTime: defaultMigrationTime ? Number(defaultMigrationTime) : 2,
      threatHorizon: threatHorizon ? Number(threatHorizon) : 10,
    };

    // Save to persistent scan history
    historyStore.saveScan({
      id: sessionId,
      repoName: result.repoName,
      repoUrl: result.repoUrl,
      uploadedAt,
      fileCount: result.fileCount,
      totalSizeBytes: result.totalSizeBytes,
      findings: result.findings,
      stats: result.stats,
      fileTree: result.fileTree,
      dependencyGraph: result.dependencyGraph,
    });

    res.json({
      success: true,
      repoName: result.repoName,
      repoUrl: result.repoUrl,
      uploadedAt,
      fileCount: result.fileCount,
      findings: result.findings,
      stats: result.stats,
      fileTree: result.fileTree,
      dependencyGraph: result.dependencyGraph,
    });
  } catch (err: any) {
    console.error('Remote scan error:', err);
    res.status(400).json({ error: err.message || 'Failed to scan remote repository' });
  }
});

// Knowledge Base: Return 90 reference entries
app.get('/api/knowledge-base', (req, res) => {
  try {
    const kb = getKnowledgeBase();
    res.json({ count: kb.length, algorithms: kb });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load knowledge base' });
  }
});

// Scan Status: Initial state has scanned: false
app.get('/api/scan/status', (req, res) => {
  if (!currentSession) {
    return res.json({
      scanned: false,
      repoName: null,
      uploadedAt: null,
      fileCount: 0,
      findings: [],
      stats: null,
      fileTree: [],
      dependencyGraph: { nodes: [], links: [] },
    });
  }

  res.json({
    scanned: true,
    repoName: currentSession.repoName,
    uploadedAt: currentSession.uploadedAt,
    fileCount: currentSession.fileCount,
    findings: currentSession.findings,
    stats: currentSession.stats,
    fileTree: currentSession.fileTree,
    dependencyGraph: currentSession.dependencyGraph,
    weights: currentSession.weights,
    defaultBusinessCriticality: currentSession.defaultBusinessCriticality,
    defaultDataLifetime: currentSession.defaultDataLifetime,
    defaultMigrationTime: currentSession.defaultMigrationTime,
    threatHorizon: currentSession.threatHorizon,
  });
});

// ==================== DASHBOARD STATS ENDPOINTS ====================

const handleGetStats = (req: express.Request, res: express.Response) => {
  if (!currentSession) {
    return res.json({
      scanned: false,
      message: 'No repository scanned yet.',
      repoName: null,
      uploadedAt: null,
      fileCount: 0,
      stats: null,
    });
  }
  res.json({
    scanned: true,
    repoName: currentSession.repoName,
    uploadedAt: currentSession.uploadedAt,
    fileCount: currentSession.fileCount,
    stats: currentSession.stats,
  });
};
app.get('/api/scan/stats', handleGetStats);
app.get('/api/stats', handleGetStats);

// ==================== FINDINGS & DETAILS ENDPOINTS ====================

const handleGetFindings = (req: express.Request, res: express.Response) => {
  if (!currentSession) {
    return res.json({
      scanned: false,
      message: 'No repository scanned yet.',
      totalFindings: 0,
      count: 0,
      findings: [],
    });
  }

  let list = [...currentSession.findings];
  const { priority, risk, category, quantum, detection, search, q } = req.query;

  if (priority && typeof priority === 'string' && priority !== 'ALL') {
    list = list.filter((f) => f.priority.toUpperCase() === priority.toUpperCase());
  }
  if (risk && typeof risk === 'string' && risk !== 'ALL') {
    list = list.filter((f) => f.riskLevel.toUpperCase() === risk.toUpperCase());
  }
  if (category && typeof category === 'string' && category !== 'ALL') {
    list = list.filter((f) => f.category.toUpperCase() === category.toUpperCase());
  }
  if (quantum && typeof quantum === 'string' && quantum !== 'ALL') {
    list = list.filter((f) => f.quantumStatus.toUpperCase() === quantum.toUpperCase());
  }
  if (detection && typeof detection === 'string' && detection !== 'ALL') {
    list = list.filter((f) => f.detectionType.toUpperCase() === detection.toUpperCase());
  }
  const queryStr = (search || q) as string | undefined;
  if (queryStr && queryStr.trim()) {
    const s = queryStr.toLowerCase();
    list = list.filter(
      (f) =>
        f.algorithmName.toLowerCase().includes(s) ||
        f.file.toLowerCase().includes(s) ||
        f.code.toLowerCase().includes(s) ||
        f.evidence.toLowerCase().includes(s)
    );
  }

  res.json({
    scanned: true,
    repoName: currentSession.repoName,
    totalFindings: currentSession.findings.length,
    count: list.length,
    findings: list,
  });
};
app.get('/api/scan/findings', handleGetFindings);
app.get('/api/findings', handleGetFindings);

const handleGetFindingDetail = (req: express.Request, res: express.Response) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }

  const { id } = req.params;
  const finding = currentSession.findings.find((f) => f.id === id);
  if (!finding) {
    return res.status(404).json({ error: `Finding with ID "${id}" not found.` });
  }

  // Retrieve source code snippet surrounding the finding
  const fileContent = currentSession.files.get(finding.file);
  const surroundingLines: { lineNumber: number; content: string; isDetectedLine: boolean }[] = [];
  if (fileContent) {
    const allLines = fileContent.split('\n');
    const start = Math.max(1, finding.line - 6);
    const end = Math.min(allLines.length, finding.line + 6);
    for (let l = start; l <= end; l++) {
      surroundingLines.push({
        lineNumber: l,
        content: allLines[l - 1] || '',
        isDetectedLine: l === finding.line,
      });
    }
  }

  const referenceAlgorithm = getAlgorithmById(finding.algorithmId);

  res.json({
    scanned: true,
    finding,
    surroundingLines,
    referenceAlgorithm: referenceAlgorithm || null,
  });
};
app.get('/api/scan/findings/:id', handleGetFindingDetail);
app.get('/api/findings/:id', handleGetFindingDetail);

// ==================== RECOMMENDATIONS ENDPOINTS ====================

const handleGetRecommendations = (req: express.Request, res: express.Response) => {
  if (!currentSession) {
    return res.json({
      scanned: false,
      message: 'No repository scanned yet.',
      summary: { total: 0, p1Count: 0, p2Count: 0, p3Count: 0, p4Count: 0 },
      recommendations: { p1Immediate: [], p2High: [], p3Planned: [], p4Monitor: [] },
    });
  }

  const p1 = currentSession.findings.filter((f) => f.priority === 'P1');
  const p2 = currentSession.findings.filter((f) => f.priority === 'P2');
  const p3 = currentSession.findings.filter((f) => f.priority === 'P3');
  const p4 = currentSession.findings.filter((f) => f.priority === 'P4');

  res.json({
    scanned: true,
    repoName: currentSession.repoName,
    summary: {
      total: currentSession.findings.length,
      p1Count: p1.length,
      p2Count: p2.length,
      p3Count: p3.length,
      p4Count: p4.length,
    },
    recommendations: {
      p1Immediate: p1.map((f) => ({
        id: f.id,
        algorithm: f.algorithmName,
        file: f.file,
        line: f.line,
        quantumStatus: f.quantumStatus,
        riskScore: f.riskScore,
        riskLevel: f.riskLevel,
        recommendation: f.recommendation,
        moscaEquation: `${f.dataLifetime}y (Shelf) + ${f.migrationTime}y (Migrate) > ${f.threatHorizon}y (Horizon)`,
        actionRequired: 'Replace vulnerable asymmetric public-key primitive with NIST FIPS 203 (ML-KEM) or FIPS 204 (ML-DSA).',
      })),
      p2High: p2.map((f) => ({
        id: f.id,
        algorithm: f.algorithmName,
        file: f.file,
        line: f.line,
        quantumStatus: f.quantumStatus,
        riskScore: f.riskScore,
        riskLevel: f.riskLevel,
        recommendation: f.recommendation,
        actionRequired: 'Schedule migration to modern post-quantum or hybrid cryptographic primitives.',
      })),
      p3Planned: p3.map((f) => ({
        id: f.id,
        algorithm: f.algorithmName,
        file: f.file,
        line: f.line,
        quantumStatus: f.quantumStatus,
        riskScore: f.riskScore,
        riskLevel: f.riskLevel,
        recommendation: f.recommendation,
        actionRequired: 'Plan crypto-agility refactoring and update legacy key sizes or hash functions in next release cycle.',
      })),
      p4Monitor: p4.map((f) => ({
        id: f.id,
        algorithm: f.algorithmName,
        file: f.file,
        line: f.line,
        quantumStatus: f.quantumStatus,
        riskScore: f.riskScore,
        riskLevel: f.riskLevel,
        recommendation: f.recommendation,
        actionRequired: 'Maintain current post-quantum safe / quantum-resistant posture; monitor standard updates.',
      })),
    },
  });
};
app.get('/api/scan/recommendations', handleGetRecommendations);
app.get('/api/recommendations', handleGetRecommendations);

// Export aliases
app.get('/api/export/json', (req, res) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }
  const cbom = generateCycloneDxCbom(currentSession.repoName, currentSession.findings);
  res.setHeader('Content-Disposition', `attachment; filename="${currentSession.repoName}-cbom.json"`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(cbom);
});

app.get('/api/export/csv', (req, res) => {
  if (!currentSession) {
    return res.status(400).send('No repository scanned yet.');
  }
  const csv = generateCbomCsv(currentSession.findings);
  res.setHeader('Content-Disposition', `attachment; filename="${currentSession.repoName}-cbom.csv"`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(csv);
});

// Reset scan session
app.delete('/api/scan', (req, res) => {
  currentSession = null;
  res.json({ success: true, message: 'Scan session cleared' });
});

app.post('/api/scan/reset', (req, res) => {
  currentSession = null;
  res.json({ success: true, message: 'Scan session cleared' });
});

// Upload ZIP and perform scan
app.post('/api/scan/upload', upload.single('repository'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No ZIP file uploaded. Please select a valid repository archive.' });
    }

    const originalName = req.file.originalname || 'repository.zip';
    const repoName = originalName.replace(/\.zip$/i, '');

    // Parse options from body if provided
    let weights = DEFAULT_RISK_WEIGHTS;
    if (req.body.weights) {
      try {
        weights = typeof req.body.weights === 'string' ? JSON.parse(req.body.weights) : req.body.weights;
      } catch (e) {
        // ignore
      }
    }

    const defaultBusinessCriticality = req.body.defaultBusinessCriticality || 'MEDIUM';
    const defaultDataLifetime = req.body.defaultDataLifetime ? Number(req.body.defaultDataLifetime) : 5;
    const defaultMigrationTime = req.body.defaultMigrationTime ? Number(req.body.defaultMigrationTime) : 2;
    const threatHorizon = req.body.threatHorizon ? Number(req.body.threatHorizon) : 10;
    const confidenceThreshold = req.body.confidenceThreshold ? Number(req.body.confidenceThreshold) : 30;

    // Safe extraction (rejecting path traversal, zip bombs, etc.)
    const extractedFiles = safeExtractZip(req.file.buffer);

    if (extractedFiles.length === 0) {
      return res.status(400).json({
        error: 'The uploaded ZIP archive contains no supported code or configuration files to inspect.',
      });
    }

    // Run static detection engine
    const { findings, stats, fileTree, dependencyGraph } = scanRepository(extractedFiles, {
      weights,
      defaultBusinessCriticality,
      defaultDataLifetime,
      defaultMigrationTime,
      threatHorizon,
      confidenceThreshold,
    });

    // Populate file maps for Developer View editing & downloads
    const fileMap = new Map<string, string>();
    const originalFileMap = new Map<string, string>();
    for (const f of extractedFiles) {
      fileMap.set(f.relativePath, f.content);
      originalFileMap.set(f.relativePath, f.content);
    }

    currentSession = {
      id: `session-${Date.now()}`,
      repoName,
      uploadedAt: new Date().toISOString(),
      fileCount: extractedFiles.length,
      totalSizeBytes: req.file.size,
      files: fileMap,
      originalFiles: originalFileMap,
      fileTree,
      findings,
      stats,
      dependencyGraph,
      weights,
      defaultBusinessCriticality,
      defaultDataLifetime,
      defaultMigrationTime,
      threatHorizon,
    };

    // Persist scan in history store
    historyStore.saveScan({
      id: currentSession.id,
      repoName,
      uploadedAt: currentSession.uploadedAt,
      fileCount: extractedFiles.length,
      totalSizeBytes: req.file.size,
      findings,
      stats,
      fileTree,
      dependencyGraph,
    });

    res.json({
      success: true,
      repoName,
      uploadedAt: currentSession.uploadedAt,
      fileCount: extractedFiles.length,
      findings,
      stats,
      fileTree,
      dependencyGraph,
    });
  } catch (err: any) {
    console.error('Upload scan error:', err);
    res.status(500).json({ error: err.message || 'Failed to scan repository' });
  }
});

// Recalculate Risk on updated weights or finding parameters
app.post('/api/scan/recalculate', (req, res) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }

  const {
    findingId,
    businessCriticality,
    dataLifetime,
    migrationTime,
    threatHorizon,
    weights,
  } = req.body;

  if (weights) {
    currentSession.weights = { ...currentSession.weights, ...weights };
  }
  if (threatHorizon !== undefined) {
    currentSession.threatHorizon = Number(threatHorizon);
  }

  // Update specific finding or all findings
  currentSession.findings = currentSession.findings.map((finding) => {
    let crit = finding.businessCriticality;
    let life = finding.dataLifetime;
    let mig = finding.migrationTime;
    let th = currentSession!.threatHorizon;

    if (findingId && finding.id === findingId) {
      if (businessCriticality) crit = businessCriticality;
      if (dataLifetime !== undefined) life = Number(dataLifetime);
      if (migrationTime !== undefined) mig = Number(migrationTime);
    } else if (!findingId) {
      if (businessCriticality) crit = businessCriticality;
      if (dataLifetime !== undefined) life = Number(dataLifetime);
      if (migrationTime !== undefined) mig = Number(migrationTime);
    }

    const {
      riskScore,
      riskLevel,
      priority,
      quantumRelevanceScore,
      algorithmConcernScore,
      businessCriticalityScore,
      dataLifetimeScore,
      migrationEffortScore,
      moscaAnalysis,
    } = calculateFindingRisk(
      {
        quantumStatus: finding.quantumStatus,
        classicalSecurity: finding.classicalSecurity,
        businessCriticality: crit,
        dataLifetime: life,
        migrationTime: mig,
        threatHorizon: th,
        category: finding.category,
        confidence: finding.confidence,
      },
      currentSession!.weights
    );

    return {
      ...finding,
      businessCriticality: crit,
      dataLifetime: life,
      migrationTime: mig,
      threatHorizon: th,
      riskScore,
      riskLevel,
      priority,
      quantumRelevanceScore,
      algorithmConcernScore,
      businessCriticalityScore,
      dataLifetimeScore,
      migrationEffortScore,
      moscaAnalysis,
    };
  });

  // Recompute repository stats
  const totalFindings = currentSession.findings.length;
  const criticalRisks = currentSession.findings.filter((f) => f.riskLevel === 'CRITICAL').length;
  const highRisks = currentSession.findings.filter((f) => f.riskLevel === 'HIGH').length;
  const mediumRisks = currentSession.findings.filter((f) => f.riskLevel === 'MEDIUM').length;
  const lowRisks = currentSession.findings.filter((f) => f.riskLevel === 'LOW').length;
  const minimalRisks = currentSession.findings.filter((f) => f.riskLevel === 'MINIMAL').length;
  const p1Candidates = currentSession.findings.filter((f) => f.priority === 'P1').length;
  const p2Candidates = currentSession.findings.filter((f) => f.priority === 'P2').length;
  const p3Candidates = currentSession.findings.filter((f) => f.priority === 'P3').length;
  const p4Candidates = currentSession.findings.filter((f) => f.priority === 'P4').length;

  const averageRiskScore =
    totalFindings > 0
      ? Math.round(currentSession.findings.reduce((acc, f) => acc + f.riskScore, 0) / totalFindings)
      : 0;

  let overallQuantumPosture = currentSession.stats.overallQuantumPosture;
  if (criticalRisks > 0 || p1Candidates > 0) {
    overallQuantumPosture = 'HIGH_EXPOSURE';
  } else if (highRisks > 0) {
    overallQuantumPosture = 'MODERATE_EXPOSURE';
  } else if (totalFindings > 0) {
    overallQuantumPosture = 'WELL_PREPARED';
  }

  currentSession.stats = {
    ...currentSession.stats,
    criticalRisks,
    highRisks,
    mediumRisks,
    lowRisks,
    p1Candidates,
    p2Candidates,
    p3Candidates,
    p4Candidates,
    averageRiskScore,
    overallQuantumPosture,
    riskDistribution: {
      critical: criticalRisks,
      high: highRisks,
      medium: mediumRisks,
      low: lowRisks,
      minimal: minimalRisks,
    },
    riskBreakdown: {
      critical: criticalRisks,
      high: highRisks,
      medium: mediumRisks,
      low: lowRisks,
      minimal: minimalRisks,
    },
  };

  res.json({
    success: true,
    findings: currentSession.findings,
    stats: currentSession.stats,
  });
});

// ==================== MANUAL ALGORITHMS & INVENTORY ====================

app.post('/api/algorithms/evaluate', (req, res) => {
  try {
    const {
      algorithmName,
      algorithmFamily,
      keySize,
      purpose,
      dataSensitivity,
      expectedShelfLife,
      migrationTime,
      internetExposure,
    } = req.body;

    if (!algorithmName) {
      return res.status(400).json({ error: 'Algorithm Name is required.' });
    }

    const nameUpper = String(algorithmName).toUpperCase();
    const familyUpper = String(algorithmFamily || '').toUpperCase();
    const isInternet = internetExposure === true || internetExposure === 'Yes' || internetExposure === 'true';

    const allKb = getKnowledgeBase();
    const matchedKb = allKb.find(
      (a) =>
        a.name.toUpperCase() === nameUpper ||
        nameUpper.includes(a.name.toUpperCase()) ||
        a.id.toLowerCase() === algorithmName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    );

    let quantumStatus: Finding['quantumStatus'] = 'VULNERABLE_SHOR';
    let classicalSecurity: Finding['classicalSecurity'] = 'SECURE';
    let category: Finding['category'] = (algorithmFamily as any) || 'ASYMMETRIC_KEY_EXCHANGE';
    let recommendedTarget = matchedKb?.recommended_replacement?.[0] || 'ML-KEM-768 (NIST FIPS 203)';

    if (matchedKb) {
      quantumStatus = matchedKb.quantum_status;
      classicalSecurity = matchedKb.classical_security;
      category = matchedKb.category as any;
      recommendedTarget = matchedKb.recommended_replacement?.[0] || recommendedTarget;
    } else {
      if (
        nameUpper.includes('RSA') ||
        nameUpper.includes('ECC') ||
        nameUpper.includes('ECDSA') ||
        nameUpper.includes('ECDH') ||
        nameUpper.includes('DIFFIE') ||
        nameUpper.includes('DSA') ||
        familyUpper.includes('ASYMMETRIC') ||
        familyUpper.includes('SIGNATURE')
      ) {
        quantumStatus = 'VULNERABLE_SHOR';
        const kSizeNum = Number(keySize);
        if ((nameUpper.includes('1024') || (kSizeNum && kSizeNum < 2048)) && nameUpper.includes('RSA')) {
          classicalSecurity = 'BROKEN';
        } else {
          classicalSecurity = 'SECURE';
        }
        if (familyUpper.includes('SIGNATURE') || nameUpper.includes('ECDSA') || nameUpper.includes('DSA') || purpose?.toLowerCase().includes('sign')) {
          recommendedTarget = 'ML-DSA-65 (NIST FIPS 204) / SLH-DSA (FIPS 205)';
        } else {
          recommendedTarget = 'ML-KEM-768 (NIST FIPS 203)';
        }
      } else if (
        nameUpper.includes('AES-256') ||
        (nameUpper.includes('AES') && (keySize === '256' || keySize === 256))
      ) {
        quantumStatus = 'QUANTUM_RESISTANT';
        classicalSecurity = 'SECURE';
        category = 'AEAD';
        recommendedTarget = "AES-256 remains quantum-resistant. Grover's algorithm reduces effective strength to 128 bits, which is still secure. Migration is NOT required.";
      } else if (
        nameUpper.includes('AES-128') ||
        (nameUpper.includes('AES') && (keySize === '128' || keySize === 128))
      ) {
        quantumStatus = 'PARTIALLY_VULNERABLE_GROVER';
        classicalSecurity = 'SECURE';
        category = 'AEAD';
        recommendedTarget = 'AES-256-GCM (NIST SP 800-38D)';
      } else if (
        nameUpper.includes('DES') ||
        nameUpper.includes('3DES') ||
        nameUpper.includes('RC4') ||
        nameUpper.includes('BLOWFISH')
      ) {
        quantumStatus = 'VULNERABLE_SHOR';
        classicalSecurity = 'BROKEN';
        category = 'SYMMETRIC_ENCRYPTION';
        recommendedTarget = 'AES-256-GCM (NIST SP 800-38D)';
      } else if (nameUpper.includes('MD5') || nameUpper.includes('SHA1') || nameUpper.includes('SHA-1')) {
        quantumStatus = 'VULNERABLE_SHOR';
        classicalSecurity = 'BROKEN';
        category = 'HASH_FUNCTIONS';
        recommendedTarget = 'SHA-256 / SHA3-256 (NIST FIPS 202)';
      } else if (nameUpper.includes('SHA-256') || nameUpper.includes('SHA-384') || nameUpper.includes('SHA-512') || nameUpper.includes('SHA3')) {
        quantumStatus = 'QUANTUM_RESISTANT';
        classicalSecurity = 'SECURE';
        category = 'HASH_FUNCTIONS';
        recommendedTarget = 'Current Hash is Quantum Resistant (No Migration Required)';
      } else if (nameUpper.includes('KYBER') || nameUpper.includes('ML-KEM') || nameUpper.includes('DILITHIUM') || nameUpper.includes('ML-DSA')) {
        quantumStatus = 'QUANTUM_SAFE';
        classicalSecurity = 'SECURE';
        category = 'ASYMMETRIC_KEY_EXCHANGE';
        recommendedTarget = 'Already Post-Quantum Standard (FIPS 203/204)';
      }
    }

    const weights = currentSession?.weights || DEFAULT_RISK_WEIGHTS;
    const threatHorizon = currentSession?.threatHorizon ?? 10;
    const dataLifetime = Number(expectedShelfLife) || 5;
    const migTime = Number(migrationTime) || 2;
    const sensitivity = (dataSensitivity as any) || 'MEDIUM';

    const riskCalc = calculateFindingRisk(
      {
        quantumStatus,
        classicalSecurity,
        businessCriticality: sensitivity,
        dataLifetime,
        migrationTime: migTime,
        threatHorizon,
        category,
        confidence: 100,
        internetFacing: isInternet,
        keySize: keySize ? String(keySize) : undefined,
        purpose: purpose || 'Manual Inventory Asset',
      },
      weights
    );

    const manualFinding: Finding = {
      id: `manual-algo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file: 'Manual Inventory / Registered Algorithm',
      line: 1,
      column: 1,
      code: `${algorithmName} (${keySize ? `${keySize}-bit` : 'Standard'}) - Purpose: ${purpose || 'Cryptographic Asset'}`,
      surroundingCode: [],
      algorithmId: matchedKb?.id || algorithmName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      algorithmName,
      category,
      algorithmType: (algorithmFamily as any) || 'ASYMMETRIC_KEY_EXCHANGE',
      status: matchedKb?.status || 'CURRENT',
      quantumStatus,
      classicalSecurity,
      detectionType: 'ACTIVE_USAGE',
      confidence: 100,
      evidence: `Manually added by security analyst. Sensitivity: ${sensitivity}. Exposure: ${isInternet ? 'Internet Facing' : 'Internal Only'}. Shelf-Life: ${dataLifetime}y. Migration Time: ${migTime}y.`,
      context: 'Manual Inventory Entry',
      detectedArtefact: algorithmName,
      cryptographicPurpose: (purpose as any) || 'UNKNOWN',
      keySize: keySize ? String(keySize) : undefined,
      library: 'Manual',
      protocol: 'N/A',
      ruleMatched: 'MANUAL_ENTRY',
      reason: 'Registered manually via Cryptographic Inventory Manager',
      explanationFactors: [
        `Quantum Status: ${quantumStatus}`,
        `Data Sensitivity: ${sensitivity}`,
        `Lifetime: ${dataLifetime} years`,
      ],
      vision1: {
        algorithm: algorithmName,
        riskLevel: riskCalc.riskLevel,
        purpose: purpose || 'Manual Cryptographic Asset',
        quantumThreat: quantumStatus === 'VULNERABLE_SHOR' ? 'Vulnerable to Shor Algorithm' : 'Quantum Resistant',
        status: quantumStatus === 'QUANTUM_SAFE' ? 'POST_QUANTUM' : 'CURRENT',
      },
      vision2: {
        targetAlgorithm: recommendedTarget,
        standard: recommendedTarget.includes('FIPS') ? 'NIST FIPS PQC' : 'NIST SP 800',
        targetRiskLevel: 'MINIMAL',
        migrationComplexity: 'LOW',
        recommendedTimeline: 'Q1-Q4',
        rationale: 'Post-quantum resilience and cryptographic agility alignment.',
      },
      businessCriticality: sensitivity,
      dataLifetime,
      migrationTime: migTime,
      threatHorizon,
      riskScore: riskCalc.riskScore,
      riskLevel: riskCalc.riskLevel,
      riskCategory: riskCalc.riskCategory,
      priority: riskCalc.priority,
      priorityReason: riskCalc.priorityReason,
      whyRiskLevel: riskCalc.whyRiskLevel,
      internetFacing: isInternet,
      quantumRelevanceScore: 80,
      algorithmConcernScore: 70,
      businessCriticalityScore: 60,
      dataLifetimeScore: 50,
      migrationEffortScore: 40,
      moscaAnalysis: riskCalc.moscaAnalysis,
      recommendation: recommendedTarget,
      remediation: {
        problem: riskCalc.whyRiskLevel.vulnerableAlgorithm,
        whyItMatters: riskCalc.whyRiskLevel.cryptographicPurpose,
        suggestedDirection: recommendedTarget,
        developerNextStep: `Transition instances of ${algorithmName} to ${recommendedTarget} under crypto-agile abstraction provider.`,
      },
      dependencies: [],
    };

    res.json({
      success: true,
      finding: manualFinding,
      riskScore: riskCalc.riskScore,
      riskLevel: riskCalc.riskLevel,
      priority: riskCalc.priority,
      priorityReason: riskCalc.priorityReason,
      riskCategory: riskCalc.riskCategory,
      whyRiskLevel: riskCalc.whyRiskLevel,
      recommendedTarget,
      moscaAnalysis: riskCalc.moscaAnalysis,
    });
  } catch (err: any) {
    console.error('Error evaluating manual algorithm:', err);
    res.status(500).json({ error: err.message || 'Failed to evaluate algorithm' });
  }
});

app.post('/api/algorithms/add-to-inventory', (req, res) => {
  try {
    const {
      algorithmName,
      algorithmFamily,
      keySize,
      purpose,
      dataSensitivity,
      expectedShelfLife,
      migrationTime,
      internetExposure,
    } = req.body;

    if (!algorithmName) {
      return res.status(400).json({ error: 'Algorithm Name is required.' });
    }

    const nameUpper = String(algorithmName).toUpperCase();
    const familyUpper = String(algorithmFamily || '').toUpperCase();
    const isInternet = internetExposure === true || internetExposure === 'Yes' || internetExposure === 'true';

    const allKb = getKnowledgeBase();
    const matchedKb = allKb.find(
      (a) =>
        a.name.toUpperCase() === nameUpper ||
        nameUpper.includes(a.name.toUpperCase()) ||
        a.id.toLowerCase() === algorithmName.toLowerCase().replace(/[^a-z0-9]/g, '_')
    );

    let quantumStatus: Finding['quantumStatus'] = 'VULNERABLE_SHOR';
    let classicalSecurity: Finding['classicalSecurity'] = 'SECURE';
    let category: Finding['category'] = (algorithmFamily as any) || 'ASYMMETRIC_KEY_EXCHANGE';
    let recommendedTarget = matchedKb?.recommended_replacement?.[0] || 'ML-KEM-768 (NIST FIPS 203)';

    if (matchedKb) {
      quantumStatus = matchedKb.quantum_status;
      classicalSecurity = matchedKb.classical_security;
      category = matchedKb.category as any;
      recommendedTarget = matchedKb.recommended_replacement?.[0] || recommendedTarget;
    } else {
      if (
        nameUpper.includes('RSA') ||
        nameUpper.includes('ECC') ||
        nameUpper.includes('ECDSA') ||
        nameUpper.includes('ECDH') ||
        nameUpper.includes('DIFFIE') ||
        nameUpper.includes('DSA') ||
        familyUpper.includes('ASYMMETRIC') ||
        familyUpper.includes('SIGNATURE')
      ) {
        quantumStatus = 'VULNERABLE_SHOR';
        const kSizeNum = Number(keySize);
        if ((nameUpper.includes('1024') || (kSizeNum && kSizeNum < 2048)) && nameUpper.includes('RSA')) {
          classicalSecurity = 'BROKEN';
        } else {
          classicalSecurity = 'SECURE';
        }
        if (familyUpper.includes('SIGNATURE') || nameUpper.includes('ECDSA') || nameUpper.includes('DSA') || purpose?.toLowerCase().includes('sign')) {
          recommendedTarget = 'ML-DSA-65 (NIST FIPS 204) / SLH-DSA (FIPS 205)';
        } else {
          recommendedTarget = 'ML-KEM-768 (NIST FIPS 203)';
        }
      } else if (
        nameUpper.includes('AES-256') ||
        (nameUpper.includes('AES') && (keySize === '256' || keySize === 256))
      ) {
        quantumStatus = 'QUANTUM_RESISTANT';
        classicalSecurity = 'SECURE';
        category = 'AEAD';
        recommendedTarget = "AES-256 remains quantum-resistant. Grover's algorithm reduces effective strength to 128 bits, which is still secure. Migration is NOT required.";
      } else if (
        nameUpper.includes('AES-128') ||
        (nameUpper.includes('AES') && (keySize === '128' || keySize === 128))
      ) {
        quantumStatus = 'PARTIALLY_VULNERABLE_GROVER';
        classicalSecurity = 'SECURE';
        category = 'AEAD';
        recommendedTarget = 'AES-256-GCM (NIST SP 800-38D)';
      } else if (
        nameUpper.includes('DES') ||
        nameUpper.includes('3DES') ||
        nameUpper.includes('RC4') ||
        nameUpper.includes('BLOWFISH')
      ) {
        quantumStatus = 'VULNERABLE_SHOR';
        classicalSecurity = 'BROKEN';
        category = 'SYMMETRIC_ENCRYPTION';
        recommendedTarget = 'AES-256-GCM (NIST SP 800-38D)';
      } else if (nameUpper.includes('MD5') || nameUpper.includes('SHA1') || nameUpper.includes('SHA-1')) {
        quantumStatus = 'VULNERABLE_SHOR';
        classicalSecurity = 'BROKEN';
        category = 'HASH_FUNCTIONS';
        recommendedTarget = 'SHA-256 / SHA3-256 (NIST FIPS 202)';
      } else if (nameUpper.includes('SHA-256') || nameUpper.includes('SHA-384') || nameUpper.includes('SHA-512') || nameUpper.includes('SHA3')) {
        quantumStatus = 'QUANTUM_RESISTANT';
        classicalSecurity = 'SECURE';
        category = 'HASH_FUNCTIONS';
        recommendedTarget = 'Current Hash is Quantum Resistant (No Migration Required)';
      } else if (nameUpper.includes('KYBER') || nameUpper.includes('ML-KEM') || nameUpper.includes('DILITHIUM') || nameUpper.includes('ML-DSA')) {
        quantumStatus = 'QUANTUM_SAFE';
        classicalSecurity = 'SECURE';
        category = 'ASYMMETRIC_KEY_EXCHANGE';
        recommendedTarget = 'Already Post-Quantum Standard (FIPS 203/204)';
      }
    }

    const weights = currentSession?.weights || DEFAULT_RISK_WEIGHTS;
    const threatHorizon = currentSession?.threatHorizon ?? 10;
    const dataLifetime = Number(expectedShelfLife) || 5;
    const migTime = Number(migrationTime) || 2;
    const sensitivity = (dataSensitivity as any) || 'MEDIUM';

    const riskCalc = calculateFindingRisk(
      {
        quantumStatus,
        classicalSecurity,
        businessCriticality: sensitivity,
        dataLifetime,
        migrationTime: migTime,
        threatHorizon,
        category,
        confidence: 100,
        internetFacing: isInternet,
        keySize: keySize ? String(keySize) : undefined,
        purpose: purpose || 'Manual Inventory Asset',
      },
      weights
    );

    const manualFinding: Finding = {
      id: `manual-algo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file: 'Manual Inventory / Registered Algorithm',
      line: 1,
      column: 1,
      code: `${algorithmName} (${keySize ? `${keySize}-bit` : 'Standard'}) - Purpose: ${purpose || 'Cryptographic Asset'}`,
      surroundingCode: [],
      algorithmId: matchedKb?.id || algorithmName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      algorithmName,
      category,
      algorithmType: (algorithmFamily as any) || 'ASYMMETRIC_KEY_EXCHANGE',
      status: matchedKb?.status || 'CURRENT',
      quantumStatus,
      classicalSecurity,
      detectionType: 'ACTIVE_USAGE',
      confidence: 100,
      evidence: `Manually added by security analyst. Sensitivity: ${sensitivity}. Exposure: ${isInternet ? 'Internet Facing' : 'Internal Only'}. Shelf-Life: ${dataLifetime}y. Migration Time: ${migTime}y.`,
      context: 'Manual Inventory Entry',
      detectedArtefact: algorithmName,
      cryptographicPurpose: (purpose as any) || 'UNKNOWN',
      keySize: keySize ? String(keySize) : undefined,
      library: 'Manual',
      protocol: 'N/A',
      ruleMatched: 'MANUAL_ENTRY',
      reason: 'Registered manually via Cryptographic Inventory Manager',
      explanationFactors: [
        `Quantum Status: ${quantumStatus}`,
        `Data Sensitivity: ${sensitivity}`,
        `Lifetime: ${dataLifetime} years`,
      ],
      vision1: {
        algorithm: algorithmName,
        riskLevel: riskCalc.riskLevel,
        purpose: purpose || 'Manual Cryptographic Asset',
        quantumThreat: quantumStatus === 'VULNERABLE_SHOR' ? 'Vulnerable to Shor Algorithm' : 'Quantum Resistant',
        status: quantumStatus === 'QUANTUM_SAFE' ? 'POST_QUANTUM' : 'CURRENT',
      },
      vision2: {
        targetAlgorithm: recommendedTarget,
        standard: recommendedTarget.includes('FIPS') ? 'NIST FIPS PQC' : 'NIST SP 800',
        targetRiskLevel: 'MINIMAL',
        migrationComplexity: 'LOW',
        recommendedTimeline: 'Q1-Q4',
        rationale: 'Post-quantum resilience and cryptographic agility alignment.',
      },
      businessCriticality: sensitivity,
      dataLifetime,
      migrationTime: migTime,
      threatHorizon,
      riskScore: riskCalc.riskScore,
      riskLevel: riskCalc.riskLevel,
      riskCategory: riskCalc.riskCategory,
      priority: riskCalc.priority,
      priorityReason: riskCalc.priorityReason,
      whyRiskLevel: riskCalc.whyRiskLevel,
      internetFacing: isInternet,
      quantumRelevanceScore: 80,
      algorithmConcernScore: 70,
      businessCriticalityScore: 60,
      dataLifetimeScore: 50,
      migrationEffortScore: 40,
      moscaAnalysis: riskCalc.moscaAnalysis,
      recommendation: recommendedTarget,
      remediation: {
        problem: riskCalc.whyRiskLevel.vulnerableAlgorithm,
        whyItMatters: riskCalc.whyRiskLevel.cryptographicPurpose,
        suggestedDirection: recommendedTarget,
        developerNextStep: `Transition instances of ${algorithmName} to ${recommendedTarget} under crypto-agile abstraction provider.`,
      },
      dependencies: [],
    };

    if (!currentSession) {
      currentSession = {
        id: `session-manual-${Date.now()}`,
        repoName: 'Cryptographic Inventory',
        uploadedAt: new Date().toISOString(),
        fileCount: 1,
        totalSizeBytes: 1024,
        files: new Map(),
        originalFiles: new Map(),
        fileTree: [],
        findings: [manualFinding],
        stats: calculateStatsFromFindings([manualFinding]),
        dependencyGraph: { nodes: [], links: [] },
        weights: DEFAULT_RISK_WEIGHTS,
        defaultBusinessCriticality: 'MEDIUM',
        defaultDataLifetime: 5,
        defaultMigrationTime: 2,
        threatHorizon: 10,
      };
    } else {
      currentSession.findings.push(manualFinding);
      currentSession.stats = calculateStatsFromFindings(
        currentSession.findings,
        Math.max(1, currentSession.fileCount)
      );
    }

    res.json({
      success: true,
      finding: manualFinding,
      stats: currentSession.stats,
      totalFindings: currentSession.findings.length,
    });
  } catch (err: any) {
    console.error('Error adding manual algorithm:', err);
    res.status(500).json({ error: err.message || 'Failed to add algorithm to inventory' });
  }
});

// ==================== MIGRATION SIMULATOR ENDPOINT ====================

app.post('/api/migration/simulate', (req, res) => {
  try {
    const { currentAlgorithm, targetAlgorithm, keySize } = req.body;

    if (!currentAlgorithm || !targetAlgorithm) {
      return res.status(400).json({ error: 'currentAlgorithm and targetAlgorithm are required.' });
    }

    const cur = String(currentAlgorithm).toUpperCase();
    const tgt = String(targetAlgorithm).toUpperCase();

    // Baseline risk score mapping
    let beforeRiskScore = 75;
    if (cur.includes('DES') || cur.includes('3DES') || cur.includes('RC4') || cur.includes('MD5')) {
      beforeRiskScore = 95;
    } else if (cur.includes('RSA-1024') || cur.includes('SHA-1') || cur.includes('SHA1')) {
      beforeRiskScore = 90;
    } else if (cur.includes('RSA-2048') || cur.includes('RSA') || cur.includes('ECC') || cur.includes('ECDSA') || cur.includes('ED25519') || cur.includes('ECDH')) {
      beforeRiskScore = 85;
    } else if (cur.includes('RSA-4096')) {
      beforeRiskScore = 80;
    } else if (cur.includes('AES-128')) {
      beforeRiskScore = 45;
    } else if (cur.includes('AES-256')) {
      beforeRiskScore = 15;
    }

    // Target risk score mapping
    let afterRiskScore = 18;
    if (tgt.includes('ML-KEM-1024') || tgt.includes('ML-DSA-87')) {
      afterRiskScore = 12;
    } else if (tgt.includes('ML-KEM') || tgt.includes('ML-DSA') || tgt.includes('KYBER') || tgt.includes('DILITHIUM')) {
      afterRiskScore = 18;
    } else if (tgt.includes('HYBRID') || tgt.includes('X25519')) {
      afterRiskScore = 16;
    } else if (tgt.includes('SLH-DSA') || tgt.includes('SPHINCS')) {
      afterRiskScore = 20;
    } else if (tgt.includes('AES-256') || tgt.includes('SHA-256') || tgt.includes('SHA3')) {
      afterRiskScore = 15;
    } else if (tgt.includes('RSA') || tgt.includes('ECC')) {
      afterRiskScore = 82;
    }

    // Cryptographic strength calculation
    let strengthBefore = 'Classical: 112 bits / Quantum: 0 bits (Vulnerable to Shor)';
    if (cur.includes('DES') || cur.includes('MD5') || cur.includes('SHA-1')) {
      strengthBefore = 'Classical: < 64 bits (Broken) / Quantum: 0 bits';
    } else if (cur.includes('AES-256')) {
      strengthBefore = 'Classical: 256 bits / Quantum: 128 bits (Quantum-Resistant)';
    } else if (cur.includes('AES-128')) {
      strengthBefore = 'Classical: 128 bits / Quantum: 64 bits (Grover Halved)';
    }

    let strengthAfter = 'Classical: 192 bits / Quantum: 128 bits (NIST Level 3 Post-Quantum Safe)';
    if (tgt.includes('1024') || tgt.includes('87')) {
      strengthAfter = 'Classical: 256 bits / Quantum: 192 bits (NIST Level 5 Post-Quantum Safe)';
    } else if (tgt.includes('AES-256')) {
      strengthAfter = 'Classical: 256 bits / Quantum: 128 bits (Post-Quantum Grover Margin)';
    }

    // Performance metrics
    let keySizeChange = '+928 bytes (Public key grows from 256 B to 1,184 B)';
    let ciphertextChange = '+832 bytes (Ciphertext grows from 256 B to 1,088 B)';
    let latencyImpact = 'Key generation: ~10% slower; Encapsulation / Decapsulation: 5x-10x faster than RSA modular exponentiation';
    let complexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    let complexityReason = 'Medium: Requires KEM API abstraction, hybrid mode negotiation, and buffer size expansion in protocol headers.';
    let rationale = `Migrating from ${currentAlgorithm} to ${targetAlgorithm} permanently eliminates Shor's algorithm threat by deploying standardized lattice-based post-quantum cryptography (NIST FIPS 203/204).`;

    // Special case check: AES-256
    if (cur.includes('AES-256')) {
      rationale = "AES-256 remains quantum-resistant. Grover's algorithm reduces effective strength to 128 bits, which is still secure. Migration is NOT required.";
      complexity = 'LOW';
      complexityReason = 'Maintain existing AES-256-GCM configurations with unique random nonces.';
      keySizeChange = '0 bytes (No change required)';
      ciphertextChange = '0 bytes';
      latencyImpact = 'Baseline line-rate hardware acceleration (AES-NI).';
    } else if (tgt.includes('HYBRID')) {
      complexity = 'HIGH';
      complexityReason = 'High: Combines classical ECDH with ML-KEM; requires dual public key transmission and dual shared secret derivation.';
    } else if (cur.includes('MD5') || cur.includes('SHA-1')) {
      complexity = 'LOW';
      complexityReason = 'Low: Direct drop-in replacement of digest primitive to SHA-256 or SHA3-256.';
      keySizeChange = 'N/A (Unkeyed hash)';
      ciphertextChange = '+16 bytes digest expansion';
      latencyImpact = 'Near-zero perceptible latency change; hardware SHA acceleration supported on modern CPUs.';
    }

    res.json({
      success: true,
      currentAlgorithm,
      targetAlgorithm,
      beforeRiskScore,
      afterRiskScore,
      riskReduction: Math.max(0, beforeRiskScore - afterRiskScore),
      strengthBefore,
      strengthAfter,
      performanceImpact: {
        keySizeChange,
        ciphertextChange,
        latencyImpact,
      },
      complexity,
      complexityReason,
      rationale,
    });
  } catch (err: any) {
    console.error('Migration simulation error:', err);
    res.status(500).json({ error: err.message || 'Failed to simulate migration' });
  }
});

// Developer View: Get file content
app.get('/api/scan/file', (req, res) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }

  const filePath = req.query.path as string;
  if (!filePath || !currentSession.files.has(filePath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }

  const content = currentSession.files.get(filePath)!;
  const lines = content.split('\n');
  const fileFindings = currentSession.findings.filter((f) => f.file === filePath);

  res.json({
    path: filePath,
    content,
    lineCount: lines.length,
    findings: fileFindings,
    isModified: currentSession.originalFiles.get(filePath) !== content,
  });
});

// Developer View: Save modified file content
app.post('/api/scan/file', (req, res) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }

  const { path: filePath, content } = req.body;
  if (!filePath || typeof content !== 'string') {
    return res.status(400).json({ error: 'Invalid file path or content.' });
  }

  // Update working copy
  currentSession.files.set(filePath, content);

  // Re-scan repository with updated file
  const extractedFiles = Array.from(currentSession.files.entries()).map(([p, c]) => ({
    relativePath: p,
    content: c,
    size: Buffer.byteLength(c, 'utf-8'),
  }));

  const rescanned = scanRepository(extractedFiles, {
    weights: currentSession.weights,
    defaultBusinessCriticality: currentSession.defaultBusinessCriticality,
    defaultDataLifetime: currentSession.defaultDataLifetime,
    defaultMigrationTime: currentSession.defaultMigrationTime,
    threatHorizon: currentSession.threatHorizon,
  });

  currentSession.findings = rescanned.findings;
  currentSession.stats = rescanned.stats;
  currentSession.fileTree = rescanned.fileTree;
  currentSession.dependencyGraph = rescanned.dependencyGraph;

  const fileFindings = currentSession.findings.filter((f) => f.file === filePath);

  res.json({
    success: true,
    message: 'File saved and re-scanned successfully.',
    path: filePath,
    findings: fileFindings,
    stats: currentSession.stats,
    isModified: currentSession.originalFiles.get(filePath) !== content,
  });
});

// Developer View: Reset file to original uploaded state
app.post('/api/scan/reset-file', (req, res) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }

  const { path: filePath } = req.body;
  if (!filePath || !currentSession.originalFiles.has(filePath)) {
    return res.status(404).json({ error: 'Original file content not found.' });
  }

  const original = currentSession.originalFiles.get(filePath)!;
  currentSession.files.set(filePath, original);

  // Re-scan repository
  const extractedFiles = Array.from(currentSession.files.entries()).map(([p, c]) => ({
    relativePath: p,
    content: c,
    size: Buffer.byteLength(c, 'utf-8'),
  }));

  const rescanned = scanRepository(extractedFiles, {
    weights: currentSession.weights,
    defaultBusinessCriticality: currentSession.defaultBusinessCriticality,
    defaultDataLifetime: currentSession.defaultDataLifetime,
    defaultMigrationTime: currentSession.defaultMigrationTime,
    threatHorizon: currentSession.threatHorizon,
  });

  currentSession.findings = rescanned.findings;
  currentSession.stats = rescanned.stats;
  currentSession.fileTree = rescanned.fileTree;
  currentSession.dependencyGraph = rescanned.dependencyGraph;

  res.json({
    success: true,
    message: 'File reset to original uploaded content.',
    path: filePath,
    content: original,
    findings: currentSession.findings.filter((f) => f.file === filePath),
    stats: currentSession.stats,
    isModified: false,
  });
});

// Download single file
app.get('/api/scan/download/file', (req, res) => {
  if (!currentSession) {
    return res.status(400).send('No repository scanned yet.');
  }

  const filePath = req.query.path as string;
  if (!filePath || !currentSession.files.has(filePath)) {
    return res.status(404).send(`File not found: ${filePath}`);
  }

  const content = currentSession.files.get(filePath)!;
  const filename = path.basename(filePath);

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(content);
});

// Download updated repository as ZIP
app.get('/api/scan/download/zip', (req, res) => {
  if (!currentSession) {
    return res.status(400).send('No repository scanned yet.');
  }

  try {
    const zip = new AdmZip();
    for (const [relPath, content] of currentSession.files.entries()) {
      zip.addFile(relPath, Buffer.from(content, 'utf-8'));
    }

    const zipBuffer = zip.toBuffer();
    const downloadName = `${currentSession.repoName}-updated.zip`;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).send(`Failed to generate ZIP: ${err.message}`);
  }
});

// Export CBOM (CycloneDX 1.6 or CSV)
app.get('/api/scan/cbom', (req, res) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }

  const format = (req.query.format as string) || 'json';
  if (format === 'csv') {
    const csv = generateCbomCsv(currentSession.findings);
    res.setHeader('Content-Disposition', `attachment; filename="${currentSession.repoName}-cbom.csv"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(csv);
  }

  const cbom = generateCycloneDxCbom(currentSession.repoName, currentSession.findings);
  res.setHeader('Content-Disposition', `attachment; filename="${currentSession.repoName}-cbom.json"`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(cbom);
});

// AI & Deterministic Migration Advisory
app.post('/api/ai/advisory', async (req, res) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }

  const { findingId } = req.body;
  const finding = currentSession.findings.find((f) => f.id === findingId);
  if (!finding) {
    return res.status(404).json({ error: 'Finding not found.' });
  }

  try {
    const advisory = await getAiAdvisory(finding);
    res.json(advisory);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate advisory.' });
  }
});

// Migration Simulator
app.post('/api/scan/simulate', (req, res) => {
  if (!currentSession) {
    return res.status(400).json({ error: 'No repository scanned yet.' });
  }

  const { findingId, targetAlgorithmId } = req.body;
  const finding = currentSession.findings.find((f) => f.id === findingId);
  if (!finding) {
    return res.status(404).json({ error: 'Finding not found.' });
  }

  const targetAlgo = getAlgorithmById(targetAlgorithmId);
  if (!targetAlgo) {
    return res.status(404).json({ error: 'Target algorithm not found in knowledge base.' });
  }

  // Calculate simulated finding score
  const simulatedRisk = calculateFindingRisk(
    {
      quantumStatus: targetAlgo.quantum_status,
      classicalSecurity: targetAlgo.classical_security,
      businessCriticality: finding.businessCriticality,
      dataLifetime: finding.dataLifetime,
      migrationTime: finding.migrationTime,
      threatHorizon: finding.threatHorizon,
      category: targetAlgo.category,
      confidence: finding.confidence,
    },
    currentSession.weights
  );

  // Calculate simulated repository risk delta
  const simulatedFindings = currentSession.findings.map((f) =>
    f.id === findingId ? { ...f, riskScore: simulatedRisk.riskScore, riskLevel: simulatedRisk.riskLevel } : f
  );

  const beforeAverage = currentSession.stats.averageRiskScore;
  const afterAverage = Math.round(
    simulatedFindings.reduce((sum, f) => sum + f.riskScore, 0) / (simulatedFindings.length || 1)
  );

  res.json({
    findingId,
    originalAlgorithm: finding.algorithmName,
    originalRiskScore: finding.riskScore,
    originalRiskLevel: finding.riskLevel,
    targetAlgorithm: targetAlgo.name,
    targetQuantumStatus: targetAlgo.quantum_status,
    simulatedRiskScore: simulatedRisk.riskScore,
    simulatedRiskLevel: simulatedRisk.riskLevel,
    simulatedPriority: simulatedRisk.priority,
    simulatedMosca: simulatedRisk.moscaAnalysis,
    repoAverageBefore: beforeAverage,
    repoAverageAfter: afterAverage,
    delta: beforeAverage - afterAverage,
    notes: 'SIMULATION ONLY: This projection estimates security score changes based on substituting the current algorithm with the selected post-quantum candidate.',
  });
});

// ==================== VITE & PRODUCTION HANDLERS ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CRYPTOVISTA Server running on http://localhost:${PORT}`);
  });
}

startServer();
