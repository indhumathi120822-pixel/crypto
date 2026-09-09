import {
  BusinessCriticality,
  Finding,
  PriorityLevel,
  RiskLevel,
  RiskCategory,
  RiskWeights,
  RiskThresholds,
  WhyRiskLevel,
  QuantumStatus,
  ClassicalSecurity,
  CategoryType,
  CryptographicPurpose,
  Vision1State,
  Vision2State,
} from './types.js';

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  quantumRelevance: 0.30,
  algorithmConcern: 0.20,
  businessCriticality: 0.20,
  dataLifetime: 0.15,
  migrationEffort: 0.15,
};

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  minimal: 20,
  low: 40,
  medium: 60,
  high: 80,
};

export function getRiskLevelFromScore(
  score: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): RiskLevel {
  if (score <= thresholds.minimal) return 'MINIMAL';
  if (score <= thresholds.low) return 'LOW';
  if (score <= thresholds.medium) return 'MEDIUM';
  if (score <= thresholds.high) return 'HIGH';
  return 'CRITICAL';
}

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
    urgencyText = `ADEQUATE WINDOW: Estimated safety buffer of ${safetyMarginYears.toFixed(1)} years before reaching threat horizon (${threatHorizon} yrs).`;
  }

  return {
    deficitYears,
    isUrgent,
    urgencyText,
    safetyMarginYears,
    disclaimer: 'This is a planning and risk-assessment model inspired by the Mosca framework. It is not a prediction of quantum-computer availability.',
  };
}

