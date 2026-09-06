export type CategoryType = 
  | 'SYMMETRIC_ENCRYPTION'
  | 'ASYMMETRIC_KEY_EXCHANGE'
  | 'DIGITAL_SIGNATURES'
  | 'HASH_FUNCTIONS'
  | 'HASH_XOF_MAC'
  | 'AEAD'
  | 'PASSWORD_HASHING_KDF';

export type AlgorithmStatus = 'CURRENT' | 'LEGACY' | 'DEPRECATED' | 'POST_QUANTUM';
export type QuantumStatus = 'VULNERABLE_SHOR' | 'PARTIALLY_VULNERABLE_GROVER' | 'QUANTUM_RESISTANT' | 'QUANTUM_SAFE';
export type ClassicalSecurity = 'SECURE' | 'ACCEPTABLE' | 'WEAK' | 'BROKEN';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type BusinessCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DetectionType = 'ACTIVE_USAGE' | 'LIBRARY_USAGE' | 'CONFIGURATION_USAGE' | 'TEXTUAL_REFERENCE' | 'UNKNOWN';

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
  businessCriticality: BusinessCriticality;
  dataLifetime: number; // in years, default 5
  migrationTime: number; // in years, default 2
  threatHorizon: number; // in years, default 10
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  priority: PriorityLevel;
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
  repoName: string;
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
