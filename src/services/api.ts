import {
  ScanStatusResponse,
  Finding,
  ScanStats,
  FileTreeNode,
  RiskWeights,
  BusinessCriticality,
  SimulatedResult,
  CryptoAlgorithmDef,
} from '../types';

export const api = {
  async getStatus(): Promise<ScanStatusResponse> {
    const res = await fetch('/api/scan/status');
    if (!res.ok) throw new Error('Failed to fetch scan status');
    return res.json();
  },

  async getStats(): Promise<{
    scanned: boolean;
    repoName: string | null;
    uploadedAt: string | null;
    fileCount: number;
    stats: ScanStats | null;
  }> {
    const res = await fetch('/api/scan/stats');
    if (!res.ok) throw new Error('Failed to fetch scan statistics');
    return res.json();
  },

  async getFindings(params?: {
    priority?: string;
    risk?: string;
    category?: string;
    quantum?: string;
    detection?: string;
    search?: string;
  }): Promise<{
    scanned: boolean;
    repoName?: string;
    totalFindings: number;
    count: number;
    findings: Finding[];
  }> {
    const query = new URLSearchParams();
    if (params?.priority) query.set('priority', params.priority);
    if (params?.risk) query.set('risk', params.risk);
    if (params?.category) query.set('category', params.category);
    if (params?.quantum) query.set('quantum', params.quantum);
    if (params?.detection) query.set('detection', params.detection);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const url = `/api/scan/findings${queryString ? `?${queryString}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch findings');
    return res.json();
  },

  async getFindingDetail(id: string): Promise<{
    scanned: boolean;
    finding: Finding;
    surroundingLines: { lineNumber: number; content: string; isDetectedLine: boolean }[];
    referenceAlgorithm: CryptoAlgorithmDef | null;
  }> {
    const res = await fetch(`/api/scan/findings/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch details for finding ${id}`);
    return res.json();
  },

  async getRecommendations(): Promise<{
    scanned: boolean;
    repoName?: string;
    summary: { total: number; p1Count: number; p2Count: number; p3Count: number; p4Count: number };
    recommendations: {
      p1Immediate: any[];
      p2High: any[];
      p3Planned: any[];
      p4Monitor: any[];
    };
  }> {
    const res = await fetch('/api/scan/recommendations');
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
  },

  async clearScan(): Promise<void> {
    const res = await fetch('/api/scan', { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to reset scan session');
  },

  async uploadZip(file: File, options?: {
    weights?: RiskWeights;
    defaultBusinessCriticality?: BusinessCriticality;
    defaultDataLifetime?: number;
    defaultMigrationTime?: number;
    threatHorizon?: number;
    confidenceThreshold?: number;
  }): Promise<{
    success: boolean;
    repoName: string;
    uploadedAt: string;
    fileCount: number;
    findings: Finding[];
    stats: ScanStats;
    fileTree: FileTreeNode[];
  }> {
    const formData = new FormData();
    formData.append('repository', file);

    if (options?.weights) {
      formData.append('weights', JSON.stringify(options.weights));
    }
    if (options?.defaultBusinessCriticality) {
      formData.append('defaultBusinessCriticality', options.defaultBusinessCriticality);
    }
    if (options?.defaultDataLifetime !== undefined) {
      formData.append('defaultDataLifetime', String(options.defaultDataLifetime));
    }
    if (options?.defaultMigrationTime !== undefined) {
      formData.append('defaultMigrationTime', String(options.defaultMigrationTime));
    }
    if (options?.threatHorizon !== undefined) {
      formData.append('threatHorizon', String(options.threatHorizon));
    }
    if (options?.confidenceThreshold !== undefined) {
      formData.append('confidenceThreshold', String(options.confidenceThreshold));
    }

    const res = await fetch('/api/scan/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to upload and scan repository');
    }

    return res.json();
  },

  async recalculateRisk(params: {
    findingId?: string;
    businessCriticality?: BusinessCriticality;
    dataLifetime?: number;
    migrationTime?: number;
    threatHorizon?: number;
    weights?: RiskWeights;
  }): Promise<{ success: boolean; findings: Finding[]; stats: ScanStats }> {
    const res = await fetch('/api/scan/recalculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Recalculation failed' }));
      throw new Error(err.error || 'Failed to recalculate risk');
    }

    return res.json();
  },

  async getFile(path: string): Promise<{
    path: string;
    content: string;
    lineCount: number;
    findings: Finding[];
    isModified: boolean;
  }> {
    const res = await fetch(`/api/scan/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`Failed to load file ${path}`);
    return res.json();
  },

  async saveFile(path: string, content: string): Promise<{
    success: boolean;
    message: string;
    path: string;
    findings: Finding[];
    stats: ScanStats;
    isModified: boolean;
  }> {
    const res = await fetch('/api/scan/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });

    if (!res.ok) throw new Error(`Failed to save file ${path}`);
    return res.json();
  },

  async resetFile(path: string): Promise<{
    success: boolean;
    message: string;
    path: string;
    content: string;
    findings: Finding[];
    stats: ScanStats;
    isModified: boolean;
  }> {
    const res = await fetch('/api/scan/reset-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });

    if (!res.ok) throw new Error(`Failed to reset file ${path}`);
    return res.json();
  },

  async getKnowledgeBase(): Promise<{ count: number; algorithms: CryptoAlgorithmDef[] }> {
    const res = await fetch('/api/knowledge-base');
    if (!res.ok) throw new Error('Failed to load knowledge base');
    return res.json();
  },

  async getAiAdvisory(findingId: string): Promise<{
    advice: string;
    source: 'GEMINI_AI' | 'DETERMINISTIC_ENGINE';
  }> {
    const res = await fetch('/api/ai/advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId }),
    });

    if (!res.ok) throw new Error('Failed to generate advisory');
    return res.json();
  },

  async simulateFindingMigration(findingId: string, targetAlgorithmId: string): Promise<SimulatedResult> {
    const res = await fetch('/api/scan/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId, targetAlgorithmId }),
    });

    if (!res.ok) throw new Error('Failed to simulate migration');
    return res.json();
  },

  getDownloadFileUrl(path: string): string {
    return `/api/scan/download/file?path=${encodeURIComponent(path)}`;
  },

  getDownloadZipUrl(): string {
    return '/api/scan/download/zip';
  },

  getCbomUrl(format: 'json' | 'csv'): string {
    return `/api/scan/cbom?format=${format}`;
  },

  async listScans(query?: string): Promise<{ scans: import('../types').StoredScanSummary[]; count: number }> {
    const q = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`/api/scans${q}`);
    if (!res.ok) throw new Error('Failed to list past scans');
    return res.json();
  },

  async getScan(id: string): Promise<any> {
    const res = await fetch(`/api/scans/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to load scan ${id}`);
    return res.json();
  },

  async loadScan(id: string): Promise<any> {
    const res = await fetch(`/api/scans/${encodeURIComponent(id)}/load`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to activate scan ${id}`);
    return res.json();
  },

  async deleteScan(id: string): Promise<void> {
    const res = await fetch(`/api/scans/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete scan ${id}`);
  },

  async compareScans(oldScanId: string, newScanId: string): Promise<import('../types').ScanComparisonResult> {
    const res = await fetch('/api/scans/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldScanId, newScanId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Comparison failed' }));
      throw new Error(err.error || 'Failed to compare scans');
    }
    return res.json();
  },

  async validateRepoUrl(url: string): Promise<{
    valid: boolean;
    provider?: string | null;
    owner?: string;
    repo?: string;
    error?: string;
  }> {
    const res = await fetch('/api/scan/validate-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },

  async scanRemoteRepo(params: {
    url: string;
    branch?: string;
    weights?: RiskWeights;
    defaultBusinessCriticality?: BusinessCriticality;
    defaultDataLifetime?: number;
    defaultMigrationTime?: number;
    threatHorizon?: number;
    confidenceThreshold?: number;
  }): Promise<{
    success: boolean;
    repoName: string;
    repoUrl?: string;
    uploadedAt: string;
    fileCount: number;
    findings: Finding[];
    stats: ScanStats;
    fileTree: FileTreeNode[];
    dependencyGraph: any;
  }> {
    const res = await fetch('/api/scan/remote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Remote scan failed' }));
      throw new Error(err.error || 'Failed to scan remote repository');
    }
    return res.json();
  },

  async evaluateAlgorithm(params: {
    algorithmName: string;
    algorithmFamily: string;
    keySize?: string | number;
    purpose?: string;
    dataSensitivity: string;
    expectedShelfLife: number;
    migrationTime: number;
    internetExposure: boolean | string;
  }): Promise<{
    success: boolean;
    finding: Finding;
    riskScore: number;
    riskLevel: string;
    priority: string;
    priorityReason: string;
    riskCategory: string;
    whyRiskLevel: any;
    recommendedTarget: string;
    moscaAnalysis: any;
  }> {
    const res = await fetch('/api/algorithms/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Evaluation failed' }));
      throw new Error(err.error || 'Failed to evaluate algorithm');
    }
    return res.json();
  },

  async addManualAlgorithm(params: {
    algorithmName: string;
    algorithmFamily: string;
    keySize?: string | number;
    purpose?: string;
    dataSensitivity: string;
    expectedShelfLife: number;
    migrationTime: number;
    internetExposure: boolean | string;
  }): Promise<{
    success: boolean;
    finding: Finding;
    stats: ScanStats;
    totalFindings: number;
  }> {
    const res = await fetch('/api/algorithms/add-to-inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to add algorithm' }));
      throw new Error(err.error || 'Failed to add algorithm to inventory');
    }
    return res.json();
  },

  async simulateMigration(params: {
    currentAlgorithm: string;
    targetAlgorithm: string;
    keySize?: number;
  }): Promise<{
    success: boolean;
    currentAlgorithm: string;
    targetAlgorithm: string;
    beforeRiskScore: number;
    afterRiskScore: number;
    riskReduction: number;
    strengthBefore: string;
    strengthAfter: string;
    performanceImpact: {
      keySizeChange: string;
      ciphertextChange: string;
      latencyImpact: string;
    };
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    complexityReason: string;
    rationale: string;
  }> {
    const res = await fetch('/api/migration/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Simulation failed' }));
      throw new Error(err.error || 'Failed to simulate migration');
    }
    return res.json();
  },
};