export function generateVisionStates(
  algorithmName: string,
  category: CategoryType,
  purpose: CryptographicPurpose,
  quantumStatus: QuantumStatus,
  classicalSecurity: ClassicalSecurity,
  riskLevel: RiskLevel
): { vision1: Vision1State; vision2: Vision2State } {
  const algoLower = algorithmName.toLowerCase();

  let threat = 'Classical evaluation acceptable';
  if (quantumStatus === 'VULNERABLE_SHOR') {
    threat = "Vulnerable to Shor's algorithm on Cryptanalytically Relevant Quantum Computers (CRQCs). Discrete log / factorization solved in polynomial time.";
  } else if (quantumStatus === 'PARTIALLY_VULNERABLE_GROVER') {
    threat = "Subject to Grover's quantum search quadratic speedup, effectively reducing symmetric key bit-security by 50%.";
  } else if (quantumStatus === 'QUANTUM_SAFE' || quantumStatus === 'QUANTUM_RESISTANT') {
    threat = 'Quantum resilient: no known polynomial-time quantum attacks exist.';
  }

  const vision1: Vision1State = {
    algorithm: algorithmName,
    riskLevel,
    purpose: purpose,
    quantumThreat: threat,
    status: classicalSecurity === 'BROKEN' ? 'DEPRECATED' : 'CURRENT',
  };

  // Determine Target Post-Quantum Vision 2 based on Category and Purpose
  let vision2: Vision2State;

  if (category === 'ASYMMETRIC_KEY_EXCHANGE' || purpose === 'KEY_EXCHANGE_KEM') {
    vision2 = {
      targetAlgorithm: 'ML-KEM-768 (NIST FIPS 203) / X25519-Kyber768 Hybrid',
      standard: 'NIST FIPS 203 (Module-Lattice-Based Key-Encapsulation Mechanism)',
      targetRiskLevel: 'LOW',
      migrationComplexity: 'MEDIUM',
      recommendedTimeline: 'Priority 1 (Phase 1 immediate hybrid deployment)',
      rationale: 'Provides IND-CCA2 quantum resistance matching NIST Security Category 3. Hybridization guarantees classical compliance during transition.',
    };
  } else if (category === 'DIGITAL_SIGNATURES' || purpose === 'DIGITAL_SIGNATURE') {
    if (algoLower.includes('ed25519') || algoLower.includes('ecdsa') || algoLower.includes('rsa')) {
      vision2 = {
        targetAlgorithm: 'ML-DSA-65 (NIST FIPS 204) / SLH-DSA-128s (NIST FIPS 205)',
        standard: 'NIST FIPS 204 (Module-Lattice) & FIPS 205 (Stateless Hash-Based)',
        targetRiskLevel: 'LOW',
        migrationComplexity: 'HIGH',
        recommendedTimeline: 'Priority 1 (PKI & Certificate chain upgrade)',
        rationale: 'Replaces Shor-vulnerable discrete log / factoring signatures. ML-DSA provides compact lattice signatures; SLH-DSA offers conservative hash-based backup.',
      };
    } else {
      vision2 = {
        targetAlgorithm: 'ML-DSA-65 (NIST FIPS 204)',
        standard: 'NIST FIPS 204',
        targetRiskLevel: 'LOW',
        migrationComplexity: 'HIGH',
        recommendedTimeline: 'Priority 2 (Plan signature infrastructure migration)',
        rationale: 'NIST standardized primary post-quantum digital signature algorithm.',
      };
    }
  } else if (category === 'SYMMETRIC_ENCRYPTION' || category === 'AEAD') {
    if (algoLower.includes('128') || algoLower.includes('des') || algoLower.includes('rc4') || algoLower.includes('blowfish')) {
      vision2 = {
        targetAlgorithm: 'AES-256-GCM / ChaCha20-Poly1305 (256-bit)',
        standard: 'NIST SP 800-38D & CNSA 2.0 Suite',
        targetRiskLevel: 'LOW',
        migrationComplexity: 'LOW',
        recommendedTimeline: 'Priority 2 (Increase key length to 256 bits)',
        rationale: 'Doubling key length from 128 to 256 bits guarantees a full 128 bits of security against Grover quantum search.',
      };
    } else {
      vision2 = {
        targetAlgorithm: 'AES-256-GCM (Quantum Resistant)',
        standard: 'NIST SP 800-38D & CNSA 2.0',
        targetRiskLevel: 'LOW',
        migrationComplexity: 'LOW',
        recommendedTimeline: 'Current State Secure (Maintain AES-256 with frequent key rotation)',
        rationale: 'Already provides full post-quantum security margin under Grover attack.',
      };
    }
  } else if (category === 'HASH_FUNCTIONS' || category === 'HASH_XOF_MAC') {
    if (algoLower.includes('md5') || algoLower.includes('sha1') || algoLower.includes('sha-1')) {
      vision2 = {
        targetAlgorithm: 'SHA-384 / SHA3-256 / SHAKE-256',
        standard: 'NIST FIPS 180-4 / FIPS 202',
        targetRiskLevel: 'LOW',
        migrationComplexity: 'LOW',
        recommendedTimeline: 'Priority 1 (Remediate classical collision vulnerabilities immediately)',
        rationale: 'Replaces critically broken hash primitives with collision and preimage-resistant algorithms meeting post-quantum standards.',
      };
    } else {
      vision2 = {
        targetAlgorithm: 'SHA-384 / SHA-512 / SHA3-256',
        standard: 'NIST FIPS 180-4 / FIPS 202',
        targetRiskLevel: 'LOW',
        migrationComplexity: 'LOW',
        recommendedTimeline: 'Priority 3 (Align with CNSA 2.0 384-bit requirements)',
        rationale: 'CNSA 2.0 mandates SHA-384 for quantum-safe national security systems.',
      };
    }
  } else if (category === 'PASSWORD_HASHING_KDF') {
    vision2 = {
      targetAlgorithm: 'Argon2id (RFC 9106) / HKDF-SHA384',
      standard: 'RFC 9106 Password Hashing Competition Winner & NIST SP 800-56C',
      targetRiskLevel: 'LOW',
      migrationComplexity: 'LOW',
      recommendedTimeline: 'Priority 2 (Enforce memory-hard KDF parameters)',
      rationale: 'Provides memory-hard defense against ASIC, GPU, and quantum-assisted brute force attacks.',
    };
  } else {
    vision2 = {
      targetAlgorithm: 'NIST Post-Quantum Cryptographic Standard (FIPS 203/204/205)',
      standard: 'NIST PQC Standardization Project',
      targetRiskLevel: 'LOW',
      migrationComplexity: 'MEDIUM',
      recommendedTimeline: 'Priority 3 (Audit and map to post-quantum primitive)',
      rationale: 'Transition to standard post-quantum cryptographic primitives.',
    };
  }

  return { vision1, vision2 };
}

