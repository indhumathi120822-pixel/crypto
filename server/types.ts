export type CategoryType = 
  | 'SYMMETRIC_ENCRYPTION'
  | 'ASYMMETRIC_KEY_EXCHANGE'
  | 'DIGITAL_SIGNATURES'
  | 'HASH_FUNCTIONS'
  | 'HASH_XOF_MAC'
  | 'AEAD'
  | 'PASSWORD_HASHING_KDF';

export type CryptographicPurpose =
  | 'ENCRYPTION'
  | 'DIGITAL_SIGNATURE'
  | 'KEY_EXCHANGE_KEM'
  | 'HASHING'
  | 'MAC'
  | 'PASSWORD_HASHING'
  | 'AUTHENTICATION'
  | 'TRANSPORT_SECURITY'
  | 'UNKNOWN';

export type AlgorithmStatus = 'CURRENT' | 'LEGACY' | 'DEPRECATED' | 'POST_QUANTUM';
export type QuantumStatus = 'VULNERABLE_SHOR' | 'PARTIALLY_VULNERABLE_GROVER' | 'QUANTUM_RESISTANT' | 'QUANTUM_SAFE';
export type ClassicalSecurity = 'SECURE' | 'ACCEPTABLE' | 'WEAK' | 'BROKEN';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
export type RiskCategory = 'Quantum Vulnerability' | 'Classical Weakness' | 'Migration Risk';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type BusinessCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DetectionType = 'ACTIVE_USAGE' | 'LIBRARY_USAGE' | 'CONFIGURATION_USAGE' | 'TEXTUAL_REFERENCE' | 'UNKNOWN';

export interface WhyRiskLevel {
  vulnerableAlgorithm: string;
  keySize: string;
  cryptographicPurpose: string;
  internetExposure: string;
  dataSensitivity: string;
  expectedDataLifetime: string;
  migrationComplexity: string;
}

export interface RiskThresholds {
  minimal: number; // default 20 (0 - 20)
  low: number; // default 40 (21 - 40)
  medium: number; // default 60 (41 - 60)
  high: number; // default 80 (61 - 80)
}

export interface Vision1State {
  algorithm: string;
  riskLevel: RiskLevel;
  purpose: string;
  quantumThreat: string;
  status: AlgorithmStatus;
}

export interface Vision2State {
  targetAlgorithm: string;
  standard: string;
  targetRiskLevel: RiskLevel;
  migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedTimeline: string;
  rationale: string;
}

export interface CryptoAlgorithmDef {
  id: string;
  name: string;
  aliases: string[];
  category: CategoryType;
  type: string;
  status: AlgorithmStatus;
  quantum_status: QuantumStatus;
  classical_security: ClassicalSecurity;
  risk_level: RiskLevel;
  key_sizes: (number | string)[];
  recommended_replacement: string[];
  detection_patterns: string[];
  languages: string[];
  notes: string;
}

export interface CodeSnippetLine {
  lineNumber: number;
  content: string;
  isTarget: boolean;
}

export interface RemediationInfo {
  problem: string;
  whyItMatters: string;
  suggestedDirection: string;
  developerNextStep: string;
  suggestedDiff?: {
    original: string;
    replacement: string;
    explanation: string;
  };
}

export interface Finding {
  id: string;
  file: string;
  line: number;
  column: number;
  code: string;
  surroundingCode: CodeSnippetLine[];
  algorithmId: string;
  algorithmName: string;
  category: CategoryType;
  algorithmType: string;
  status: AlgorithmStatus;
  quantumStatus: QuantumStatus;
  classicalSecurity: ClassicalSecurity;
  detectionType: DetectionType;
  confidence: number;
  evidence: string;
  context: string;
  detectedArtefact: string;
  cryptographicPurpose: CryptographicPurpose;
  keySize: number | string | null;
  library: string;
  protocol: string;
  ruleMatched: string;
  reason: string;
  explanationFactors: string[];
  vision1: Vision1State;
  vision2: Vision2State;
  isRedacted?: boolean;
  businessCriticality: BusinessCriticality;
  dataLifetime: number; // in years, default 5
  migrationTime: number; // in years, default 2
  threatHorizon: number; // in years, default 10
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  riskCategory: RiskCategory;
  priority: PriorityLevel;
  priorityReason?: string;
  whyRiskLevel: WhyRiskLevel;
  internetFacing?: boolean;
  isInsufficientInfo?: boolean;
  quantumRelevanceScore: number;
  algorithmConcernScore: number;
  businessCriticalityScore: number;
  dataLifetimeScore: number;
  migrationEffortScore: number;
  moscaAnalysis: {
    deficitYears: number;
    isUrgent: boolean;
    urgencyText: string;
    safetyMarginYears: number;
    disclaimer: string;
  };
  recommendation: string;
  remediation: RemediationInfo;
  dependencies: string[];
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
  findingCount?: number;
}

