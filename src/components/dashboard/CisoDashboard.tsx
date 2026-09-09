import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Atom,
  Clock,
  Layers,
  ArrowRight,
  Download,
  FileSpreadsheet,
  Terminal,
  Activity,
  CheckCircle2,
  Zap,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RiskBadge, QuantumBadge, PriorityBadge } from '../common/Badge';
import { QuantumRiskRing } from './QuantumRiskRing';
import { AddAlgorithmModal } from '../inventory/AddAlgorithmModal';
import { RiskLevel, RiskCategory, PriorityLevel } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export const CisoDashboard: React.FC = () => {
  const { stats, findings, repoName, setActivePage, openFindingInCode, settings } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!stats) return null;

  const urgentFindings = findings.filter((f) => f.priority === 'P1');
  const p1Count = urgentFindings.length;
  const p2Count = findings.filter((f) => f.priority === 'P2').length;
  const p3Count = findings.filter((f) => f.priority === 'P3').length;
  const p4Count = findings.filter((f) => f.priority === 'P4').length;
  const activeUsageCount = findings.filter((f) => f.detectionType === 'ACTIVE_USAGE').length;

  const shorFindings = findings.filter((f) => f.quantumStatus === 'VULNERABLE_SHOR');
  const brokenFindings = findings.filter((f) => f.classicalSecurity === 'BROKEN');
  const moscaUrgentFindings = findings.filter((f) => f.moscaAnalysis.isUrgent);

  // Risk distribution data for chart (Semantic Enterprise Colors)
  const riskChartData = [
    { name: 'Critical', count: stats.criticalRisks, color: '#991b1b' }, // Deep red / burgundy
    { name: 'High', count: stats.highRisks, color: '#d97706' }, // Professional amber
    { name: 'Medium', count: stats.mediumRisks, color: '#ca8a04' }, // Yellow / Gold
    { name: 'Low', count: stats.lowRisks, color: '#059669' }, // Emerald / Green
  ];

  // Quantum distribution data (High -> Purple/Magenta, Medium -> Amber, Low -> Teal/Green)
  const quantumChartData = [
    {
      name: 'Shor (PKI)',
      count: stats.quantumStatusDistribution['VULNERABLE_SHOR'] || 0,
      color: '#9333ea', // Purple / Magenta accent
    },
    {
      name: 'Grover (<256b)',
      count: stats.quantumStatusDistribution['PARTIALLY_VULNERABLE_GROVER'] || 0,
      color: '#d97706', // Amber
    },
    {
      name: 'Resistant (256b)',
      count: stats.quantumStatusDistribution['QUANTUM_RESISTANT'] || 0,
      color: '#0d9488', // Teal
    },
    {
      name: 'Quantum Safe',
      count: stats.quantumStatusDistribution['QUANTUM_SAFE'] || 0,
      color: '#059669', // Green
    },
  ].filter((d) => d.count > 0);

  // Top algorithms detected
  const topAlgos = Object.entries(stats.algorithmDistribution)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 5);

  // Determine overall risk level and category
  const getOverallRiskLevel = (avgScore: number): RiskLevel => {
    if (avgScore >= 81 || stats.criticalRisks > 0) return 'CRITICAL';
    if (avgScore >= 61 || stats.highRisks > 0) return 'HIGH';
    if (avgScore >= 41 || stats.mediumRisks > 0) return 'MEDIUM';
    if (avgScore >= 21 || stats.lowRisks > 0) return 'LOW';
    return 'MINIMAL';
  };

  const overallRiskLevel = getOverallRiskLevel(stats.averageRiskScore);

  const overallRiskCategory: RiskCategory = shorFindings.length > 0
    ? 'Quantum Vulnerability'
    : brokenFindings.length > 0
    ? 'Classical Weakness'
    : 'Migration Risk';

  const overallPriority: PriorityLevel = p1Count > 0 ? 'P1' : p2Count > 0 ? 'P2' : p3Count > 0 ? 'P3' : 'P4';
  const overallPriorityReason = p1Count > 0
    ? `${p1Count} urgent cryptographic asset(s) identified requiring immediate architectural remediation (Shor-vulnerable PKI or Mosca planning horizon deficit).`
    : p2Count > 0
    ? `${p2Count} high-priority asset(s) scheduled for migration to post-quantum standards.`
    : p3Count > 0
    ? `${p3Count} medium-priority planned migration asset(s) mapped on multi-year roadmap.`
    : 'Cryptographic inventory is within manageable risk thresholds; continuous monitoring recommended.';

  return (
    <div className="space-y-6">
      {/* Executive Quantum Posture Header */}
      <div className="p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                stats.overallQuantumPosture === 'HIGH_EXPOSURE'
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  : stats.overallQuantumPosture === 'MODERATE_EXPOSURE'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {stats.overallQuantumPosture === 'HIGH_EXPOSURE' ? (
                <ShieldAlert className="w-8 h-8" />
              ) : stats.overallQuantumPosture === 'MODERATE_EXPOSURE' ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  CISO Executive Summary
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Target: <strong className="font-semibold text-slate-900 dark:text-slate-100">{repoName}</strong>
                </span>
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {stats.overallQuantumPosture === 'HIGH_EXPOSURE'
                  ? 'High Post-Quantum Cryptographic Exposure'
                  : stats.overallQuantumPosture === 'MODERATE_EXPOSURE'
                  ? 'Moderate Quantum Risk Surface Detected'
                  : 'Healthy Cryptographic Posture'}
              </h1>

              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                {stats.overallQuantumPosture === 'HIGH_EXPOSURE'
                  ? 'The scanned repository employs public-key algorithms vulnerable to Shor’s algorithm and/or classical broken ciphers. Store-Now-Decrypt-Later (SNDL) threat model mandates initiating post-quantum migration planning.'
                  : stats.overallQuantumPosture === 'MODERATE_EXPOSURE'
                  ? 'Several cryptographic implementations require scheduled migration toward modern authenticated or post-quantum primitives.'
                  : 'No critical post-quantum vulnerabilities or broken cryptographic primitives were detected in the codebase.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Algorithm
            </button>

            <button
              onClick={() => setActivePage('cbom')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CBOM (CycloneDX)
            </button>

            <button
              onClick={() => setActivePage('developer')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              Switch to Developer View
            </button>
          </div>
        </div>
      </div>

      {/* Quantum Risk Ring & Explanatory Breakdown Component */}
      <QuantumRiskRing
        score={stats.averageRiskScore}
        level={overallRiskLevel}
        category={overallRiskCategory}
        priority={overallPriority}
        priorityReason={overallPriorityReason}
        findings={findings}
        onSelectFinding={(f) => {
          openFindingInCode(f);
        }}
      />

      {/* Zero Findings Notice */}
      {findings.length === 0 && (
        <div className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-200">
            No cryptographic artefacts were detected in the uploaded repository.
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            The scanner inspected all supported source code and configuration files. No standard symmetric/asymmetric algorithms, JWT ciphers, or cryptographic API signatures were identified.
          </p>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-medium">Total Cryptographic Findings</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {stats.totalFindings}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Found in {stats.scannedFiles} scanned files
          </div>
        </div>

        {/* Shor Vulnerable (PKI) - Purple/Magenta Quantum Relevance Accent */}
        <div className="p-4 rounded-xl border border-purple-900/20 dark:border-purple-900/40 bg-purple-950/5 dark:bg-[#1f0a28]/50 shadow-xs">
          <div className="flex items-center justify-between text-purple-900/70 dark:text-purple-300/70 text-xs mb-2">
            <span className="font-medium">Quantum Threat (Shor PKI)</span>
            <Atom className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-purple-900 dark:text-purple-200">
            {shorFindings.length}
          </div>
          <div className="text-xs text-purple-950/70 dark:text-purple-300/70 mt-1">
            RSA, ECC, DH or DSA instances
          </div>
        </div>

        {/* Mosca Deficit (Urgent) - Professional Amber Accent */}
        <div className="p-4 rounded-xl border border-amber-800/20 dark:border-amber-800/40 bg-amber-950/5 dark:bg-[#251405]/50 shadow-xs">
          <div className="flex items-center justify-between text-amber-900/70 dark:text-amber-300/70 text-xs mb-2">
            <span className="font-medium">Mosca Deficit (Urgent)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-amber-900 dark:text-amber-200">
            {moscaUrgentFindings.length}
          </div>
          <div className="text-xs text-amber-950/70 dark:text-amber-300/70 mt-1">
            Data shelf life + Migration &gt; Horizon
          </div>
        </div>

        {/* Average Risk Score - Cyan/Slate Accent */}
        <div className="p-4 rounded-xl border border-cyan-900/20 dark:border-cyan-900/40 bg-cyan-950/5 dark:bg-[#071920]/50 shadow-xs">
          <div className="flex items-center justify-between text-cyan-900/70 dark:text-cyan-300/70 text-xs mb-2">
            <span className="font-medium">Average Risk Score</span>
            <Activity className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-bold font-mono text-cyan-950 dark:text-cyan-100">
              {stats.averageRiskScore}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 100</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Crypto Agility Rating: <strong className="text-slate-700 dark:text-slate-300">{stats.cryptoAgility.rating}</strong>
          </div>
        </div>
      </div>

      {/* Priority Migration Posture & Active Usage Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* P1 — Immediate (Deep red / burgundy tone) */}
        <button
          onClick={() => setActivePage('recommendations')}
          className="p-3.5 rounded-xl border border-rose-900/30 dark:border-rose-900/70 bg-rose-950/10 dark:bg-[#2e0b12]/70 text-left transition-all hover:border-rose-800/60 cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              P1 — Immediate
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-900 dark:text-rose-100 mt-1">
            {p1Count}
          </div>
          <div className="text-[10px] text-rose-950/70 dark:text-rose-300/70 mt-0.5">
            Urgent Shor / Mosca deficit
          </div>
        </button>

        {/* P2 — High (Professional amber/orange tone) */}
        <button
          onClick={() => setActivePage('recommendations')}
          className="p-3.5 rounded-xl border border-amber-800/30 dark:border-amber-800/70 bg-amber-950/10 dark:bg-[#301a07]/70 text-left transition-all hover:border-amber-800/60 cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              P2 — High
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
            {p2Count}
          </div>
          <div className="text-[10px] text-amber-950/70 dark:text-amber-300/70 mt-0.5">
            Scheduled migration
          </div>
        </button>

        {/* P3 — Planned (Professional blue tone) */}
        <button
          onClick={() => setActivePage('recommendations')}
          className="p-3.5 rounded-xl border border-blue-800/30 dark:border-blue-800/70 bg-blue-950/10 dark:bg-[#0a1b33]/70 text-left transition-all hover:border-blue-800/60 cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-200">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              P3 — Planned
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
            {p3Count}
          </div>
          <div className="text-[10px] text-blue-950/70 dark:text-blue-300/70 mt-0.5">
            Medium-term roadmap
          </div>
        </button>

        {/* P4 — Monitor (Professional green/teal tone) */}
        <button
          onClick={() => setActivePage('recommendations')}
          className="p-3.5 rounded-xl border border-teal-800/30 dark:border-teal-800/70 bg-teal-950/10 dark:bg-[#07241e]/70 text-left transition-all hover:border-teal-800/60 cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-teal-900 dark:text-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
              P4 — Monitor
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-teal-900 dark:text-teal-100 mt-1">
            {p4Count}
          </div>
          <div className="text-[10px] text-teal-950/70 dark:text-teal-300/70 mt-0.5">
            Resistant / Safe ciphers
          </div>
        </button>

        {/* Active Usage (Professional Cyan / Teal Accent) */}
        <button
          onClick={() => setActivePage('findings')}
          className="p-3.5 rounded-xl border border-cyan-800/30 dark:border-cyan-800/70 bg-cyan-950/10 dark:bg-[#09252e]/70 text-left transition-all hover:border-cyan-800/60 cursor-pointer shadow-xs col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold flex items-center gap-1.5 text-cyan-900 dark:text-cyan-200">
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              Active Usage
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-900 dark:text-cyan-100 mt-1">
            {activeUsageCount}
          </div>
          <div className="text-[10px] text-cyan-950/70 dark:text-cyan-300/70 mt-0.5">
            Direct code invocations
          </div>
        </button>
      </div>

      {/* Mosca Planning Model Executive Alert */}
      <div className="p-4 rounded-xl border border-amber-800/30 dark:border-amber-700/60 bg-amber-950/15 dark:bg-[#2e1c07]/70 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Mosca Planning Model (X + Y &gt; Z Analysis)
              </h4>
              <p className="text-xs text-amber-950/90 dark:text-amber-100/90 mt-0.5 leading-relaxed">
                {moscaUrgentFindings.length > 0
                  ? `${moscaUrgentFindings.length} cryptographic asset(s) show a shelf-life and migration duration that exceeds the ${settings.threatHorizon}-year planning horizon. Adversaries intercepting data today can decrypt it in the future (Store-Now-Decrypt-Later).`
                  : `All evaluated cryptographic assets fall within the ${settings.threatHorizon}-year planning horizon safety buffer under current organizational lifetime parameters.`}
              </p>
              <p className="text-[11px] text-amber-900/60 dark:text-amber-300/60 mt-1 italic">
                Disclaimer: This is a planning and risk-assessment model inspired by the Mosca framework. It is not a prediction of quantum-computer availability.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActivePage('quantum')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline shrink-0 cursor-pointer"
          >
            Inspect Mosca Model
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Bar Chart */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Risk Level Distribution
            </h3>
            <span className="text-xs text-slate-500">Based on 5-factor risk model</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={65} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quantum Security Posture */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Quantum Security Status
            </h3>
            <span className="text-xs text-slate-500">Shor &amp; Grover Relevance</span>
          </div>

          <div className="h-48 w-full flex items-center">
            {quantumChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quantumChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {quantumChartData.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full text-center text-xs text-slate-500">
                No quantum-relevant algorithms detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Urgent Cryptographic Assets Table */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Priority Migration Candidates (P1 / P2)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assets requiring immediate architectural review or scheduled migration
            </p>
          </div>

          <button
            onClick={() => setActivePage('findings')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            View all ({findings.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {findings.filter((f) => f.priority === 'P1' || f.priority === 'P2').length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No P1 or P2 critical findings detected in this repository.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="pb-2.5">Priority</th>
                  <th className="pb-2.5">Algorithm</th>
                  <th className="pb-2.5">Location</th>
                  <th className="pb-2.5">Quantum Status</th>
                  <th className="pb-2.5">Risk Score</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {findings
                  .filter((f) => f.priority === 'P1' || f.priority === 'P2')
                  .slice(0, 6)
                  .map((finding) => (
                    <tr key={finding.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5">
                        <PriorityBadge priority={finding.priority} />
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {finding.algorithmName}
                        <div className="text-[11px] font-normal text-slate-500">{finding.algorithmType}</div>
                      </td>
                      <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                        {finding.file}:{finding.line}
                      </td>
                      <td className="py-2.5">
                        <QuantumBadge status={finding.quantumStatus} size="sm" />
                      </td>
                      <td className="py-2.5">
                        <RiskBadge level={finding.riskLevel} score={finding.riskScore} size="sm" />
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => openFindingInCode(finding)}
                          className="px-2 py-1 rounded text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                        >
                          Inspect Code
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Algorithm Registration Modal */}
      <AddAlgorithmModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
