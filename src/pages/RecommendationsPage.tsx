import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/common/EmptyState';
import { Finding, PriorityLevel } from '../types';
import { PriorityBadge, QuantumBadge, RiskBadge } from '../components/common/Badge';
import { FindingDetailModal } from '../components/findings/FindingDetailModal';
import {
  GitPullRequestDraft,
  ShieldAlert,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Code2,
  Share2,
} from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  const { scanned, findings, dependencyGraph, repoName, openFindingInCode, setActivePage } = useApp();

  const [activePriority, setActivePriority] = useState<PriorityLevel>('P1');
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);

  if (!scanned) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Remediation Recommendations Available"
          description="Upload and scan a repository to generate a prioritized P1–P4 migration roadmap aligned with NIST post-quantum standards."
          onNavigateScan={() => setActivePage('scan')}
          onNavigateKnowledgeBase={() => setActivePage('knowledge-base')}
          viewContext="recommendations"
        />
      </div>
    );
  }

  const p1List = findings.filter((f) => f.priority === 'P1');
  const p2List = findings.filter((f) => f.priority === 'P2');
  const p3List = findings.filter((f) => f.priority === 'P3');
  const p4List = findings.filter((f) => f.priority === 'P4');

  const getListForPriority = (p: PriorityLevel) => {
    if (p === 'P1') return p1List;
    if (p === 'P2') return p2List;
    if (p === 'P3') return p3List;
    return p4List;
  };

  const activeList = getListForPriority(activePriority);

  return (
    <div className="py-4 space-y-6">
      {/* Header */}
      <div className="p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
              Migration Strategy &amp; NIST FIPS Alignment
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Remediation Roadmap
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Actionable priority matrix organizing discovered cryptographic assets into phased transition windows for {repoName}.
            </p>
          </div>

          <button
            onClick={() => setActivePage('simulator')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Simulate Transitions
          </button>
        </div>
      </div>

      {/* 4 Priority Matrix Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* P1 - Immediate: Deep Red / Burgundy */}
        <button
          onClick={() => setActivePriority('P1')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            activePriority === 'P1'
              ? 'border-rose-900/80 bg-rose-950/25 dark:bg-[#320c13] shadow-sm ring-1 ring-rose-800/40'
              : 'border-rose-900/20 bg-rose-950/5 dark:bg-[#1a060a]/60 hover:border-rose-800/50 hover:bg-rose-950/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              P1 — Immediate
            </span>
            <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-rose-900/20 text-rose-900 dark:text-rose-100 border border-rose-800/30">
              {p1List.length}
            </span>
          </div>
          <div className="text-[11px] text-rose-950/80 dark:text-rose-300/80 leading-snug">
            Shor vulnerable + Mosca deficit or broken classical ciphers
          </div>
        </button>

        {/* P2 - High: Professional Amber / Orange */}
        <button
          onClick={() => setActivePriority('P2')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            activePriority === 'P2'
              ? 'border-amber-800/80 bg-amber-950/25 dark:bg-[#341d08] shadow-sm ring-1 ring-amber-700/40'
              : 'border-amber-900/20 bg-amber-950/5 dark:bg-[#1c0e04]/60 hover:border-amber-800/50 hover:bg-amber-950/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              P2 — High
            </span>
            <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-amber-900/20 text-amber-900 dark:text-amber-100 border border-amber-800/30">
              {p2List.length}
            </span>
          </div>
          <div className="text-[11px] text-amber-950/80 dark:text-amber-300/80 leading-snug">
            High risk asymmetric algorithms or weak symmetric primitives
          </div>
        </button>

        {/* P3 - Planned: Professional Blue */}
        <button
          onClick={() => setActivePriority('P3')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            activePriority === 'P3'
              ? 'border-blue-800/80 bg-blue-950/25 dark:bg-[#0c1e38] shadow-sm ring-1 ring-blue-700/40'
              : 'border-blue-900/20 bg-blue-950/5 dark:bg-[#060f1c]/60 hover:border-blue-800/50 hover:bg-blue-950/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              P3 — Planned
            </span>
            <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-800/30">
              {p3List.length}
            </span>
          </div>
          <div className="text-[11px] text-blue-950/80 dark:text-blue-300/80 leading-snug">
            Legacy symmetric ciphers (&lt;256b), PBKDF2, or internal utilities
          </div>
        </button>

        {/* P4 - Monitor: Professional Green / Teal */}
        <button
          onClick={() => setActivePriority('P4')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            activePriority === 'P4'
              ? 'border-teal-800/80 bg-teal-950/25 dark:bg-[#092922] shadow-sm ring-1 ring-teal-700/40'
              : 'border-teal-900/20 bg-teal-950/5 dark:bg-[#041410]/60 hover:border-teal-800/50 hover:bg-teal-950/15'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-teal-900 dark:text-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
              P4 — Monitor
            </span>
            <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-teal-900/20 text-teal-900 dark:text-teal-100 border border-teal-800/30">
              {p4List.length}
            </span>
          </div>
          <div className="text-[11px] text-teal-950/80 dark:text-teal-300/80 leading-snug">
            Quantum resistant algorithms (AES-256, SHA-256, Argon2id)
          </div>
        </button>
      </div>

      {/* Priority Table */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {activePriority} Migration Candidates ({activeList.length})
          </h2>
          <span className="text-xs text-slate-500">
            Click any item to inspect remediation steps
          </span>
        </div>

        {activeList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No findings categorized under {activePriority} priority.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {activeList.map((f) => (
              <div
                key={f.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 p-2 rounded-lg transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {f.algorithmName}
                    </span>
                    <QuantumBadge status={f.quantumStatus} size="sm" />
                    <RiskBadge level={f.riskLevel} score={f.riskScore} size="sm" />
                  </div>

                  <div className="font-mono text-[11px] text-slate-500">
                    {f.file}:{f.line}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                    {f.recommendation}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setInspectingFinding(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    View Remediation
                  </button>
                  <button
                    onClick={() => openFindingInCode(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer"
                  >
                    Edit Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dependency & Blast Radius Visualizer */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Cryptographic Dependency &amp; Blast Radius
          </h2>
        </div>

        {dependencyGraph.nodes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-lg">
            {dependencyGraph.statusMessage ||
              'Dependency relationship could not be confidently determined (no cryptographic usages detected).'}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Mapped cryptographic invocations across files. Shows which modules consume cryptographic libraries and primitives.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dependencyGraph.nodes
                .filter((n) => n.type === 'file')
                .map((fileNode) => {
                  const linkedAlgos = dependencyGraph.links
                    .filter((l) => l.source === fileNode.id)
                    .map((l) => {
                      const target = dependencyGraph.nodes.find((n) => n.id === l.target);
                      return { targetName: target?.label || 'Crypto Primitive', label: l.label };
                    });

                  return (
                    <div
                      key={fileNode.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {fileNode.label}
                        </span>
                        {fileNode.riskLevel && (
                          <RiskBadge level={fileNode.riskLevel} size="sm" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Cryptographic Calls:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {linkedAlgos.map((link, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400"
                            >
                              {link.targetName}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Inspecting Finding Slide-over Modal */}
      {inspectingFinding && (
        <FindingDetailModal
          finding={inspectingFinding}
          onClose={() => setInspectingFinding(null)}
        />
      )}
    </div>
  );
};
