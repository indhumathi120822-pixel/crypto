import React, { useState } from 'react';
import { Finding, PriorityLevel, RiskLevel, RiskCategory, WhyRiskLevel } from '../../types';
import { ShieldAlert, AlertTriangle, ShieldCheck, Clock, Globe, Key, Lock, FileText, CheckCircle2, ChevronDown } from 'lucide-react';
import { PriorityBadge, RiskBadge } from '../common/Badge';

interface QuantumRiskRingProps {
  score: number;
  level: RiskLevel;
  category?: RiskCategory | string;
  priority: PriorityLevel;
  priorityReason?: string;
  whyRiskLevel?: WhyRiskLevel;
  findings?: Finding[];
  onSelectFinding?: (finding: Finding) => void;
}

export const QuantumRiskRing: React.FC<QuantumRiskRingProps> = ({
  score,
  level,
  category = 'Quantum Vulnerability',
  priority,
  priorityReason,
  whyRiskLevel,
  findings = [],
  onSelectFinding,
}) => {
  const [selectedFindingId, setSelectedFindingId] = useState<string>('overall');

  // SVG calculations for the circular ring
  const radius = 90;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Active finding if one is selected
  const activeFinding = selectedFindingId !== 'overall' ? findings.find((f) => f.id === selectedFindingId) : null;

  const currentScore = activeFinding ? activeFinding.riskScore : clampedScore;
  const currentLevel: RiskLevel = activeFinding ? activeFinding.riskLevel : level;
  const currentCategory = activeFinding ? activeFinding.riskCategory || 'Quantum Vulnerability' : category;
  const currentPriority: PriorityLevel = activeFinding ? activeFinding.priority : priority;
  const currentPriorityReason = activeFinding
    ? activeFinding.priorityReason || `Evaluated for ${activeFinding.algorithmName} based on quantum vulnerability and operational exposure.`
    : priorityReason || 'Composite assessment derived from detected algorithm vulnerability, key size, and exposure.';

  const isInsufficient = activeFinding?.isInsufficientInfo ?? false;

  const currentWhy: WhyRiskLevel = activeFinding?.whyRiskLevel || whyRiskLevel || {
    vulnerableAlgorithm: activeFinding?.algorithmName || (findings[0]?.algorithmName ?? 'Multiple Enterprise Ciphers'),
    keySize: String(activeFinding?.keySize || 'Various (128 - 4096 bits)'),
    cryptographicPurpose: activeFinding?.category || 'Transport & Data Protection',
    internetExposure: 'Assessed per active endpoint',
    dataSensitivity: 'Confidential / Multi-year lifespan',
    expectedDataLifetime: '5-10 years (SNDL window)',
    migrationComplexity: 'Moderate to High',
  };

  // High contrast & pattern/symbol indicators for color-vision deficiency
  const getLevelPresentation = (lvl: RiskLevel) => {
    switch (lvl) {
      case 'CRITICAL':
        return {
          labelText: 'CRITICAL RISK',
          colorCode: '#b91c1c', // red-700
          bgColor: 'bg-red-500/15 dark:bg-red-950/40',
          textColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-600 dark:border-red-500',
          icon: <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />,
          dashArray: 'none',
        };
      case 'HIGH':
        return {
          labelText: 'HIGH RISK',
          colorCode: '#c2410c', // orange-700
          bgColor: 'bg-orange-500/15 dark:bg-orange-950/40',
          textColor: 'text-orange-700 dark:text-orange-300',
          borderColor: 'border-orange-600 dark:border-orange-500',
          icon: <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
          dashArray: 'none',
        };
      case 'MEDIUM':
        return {
          labelText: 'MEDIUM RISK',
          colorCode: '#b45309', // amber-700
          bgColor: 'bg-amber-500/15 dark:bg-amber-950/40',
          textColor: 'text-amber-700 dark:text-amber-300',
          borderColor: 'border-amber-600 dark:border-amber-500',
          icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
          dashArray: 'none',
        };
      case 'LOW':
        return {
          labelText: 'LOW RISK',
          colorCode: '#047857', // emerald-700
          bgColor: 'bg-emerald-500/15 dark:bg-emerald-950/40',
          textColor: 'text-emerald-700 dark:text-emerald-300',
          borderColor: 'border-emerald-600 dark:border-emerald-500',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
          dashArray: 'none',
        };
      case 'MINIMAL':
      default:
        return {
          labelText: 'MINIMAL RISK',
          colorCode: '#475569', // slate-600
          bgColor: 'bg-slate-500/15 dark:bg-slate-800/60',
          textColor: 'text-slate-700 dark:text-slate-300',
          borderColor: 'border-slate-500 dark:border-slate-600',
          icon: <CheckCircle2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
          dashArray: 'none',
        };
    }
  };

  const presentation = getLevelPresentation(currentLevel);

  const getPriorityExplanation = (p: PriorityLevel) => {
    switch (p) {
      case 'P1':
        return {
          title: 'Priority 1: Immediate action',
          sub: 'Critical Shor/classical exposure on exposed systems requiring immediate mitigation planning.',
          badgeColor: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40',
        };
      case 'P2':
        return {
          title: 'Priority 2: High priority',
          sub: 'Vulnerable cryptographic primitives with substantial operational or shelf-life risk.',
          badgeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
        };
      case 'P3':
        return {
          title: 'Priority 3: Planned migration',
          sub: 'Transition required as part of standard multi-year post-quantum roadmap.',
          badgeColor: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40',
        };
      case 'P4':
      default:
        return {
          title: 'Priority 4: Monitor / review',
          sub: 'Quantum-resistant or low-impact primitives requiring ongoing verification.',
          badgeColor: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40',
        };
    }
  };

  const priorityMeta = getPriorityExplanation(currentPriority);

  return (
    <div id="quantum-risk-ring-container" className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
      {/* Header & Item Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Deterministic Assessment Engine
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Quantum Risk Ring &amp; Explanatory Breakdown
          </h2>
        </div>

        {findings.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="select-risk-target" className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Target Scope:
            </label>
            <div className="relative">
              <select
                id="select-risk-target"
                value={selectedFindingId}
                onChange={(e) => {
                  setSelectedFindingId(e.target.value);
                  if (onSelectFinding && e.target.value !== 'overall') {
                    const match = findings.find((f) => f.id === e.target.value);
                    if (match) onSelectFinding(match);
                  }
                }}
                className="pl-3 pr-8 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="overall">Overall Repository Posture ({findings.length} findings)</option>
                {findings.slice(0, 20).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.algorithmName} — {f.file.split('/').pop()}:{f.line} ({f.riskLevel})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Main Ring Visual Representation */}
      <div className="flex flex-col lg:flex-row items-center justify-around gap-8 py-2">
        {/* The Circular SVG Ring */}
        <div className="relative flex flex-col items-center justify-center shrink-0">
          <svg
            className="w-64 h-64 transform -rotate-90 drop-shadow-sm"
            viewBox="0 0 220 220"
            role="img"
            aria-label={`Quantum Risk Gauge: ${presentation.labelText}, Score ${currentScore} out of 100`}
          >
            {/* Background Track with Subtle Ticks */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="transparent"
              stroke="#e2e8f0"
              className="dark:stroke-slate-800"
              strokeWidth={strokeWidth}
            />

            {/* Colored Dynamic Value Ring */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="transparent"
              stroke={presentation.colorCode}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center of Ring Content - STRICT REQUIREMENT */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
            {/* Actual Full Risk Level Text (NOT just 'Risk') */}
            <div
              id="ring-center-risk-level"
              className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 border shadow-xs ${presentation.bgColor} ${presentation.textColor} ${presentation.borderColor}`}
            >
              {presentation.icon}
              <span>{presentation.labelText}</span>
            </div>

            {/* Quantum Risk Score: XX / 100 */}
            <div id="ring-center-risk-score" className="mt-2 text-slate-900 dark:text-white flex flex-col items-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quantum Risk Score
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black font-mono tracking-tight">{currentScore}</span>
                <span className="text-sm font-bold text-slate-400 font-mono">/ 100</span>
              </div>
            </div>

            {/* Risk Category: Quantum Vulnerability / Classical Weakness / Migration Risk */}
            <div id="ring-center-risk-category" className="mt-1">
              <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {currentCategory}
              </span>
            </div>
          </div>
        </div>

        {/* Ring Reference Scale / Legend (Aids Color-Blind Users) */}
        <div className="w-full max-w-sm space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Calibrated Risk Severity Scale
          </div>

          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
              currentLevel === 'CRITICAL'
                ? 'bg-red-500/10 border-red-500 font-bold dark:bg-red-950/40'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600" />
              <span className="font-mono font-bold">81 – 100</span>
              <span className="font-bold text-red-700 dark:text-red-300">CRITICAL RISK</span>
            </div>
            <span className="text-[11px] text-slate-500">Shor vulnerable PKI &amp; broken</span>
          </div>

          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
              currentLevel === 'HIGH'
                ? 'bg-orange-500/10 border-orange-500 font-bold dark:bg-orange-950/40'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-600" />
              <span className="font-mono font-bold">61 – 80</span>
              <span className="font-bold text-orange-700 dark:text-orange-300">HIGH RISK</span>
            </div>
            <span className="text-[11px] text-slate-500">Exposed classical &amp; short key</span>
          </div>

          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
              currentLevel === 'MEDIUM'
                ? 'bg-amber-500/10 border-amber-500 font-bold dark:bg-amber-950/40'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-600" />
              <span className="font-mono font-bold">41 – 60</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">MEDIUM RISK</span>
            </div>
            <span className="text-[11px] text-slate-500">Grover-reduced or legacy</span>
          </div>

          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
              currentLevel === 'LOW'
                ? 'bg-emerald-500/10 border-emerald-500 font-bold dark:bg-emerald-950/40'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-600" />
              <span className="font-mono font-bold">21 – 40</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">LOW RISK</span>
            </div>
            <span className="text-[11px] text-slate-500">Strong symmetric &amp; hashes</span>
          </div>

          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
              currentLevel === 'MINIMAL'
                ? 'bg-slate-500/10 border-slate-500 font-bold dark:bg-slate-800/60'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500" />
              <span className="font-mono font-bold">0 – 20</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">MINIMAL RISK</span>
            </div>
            <span className="text-[11px] text-slate-500">PQC standardized / AES-256</span>
          </div>
        </div>
      </div>

      {/* BELOW THE RING: Detailed "Why is this risk level?" & "Priority Level (1-4)" */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
        {/* Section 1: Why is this risk level? */}
        <div id="risk-explanation-panel" className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Why is this risk level?
            </h3>
            {isInsufficient && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                Insufficient information for reliable assessment
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700/60 text-xs">
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Vulnerable algorithm detected</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {currentWhy.vulnerableAlgorithm}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Key size / strength</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {currentWhy.keySize}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Cryptographic purpose</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-[200px] truncate">
                {currentWhy.cryptographicPurpose}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Internet exposure</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                {currentWhy.internetExposure}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Data sensitivity</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {currentWhy.dataSensitivity}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Expected data lifetime</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {currentWhy.expectedDataLifetime}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Migration complexity</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {currentWhy.migrationComplexity}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Priority Level (1-4) */}
        <div id="priority-explanation-panel" className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                Calculated Migration Priority
              </h3>
              <span className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase border ${priorityMeta.badgeColor}`}>
                {currentPriority}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 mb-3">
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-0.5">
                {priorityMeta.title}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {priorityMeta.sub}
              </p>
            </div>

            {/* Contextual Reason */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Priority Assignment Rationale:
              </span>
              <p className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 text-xs leading-relaxed border border-slate-200 dark:border-slate-800">
                {currentPriorityReason}
              </p>
            </div>
          </div>

          {/* Quick Metrics Summary Bar */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Risk Level</span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{currentLevel}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Risk Score</span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{currentScore} / 100</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Priority</span>
              <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{currentPriority}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
