import {
  BusinessCriticality,
  Finding,
  PriorityLevel,
  RiskLevel,
  RiskWeights,
  QuantumStatus,
  ClassicalSecurity,
  CategoryType
} from './types.js';

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  quantumRelevance: 0.30,
  algorithmConcern: 0.20,
  businessCriticality: 0.20,
  dataLifetime: 0.15,
  migrationEffort: 0.15,
};

export function getQuantumRelevanceScore(status: QuantumStatus): number {
  switch (status) {
    case 'VULNERABLE_SHOR':
      return 100;
    case 'PARTIALLY_VULNERABLE_GROVER':
      return 50;
    case 'QUANTUM_RESISTANT':
      return 10;
    case 'QUANTUM_SAFE':
      return 0;
    default:
      return 40;
  }
}

export function getAlgorithmConcernScore(security: ClassicalSecurity): number {
  switch (security) {
    case 'BROKEN':
      return 100;
    case 'WEAK':
      return 75;
    case 'ACCEPTABLE':
      return 40;
    case 'SECURE':
      return 10;
    default:
      return 50;
  }
}

export function getBusinessCriticalityScore(crit: BusinessCriticality): number {
  switch (crit) {
    case 'CRITICAL':
      return 100;
    case 'HIGH':
      return 75;
    case 'MEDIUM':
      return 50;
    case 'LOW':
      return 25;
    default:
      return 50;
  }
}

export function getDataLifetimeScore(years: number): number {
  if (years > 10) return 100;
  if (years >= 7) return 80;
  if (years >= 4) return 50;
  if (years >= 2) return 25;
  return 10;
}

export function getMigrationEffortScore(category: CategoryType): number {
  switch (category) {
    case 'ASYMMETRIC_KEY_EXCHANGE':
    case 'DIGITAL_SIGNATURES':
      return 85; // PKI, certificates, protocol renegotiation, certificate authorities
    case 'SYMMETRIC_ENCRYPTION':
    case 'AEAD':
      return 60; // Data at rest re-encryption, key distribution
    case 'PASSWORD_HASHING_KDF':
      return 45; // Progressive re-hashing upon authentication
    case 'HASH_FUNCTIONS':
    case 'HASH_XOF_MAC':
      return 30; // Checksum / hash algorithm swaps
    default:
      return 50;
  }
}

export function calculateMoscaAnalysis(
  dataLifetime: number,
  migrationTime: number,
  threatHorizon: number = 10
) {
  const totalExposureYears = dataLifetime + migrationTime;
  const isUrgent = totalExposureYears > threatHorizon;
  const deficitYears = isUrgent ? totalExposureYears - threatHorizon : 0;
  const safetyMarginYears = isUrgent ? 0 : threatHorizon - totalExposureYears;

  let urgencyText = '';
  if (isUrgent) {
    urgencyText = `CRITICAL DEFICIT: Data shelf-life (${dataLifetime} yrs) + Migration time (${migrationTime} yrs) exceeds threat horizon (${threatHorizon} yrs) by ${deficitYears.toFixed(1)} years. Store-Now-Decrypt-Later (SNDL) exposure exists today.`;
  } else {
    urgencyText = `ADEQUATE WINDOW: Estimated safety buffer of ${safetyMarginYears.toFixed(1)} years before reaching threat horizon.`;
  }

  return {
    deficitYears,
    isUrgent,
    urgencyText,
    safetyMarginYears,
    disclaimer: 'This is a planning and risk-assessment model inspired by the Mosca framework. It is not a prediction of quantum-computer availability.',
  };
}

export function calculateFindingRisk(
  finding: {
    quantumStatus: QuantumStatus;
    classicalSecurity: ClassicalSecurity;
    businessCriticality: BusinessCriticality;
    dataLifetime: number;
    migrationTime: number;
    threatHorizon?: number;
    category: CategoryType;
    confidence: number;
  },
  customWeights?: Partial<RiskWeights>
): {
  riskScore: number;
  riskLevel: RiskLevel;
  priority: PriorityLevel;
  quantumRelevanceScore: number;
  algorithmConcernScore: number;
  businessCriticalityScore: number;
  dataLifetimeScore: number;
  migrationEffortScore: number;
  moscaAnalysis: ReturnType<typeof calculateMoscaAnalysis>;
} {
  const weights = { ...DEFAULT_RISK_WEIGHTS, ...customWeights };
  const sumWeights =
    weights.quantumRelevance +
    weights.algorithmConcern +
    weights.businessCriticality +
    weights.dataLifetime +
    weights.migrationEffort || 1;

  const wQ = weights.quantumRelevance / sumWeights;
  const wA = weights.algorithmConcern / sumWeights;
  const wB = weights.businessCriticality / sumWeights;
  const wL = weights.dataLifetime / sumWeights;
  const wM = weights.migrationEffort / sumWeights;

  const quantumRelevanceScore = getQuantumRelevanceScore(finding.quantumStatus);
  const algorithmConcernScore = getAlgorithmConcernScore(finding.classicalSecurity);
  const businessCriticalityScore = getBusinessCriticalityScore(finding.businessCriticality);
  const dataLifetimeScore = getDataLifetimeScore(finding.dataLifetime);
  const migrationEffortScore = getMigrationEffortScore(finding.category);

  const rawRisk =
    quantumRelevanceScore * wQ +
    algorithmConcernScore * wA +
    businessCriticalityScore * wB +
    dataLifetimeScore * wL +
    migrationEffortScore * wM;

  const riskScore = Math.min(100, Math.max(0, Math.round(rawRisk)));

  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 80) riskLevel = 'CRITICAL';
  else if (riskScore >= 60) riskLevel = 'HIGH';
  else if (riskScore >= 30) riskLevel = 'MEDIUM';

  const threatHorizon = finding.threatHorizon ?? 10;
  const moscaAnalysis = calculateMoscaAnalysis(
    finding.dataLifetime,
    finding.migrationTime,
    threatHorizon
  );

  // Priority Determination
  let priority: PriorityLevel = 'P4';
  if (
    riskLevel === 'CRITICAL' ||
    (finding.quantumStatus === 'VULNERABLE_SHOR' && (finding.businessCriticality === 'CRITICAL' || moscaAnalysis.isUrgent)) ||
    finding.classicalSecurity === 'BROKEN'
  ) {
    priority = 'P1';
  } else if (
    riskLevel === 'HIGH' ||
    finding.quantumStatus === 'VULNERABLE_SHOR' ||
    finding.classicalSecurity === 'WEAK'
  ) {
    priority = 'P2';
  } else if (
    riskLevel === 'MEDIUM' ||
    finding.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER'
  ) {
    priority = 'P3';
  } else {
    priority = 'P4';
  }

  return {
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
}
