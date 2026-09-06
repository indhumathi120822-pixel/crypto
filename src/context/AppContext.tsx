import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Finding,
  ScanStats,
  FileTreeNode,
  DependencyGraph,
  AppSettings,
  BusinessCriticality,
  RiskWeights,
} from '../types';
import { api } from '../services/api';

export type PageId =
  | 'dashboard'
  | 'scan'
  | 'findings'
  | 'developer'
  | 'cbom'
  | 'quantum'
  | 'recommendations'
  | 'simulator'
  | 'knowledge-base'
  | 'settings';

export type ViewMode = 'ciso' | 'developer';

const DEFAULT_WEIGHTS: RiskWeights = {
  quantumRelevance: 0.3,
  algorithmConcern: 0.2,
  businessCriticality: 0.2,
  dataLifetime: 0.15,
  migrationEffort: 0.15,
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'indigo',
  animationsEnabled: true,
  reducedMotion: false,
  weights: DEFAULT_WEIGHTS,
  defaultBusinessCriticality: 'MEDIUM',
  defaultDataLifetime: 5,
  defaultMigrationTime: 2,
  threatHorizon: 10,
  maxUploadSizeMb: 30,
  confidenceThreshold: 30,
};

interface AppContextType {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  scanned: boolean;
  repoName: string | null;
  uploadedAt: string | null;
  fileCount: number;
  findings: Finding[];
  stats: ScanStats | null;
  fileTree: FileTreeNode[];
  dependencyGraph: DependencyGraph;
  selectedFindingId: string | null;
  setSelectedFindingId: (id: string | null) => void;
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  selectedLineNumber: number | null;
  setSelectedLineNumber: (line: number | null) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refreshStatus: () => Promise<void>;
  clearScan: () => Promise<void>;
  openFindingInCode: (finding: Finding) => void;
  applyUpdatedScanResult: (data: {
    repoName: string;
    uploadedAt: string;
    fileCount: number;
    findings: Finding[];
    stats: ScanStats;
    fileTree: FileTreeNode[];
    dependencyGraph?: DependencyGraph;
  }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('ciso');
  const [scanned, setScanned] = useState<boolean>(false);
  const [repoName, setRepoName] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraph>({ nodes: [], links: [] });

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedLineNumber, setSelectedLineNumber] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Settings loaded from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('cryptovista_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
    localStorage.setItem('cryptovista_settings', JSON.stringify(settings));
  }, [settings]);

  const refreshStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getStatus();
      setScanned(data.scanned);
      setRepoName(data.repoName);
      setUploadedAt(data.uploadedAt);
      setFileCount(data.fileCount);
      setFindings(data.findings || []);
      setStats(data.stats);
      setFileTree(data.fileTree || []);
      setDependencyGraph(data.dependencyGraph || { nodes: [], links: [] });
    } catch (err: any) {
      console.error('Failed to load scan status:', err);
      setError(err.message || 'Could not connect to scanner server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const clearScan = async () => {
    try {
      setIsLoading(true);
      await api.clearScan();
      setScanned(false);
      setRepoName(null);
      setUploadedAt(null);
      setFileCount(0);
      setFindings([]);
      setStats(null);
      setFileTree([]);
      setDependencyGraph({ nodes: [], links: [] });
      setSelectedFindingId(null);
      setSelectedFilePath(null);
      setSelectedLineNumber(null);
      setActivePage('dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to clear scan');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
  };

  const openFindingInCode = (finding: Finding) => {
    setSelectedFindingId(finding.id);
    setSelectedFilePath(finding.file);
    setSelectedLineNumber(finding.line);
    setActivePage('developer');
  };

  const applyUpdatedScanResult = (data: {
    repoName: string;
    uploadedAt: string;
    fileCount: number;
    findings: Finding[];
    stats: ScanStats;
    fileTree: FileTreeNode[];
    dependencyGraph?: DependencyGraph;
  }) => {
    setScanned(true);
    setRepoName(data.repoName);
    setUploadedAt(data.uploadedAt);
    setFileCount(data.fileCount);
    setFindings(data.findings);
    setStats(data.stats);
    setFileTree(data.fileTree);
    if (data.dependencyGraph) {
      setDependencyGraph(data.dependencyGraph);
    }
    setActivePage('dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        viewMode,
        setViewMode,
        scanned,
        repoName,
        uploadedAt,
        fileCount,
        findings,
        stats,
        fileTree,
        dependencyGraph,
        selectedFindingId,
        setSelectedFindingId,
        selectedFilePath,
        setSelectedFilePath,
        selectedLineNumber,
        setSelectedLineNumber,
        settings,
        updateSettings,
        isLoading,
        error,
        clearError: () => setError(null),
        refreshStatus,
        clearScan,
        openFindingInCode,
        applyUpdatedScanResult,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
