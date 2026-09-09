import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Finding, PriorityLevel, CategoryType } from '../types';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  FileCode,
  Filter,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';

export const RoadmapMatrixPage: React.FC = () => {
  const { scanned, repoName, findings, openFindingInCode, setActivePage } = useApp();
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!scanned || findings.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 mt-6">
        <Layers className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          No Cryptographic Inventory Scanned Yet
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Scan a repository to generate the enterprise Vision 1 (Current State) vs Vision 2 (Post-Quantum Target) Transition Matrix.
        </p>
        <button
          onClick={() => setActivePage('scan')}
          className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
        >
          Scan Repository
        </button>
      </div>
    );
  }

  // Filter findings that have vision1 & vision2
  let filtered = findings.filter((f) => !!f.vision1 && !!f.vision2);

  if (priorityFilter !== 'ALL') {
    filtered = filtered.filter((f) => f.priority === priorityFilter);
  }
  if (categoryFilter !== 'ALL') {
    filtered = filtered.filter((f) => f.category === categoryFilter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.algorithmName.toLowerCase().includes(q) ||
        f.file.toLowerCase().includes(q) ||
        f.vision2?.targetAlgorithm.toLowerCase().includes(q) ||
        f.vision2?.standard.toLowerCase().includes(q)
    );
  }

  const p1Count = findings.filter((f) => f.priority === 'P1').length;
  const p2Count = findings.filter((f) => f.priority === 'P2').length;
  const p3Count = findings.filter((f) => f.priority === 'P3').length;

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Vision 1 vs Vision 2: Post-Quantum Migration Matrix
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Component-by-component mapping from current vulnerable cryptography to NIST-standardized Post-Quantum targets.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30">
            {p1Count} P1 Immediate
          </span>
          <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
            {p2Count} P2 High
          </span>
          <span className="px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30">
            {p3Count} P3 Planned
          </span>
        </div>
      </div>

      {/* Migration Standards Reference Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-400">
            Official Migration Standards Compliance
          </span>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-semibold">
              NIST FIPS 203 (ML-KEM)
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-semibold">
              NIST FIPS 204 (ML-DSA)
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-semibold">
              NIST FIPS 205 (SLH-DSA)
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-semibold">
              CNSA 2.0 Suite
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          Repository: <span className="text-white font-semibold">{repoName}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter components or target algorithms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[240px]"
        />

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Priorities</option>
          <option value="P1">Priority 1 (Immediate Hybrid/PQC)</option>
          <option value="P2">Priority 2 (High / Scheduled)</option>
          <option value="P3">Priority 3 (Planned / Agility)</option>
          <option value="P4">Priority 4 (Secure / Monitor)</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Cryptographic Categories</option>
          <option value="ASYMMETRIC_KEY_EXCHANGE">Key Exchange (KEM)</option>
          <option value="DIGITAL_SIGNATURES">Digital Signatures</option>
          <option value="SYMMETRIC_ENCRYPTION">Symmetric Ciphers</option>
          <option value="HASH_FUNCTIONS">Hash Functions</option>
          <option value="PASSWORD_HASHING_KDF">Password KDFs</option>
        </select>

        <span className="text-xs text-slate-500 ml-auto">
          Showing {filtered.length} of {findings.length} mapped items
        </span>
      </div>

      {/* Vision 1 vs Vision 2 Comparison Table */}
      <div className="space-y-4">
        {filtered.map((item) => {
          const v1 = item.vision1!;
          const v2 = item.vision2!;
          const isP1 = item.priority === 'P1';

          return (
            <div
              key={item.id}
              className={`rounded-xl border transition-shadow overflow-hidden bg-white dark:bg-slate-900 ${
                isP1
                  ? 'border-rose-300 dark:border-rose-900/60 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Header Bar */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono">
                  <FileCode className="w-4 h-4 text-indigo-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.file}:{item.line}
                  </span>
                  <span className="text-slate-400">({item.category.replace(/_/g, ' ')})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-black text-[10px] px-2 py-0.5 rounded ${
                      item.priority === 'P1'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : item.priority === 'P2'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {item.priority}
                  </span>
                  <button
                    onClick={() => openFindingInCode(item)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Inspect in Code
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 2-Column Split: Vision 1 (Current) vs Vision 2 (Target) */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 p-4 gap-4">
                {/* Vision 1: Current State */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      Vision 1: Current Cryptographic State
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        v1.riskLevel === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-500'
                          : v1.riskLevel === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {v1.riskLevel} RISK
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 space-y-1.5">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-500" />
                      {v1.algorithm}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>Purpose:</strong> {v1.purpose.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed pt-1">
                      <strong>Quantum Threat:</strong> {v1.quantumThreat}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div>
                      <strong>Rule Matched:</strong>{' '}
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {item.ruleMatched || 'RULE-PQC-01-SHOR-ASYMMETRIC-BREAK'}
                      </span>
                    </div>
                    <div>
                      <strong>Audit Reason:</strong> {item.reason}
                    </div>
                  </div>
                </div>

                {/* Vision 2: Target Post-Quantum State */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Vision 2: Post-Quantum Target State
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                      LOW POST-QUANTUM RISK
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {v2.targetAlgorithm}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>Standard:</strong> {v2.standard}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed pt-1">
                      <strong>Rationale:</strong> {v2.rationale}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div>
                      <strong>Recommended Timeline:</strong>{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {v2.recommendedTimeline}
                      </span>
                    </div>
                    <div>
                      <strong>Migration Complexity:</strong>{' '}
                      <span
                        className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                          v2.migrationComplexity === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-emerald-500/20 text-emerald-500'
                        }`}
                      >
                        {v2.migrationComplexity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Snippet Box with Redaction Awareness */}
              <div className="px-4 py-2 bg-slate-950 text-slate-300 text-[11px] font-mono border-t border-slate-800 flex items-center justify-between">
                <span className="truncate max-w-2xl">{item.code}</span>
                {item.isRedacted && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    Sensitive Data Redacted
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
