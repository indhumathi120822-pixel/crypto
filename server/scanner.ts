import AdmZip from 'adm-zip';
import path from 'path';
import {
  Finding,
  FileTreeNode,
  ScanStats,
  AgilityAnalysis,
  AgilityFinding,
  DependencyGraph,
  DependencyNode,
  DependencyLink,
  DetectionType,
  BusinessCriticality,
  RiskWeights,
} from './types.js';
import { getKnowledgeBase } from './knowledgeBase.js';
import { calculateFindingRisk, DEFAULT_RISK_WEIGHTS } from './riskEngine.js';
import { generateRecommendation } from './recommendations.js';

const SCANNABLE_EXTENSIONS = new Set([
  '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.rs',
  '.kt', '.swift', '.yaml', '.yml', '.json', '.xml',
  '.conf', '.config', '.properties', '.env', 'dockerfile'
]);

const MANIFEST_NAMES = new Set([
  'package.json', 'requirements.txt', 'pom.xml',
  'build.gradle', 'go.mod', 'cargo.toml', 'gemfile'
]);

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', '__pycache__', '.idea', '.vscode',
  'dist', 'build', 'target', 'bin', 'obj', '.venv', 'vendor'
]);

interface ExtractedFile {
  relativePath: string;
  content: string;
  size: number;
}

export function safeExtractZip(
  zipBuffer: Buffer,
  maxUncompressedBytes: number = 50 * 1024 * 1024
): ExtractedFile[] {
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err: any) {
    throw new Error(`Invalid or corrupted ZIP archive: ${err?.message || 'Failed to parse'}`);
  }

  const entries = zip.getEntries();
  const extractedFiles: ExtractedFile[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const rawName = entry.entryName.replace(/\\/g, '/');

    // Safe path validation: Prevent path traversal attacks (../, absolute paths, drive letters)
    if (
      rawName.includes('../') ||
      rawName.includes('/..') ||
      rawName.startsWith('/') ||
      /^[a-zA-Z]:/.test(rawName) ||
      rawName.includes('\0')
    ) {
      console.warn(`[Security Alert] Skipped unsafe zip path: ${rawName}`);
      continue;
    }

    // Filter out ignored top-level or internal directories
    const parts = rawName.split('/');
    if (parts.some((part) => IGNORED_DIRS.has(part.toLowerCase()))) {
      continue;
    }

    const uncompressedSize = entry.header.size;
    totalBytes += uncompressedSize;

    // Zip bomb detection
    if (totalBytes > maxUncompressedBytes) {
      throw new Error(
        `Zip extraction exceeded maximum permitted uncompressed threshold (${Math.round(
          maxUncompressedBytes / (1024 * 1024)
        )}MB). Extraction aborted to prevent zip bomb.`
      );
    }

    try {
      const buffer = entry.getData();
      // Check if binary by checking null bytes in first 1024 bytes
      const isBinary = buffer.subarray(0, Math.min(1024, buffer.length)).includes(0);
      if (isBinary) {
        continue;
      }
      const content = buffer.toString('utf-8');
      extractedFiles.push({
        relativePath: rawName,
        content,
        size: uncompressedSize,
      });
    } catch (readErr) {
      console.warn(`Could not decode file ${rawName}, skipping:`, readErr);
    }
  }

  return extractedFiles;
}

export function buildFileTree(files: ExtractedFile[], findingCounts?: Map<string, number>): FileTreeNode[] {
  const rootNodes: FileTreeNode[] = [];
  const dirMap = new Map<string, FileTreeNode>();

  for (const file of files) {
    const parts = file.relativePath.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const prevPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLast) {
        const fileNode: FileTreeNode = {
          id: currentPath,
          name: part,
          path: currentPath,
          type: 'file',
          size: file.size,
          findingCount: findingCounts?.get(currentPath) || 0,
        };

        if (prevPath && dirMap.has(prevPath)) {
          dirMap.get(prevPath)!.children!.push(fileNode);
        } else {
          rootNodes.push(fileNode);
        }
      } else {
        if (!dirMap.has(currentPath)) {
          const dirNode: FileTreeNode = {
            id: currentPath,
            name: part,
            path: currentPath,
            type: 'directory',
            children: [],
            findingCount: 0,
          };
          dirMap.set(currentPath, dirNode);

          if (prevPath && dirMap.has(prevPath)) {
            dirMap.get(prevPath)!.children!.push(dirNode);
          } else {
            rootNodes.push(dirNode);
          }
        }
      }
    }
  }

  // Aggregate finding counts to parent directories
  function updateDirFindingCounts(node: FileTreeNode): number {
    if (node.type === 'file') {
      return node.findingCount || 0;
    }
    let sum = 0;
    if (node.children) {
      for (const child of node.children) {
        sum += updateDirFindingCounts(child);
      }
    }
    node.findingCount = sum;
    return sum;
  }

  for (const root of rootNodes) {
    updateDirFindingCounts(root);
  }

  return rootNodes;
}

