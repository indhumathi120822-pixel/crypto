import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Finding, PriorityLevel } from '../../types';
import { RiskBadge, QuantumBadge, PriorityBadge, DetectionBadge } from '../common/Badge';
import { Code2, ExternalLink, Filter, Terminal, Sparkles, Check, ArrowRight } from 'lucide-react';

export const DeveloperDashboard: React.FC = () => {
  const { findings, openFindingInCode, setActivePage } = useApp();
  const [filterPriority, setFilterPriority] = useState<PriorityLevel | 'ALL'>('ALL');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(findings[0] || null);

  const filteredFindings = findings.filter((f) => {
    if (filterPriority !== 'ALL' && f.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Developer Cryptographic Findings Console
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Exact file locations, line numbers, detection evidence, and suggested code diffs
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs">
          {(['ALL', 'P1', 'P2', 'P3', 'P4'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterPriority === p
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {p === 'ALL' ? 'All Findings' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Findings List on Left, Code Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
          {filteredFindings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl">
              No findings match the selected priority filter.
            </div>
          ) : (
            filteredFindings.map((finding) => {
              const isSelected = selectedFinding?.id === finding.id;
              return (
                <div
                  key={finding.id}
                  onClick={() => setSelectedFinding(finding)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-indigo-500/70 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={finding.priority} />
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {finding.algorithmName}
                      </span>
                    </div>
                    <RiskBadge level={finding.riskLevel} score={finding.riskScore} size="sm" />
                  </div>

                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">
                    {finding.file}:{finding.line}
                  </div>

                  <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-slate-300 truncate">
                    {finding.code.trim()}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                    <DetectionBadge type={finding.detectionType} confidence={finding.confidence} />
                    <span className="text-slate-400">{finding.category}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Code & Remediation Inspector */}
        <div className="lg:col-span-7">
          {selectedFinding ? (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {selectedFinding.algorithmName}
                    </h3>
                    <QuantumBadge status={selectedFinding.quantumStatus} size="sm" />
                    <DetectionBadge
                      type={selectedFinding.detectionType}
                      confidence={selectedFinding.confidence}
                    />
                  </div>
                  <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedFinding.file}:{selectedFinding.line}
                  </div>
                </div>

                <button
                  onClick={() => openFindingInCode(selectedFinding)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer shrink-0"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Edit in Code Editor
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </button>
              </div>

              {/* Evidence banner */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Detection Evidence: </span>
                <span className="text-slate-600 dark:text-slate-400">{selectedFinding.evidence}</span>
              </div>

              {/* Surrounding Code snippet */}
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Exact Source Context (Lines {Math.max(1, selectedFinding.line - 5)}–{selectedFinding.line + 5})</span>
                  <span className="text-[11px] font-mono text-slate-400">Target Line: {selectedFinding.line}</span>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 overflow-x-auto text-xs font-mono">
                  {selectedFinding.surroundingCode.map((line) => (
                    <div
                      key={line.lineNumber}
                      className={`flex items-stretch px-3 py-1 ${
                        line.isTarget
                          ? 'bg-rose-950/60 border-l-4 border-rose-500 text-rose-200 font-semibold'
                          : 'text-slate-400 hover:bg-slate-900/50'
                      }`}
                    >
                      <span className="w-10 select-none text-slate-600 text-right pr-3 shrink-0">
                        {line.lineNumber}
                      </span>
                      <pre className="whitespace-pre flex-1 overflow-x-auto">{line.content}</pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remediation & Suggested Diff */}
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Remediation Direction
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedFinding.recommendation}
                </p>

                {selectedFinding.remediation.suggestedDiff && (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Suggested Code Diff Preview:
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 font-mono text-[11px] space-y-1">
                      <div className="text-rose-400 flex items-start gap-1">
                        <span className="select-none">-</span>
                        <pre className="whitespace-pre-wrap">{selectedFinding.remediation.suggestedDiff.original}</pre>
                      </div>
                      <div className="text-emerald-400 flex items-start gap-1">
                        <span className="select-none">+</span>
                        <pre className="whitespace-pre-wrap">{selectedFinding.remediation.suggestedDiff.replacement}</pre>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      {selectedFinding.remediation.suggestedDiff.explanation}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Developer Next Step: <strong>{selectedFinding.remediation.developerNextStep}</strong>
                  </span>
                  <button
                    onClick={() => setActivePage('findings')}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    Deep-dive finding
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl">
              Select a finding from the left panel to inspect code context.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
