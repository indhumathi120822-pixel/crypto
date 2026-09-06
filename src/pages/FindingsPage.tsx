import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Finding, PriorityLevel, RiskLevel, QuantumStatus, CategoryType, DetectionType } from '../types';
import { RiskBadge, QuantumBadge, PriorityBadge, DetectionBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { FindingDetailModal } from '../components/findings/FindingDetailModal';
import {
  Search,
  Filter,
  Code2,
  ExternalLink,
  ChevronRight,
  ArrowUpDown,
  Download,
  Terminal,
  ShieldAlert,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const FindingsPage: React.FC = () => {
  const { scanned, findings, repoName, openFindingInCode, setActivePage } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'ALL'>('ALL');
  const [filterQuantum, setFilterQuantum] = useState<QuantumStatus | 'ALL'>('ALL');
  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [filterDetection, setFilterDetection] = useState<DetectionType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'risk' | 'priority' | 'line' | 'name'>('risk');

  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);

  if (!scanned) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Findings Discovered Yet"
          description="Upload a ZIP archive containing source code or configuration files to scan and generate cryptographic findings."
          onNavigateScan={() => setActivePage('scan')}
          onNavigateKnowledgeBase={() => setActivePage('knowledge-base')}
          viewContext="findings"
        />
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Cryptographic Artefacts Detected"
          description="No cryptographic artefacts were detected in the uploaded repository."
          onNavigateScan={() => setActivePage('scan')}
          onNavigateKnowledgeBase={() => setActivePage('knowledge-base')}
          viewContext="findings"
        />
      </div>
    );
  }

  // Priority and Detection Metric Counts
  const p1Count = findings.filter((f) => f.priority === 'P1').length;
  const p2Count = findings.filter((f) => f.priority === 'P2').length;
  const p3Count = findings.filter((f) => f.priority === 'P3').length;
  const p4Count = findings.filter((f) => f.priority === 'P4').length;
  const activeUsageCount = findings.filter((f) => f.detectionType === 'ACTIVE_USAGE').length;

  // Filter findings
  const filtered = findings.filter((f) => {
    if (filterRisk !== 'ALL' && f.riskLevel !== filterRisk) return false;
    if (filterQuantum !== 'ALL' && f.quantumStatus !== filterQuantum) return false;
    if (filterPriority !== 'ALL' && f.priority !== filterPriority) return false;
    if (filterCategory !== 'ALL' && f.category !== filterCategory) return false;
    if (filterDetection !== 'ALL' && f.detectionType !== filterDetection) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        f.algorithmName.toLowerCase().includes(q) ||
        f.file.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        f.evidence.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Sort findings
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'risk') return b.riskScore - a.riskScore;
    if (sortBy === 'priority') return a.priority.localeCompare(b.priority);
    if (sortBy === 'line') return a.line - b.line;
    if (sortBy === 'name') return a.algorithmName.localeCompare(b.algorithmName);
    return 0;
  });

  return (
    <div className="py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Cryptographic Findings Inventory
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Displaying {sorted.length} of {findings.length} findings in {repoName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePage('cbom')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Export CBOM
          </button>
          <button
            onClick={() => setActivePage('developer')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            Open Code Editor
          </button>
        </div>
      </div>

      {/* Priority & Active Usage Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* P1 - Immediate: Deep Red / Burgundy */}
        <button
          onClick={() => setFilterPriority((prev) => (prev === 'P1' ? 'ALL' : 'P1'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterPriority === 'P1'
              ? 'border-rose-900/80 bg-rose-950/25 dark:bg-[#320c13] shadow-sm ring-1 ring-rose-800/40'
              : 'border-rose-900/20 bg-rose-950/5 dark:bg-[#1a060a]/60 hover:border-rose-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              P1 — Immediate
            </span>
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-rose-900 dark:text-rose-100 mt-1">
            {p1Count}
          </div>
          <div className="text-[10px] text-rose-950/70 dark:text-rose-300/70 mt-0.5">
            Highest migration urgency
          </div>
        </button>

        {/* P2 - High: Professional Amber / Orange */}
        <button
          onClick={() => setFilterPriority((prev) => (prev === 'P2' ? 'ALL' : 'P2'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterPriority === 'P2'
              ? 'border-amber-800/80 bg-amber-950/25 dark:bg-[#341d08] shadow-sm ring-1 ring-amber-700/40'
              : 'border-amber-900/20 bg-amber-950/5 dark:bg-[#1c0e04]/60 hover:border-amber-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              P2 — High
            </span>
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
            {p2Count}
          </div>
          <div className="text-[10px] text-amber-950/70 dark:text-amber-300/70 mt-0.5">
            Scheduled migration
          </div>
        </button>

        {/* P3 - Planned: Professional Blue */}
        <button
          onClick={() => setFilterPriority((prev) => (prev === 'P3' ? 'ALL' : 'P3'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterPriority === 'P3'
              ? 'border-blue-800/80 bg-blue-950/25 dark:bg-[#0c1e38] shadow-sm ring-1 ring-blue-700/40'
              : 'border-blue-900/20 bg-blue-950/5 dark:bg-[#060f1c]/60 hover:border-blue-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-200">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              P3 — Planned
            </span>
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
            {p3Count}
          </div>
          <div className="text-[10px] text-blue-950/70 dark:text-blue-300/70 mt-0.5">
            Medium-term roadmap
          </div>
        </button>

        {/* P4 - Monitor: Calm Green / Teal */}
        <button
          onClick={() => setFilterPriority((prev) => (prev === 'P4' ? 'ALL' : 'P4'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterPriority === 'P4'
              ? 'border-teal-800/80 bg-teal-950/25 dark:bg-[#092922] shadow-sm ring-1 ring-teal-700/40'
              : 'border-teal-900/20 bg-teal-950/5 dark:bg-[#041410]/60 hover:border-teal-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-teal-900 dark:text-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
              P4 — Monitor
            </span>
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-teal-900 dark:text-teal-100 mt-1">
            {p4Count}
          </div>
          <div className="text-[10px] text-teal-950/70 dark:text-teal-300/70 mt-0.5">
            Quantum resistant primitives
          </div>
        </button>

        {/* Active Usage: Professional Cyan / Teal Accent */}
        <button
          onClick={() => setFilterDetection((prev) => (prev === 'ACTIVE_USAGE' ? 'ALL' : 'ACTIVE_USAGE'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            filterDetection === 'ACTIVE_USAGE'
              ? 'border-cyan-800/80 bg-cyan-950/25 dark:bg-[#0c2933] shadow-sm ring-1 ring-cyan-700/40'
              : 'border-cyan-900/20 bg-cyan-950/5 dark:bg-[#05171d]/60 hover:border-cyan-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-cyan-900 dark:text-cyan-200">
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              Active Usage
            </span>
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-cyan-900 dark:text-cyan-100 mt-1">
            {activeUsageCount}
          </div>
          <div className="text-[10px] text-cyan-950/70 dark:text-cyan-300/70 mt-0.5">
            Direct crypto invocations
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search algorithm, file path, code snippet, or evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="risk">Sort by Risk Score</option>
              <option value="priority">Sort by Priority (P1 to P4)</option>
              <option value="name">Sort by Algorithm Name</option>
              <option value="line">Sort by Line Number</option>
            </select>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Risk Level */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Quantum Status */}
          <select
            value={filterQuantum}
            onChange={(e) => setFilterQuantum(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Quantum Statuses</option>
            <option value="VULNERABLE_SHOR">Shor Vulnerable (PKI)</option>
            <option value="PARTIALLY_VULNERABLE_GROVER">Grover Halved (&lt;256b)</option>
            <option value="QUANTUM_RESISTANT">Quantum Resistant (256b)</option>
            <option value="QUANTUM_SAFE">Post-Quantum Safe (FIPS)</option>
          </select>

          {/* Priority */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Priorities</option>
            <option value="P1">P1 (Immediate)</option>
            <option value="P2">P2 (High)</option>
            <option value="P3">P3 (Planned)</option>
            <option value="P4">P4 (Monitor)</option>
          </select>

          {/* Detection Type */}
          <select
            value={filterDetection}
            onChange={(e) => setFilterDetection(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Detection Types</option>
            <option value="ACTIVE_USAGE">Active Invocations</option>
            <option value="LIBRARY_USAGE">Library Imports</option>
            <option value="CONFIGURATION_USAGE">Configuration Files</option>
            <option value="TEXTUAL_REFERENCE">Textual References</option>
            <option value="UNKNOWN">Unknown / Blind Spots</option>
          </select>

          {(filterRisk !== 'ALL' ||
            filterQuantum !== 'ALL' ||
            filterPriority !== 'ALL' ||
            filterCategory !== 'ALL' ||
            filterDetection !== 'ALL' ||
            searchQuery) && (
            <button
              onClick={() => {
                setFilterRisk('ALL');
                setFilterQuantum('ALL');
                setFilterPriority('ALL');
                setFilterCategory('ALL');
                setFilterDetection('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-rose-500 hover:underline px-2 cursor-pointer font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Findings Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No cryptographic findings match your current search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Algorithm &amp; Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Code Snippet</th>
                  <th className="py-3 px-4">Quantum Status</th>
                  <th className="py-3 px-4">Detection</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {sorted.map((finding) => (
                  <tr
                    key={finding.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={finding.priority} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {finding.algorithmName}
                      </div>
                      <div className="text-[11px] text-slate-500">{finding.algorithmType}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div>{finding.file}</div>
                      <div className="text-slate-400">Line {finding.line}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-slate-300">
                        {finding.code.trim()}
                      </code>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <QuantumBadge status={finding.quantumStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <DetectionBadge
                        type={finding.detectionType}
                        confidence={finding.confidence}
                      />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <RiskBadge level={finding.riskLevel} score={finding.riskScore} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => setInspectingFinding(finding)}
                        className="px-2.5 py-1 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => openFindingInCode(finding)}
                        className="px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Open in Code Editor"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail slide-over modal */}
      {inspectingFinding && (
        <FindingDetailModal
          finding={inspectingFinding}
          onClose={() => setInspectingFinding(null)}
        />
      )}
    </div>
  );
};
