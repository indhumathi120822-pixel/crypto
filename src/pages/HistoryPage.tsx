import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { StoredScanSummary, ScanComparisonResult } from '../types';
import {
  History,
  GitCompare,
  Trash2,
  FolderOpen,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Calendar,
  Layers,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { applyUpdatedScanResult, setActivePage } = useApp();
  const [scans, setScans] = useState<StoredScanSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comparison State
  const [isComparing, setIsComparing] = useState(false);
  const [oldScanId, setOldScanId] = useState<string>('');
  const [newScanId, setNewScanId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ScanComparisonResult | null>(null);
  const [comparingLoading, setComparingLoading] = useState(false);

  const fetchScans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.listScans(searchQuery);
      setScans(res.scans);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve scan history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, [searchQuery]);

  const handleLoadScan = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.loadScan(id);
      const fullScan = await api.getScan(id);
      if (fullScan) {
        applyUpdatedScanResult({
          repoName: fullScan.repoName,
          uploadedAt: fullScan.uploadedAt,
          fileCount: fullScan.fileCount,
          findings: fullScan.findings,
          stats: fullScan.stats,
          fileTree: fullScan.fileTree,
          dependencyGraph: fullScan.dependencyGraph,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to activate scan session');
      setLoading(false);
    }
  };

  const handleDeleteScan = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this scan record?')) return;
    try {
      await api.deleteScan(id);
      setScans((prev) => prev.filter((s) => s.id !== id));
      if (comparisonResult && (comparisonResult.oldScanId === id || comparisonResult.newScanId === id)) {
        setComparisonResult(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete scan record');
    }
  };

  const handleRunComparison = async () => {
    if (!oldScanId || !newScanId) {
      setError('Please select both a Baseline scan and a Comparison scan.');
      return;
    }
    if (oldScanId === newScanId) {
      setError('Please select two distinct scans to compare progress.');
      return;
    }

    try {
      setComparingLoading(true);
      setError(null);
      const res = await api.compareScans(oldScanId, newScanId);
      setComparisonResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate comparison report');
    } finally {
      setComparingLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Scan History & Comparative Auditing
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Persisted cryptographic scan archives. Track post-quantum migration velocity across commits and releases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsComparing(!isComparing);
              if (!isComparing && scans.length >= 2) {
                setOldScanId(scans[scans.length - 1]?.id || '');
                setNewScanId(scans[0]?.id || '');
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              isComparing
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            {isComparing ? 'Hide Comparison Panel' : 'Compare Two Scans'}
          </button>
          <button
            onClick={fetchScans}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            title="Refresh Scan List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="underline font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Comparison Drawer/Panel */}
      {isComparing && (
        <div className="p-5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <GitCompare className="w-4 h-4 text-indigo-500" />
              Differential Scan Analysis (Baseline vs New Release)
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Measures quantified risk reduction & migrated post-quantum primitives
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Baseline (Earlier Scan)
              </label>
              <select
                value={oldScanId}
                onChange={(e) => setOldScanId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select Baseline Scan...</option>
                {scans.map((s) => (
                  <option key={`old-${s.id}`} value={s.id}>
                    {s.repoName} ({new Date(s.uploadedAt).toLocaleDateString()} - Score: {s.averageRiskScore})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Target (Latest / Remediated Scan)
              </label>
              <select
                value={newScanId}
                onChange={(e) => setNewScanId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select Target Scan...</option>
                {scans.map((s) => (
                  <option key={`new-${s.id}`} value={s.id}>
                    {s.repoName} ({new Date(s.uploadedAt).toLocaleDateString()} - Score: {s.averageRiskScore})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunComparison}
              disabled={comparingLoading || !oldScanId || !newScanId}
              className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {comparingLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Calculating Delta...
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4" />
                  Compare Post-Quantum Progress
                </>
              )}
            </button>
          </div>

          {/* Comparison Results Card */}
          {comparisonResult && (
            <div className="mt-4 p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">Risk Score Change</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-slate-400 line-through">
                      {comparisonResult.oldRiskScore}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {comparisonResult.newRiskScore}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
                    {comparisonResult.riskReduction > 0
                      ? `-${comparisonResult.riskReduction} pts (${comparisonResult.riskReductionPercent}% reduction)`
                      : 'No net risk reduction'}
                  </span>
                </div>

                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">Resolved Vulnerabilities</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {comparisonResult.resolvedFindings.length}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {comparisonResult.migrationProgress.migratedToPqcCount} primitives remediated
                  </span>
                </div>

                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">New Findings</span>
                  <div className="text-2xl font-black text-rose-500 mt-1">
                    {comparisonResult.newFindings.length}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Introduced since baseline
                  </span>
                </div>

                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">P1 Migration Velocity</span>
                  <div className="text-2xl font-black text-indigo-500 mt-1">
                    {comparisonResult.migrationProgress.progressPercent}%
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {comparisonResult.migrationProgress.pendingP1Count} critical P1s remain
                  </span>
                </div>
              </div>

              {/* Resolved Findings List */}
              {comparisonResult.resolvedFindings.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    Successfully Remediated Cryptographic Primitives
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {comparisonResult.resolvedFindings.map((f, i) => (
                      <div
                        key={`resolved-${i}`}
                        className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-slate-800 dark:text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-semibold">{f.algorithmName}</span>
                          <span className="text-slate-500 text-[11px]">
                            {f.file}:{f.line}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                          Remediated
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search & Scans Table */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search past scans by repository name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading scan history...
          </div>
        ) : scans.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
            <History className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No scan history found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Scan a local ZIP archive or remote Git repository to start building your cryptographic audit timeline.
            </p>
            <button
              onClick={() => setActivePage('scan')}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              Start New Scan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Repository</th>
                  <th className="py-3 px-3">Date Scanned</th>
                  <th className="py-3 px-3">Files</th>
                  <th className="py-3 px-3">Risk Score</th>
                  <th className="py-3 px-3">Quantum Exposure</th>
                  <th className="py-3 px-3">P1 Urgent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {scans.map((s) => {
                  const isHighExposure = s.overallQuantumPosture === 'HIGH_EXPOSURE';
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-indigo-500" />
                          {s.repoName}
                        </div>
                        {s.repoUrl && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                            {s.repoUrl}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(s.uploadedAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {s.fileCount} files
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-md ${
                            s.averageRiskScore >= 70
                              ? 'bg-rose-500/15 text-rose-500'
                              : s.averageRiskScore >= 40
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-emerald-500/15 text-emerald-500'
                          }`}
                        >
                          {s.averageRiskScore} / 100
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isHighExposure
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isHighExposure ? (
                            <ShieldAlert className="w-3 h-3" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          {s.overallQuantumPosture.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {s.p1Candidates > 0 ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {s.p1Candidates} P1
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleLoadScan(s.id)}
                            className="px-2.5 py-1.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-medium text-xs flex items-center gap-1 cursor-pointer"
                            title="Load into Active Session"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteScan(s.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Delete scan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
