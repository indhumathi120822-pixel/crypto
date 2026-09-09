import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { EmptyState } from '../components/common/EmptyState';
import { AddAlgorithmModal } from '../components/inventory/AddAlgorithmModal';
import { PriorityLevel, QuantumStatus } from '../types';
import {
  FileSpreadsheet,
  Download,
  Code2,
  Copy,
  Check,
  FileJson,
  ShieldCheck,
  Search,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Layers,
  Atom,
  SlidersHorizontal,
  X,
  Plus,
} from 'lucide-react';
import {
  QuantumBadge,
  ClassicalSecurityBadge,
  PriorityBadge,
  RiskBadge,
} from '../components/common/Badge';

export const CbomPage: React.FC = () => {
  const { scanned, findings, repoName, setActivePage } = useApp();

  const [activeTab, setActiveTab] = useState<'table' | 'raw_json'>('table');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'ALL'>('ALL');
  const [filterQuantum, setFilterQuantum] = useState<QuantumStatus | 'ALL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!scanned) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Cryptographic Assets Discovered Yet"
          description="Upload and scan a repository to generate an enterprise Cryptographic Bill of Materials (CBOM) compliant with the CycloneDX 1.6 specification."
          onNavigateScan={() => setActivePage('scan')}
          onNavigateKnowledgeBase={() => setActivePage('knowledge-base')}
          viewContext="cbom"
        />
      </div>
    );
  }

  // Summary counts
  const totalCount = findings.length;
  const p1Count = findings.filter((f) => f.priority === 'P1').length;
  const p2Count = findings.filter((f) => f.priority === 'P2').length;
  const p3Count = findings.filter((f) => f.priority === 'P3').length;
  const p4Count = findings.filter((f) => f.priority === 'P4').length;
  const quantumRelevantCount = findings.filter(
    (f) => f.quantumStatus === 'VULNERABLE_SHOR' || f.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER'
  ).length;

  const filteredFindings = findings.filter((f) => {
    if (filterPriority !== 'ALL' && f.priority !== filterPriority) return false;
    if (filterQuantum !== 'ALL' && f.quantumStatus !== filterQuantum) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      f.algorithmName.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.file.toLowerCase().includes(q)
    );
  });

  const handleCopyJson = async () => {
    try {
      const res = await fetch('/api/scan/cbom?format=json');
      const json = await res.json();
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="py-4 space-y-6">
      {/* Header with Enterprise Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-950/15 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
              CycloneDX 1.6 Specification
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Cryptographic Assets: {totalCount}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5">
            Cryptographic Bill of Materials (CBOM)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Machine-readable inventory of all cryptographic algorithms, key lengths, and quantum security levels identified in {repoName}.
          </p>
        </div>

        {/* Download & Register Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Algorithm
          </button>

          <a
            href={api.getCbomUrl('json')}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer border border-slate-700/50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CycloneDX JSON
          </a>

          <a
            href={api.getCbomUrl('csv')}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {/* CBOM Inventory Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Assets */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-medium">Total Assets</span>
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Discovered components
          </div>
        </div>

        {/* P1 — Immediate (Deep Red / Burgundy) */}
        <button
          onClick={() => setFilterPriority((prev) => (prev === 'P1' ? 'ALL' : 'P1'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterPriority === 'P1'
              ? 'border-rose-900/80 bg-rose-950/25 dark:bg-[#320c13] shadow-sm ring-1 ring-rose-800/40'
              : 'border-rose-900/20 bg-rose-950/5 dark:bg-[#1a060a]/60 hover:border-rose-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1 text-rose-900 dark:text-rose-200">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              P1 Immediate
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-900 dark:text-rose-100">
            {p1Count}
          </div>
          <div className="text-[10px] text-rose-950/70 dark:text-rose-300/70 mt-0.5 truncate">
            Critical priority
          </div>
        </button>

        {/* P2 — High (Amber / Orange) */}
        <button
          onClick={() => setFilterPriority((prev) => (prev === 'P2' ? 'ALL' : 'P2'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterPriority === 'P2'
              ? 'border-amber-800/80 bg-amber-950/25 dark:bg-[#341d08] shadow-sm ring-1 ring-amber-700/40'
              : 'border-amber-900/20 bg-amber-950/5 dark:bg-[#1c0e04]/60 hover:border-amber-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              P2 High
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-100">
            {p2Count}
          </div>
          <div className="text-[10px] text-amber-950/70 dark:text-amber-300/70 mt-0.5 truncate">
            High priority
          </div>
        </button>

        {/* P3 — Planned (Blue) */}
        <button
          onClick={() => setFilterPriority((prev) => (prev === 'P3' ? 'ALL' : 'P3'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterPriority === 'P3'
              ? 'border-blue-800/80 bg-blue-950/25 dark:bg-[#0c1e38] shadow-sm ring-1 ring-blue-700/40'
              : 'border-blue-900/20 bg-blue-950/5 dark:bg-[#060f1c]/60 hover:border-blue-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1 text-blue-900 dark:text-blue-200">
              <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              P3 Planned
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100">
            {p3Count}
          </div>
          <div className="text-[10px] text-blue-950/70 dark:text-blue-300/70 mt-0.5 truncate">
            Planned phase
          </div>
        </button>

        {/* P4 — Monitor (Green / Teal) */}
        <button
          onClick={() => setFilterPriority((prev) => (prev === 'P4' ? 'ALL' : 'P4'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterPriority === 'P4'
              ? 'border-teal-800/80 bg-teal-950/25 dark:bg-[#092922] shadow-sm ring-1 ring-teal-700/40'
              : 'border-teal-900/20 bg-teal-950/5 dark:bg-[#041410]/60 hover:border-teal-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1 text-teal-900 dark:text-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              P4 Monitor
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-teal-900 dark:text-teal-100">
            {p4Count}
          </div>
          <div className="text-[10px] text-teal-950/70 dark:text-teal-300/70 mt-0.5 truncate">
            Quantum resilient
          </div>
        </button>

        {/* Quantum Relevance (Purple / Magenta Accent) */}
        <button
          onClick={() => setFilterQuantum((prev) => (prev === 'VULNERABLE_SHOR' ? 'ALL' : 'VULNERABLE_SHOR'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterQuantum === 'VULNERABLE_SHOR'
              ? 'border-purple-800/80 bg-purple-950/25 dark:bg-[#280c3a] shadow-sm ring-1 ring-purple-700/40'
              : 'border-purple-900/20 bg-purple-950/5 dark:bg-[#160620]/60 hover:border-purple-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1 text-purple-900 dark:text-purple-200">
              <Atom className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              Quantum Alert
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900 dark:text-purple-100">
            {quantumRelevantCount}
          </div>
          <div className="text-[10px] text-purple-950/70 dark:text-purple-300/70 mt-0.5 truncate">
            Shor &amp; Grover risk
          </div>
        </button>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'table'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Inventory Table ({filteredFindings.length})
          </button>
          <button
            onClick={() => setActiveTab('raw_json')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'raw_json'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            CycloneDX 1.6 Raw JSON Schema
          </button>
        </div>

        {activeTab === 'table' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter controls */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 — Immediate</option>
              <option value="P2">P2 — High</option>
              <option value="P3">P3 — Planned</option>
              <option value="P4">P4 — Monitor</option>
            </select>

            <select
              value={filterQuantum}
              onChange={(e) => setFilterQuantum(e.target.value as any)}
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Quantum Status</option>
              <option value="VULNERABLE_SHOR">Shor Vulnerable (PKI)</option>
              <option value="PARTIALLY_VULNERABLE_GROVER">Grover Halved (&lt;256b)</option>
              <option value="QUANTUM_RESISTANT">Quantum Resistant (256b)</option>
              <option value="QUANTUM_SAFE">Post-Quantum Safe (FIPS)</option>
            </select>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search CBOM assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {(filterPriority !== 'ALL' || filterQuantum !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setFilterPriority('ALL');
                  setFilterQuantum('ALL');
                  setSearchTerm('');
                }}
                className="text-xs text-rose-600 hover:underline px-1 font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {activeTab === 'raw_json' && (
          <button
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Raw JSON'}
          </button>
        )}
      </div>

      {/* Tab 1: Enterprise CBOM Table */}
      {activeTab === 'table' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300 font-semibold tracking-wide">
                  <th className="py-3 px-4">BOM Component / Ref</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Cryptographic Primitive</th>
                  <th className="py-3 px-4">Function</th>
                  <th className="py-3 px-4">Classical Security</th>
                  <th className="py-3 px-4">Quantum Security Level</th>
                  <th className="py-3 px-4">Occurrence Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredFindings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No CBOM assets match your current search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredFindings.map((f, i) => {
                    let nistLevel = 1;
                    if (f.quantumStatus === 'QUANTUM_SAFE' || f.algorithmName.includes('256')) nistLevel = 5;
                    else if (f.quantumStatus === 'QUANTUM_RESISTANT') nistLevel = 3;
                    else nistLevel = 0;

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {f.algorithmName}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            crypto-asset-{i + 1}-{f.algorithmId}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <PriorityBadge priority={f.priority} />
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <RiskBadge level={f.riskLevel} score={f.riskScore} size="sm" />
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {f.category.toLowerCase().replace(/_/g, '-')}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {f.algorithmType}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <ClassicalSecurityBadge security={f.classicalSecurity} />
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <QuantumBadge status={f.quantumStatus} size="sm" />
                            <span className="font-mono text-[10px] text-slate-400">Lvl {nistLevel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {f.file}:{f.line}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Raw CycloneDX JSON Viewer */}
      {activeTab === 'raw_json' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[600px]">
          <pre>
            {JSON.stringify(
              {
                bomFormat: 'CycloneDX',
                specVersion: '1.6',
                serialNumber: 'urn:uuid:cryptovista-active-session',
                version: 1,
                metadata: {
                  timestamp: new Date().toISOString(),
                  tools: [
                    {
                      vendor: 'CRYPTOVISTA',
                      name: 'Cryptographic Observability & Quantum Transition Engine',
                      version: '2.0.0',
                    },
                  ],
                  component: {
                    type: 'application',
                    name: repoName || 'source-repository',
                  },
                },
                components: findings.map((f, i) => ({
                  type: 'cryptographic-asset',
                  'bom-ref': `crypto-asset-${i + 1}-${f.algorithmId}`,
                  name: f.algorithmName,
                  cryptoProperties: {
                    assetType: 'algorithm',
                    algorithmProperties: {
                      primitive: f.category.toLowerCase().replace(/_/g, '-'),
                      parameterSetIdentifier: f.algorithmType,
                      classicalSecurityLevel: f.classicalSecurity,
                      nistQuantumSecurityLevel:
                        f.quantumStatus === 'QUANTUM_SAFE'
                          ? 5
                          : f.quantumStatus === 'QUANTUM_RESISTANT'
                          ? 3
                          : 0,
                    },
                  },
                  evidence: {
                    occurrences: [
                      {
                        location: f.file,
                        line: f.line,
                        offset: f.column,
                      },
                    ],
                  },
                })),
              },
              null,
              2
            )}
          </pre>
        </div>
      )}

      {/* Manual Algorithm Registration Modal */}
      <AddAlgorithmModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
