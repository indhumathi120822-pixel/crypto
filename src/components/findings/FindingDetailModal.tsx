import React, { useState } from 'react';
import { Finding, BusinessCriticality } from '../../types';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  RiskBadge,
  QuantumBadge,
  PriorityBadge,
  DetectionBadge,
  ClassicalSecurityBadge,
} from '../common/Badge';
import {
  X,
  Code2,
  Sliders,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldAlert,
  Terminal,
  Layers,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface FindingDetailModalProps {
  finding: Finding;
  onClose: () => void;
}

export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({ finding, onClose }) => {
  const { openFindingInCode, refreshStatus } = useApp();

  const [businessCriticality, setBusinessCriticality] = useState<BusinessCriticality>(
    finding.businessCriticality
  );
  const [dataLifetime, setDataLifetime] = useState<number>(finding.dataLifetime);
  const [migrationTime, setMigrationTime] = useState<number>(finding.migrationTime);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // AI advisory state
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<'GEMINI_AI' | 'DETERMINISTIC_ENGINE' | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await api.recalculateRisk({
        findingId: finding.id,
        businessCriticality,
        dataLifetime,
        migrationTime,
      });
      await refreshStatus();
    } catch (err) {
      console.error('Failed to recalculate risk:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleFetchAiAdvisory = async () => {
    setIsLoadingAi(true);
    try {
      const res = await api.getAiAdvisory(finding.id);
      setAiAdvice(res.advice);
      setAiSource(res.source);
    } catch (err) {
      console.error('Failed to fetch AI advisory:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge priority={finding.priority} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {finding.algorithmName}
              </h2>
              <QuantumBadge status={finding.quantumStatus} size="sm" />
              <DetectionBadge type={finding.detectionType} confidence={finding.confidence} />
            </div>
            <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
              {finding.file}:{finding.line}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                openFindingInCode(finding);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              Edit Code
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div>
              <span className="text-slate-400 block text-[11px]">Category</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{finding.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Primitive Type</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{finding.algorithmType}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Classical Security</span>
              <div className="mt-0.5">
                <ClassicalSecurityBadge security={finding.classicalSecurity} />
              </div>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Calculated Risk</span>
              <div className="mt-0.5">
                <RiskBadge level={finding.riskLevel} score={finding.riskScore} />
              </div>
            </div>
          </div>

          {/* Detection Evidence */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
              Detection Evidence &amp; Context
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{finding.evidence}</p>
          </div>

          {/* Code Snippet with Surrounding Lines */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Source Code Snippet ({finding.file})
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                Target Line: {finding.line}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 overflow-x-auto font-mono text-xs">
              {finding.surroundingCode.map((line) => (
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

          {/* 5-Factor Risk Breakdown & Interactive Recalculator */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Risk Engine Breakdown &amp; Parameter Adjustment
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Total Score: {finding.riskScore}/100</span>
            </div>

            {/* Factor Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Quantum Relevance (30%)</div>
                <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                  {finding.quantumRelevanceScore} pts
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Algorithm Concern (20%)</div>
                <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                  {finding.algorithmConcernScore} pts
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Business Criticality (20%)</div>
                <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                  {finding.businessCriticalityScore} pts
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Data Lifetime (15%)</div>
                <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                  {finding.dataLifetimeScore} pts
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-400">Migration Effort (15%)</div>
                <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                  {finding.migrationEffortScore} pts
                </div>
              </div>
            </div>

            {/* Recalculate Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Business Criticality</label>
                <select
                  value={businessCriticality}
                  onChange={(e) => setBusinessCriticality(e.target.value as BusinessCriticality)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-medium">Data Lifetime (Years)</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={dataLifetime}
                  onChange={(e) => setDataLifetime(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-medium">Migration Time (Years)</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={migrationTime}
                  onChange={(e) => setMigrationTime(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                Recalculate Risk
              </button>
            </div>

            {/* Mosca Evaluation for this finding */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Mosca Planning Evaluation</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">{finding.moscaAnalysis.urgencyText}</p>
              <span className="text-[10px] text-slate-400 italic block mt-1">
                {finding.moscaAnalysis.disclaimer}
              </span>
            </div>
          </div>

          {/* Remediation & Post-Quantum Strategy */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              Architectural Remediation Recommendation
            </span>

            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {finding.recommendation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Why It Matters:
                </span>
                <span className="text-slate-600 dark:text-slate-400">{finding.remediation.whyItMatters}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Developer Next Step:
                </span>
                <span className="text-slate-600 dark:text-slate-400">{finding.remediation.developerNextStep}</span>
              </div>
            </div>

            {finding.remediation.suggestedDiff && (
              <div className="pt-2">
                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Suggested Code Replacement Diff:
                </div>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] space-y-1">
                  <div className="text-rose-400 flex items-start gap-1.5">
                    <span className="select-none font-bold">-</span>
                    <pre className="whitespace-pre-wrap">{finding.remediation.suggestedDiff.original}</pre>
                  </div>
                  <div className="text-emerald-400 flex items-start gap-1.5">
                    <span className="select-none font-bold">+</span>
                    <pre className="whitespace-pre-wrap">{finding.remediation.suggestedDiff.replacement}</pre>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 italic mt-1">
                  {finding.remediation.suggestedDiff.explanation}
                </div>
              </div>
            )}
          </div>

          {/* AI / Deterministic Migration Advisory Section */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  AI Post-Quantum Migration Advisor
                </span>
              </div>

              <button
                onClick={handleFetchAiAdvisory}
                disabled={isLoadingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
              >
                {isLoadingAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating Advisory...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate PQC Advisory
                  </>
                )}
              </button>
            </div>

            {aiAdvice ? (
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 whitespace-pre-wrap text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200">
                {aiAdvice}
                <div className="mt-2 text-[10px] text-slate-400 font-sans">
                  Generated via {aiSource === 'GEMINI_AI' ? 'Google Gemini 2.5 Pro' : 'Deterministic Advisory Engine'}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Click above to generate a specialized post-quantum architectural migration memo with parameter guidance for {finding.algorithmName}.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Finding ID: <code className="font-mono">{finding.id}</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