export function scanRepository(
  files: ExtractedFile[],
  options: {
    weights?: RiskWeights;
    defaultBusinessCriticality?: BusinessCriticality;
    defaultDataLifetime?: number;
    defaultMigrationTime?: number;
    threatHorizon?: number;
    confidenceThreshold?: number;
  } = {}
): {
  findings: Finding[];
  stats: ScanStats;
  fileTree: FileTreeNode[];
  dependencyGraph: DependencyGraph;
} {
  const kb = getKnowledgeBase();
  const weights = options.weights || DEFAULT_RISK_WEIGHTS;
  const defCrit = options.defaultBusinessCriticality || 'MEDIUM';
  const defLife = options.defaultDataLifetime ?? 5;
  const defMig = options.defaultMigrationTime ?? 2;
  const threatHorizon = options.threatHorizon ?? 10;
  const confThreshold = options.confidenceThreshold ?? 30;

  const findings: Finding[] = [];
  const fileImports = new Map<string, Set<string>>(); // file -> imported libraries
  let blindSpotsCount = 0;
  let hardcodedAlgosCount = 0;
  let centralizedConfigDetected = false;
  let abstractionDetected = false;
  const agilityFindings: AgilityFinding[] = [];

  let scannedFilesCount = 0;

  for (const file of files) {
    const ext = path.extname(file.relativePath).toLowerCase();
    const basename = path.basename(file.relativePath).toLowerCase();

    // Check if scannable
    const isCode = SCANNABLE_EXTENSIONS.has(ext) || SCANNABLE_EXTENSIONS.has(basename);
    const isManifest = MANIFEST_NAMES.has(basename);
    const isDoc = ext === '.md' || ext === '.txt' || ext === '.rst' || ext === '.adoc';

    if (!isCode && !isManifest && !isDoc) {
      continue;
    }

    scannedFilesCount++;

    const lines = file.content.split('\n');
    const importsInFile = new Set<string>();
    fileImports.set(file.relativePath, importsInFile);

    // Agility detection: Check for centralized crypto abstraction
    if (
      basename.includes('crypto_service') ||
      basename.includes('cryptomanager') ||
      basename.includes('securityconfig') ||
      basename.includes('cipherhelper')
    ) {
      abstractionDetected = true;
      agilityFindings.push({
        title: 'Centralized Cryptographic Abstraction',
        type: 'positive',
        evidence: `File ${file.relativePath} suggests a centralized cryptographic wrapper / manager.`,
        impact: 'Facilitates seamless algorithmic migration without code-wide refactoring.',
      });
    }

    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      if (!trimmed) continue;

      // Track block comments
      if (trimmed.includes('/*')) inBlockComment = true;
      const isInsideBlockComment = inBlockComment;
      if (trimmed.includes('*/')) inBlockComment = false;

      // Track triple quotes in Python
      const isPythonTripleQuote = (trimmed.startsWith('"""') || trimmed.startsWith("'''")) && trimmed.length > 3;

      const isLineComment =
        trimmed.startsWith('//') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('--') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('REM ') ||
        trimmed.startsWith('<!--');

      const isComment = isInsideBlockComment || isLineComment || isPythonTripleQuote;

      // Import tracking
      if (!isComment) {
        if (
          trimmed.startsWith('import ') ||
          trimmed.startsWith('from ') ||
          trimmed.includes('require(') ||
          trimmed.includes('#include <openssl') ||
          trimmed.includes('use ')
        ) {
          if (trimmed.toLowerCase().includes('crypto')) importsInFile.add('crypto');
          if (trimmed.toLowerCase().includes('hashlib')) importsInFile.add('hashlib');
          if (trimmed.toLowerCase().includes('openssl')) importsInFile.add('openssl');
          if (trimmed.toLowerCase().includes('bcrypt')) importsInFile.add('bcrypt');
          if (trimmed.toLowerCase().includes('jsonwebtoken')) importsInFile.add('jwt');
        }
      }

      // Check Blind Spot: Generic TLS or cipher without specified algorithm
      if (
        !isComment &&
        (trimmed.includes('ssl.create_default_context') ||
          trimmed.includes('new https.Agent') ||
          trimmed.includes('SSLContext.getInstance("TLS"') ||
          trimmed.includes('Cipher.getInstance(algorithmVariable'))
      ) {
        blindSpotsCount++;
        const surrounding = getSurroundingCode(lines, lineNum);
        const blindSpotFinding: Finding = {
          id: `blind-spot-${findings.length + 1}`,
          file: file.relativePath,
          line: lineNum,
          column: rawLine.indexOf(trimmed) + 1,
          code: rawLine,
          surroundingCode: surrounding,
          algorithmId: 'unknown-crypto-asset',
          algorithmName: 'Unknown Cryptographic Asset',
          category: 'SYMMETRIC_ENCRYPTION',
          algorithmType: 'Unspecified TLS/Cipher Suite',
          status: 'CURRENT',
          quantumStatus: 'VULNERABLE_SHOR',
          classicalSecurity: 'ACCEPTABLE',
          detectionType: 'UNKNOWN',
          confidence: 42,
          evidence: 'Cryptographic mechanism detected without static algorithm specification (dynamic negotiation or runtime configuration).',
          context: `Line ${lineNum} in ${file.relativePath}`,
          businessCriticality: defCrit,
          dataLifetime: defLife,
          migrationTime: defMig,
          threatHorizon,
          riskScore: 50,
          riskLevel: 'MEDIUM',
          priority: 'P3',
          quantumRelevanceScore: 60,
          algorithmConcernScore: 40,
          businessCriticalityScore: 50,
          dataLifetimeScore: 50,
          migrationEffortScore: 50,
          moscaAnalysis: {
            deficitYears: 0,
            isUrgent: false,
            urgencyText: 'Further inspection recommended. Dynamic cipher negotiation requires runtime telemetry.',
            safetyMarginYears: 3,
            disclaimer: 'This is a planning and risk-assessment model inspired by the Mosca framework.',
          },
          recommendation: 'Evaluate pinning explicit post-quantum or high-assurance cipher suites in transport configurations.',
          remediation: {
            problem: 'Cryptographic primitive invoked via dynamic negotiation or unknown variable.',
            whyItMatters: 'Obscures cryptographic visibility and prevents exact quantum risk classification.',
            suggestedDirection: 'Conduct deep manual audit or enable runtime cryptographic logging.',
            developerNextStep: 'Inspect runtime TLS configuration and enforce specific AES-GCM or post-quantum hybrid suites.',
          },
          dependencies: Array.from(importsInFile),
        };
        findings.push(blindSpotFinding);
        continue;
      }

      // Match against the 90 knowledge base entries
      for (const algo of kb) {
        const matchResult = matchAlgorithmInLine(rawLine, algo, {
          isComment,
          isDoc,
          isManifest,
          ext,
        });

        if (!matchResult.matched) {
          continue;
        }

        // False positive filter
        if (matchResult.detectionType === 'TEXTUAL_REFERENCE' && confThreshold > 35) {
          // If user threshold is high, omit pure textual mentions in comments/markdown
          continue;
        }

        if (matchResult.confidence < confThreshold) {
          continue;
        }

        // Check if hardcoded algorithm string (Agility)
        if (
          matchResult.detectionType === 'ACTIVE_USAGE' &&
          (rawLine.includes(`"${algo.name}"`) ||
            rawLine.includes(`'${algo.name}'`) ||
            rawLine.includes(`"${algo.id}"`))
        ) {
          hardcodedAlgosCount++;
        }

        const surrounding = getSurroundingCode(lines, lineNum);
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
            quantumStatus: algo.quantum_status,
            classicalSecurity: algo.classical_security,
            businessCriticality: defCrit,
            dataLifetime: defLife,
            migrationTime: defMig,
            threatHorizon,
            category: algo.category,
            confidence: matchResult.confidence,
          },
          weights
        );

        const { recommendation, remediation } = generateRecommendation(algo, {
          file: file.relativePath,
          line: lineNum,
          code: rawLine,
        });

        const finding: Finding = {
          id: `cv-finding-${findings.length + 1}`,
          file: file.relativePath,
          line: lineNum,
          column: rawLine.indexOf(trimmed) + 1,
          code: rawLine,
          surroundingCode: surrounding,
          algorithmId: algo.id,
          algorithmName: algo.name,
          category: algo.category,
          algorithmType: algo.type,
          status: algo.status,
          quantumStatus: algo.quantum_status,
          classicalSecurity: algo.classical_security,
          detectionType: matchResult.detectionType,
          confidence: matchResult.confidence,
          evidence: matchResult.evidence,
          context: `${algo.name} detected in ${file.relativePath}:${lineNum}`,
          businessCriticality: defCrit,
          dataLifetime: defLife,
          migrationTime: defMig,
          threatHorizon,
          riskScore,
          riskLevel,
          priority,
          quantumRelevanceScore,
          algorithmConcernScore,
          businessCriticalityScore,
          dataLifetimeScore,
          migrationEffortScore,
          moscaAnalysis,
          recommendation,
          remediation,
          dependencies: Array.from(importsInFile),
        };

        findings.push(finding);
        // Once matched for this line with high confidence, move to next algorithm
        break;
      }
    }
  }

  // Calculate Crypto Agility
  let agilityScore = 75;
  if (hardcodedAlgosCount > 5) {
    agilityScore -= 30;
    agilityFindings.push({
      title: 'Scattered Hardcoded Algorithms',
      type: 'negative',
      evidence: `${hardcodedAlgosCount} instances of direct hardcoded algorithm strings detected.`,
      impact: 'Replacing algorithms will require extensive manual source file edits across the repo.',
    });
  } else if (hardcodedAlgosCount > 0) {
    agilityScore -= 15;
    agilityFindings.push({
      title: 'Isolated Hardcoded Algorithm Invocations',
      type: 'neutral',
      evidence: `${hardcodedAlgosCount} hardcoded algorithm names located.`,
      impact: 'Manageable migration surface, but centralization is strongly recommended.',
    });
  }

  if (centralizedConfigDetected) {
    agilityScore += 20;
    agilityFindings.push({
      title: 'Configuration-Driven Cryptography',
      type: 'positive',
      evidence: 'Cryptographic parameters driven by external configuration files.',
      impact: 'Algorithms can be updated without recompiling or altering source logic.',
    });
  }

  if (abstractionDetected) {
    agilityScore += 15;
  }

  if (findings.length === 0) {
    agilityScore = 100;
  }

  agilityScore = Math.max(0, Math.min(100, agilityScore));

  let agilityRating: AgilityAnalysis['rating'] = 'MODERATE';
  if (agilityScore >= 80) agilityRating = 'EXCELLENT';
  else if (agilityScore >= 60) agilityRating = 'GOOD';
  else if (agilityScore >= 40) agilityRating = 'MODERATE';
  else if (agilityScore >= 20) agilityRating = 'POOR';
  else agilityRating = 'CRITICAL';

  const cryptoAgility: AgilityAnalysis = {
    score: agilityScore,
    rating: agilityRating,
    hardcodedAlgorithmsCount: hardcodedAlgosCount,
    centralizedConfigDetected,
    abstractionDetected,
    findings: agilityFindings,
    summary:
      agilityScore >= 70
        ? 'The repository shows healthy crypto-agility indicators, reducing migration friction.'
        : 'Cryptographic calls appear tightly coupled and hardcoded, indicating higher migration effort.',
  };

  // Build file counts for File Tree
  const findingCountsByFile = new Map<string, number>();
  for (const f of findings) {
    findingCountsByFile.set(f.file, (findingCountsByFile.get(f.file) || 0) + 1);
  }
  const fileTree = buildFileTree(files, findingCountsByFile);

  // Calculate dependency graph
  const dependencyGraph = buildDependencyGraph(files, findings);

  // Statistics calculation
  const totalFindings = findings.length;
  const quantumRelevantFindings = findings.filter(
    (f) => f.quantumStatus === 'VULNERABLE_SHOR' || f.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER'
  ).length;
  const criticalRisks = findings.filter((f) => f.riskLevel === 'CRITICAL').length;
  const highRisks = findings.filter((f) => f.riskLevel === 'HIGH').length;
  const mediumRisks = findings.filter((f) => f.riskLevel === 'MEDIUM').length;
  const lowRisks = findings.filter((f) => f.riskLevel === 'LOW').length;
  const p1Candidates = findings.filter((f) => f.priority === 'P1').length;
  const p2Candidates = findings.filter((f) => f.priority === 'P2').length;
  const p3Candidates = findings.filter((f) => f.priority === 'P3').length;
  const p4Candidates = findings.filter((f) => f.priority === 'P4').length;

  const averageRiskScore =
    totalFindings > 0
      ? Math.round(findings.reduce((acc, f) => acc + f.riskScore, 0) / totalFindings)
      : 0;

  let overallQuantumPosture: ScanStats['overallQuantumPosture'] = 'QUANTUM_READY';
  if (criticalRisks > 0 || p1Candidates > 0) {
    overallQuantumPosture = 'HIGH_EXPOSURE';
  } else if (highRisks > 0 || quantumRelevantFindings > 0) {
    overallQuantumPosture = 'MODERATE_EXPOSURE';
  } else if (totalFindings > 0) {
    overallQuantumPosture = 'WELL_PREPARED';
  }

  const algorithmDistribution: Record<string, number> = {};
  const categoryDistribution: Record<string, number> = {};
  const quantumStatusDistribution: Record<string, number> = {};

  for (const f of findings) {
    algorithmDistribution[f.algorithmName] = (algorithmDistribution[f.algorithmName] || 0) + 1;
    categoryDistribution[f.category] = (categoryDistribution[f.category] || 0) + 1;
    quantumStatusDistribution[f.quantumStatus] = (quantumStatusDistribution[f.quantumStatus] || 0) + 1;
  }

  const stats: ScanStats = {
    totalFiles: files.length,
    scannedFiles: scannedFilesCount,
    totalFindings,
    quantumRelevantFindings,
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
    cryptoAgility,
    blindSpotsCount,
    algorithmDistribution,
    categoryDistribution,
    quantumStatusDistribution,
    riskDistribution: {
      critical: criticalRisks,
      high: highRisks,
      medium: mediumRisks,
      low: lowRisks,
    },
    quantumBreakdown: {
      vulnerableShor: quantumStatusDistribution['VULNERABLE_SHOR'] || 0,
      partiallyVulnerableGrover: quantumStatusDistribution['PARTIALLY_VULNERABLE_GROVER'] || 0,
      quantumResistant: quantumStatusDistribution['QUANTUM_RESISTANT'] || 0,
      quantumSafe: quantumStatusDistribution['QUANTUM_SAFE'] || 0,
    },
    riskBreakdown: {
      critical: criticalRisks,
      high: highRisks,
      medium: mediumRisks,
      low: lowRisks,
    },
  };

  return { findings, stats, fileTree, dependencyGraph };
}