export interface AgilityFinding {
  title: string;
  type: 'positive' | 'negative' | 'neutral';
  evidence: string;
  impact: string;
}

export interface AgilityAnalysis {
  score: number; // 0 - 100
  rating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL';
  hardcodedAlgorithmsCount: number;
  centralizedConfigDetected: boolean;
  abstractionDetected: boolean;
  findings: AgilityFinding[];
  summary: string;
}

export interface DependencyNode {
  id: string;
  label: string;
  type: 'file' | 'crypto_module' | 'library';
  riskLevel?: RiskLevel;
}

export interface DependencyLink {
  source: string;
  target: string;
  label?: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  links: DependencyLink[];
  statusMessage?: string;
}

export interface ScanStats {
  totalFiles: number;
  scannedFiles: number;
  totalFindings: number;
  quantumRelevantFindings: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  minimalRisks: number;
  p1Candidates: number;
  p2Candidates: number;
  p3Candidates: number;
  p4Candidates: number;
  averageRiskScore: number;
  overallQuantumPosture: 'HIGH_EXPOSURE' | 'MODERATE_EXPOSURE' | 'WELL_PREPARED' | 'QUANTUM_READY';
  cryptoAgility: AgilityAnalysis;
  blindSpotsCount: number;
  algorithmDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  quantumStatusDistribution: Record<string, number>;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    minimal: number;
  };
  quantumBreakdown?: {
    vulnerableShor: number;
    partiallyVulnerableGrover: number;
    quantumResistant: number;
    quantumSafe: number;
  };
  riskBreakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    minimal?: number;
  };
}

export interface RiskWeights {
  quantumRelevance: number; // default 0.30
  algorithmConcern: number; // default 0.20
  businessCriticality: number; // default 0.20
  dataLifetime: number; // default 0.15
  migrationEffort: number; // default 0.15
}

export interface ScanSession {
  id: string;
  userId?: string;
  repoName: string;
  repoUrl?: string;
  uploadedAt: string;
  fileCount: number;
  totalSizeBytes: number;
  files: Map<string, string>; // path -> content
  originalFiles: Map<string, string>; // pristine copy
  fileTree: FileTreeNode[];
  findings: Finding[];
  stats: ScanStats;
  dependencyGraph: DependencyGraph;
  weights: RiskWeights;
  defaultBusinessCriticality: BusinessCriticality;
  defaultDataLifetime: number;
  defaultMigrationTime: number;
  threatHorizon: number;
}

export interface StoredScanSummary {
  id: string;
  userId?: string;
  repoName: string;
  repoUrl?: string;
  uploadedAt: string;
  fileCount: number;
  totalFindings: number;
  averageRiskScore: number;
  overallQuantumPosture: string;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  p1Candidates: number;
  p2Candidates: number;
  p3Candidates: number;
  p4Candidates: number;
}

export interface ScanComparisonResult {
  oldScanId: string;
  newScanId: string;
  oldRepoName: string;
  newRepoName: string;
  oldDate: string;
  newDate: string;
  oldRiskScore: number;
  newRiskScore: number;
  riskReduction: number;
  riskReductionPercent: number;
  oldTotalFindings: number;
  newTotalFindings: number;
  newFindings: Finding[];
  resolvedFindings: Finding[];
  unchangedFindingsCount: number;
  migrationProgress: {
    migratedToPqcCount: number;
    pendingP1Count: number;
    progressPercent: number;
  };
}

export interface UserAlgorithm {
  id: string;
  userId: string;
  algorithmName: string;
  algorithmType: string;
  keySize: string;
  cryptographicPurpose: CryptographicPurpose;
  usage: string;
  environment: string;
  dataSensitivity: BusinessCriticality;
  internetFacing: boolean;
  lifetimeYears: number;
  component: string;
  notes?: string;
  category: CategoryType;
  quantumStatus: QuantumStatus;
  classicalSecurity: ClassicalSecurity;
  riskScore: number;
  riskLevel: RiskLevel;
  riskCategory: RiskCategory;
  priority: PriorityLevel;
  priorityReason: string;
  whyRiskLevel: WhyRiskLevel;
  isInsufficientInfo?: boolean;
  pqcRecommendation: {
    targetAlgorithm: string;
    standard: string;
    targetRiskLevel: RiskLevel;
    migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
    rationale: string;
  };
  createdAt: string;
}

export interface AlgorithmAnalysisRequest {
  algorithmName: string;
  algorithmType?: string;
  keySize?: string | number;
  cryptographicPurpose?: CryptographicPurpose | string;
  usage?: string;
  environment?: string;
  dataSensitivity?: BusinessCriticality;
  internetFacing?: boolean;
  lifetimeYears?: number;
  component?: string;
  notes?: string;
  userId?: string;
}

