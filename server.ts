import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { safeExtractZip, scanRepository } from './server/scanner.js';
import { getKnowledgeBase, getAlgorithmById } from './server/knowledgeBase.js';
import { calculateFindingRisk, DEFAULT_RISK_WEIGHTS } from './server/riskEngine.js';
import { generateCycloneDxCbom, generateCbomCsv } from './server/cbom.js';
import { getAiAdvisory } from './server/recommendations.js';
import { ScanSession, Finding } from './server/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer in-memory storage with configurable upload limit (default 30MB)
let maxUploadSizeBytes = 30 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadSizeBytes,
  },
});

// In-memory active scan session (null when no repository scanned yet)
let currentSession: ScanSession | null = null;

// ==================== API ROUTES ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CRYPTOVISTA Enterprise Cryptographic Discovery' });
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
    },
    riskBreakdown: {
      critical: criticalRisks,
      high: highRisks,
      medium: mediumRisks,
      low: lowRisks,
    },
  };

  res.json({
    success: true,
    findings: currentSession.findings,
    stats: currentSession.stats,
  });
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
