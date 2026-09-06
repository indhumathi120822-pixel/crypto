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

  async simulateMigration(findingId: string, targetAlgorithmId: string): Promise<SimulatedResult> {
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
};