export function calculateFindingRisk(
  finding: {
    algorithmName?: string;
    quantumStatus: QuantumStatus;
    classicalSecurity: ClassicalSecurity;
    businessCriticality: BusinessCriticality;
    dataLifetime: number;
    migrationTime: number;
    threatHorizon?: number;
    category: CategoryType;
    purpose?: CryptographicPurpose;
    confidence: number;
    keySize?: number | string | null;
    internetFacing?: boolean;
  },
  customWeights?: Partial<RiskWeights>,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): {
  riskScore: number;
  riskLevel: RiskLevel;
  riskCategory: RiskCategory;
  priority: PriorityLevel;
  priorityReason: string;
  whyRiskLevel: WhyRiskLevel;
  isInsufficientInfo: boolean;
  quantumRelevanceScore: number;
  algorithmConcernScore: number;
  businessCriticalityScore: number;
  dataLifetimeScore: number;
  migrationEffortScore: number;
  moscaAnalysis: ReturnType<typeof calculateMoscaAnalysis>;
  explanationFactors: string[];
  ruleMatched: string;
  reason: string;
  vision1: Vision1State;
  vision2: Vision2State;
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
  const riskLevel = getRiskLevelFromScore(riskScore, thresholds);

  // Risk Category Determination
  let riskCategory: RiskCategory = 'Migration Risk';
  if (finding.classicalSecurity === 'BROKEN' || finding.classicalSecurity === 'WEAK') {
    riskCategory = 'Classical Weakness';
  } else if (
    finding.quantumStatus === 'VULNERABLE_SHOR' ||
    finding.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER'
  ) {
    riskCategory = 'Quantum Vulnerability';
  }

  const threatHorizon = finding.threatHorizon ?? 10;
  const moscaAnalysis = calculateMoscaAnalysis(
    finding.dataLifetime,
    finding.migrationTime,
    threatHorizon
  );

  // Insufficient Information Detection
  const isInsufficientInfo =
    (finding.confidence !== undefined && finding.confidence < 20) ||
    !finding.algorithmName ||
    finding.algorithmName.toLowerCase().includes('unknown');

  // Priority Determination
  let priority: PriorityLevel = 'P4';
  let priorityReason = '';

  if (
    riskLevel === 'CRITICAL' ||
    (finding.quantumStatus === 'VULNERABLE_SHOR' && (finding.businessCriticality === 'CRITICAL' || moscaAnalysis.isUrgent)) ||
    finding.classicalSecurity === 'BROKEN'
  ) {
    priority = 'P1';
    priorityReason = `${finding.algorithmName || 'Cryptographic primitive'} requires immediate remediation: ${
      finding.classicalSecurity === 'BROKEN'
        ? 'Prone to classical collision or key-recovery attacks'
        : "Vulnerable to Shor's algorithm on quantum computers with immediate Store-Now-Decrypt-Later exposure"
    }.`;
  } else if (
    riskLevel === 'HIGH' ||
    finding.quantumStatus === 'VULNERABLE_SHOR' ||
    finding.classicalSecurity === 'WEAK'
  ) {
    priority = 'P2';
    priorityReason = `High priority: ${finding.algorithmName || 'Cryptographic primitive'} is vulnerable to quantum attacks or uses deprecated parameter lengths; scheduled migration required.`;
  } else if (
    riskLevel === 'MEDIUM' ||
    finding.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER'
  ) {
    priority = 'P3';
    priorityReason = `Planned migration: Upgrade to quantum-resistant standards (such as CNSA 2.0 256-bit+ symmetric / 384-bit hash) during scheduled modernization cycles.`;
  } else {
    priority = 'P4';
    priorityReason = `Monitor / Review: Currently resilient or safe against known quantum attacks; maintain continuous monitoring.`;
  }

  // Why is this risk level? (7 Key Factors)
  const isInternetFacing = finding.internetFacing === true;
  const whyRiskLevel: WhyRiskLevel = {
    vulnerableAlgorithm: `${finding.algorithmName || 'Algorithm'} (${
      finding.quantumStatus === 'VULNERABLE_SHOR'
        ? "Vulnerable: Shor's algorithm breaks discrete logarithm/factorization in polynomial time"
        : finding.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER'
        ? "Partially Vulnerable: Grover's algorithm halves effective symmetric key security"
        : "Resistant / Safe: No known polynomial quantum attack exists"
    })`,
    keySize: finding.keySize ? `${finding.keySize}-bit key length` : 'Standard / Default key length',
    cryptographicPurpose: finding.purpose ? `${finding.purpose.replace(/_/g, ' ')}` : 'Cryptographic operation',
    internetExposure: isInternetFacing
      ? 'Internet-facing endpoint (High exposure to adversary harvesting and Store-Now-Decrypt-Later)'
      : 'Internal / Protected service component',
    dataSensitivity: `${finding.businessCriticality} business criticality`,
    expectedDataLifetime: `${finding.dataLifetime} years persistence (${
      moscaAnalysis.isUrgent
        ? `URGENT: Shelf-life + migration exceeds ${threatHorizon}-year horizon by ${moscaAnalysis.deficitYears.toFixed(1)} yrs`
        : `Within ${threatHorizon}-year threat horizon safety buffer`
    })`,
    migrationComplexity: `${
      migrationEffortScore >= 70 ? 'High' : migrationEffortScore >= 45 ? 'Medium' : 'Low'
    } (${finding.category.replace(/_/g, ' ')} protocol/infrastructure effort)`,
  };

  // Generate Explainable Factors Breakdown
  const explanationFactors: string[] = [];
  const qPts = Math.round(quantumRelevanceScore * wQ);
  const aPts = Math.round(algorithmConcernScore * wA);
  const bPts = Math.round(businessCriticalityScore * wB);
  const lPts = Math.round(dataLifetimeScore * wL);
  const mPts = Math.round(migrationEffortScore * wM);

  if (finding.quantumStatus === 'VULNERABLE_SHOR') {
    explanationFactors.push(`+${qPts} Quantum Vulnerability: Shor's algorithm completely breaks asymmetric integer factorization / discrete logarithm`);
  } else if (finding.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER') {
    explanationFactors.push(`+${qPts} Quantum Impact: Grover's search algorithm halves effective symmetric key length`);
  } else if (finding.quantumStatus === 'QUANTUM_SAFE') {
    explanationFactors.push(`+${qPts} Post-Quantum Standard: Algorithm satisfies NIST FIPS post-quantum resilience requirements`);
  } else {
    explanationFactors.push(`+${qPts} Quantum Resistance: Sufficient classical margin against known quantum algorithms`);
  }

  if (finding.classicalSecurity === 'BROKEN') {
    explanationFactors.push(`+${aPts} Classical Security: Algorithm is cryptographically broken under classical cryptanalysis`);
  } else if (finding.classicalSecurity === 'WEAK') {
    explanationFactors.push(`+${aPts} Classical Security: Deprecated or legacy parameter length below modern standards`);
  } else {
    explanationFactors.push(`+${aPts} Classical Security: Acceptable/Secure classical security margin`);
  }

  explanationFactors.push(`+${bPts} Business Criticality: Evaluated as ${finding.businessCriticality} organizational asset`);
  explanationFactors.push(`+${lPts} Data Shelf-Life: ${finding.dataLifetime} years persistence${moscaAnalysis.isUrgent ? ' (Deficit vs Threat Horizon: Store-Now-Decrypt-Later exposure)' : ''}`);
  explanationFactors.push(`+${mPts} Migration Friction: ${finding.category.replace(/_/g, ' ')} migration effort factor`);

  // Rule Matching
  let ruleMatched = 'RULE-PQC-05-GENERAL-CRYPTOGRAPHY';
  let reason = 'Cryptographic component assessed under standard security policy.';

  if (isInsufficientInfo) {
    reason = 'Insufficient information for reliable assessment - manual review required.';
    ruleMatched = 'RULE-INSUFFICIENT-DATA';
  } else if (finding.quantumStatus === 'VULNERABLE_SHOR') {
    ruleMatched = 'RULE-PQC-01-SHOR-ASYMMETRIC-BREAK';
    reason = `Asymmetric public-key primitive is fully vulnerable to Shor's algorithm polynomial-time quantum cryptanalysis. Immediate migration to NIST FIPS 203/204 required.`;
  } else if (finding.classicalSecurity === 'BROKEN') {
    ruleMatched = 'RULE-CLASSICAL-01-BROKEN-PRIMITIVE';
    reason = `Primitive exhibits practical classical collision or key-recovery weaknesses (e.g. SHA-1, MD5, DES, RC4) and must be decommissioned immediately.`;
  } else if (finding.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER') {
    ruleMatched = 'RULE-PQC-02-GROVER-KEY-HALVING';
    reason = `Symmetric primitive is susceptible to Grover's quantum search. Key lengths below 256 bits offer insufficient quantum security margin (64-bit Grover threshold).`;
  } else if (finding.quantumStatus === 'QUANTUM_SAFE') {
    ruleMatched = 'RULE-PQC-03-NIST-PQC-COMPLIANT';
    reason = `Conforms to NIST post-quantum standardization requirements (FIPS 203, FIPS 204, or FIPS 205).`;
  }

  const { vision1, vision2 } = generateVisionStates(
    finding.algorithmName || 'Cryptographic Primitive',
    finding.category,
    finding.purpose || 'ENCRYPTION',
    finding.quantumStatus,
    finding.classicalSecurity,
    riskLevel
  );

  return {
    riskScore,
    riskLevel,
    riskCategory,
    priority,
    priorityReason,
    whyRiskLevel,
    isInsufficientInfo,
    quantumRelevanceScore,
    algorithmConcernScore,
    businessCriticalityScore,
    dataLifetimeScore,
    migrationEffortScore,
    moscaAnalysis,
    explanationFactors,
    ruleMatched,
    reason,
    vision1,
    vision2,
  };
}