function getSurroundingCode(lines: string[], targetLineNum: number, span: number = 5) {
  const result = [];
  const start = Math.max(1, targetLineNum - span);
  const end = Math.min(lines.length, targetLineNum + span);

  for (let l = start; l <= end; l++) {
    result.push({
      lineNumber: l,
      content: lines[l - 1],
      isTarget: l === targetLineNum,
    });
  }
  return result;
}

function matchAlgorithmInLine(
  line: string,
  algo: import('./types.js').CryptoAlgorithmDef,
  env: { isComment: boolean; isDoc: boolean; isManifest: boolean; ext: string }
): { matched: boolean; detectionType: DetectionType; confidence: number; evidence: string } {
  const lowerLine = line.toLowerCase();
  const lowerName = algo.name.toLowerCase();

  // Check patterns first
  for (const pattern of algo.detection_patterns) {
    const lowerPat = pattern.toLowerCase();
    if (lowerLine.includes(lowerPat)) {
      if (env.isDoc || env.isComment) {
        return {
          matched: true,
          detectionType: 'TEXTUAL_REFERENCE',
          confidence: 35,
          evidence: `Textual reference to ${algo.name} pattern '${pattern}' in comment/documentation.`,
        };
      }

      if (env.isManifest) {
        return {
          matched: true,
          detectionType: 'CONFIGURATION_USAGE',
          confidence: 70,
          evidence: `Dependency or package manifest reference to ${algo.name} ('${pattern}').`,
        };
      }

      if (
        lowerLine.includes('(') ||
        lowerLine.includes('new ') ||
        lowerLine.includes('=') ||
        lowerLine.includes(':') ||
        lowerLine.includes('->') ||
        lowerLine.includes('.sign') ||
        lowerLine.includes('.verify') ||
        lowerLine.includes('.encrypt') ||
        lowerLine.includes('.decrypt')
      ) {
        return {
          matched: true,
          detectionType: 'ACTIVE_USAGE',
          confidence: 95,
          evidence: `Active API invocation/instantiation matching pattern '${pattern}' for ${algo.name}.`,
        };
      }

      return {
        matched: true,
        detectionType: 'LIBRARY_USAGE',
        confidence: 80,
        evidence: `Import or reference to ${algo.name} library module ('${pattern}').`,
      };
    }
  }

  // Exact word boundary match for algorithm name or aliases
  const terms = [algo.name, ...algo.aliases];
  for (const term of terms) {
    // Avoid short generic terms like 'rsa' or 'des' matching inside words like 'response' or 'describe'
    if (term.length <= 3) {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(line)) {
        if (env.isDoc || env.isComment) {
          return {
            matched: true,
            detectionType: 'TEXTUAL_REFERENCE',
            confidence: 30,
            evidence: `Textual mention of ${term} in documentation or comment.`,
          };
        }

        // Active vs config vs library
        if (
          lowerLine.includes('.new') ||
          lowerLine.includes('.generate') ||
          lowerLine.includes('getinstance') ||
          lowerLine.includes('createcipher') ||
          lowerLine.includes('createhash') ||
          lowerLine.includes('keypair') ||
          lowerLine.includes('sign(')
        ) {
          return {
            matched: true,
            detectionType: 'ACTIVE_USAGE',
            confidence: 90,
            evidence: `Active cryptographic invocation with ${term}.`,
          };
        }

        if (lowerLine.includes('import ') || lowerLine.includes('from ') || lowerLine.includes('require(')) {
          return {
            matched: true,
            detectionType: 'LIBRARY_USAGE',
            confidence: 75,
            evidence: `Module import referencing ${term}.`,
          };
        }
      }
    } else {
      const lowerTerm = term.toLowerCase();
      if (lowerLine.includes(lowerTerm)) {
        // Exclude common false positives
        if (lowerTerm === 'ascon' && lowerLine.includes('hasconnect')) continue;

        if (env.isDoc || env.isComment) {
          return {
            matched: true,
            detectionType: 'TEXTUAL_REFERENCE',
            confidence: 35,
            evidence: `Documentation or comment reference to ${term}.`,
          };
        }

        if (
          lowerLine.includes('(') ||
          lowerLine.includes('new ') ||
          lowerLine.includes('create') ||
          lowerLine.includes('getinstance') ||
          lowerLine.includes('key')
        ) {
          return {
            matched: true,
            detectionType: 'ACTIVE_USAGE',
            confidence: 92,
            evidence: `Active invocation matching ${algo.name} (${term}).`,
          };
        }

        return {
          matched: true,
          detectionType: 'CONFIGURATION_USAGE',
          confidence: 65,
          evidence: `Configuration parameter or symbol matching ${term}.`,
        };
      }
    }
  }

  return { matched: false, detectionType: 'UNKNOWN', confidence: 0, evidence: '' };
}

