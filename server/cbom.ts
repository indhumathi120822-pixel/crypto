import { Finding } from './types.js';
import { randomUUID } from 'crypto';

export function generateCycloneDxCbom(repoName: string, findings: Finding[]) {
  const serialNumber = `urn:uuid:${randomUUID()}`;
  const timestamp = new Date().toISOString();

  const components = findings.map((f, index) => {
    let nistLevel = 1;
    if (f.quantumStatus === 'QUANTUM_SAFE' || f.algorithmName.includes('256') || f.algorithmName.includes('512')) {
      nistLevel = 5;
    } else if (f.quantumStatus === 'QUANTUM_RESISTANT') {
      nistLevel = 3;
    } else {
      nistLevel = 0;
    }

    return {
      type: 'cryptographic-asset',
      'bom-ref': `crypto-asset-${index + 1}-${f.algorithmId}`,
      name: f.algorithmName,
      version: '1.0',
      description: `Cryptographic finding in ${f.file}:${f.line}`,
      cryptoProperties: {
        assetType: 'algorithm',
        algorithmProperties: {
          primitive: f.category.toLowerCase().replace(/_/g, '-'),
          cryptoFunctions: [f.algorithmType.toLowerCase().replace(/\s+/g, '-')],
          classicalSecurityLevel: f.classicalSecurity,
          nistQuantumSecurityLevel: nistLevel,
          quantumStatus: f.quantumStatus,
        },
        detection: {
          type: f.detectionType,
          confidence: `${f.confidence}%`,
          line: f.line,
          file: f.file,
        },
      },
      evidence: {
        occurrences: [
          {
            location: f.file,
            line: f.line,
            symbol: f.algorithmName,
            additionalContext: f.evidence,
          },
        ],
      },
    };
  });

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber,
    version: 1,
    metadata: {
      timestamp,
      tools: [
        {
          vendor: 'CRYPTOVISTA',
          name: 'Cryptographic Discovery & CBOM Engine',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: repoName || 'Scanned Repository',
        version: '1.0.0',
        description: 'Repository scanned for enterprise cryptographic assets and post-quantum migration posture.',
      },
    },
    components,
  };
}

export function generateCbomCsv(findings: Finding[]): string {
  const headers = [
    'ID',
    'File',
    'Line',
    'Algorithm',
    'Category',
    'Type',
    'Quantum_Status',
    'Classical_Security',
    'Detection_Type',
    'Confidence',
    'Risk_Score',
    'Risk_Level',
    'Priority',
    'Business_Criticality',
    'Data_Lifetime_Years',
    'Migration_Time_Years',
    'Evidence',
  ];

  const escapeCsv = (val: any) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = findings.map((f) => [
    f.id,
    f.file,
    f.line,
    f.algorithmName,
    f.category,
    f.algorithmType,
    f.quantumStatus,
    f.classicalSecurity,
    f.detectionType,
    `${f.confidence}%`,
    f.riskScore,
    f.riskLevel,
    f.priority,
    f.businessCriticality,
    f.dataLifetime,
    f.migrationTime,
    f.evidence,
  ]);

  return [headers.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
}