function buildDependencyGraph(files: ExtractedFile[], findings: Finding[]): DependencyGraph {
  const nodes: DependencyNode[] = [];
  const links: DependencyLink[] = [];
  const nodeSet = new Set<string>();

  // Add file nodes with crypto findings
  for (const file of files) {
    const fileFindings = findings.filter((f) => f.file === file.relativePath);
    if (fileFindings.length > 0) {
      let maxRisk: Finding['riskLevel'] = 'LOW';
      if (fileFindings.some((f) => f.riskLevel === 'CRITICAL')) maxRisk = 'CRITICAL';
      else if (fileFindings.some((f) => f.riskLevel === 'HIGH')) maxRisk = 'HIGH';
      else if (fileFindings.some((f) => f.riskLevel === 'MEDIUM')) maxRisk = 'MEDIUM';

      const fileNodeId = `file:${file.relativePath}`;
      if (!nodeSet.has(fileNodeId)) {
        nodes.push({
          id: fileNodeId,
          label: path.basename(file.relativePath),
          type: 'file',
          riskLevel: maxRisk,
        });
        nodeSet.add(fileNodeId);
      }

      // Link to crypto algorithm nodes
      for (const finding of fileFindings) {
        const algoNodeId = `algo:${finding.algorithmId}`;
        if (!nodeSet.has(algoNodeId)) {
          nodes.push({
            id: algoNodeId,
            label: finding.algorithmName,
            type: 'crypto_module',
            riskLevel: finding.riskLevel,
          });
          nodeSet.add(algoNodeId);
        }

        links.push({
          source: fileNodeId,
          target: algoNodeId,
          label: finding.algorithmType,
        });
      }
    }
  }

  if (nodes.length === 0) {
    return {
      nodes: [],
      links: [],
      statusMessage: 'Dependency relationship could not be confidently determined (no cryptographic usages detected).',
    };
  }

  return { nodes, links };
}
