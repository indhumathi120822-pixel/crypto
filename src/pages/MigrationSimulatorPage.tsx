import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { AddAlgorithmModal } from '../components/inventory/AddAlgorithmModal';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  TrendingDown,
  Layers,
  Clock,
  RotateCcw,
  Zap,
  FlaskConical,
  Cpu,
  Binary,
  Activity,
  Plus,
  Info,
} from 'lucide-react';
import { RiskBadge, QuantumBadge, PriorityBadge } from '../components/common/Badge';

interface TargetAlgorithmUpgrade {
  originalId: string;
  originalName: string;
  replacementName: string;
  pqcStandard: string;
  count: number;
  selected: boolean;
  effortWeeks: number;
}

const ALGORITHM_PRESETS = [
  { id: 'rsa2048', name: 'RSA-2048', target: 'ML-KEM-768 (NIST FIPS 203)' },
  { id: 'rsa4096', name: 'RSA-4096', target: 'ML-DSA-65 (NIST FIPS 204)' },
  { id: 'ecc256', name: 'ECC P-256 / ECDSA', target: 'ML-DSA-65 (NIST FIPS 204)' },
  { id: 'ecdh', name: 'ECDH Key Agreement', target: 'Hybrid X25519 + ML-KEM-768' },
  { id: 'aes128', name: 'AES-128-CBC', target: 'AES-256-GCM (NIST SP 800-38D)' },
  { id: 'aes256', name: 'AES-256-GCM', target: 'Maintain AES-256-GCM' },
  { id: 'des', name: '3DES / Triple DES', target: 'AES-256-GCM' },
  { id: 'md5', name: 'MD5 / SHA-1', target: 'SHA-256 / SHA3-256' },
];

const TARGET_PRESETS = [
  'ML-KEM-768 (NIST FIPS 203)',
  'ML-KEM-1024 (NIST FIPS 203)',
  'ML-DSA-65 (NIST FIPS 204)',
  'ML-DSA-87 (NIST FIPS 204)',
  'SLH-DSA (NIST FIPS 205 / SPHINCS+)',
  'Hybrid X25519 + ML-KEM-768',
  'AES-256-GCM (NIST SP 800-38D)',
  'SHA-256 / SHA3-256 (NIST FIPS 202)',
];

export const MigrationSimulatorPage: React.FC = () => {
  const { scanned, findings, stats, repoName, setActivePage } = useApp();

  // Mode: 'pair' (Current -> Target Analysis) or 'fleet' (Inventory Rollout)
  const [simulatorMode, setSimulatorMode] = useState<'pair' | 'fleet'>('pair');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Pair Simulation State
  const [currentAlgo, setCurrentAlgo] = useState('RSA-2048');
  const [targetAlgo, setTargetAlgo] = useState('ML-KEM-768 (NIST FIPS 203)');
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    beforeRiskScore: number;
    afterRiskScore: number;
    riskReduction: number;
    strengthBefore: string;
    strengthAfter: string;
    performanceImpact: {
      keySizeChange: string;
      ciphertextChange: string;
      latencyImpact: string;
    };
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    complexityReason: string;
    rationale: string;
  } | null>(null);

  // Fleet Targets
  const initialTargets: TargetAlgorithmUpgrade[] = [
    {
      originalId: 'rsa',
      originalName: 'RSA (Public Key Encryption / Signing)',
      replacementName: 'ML-KEM-768 (FIPS 203) / ML-DSA-65 (FIPS 204)',
      pqcStandard: 'NIST Post-Quantum Cryptography FIPS 203/204',
      count: findings.filter((f) => f.algorithmName.toUpperCase().includes('RSA')).length,
      selected: true,
      effortWeeks: 4,
    },
    {
      originalId: 'ecc',
      originalName: 'ECDSA / ECC (Elliptic Curves)',
      replacementName: 'ML-DSA-65 (FIPS 204) / SLH-DSA (FIPS 205)',
      pqcStandard: 'NIST FIPS 204 Standard',
      count: findings.filter(
        (f) =>
          f.algorithmName.toUpperCase().includes('ECC') ||
          f.algorithmName.toUpperCase().includes('ECDSA') ||
          f.algorithmName.toUpperCase().includes('ED25519')
      ).length,
      selected: true,
      effortWeeks: 3,
    },
    {
      originalId: 'dh',
      originalName: 'Diffie-Hellman / ECDH Key Exchange',
      replacementName: 'Hybrid X25519 + ML-KEM-768',
      pqcStandard: 'IETF Hybrid Key Agreement Draft',
      count: findings.filter(
        (f) =>
          f.algorithmName.toUpperCase().includes('DIFFIE') ||
          f.algorithmName.toUpperCase().includes('ECDH')
      ).length,
      selected: true,
      effortWeeks: 2,
    },
    {
      originalId: 'des',
      originalName: 'DES / 3DES / RC4 (Broken Legacy Ciphers)',
      replacementName: 'AES-256-GCM / ChaCha20-Poly1305',
      pqcStandard: 'NIST SP 800-38D (Quantum Resistant)',
      count: findings.filter(
        (f) =>
          f.algorithmName.toUpperCase().includes('DES') ||
          f.algorithmName.toUpperCase().includes('RC4')
      ).length,
      selected: true,
      effortWeeks: 1,
    },
    {
      originalId: 'hash_broken',
      originalName: 'MD5 / SHA-1 (Collision Vulnerable Hashes)',
      replacementName: 'SHA-256 / SHA-384 / BLAKE3',
      pqcStandard: 'FIPS 180-4 / FIPS 202',
      count: findings.filter(
        (f) =>
          f.algorithmName.toUpperCase().includes('MD5') ||
          f.algorithmName.toUpperCase().includes('SHA-1') ||
          f.algorithmName.toUpperCase().includes('SHA1')
      ).length,
      selected: true,
      effortWeeks: 1,
    },
    {
      originalId: 'aes128',
      originalName: 'AES-128 / CBC (Grover-Halved Symmetric)',
      replacementName: 'AES-256-GCM (256-bit Key Length)',
      pqcStandard: 'NIST Grover Resistance Guideline',
      count: findings.filter(
        (f) =>
          f.algorithmName.toUpperCase().includes('AES-128') ||
          f.algorithmName.toUpperCase().includes('AES_128')
      ).length,
      selected: false,
      effortWeeks: 2,
    },
  ].filter((t) => t.count > 0);

  const [targets, setTargets] = useState<TargetAlgorithmUpgrade[]>(initialTargets);

  useEffect(() => {
    setTargets(initialTargets);
  }, [findings.length]);

  // Run pair simulation whenever current or target changes
  const runPairSimulation = async (curr: string, tgt: string) => {
    try {
      setSimulationLoading(true);
      const res = await api.simulateMigration({
        currentAlgorithm: curr,
        targetAlgorithm: tgt,
      });
      setSimulationResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulationLoading(false);
    }
  };

  useEffect(() => {
    runPairSimulation(currentAlgo, targetAlgo);
  }, [currentAlgo, targetAlgo]);

  const toggleTarget = (id: string) => {
    setTargets((prev) =>
      prev.map((t) => (t.originalId === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectAll = () => {
    setTargets((prev) => prev.map((t) => ({ ...t, selected: true })));
  };

  const clearAll = () => {
    setTargets((prev) => prev.map((t) => ({ ...t, selected: false })));
  };

  // Fleet stats
  const currentRiskScore = stats?.averageRiskScore ?? 0;
  const currentShor = stats?.quantumStatusDistribution?.['VULNERABLE_SHOR'] || 0;

  let simulatedMigratedCount = 0;
  let simulatedEffortWeeks = 0;

  for (const t of targets) {
    if (t.selected) {
      simulatedMigratedCount += t.count;
      simulatedEffortWeeks += t.effortWeeks;
    }
  }

  const migrationRatio = findings.length > 0 ? simulatedMigratedCount / findings.length : 0;
  const projectedRiskScore = Math.max(10, Math.round(currentRiskScore * (1 - migrationRatio * 0.75)));
  const riskReductionPct =
    currentRiskScore > 0
      ? Math.round(((currentRiskScore - projectedRiskScore) / currentRiskScore) * 100)
      : 0;

  const projectedShor = Math.max(
    0,
    currentShor -
      (targets.find((t) => t.originalId === 'rsa' && t.selected)?.count || 0) -
      (targets.find((t) => t.originalId === 'ecc' && t.selected)?.count || 0) -
      (targets.find((t) => t.originalId === 'dh' && t.selected)?.count || 0)
  );

  return (
    <div className="py-4 space-y-6">
      {/* Header */}
      <div className="p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-500" />
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                Cryptographic Transition Engine
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              PQC Migration Simulator
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Model transition paths from classical algorithms to post-quantum standards with rigorous compatibility, latency, key size, and risk delta calculations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mode Switcher */}
            <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSimulatorMode('pair')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  simulatorMode === 'pair'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Algorithm Transition Matrix
              </button>
              <button
                onClick={() => setSimulatorMode('fleet')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  simulatorMode === 'fleet'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Inventory Rollout Modeling ({findings.length})
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Algo
            </button>
          </div>
        </div>
      </div>

      {/* ===================== MODE 1: ALGORITHM PAIR SIMULATOR ===================== */}
      {simulatorMode === 'pair' && (
        <div className="space-y-6">
          {/* Preset Buttons */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Quick Scenario Selectors
            </span>
            <div className="flex flex-wrap gap-2">
              {ALGORITHM_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentAlgo(p.name);
                    setTargetAlgo(p.target);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                    currentAlgo === p.name
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {p.name} → {p.target.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Current -> Target Selection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Algorithm Card */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-rose-500 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Current (Source) Cryptographic Primitive
                </span>
                {simulationResult && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    Risk Score: {simulationResult.beforeRiskScore} / 100
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Select or type algorithm:
                </label>
                <input
                  type="text"
                  value={currentAlgo}
                  onChange={(e) => setCurrentAlgo(e.target.value)}
                  placeholder="e.g. RSA-2048, ECC P-256, AES-256, DES"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {simulationResult && (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Cryptographic Security Margin:</span>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {simulationResult.strengthBefore}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Target Algorithm Card */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Target (Post-Quantum) Standard
                </span>
                {simulationResult && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Projected Score: {simulationResult.afterRiskScore} / 100
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Target Algorithm Standard:
                </label>
                <select
                  value={targetAlgo}
                  onChange={(e) => setTargetAlgo(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {TARGET_PRESETS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {simulationResult && (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Post-Quantum Assurance Level:</span>
                    <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {simulationResult.strengthAfter}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulation Output Dashboard */}
          {simulationResult && (
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
              {/* Top Banner: Risk Reduction & Complexity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Risk Delta */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
                  <div className="text-xs text-slate-400 font-medium">Projected Risk Reduction</div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-bold font-mono text-slate-400 line-through">
                      {simulationResult.beforeRiskScore}
                    </span>
                    <ArrowRight className="w-4 h-4 text-indigo-500" />
                    <span className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {simulationResult.afterRiskScore}
                    </span>
                    <span className="text-xs font-semibold text-emerald-500">
                      (-{simulationResult.riskReduction} pts)
                    </span>
                  </div>
                </div>

                {/* Complexity Rating */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
                  <div className="text-xs text-slate-400 font-medium">Migration Complexity</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        simulationResult.complexity === 'LOW'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : simulationResult.complexity === 'MEDIUM'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {simulationResult.complexity} COMPLEXITY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {simulationResult.complexityReason}
                  </p>
                </div>

                {/* Agility Impact */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
                  <div className="text-xs text-slate-400 font-medium">Cryptographic Agility</div>
                  <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    NIST FIPS 203/204 Aligned
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Compliant with CNSA 2.0 timeline and Federal quantum mandates.
                  </p>
                </div>
              </div>

              {/* Engineering Performance & Overhead Metrics */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  Wire Protocol & Latency Impact Breakdown
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block">
                      Public Key Size Delta
                    </span>
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {simulationResult.performanceImpact.keySizeChange}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block">
                      Ciphertext / Signature Expansion
                    </span>
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {simulationResult.performanceImpact.ciphertextChange}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block">
                      Computation & CPU Latency
                    </span>
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {simulationResult.performanceImpact.latencyImpact}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rationale & Advice Note */}
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
                  currentAlgo.toUpperCase().includes('AES-256')
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/20 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Info className="w-5 h-5 shrink-0 text-indigo-500" />
                <div>
                  <strong className="font-bold block mb-0.5">
                    {currentAlgo.toUpperCase().includes('AES-256')
                      ? 'NIST Cryptographic Guidance Notice: No Migration Required'
                      : 'Architectural Transition Rationale'}
                  </strong>
                  <span>{simulationResult.rationale}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== MODE 2: FLEET ROLLOUT SIMULATOR ===================== */}
      {simulatorMode === 'fleet' && (
        <div className="space-y-6">
          {/* Projected Outcomes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Risk Score Delta */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Enterprise Risk Score</span>
                <span className="text-emerald-500 font-semibold font-mono flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  -{riskReductionPct}%
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-slate-400 line-through">
                  {currentRiskScore}
                </span>
                <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {projectedRiskScore}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>

              <div className="text-[11px] text-slate-500 mt-2">
                Simulated posture shift based on candidate migrations.
              </div>
            </div>

            {/* Shor Vulnerabilities */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="text-xs text-slate-400">Shor Vulnerable Assets</div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold font-mono text-rose-400 line-through">
                  {currentShor}
                </span>
                <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {projectedShor}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                {currentShor - projectedShor} public key assets upgraded to FIPS 203/204.
              </div>
            </div>

            {/* Assets Migrated */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="text-xs text-slate-400">Candidate Migrations</div>
              <div className="text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-2">
                {simulatedMigratedCount} / {findings.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                {Math.round(migrationRatio * 100)}% of identified cryptographic footprint.
              </div>
            </div>

            {/* Estimated Velocity */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="text-xs text-slate-400">Estimated Engineering Effort</div>
              <div className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
                ~{simulatedEffortWeeks} weeks
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Based on migration complexity weights and module dependencies.
              </div>
            </div>
          </div>

          {/* Upgrade Target Toggles */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Cryptographic Migration Toggles
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={clearAll}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {targets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No algorithms detected in current scan or inventory to simulate.
              </div>
            ) : (
              <div className="space-y-3">
                {targets.map((target) => (
                  <div
                    key={target.originalId}
                    onClick={() => toggleTarget(target.originalId)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      target.selected
                        ? 'border-indigo-500/80 bg-indigo-500/5 dark:bg-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={target.selected}
                        onChange={() => {}}
                        className="mt-1 accent-indigo-600 rounded cursor-pointer"
                      />

                      <div className="space-y-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{target.originalName}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {target.count} instance{target.count > 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 shrink-0" />
                          <span>Target: {target.replacementName}</span>
                        </div>

                        <div className="text-[11px] text-slate-400">{target.pqcStandard}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Est. Effort: {target.effortWeeks} wks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phased Execution Playbook */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>Post-Quantum Transition Playbook (Recommended Phase Order)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
              Phase 1: Quick Wins
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Decommission MD5, SHA-1, DES, and RC4. Upgrade symmetric key sizes to AES-256 for instant Grover quantum resistance.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
              Phase 2: Hybrid KEM
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Deploy hybrid key exchange (X25519 + ML-KEM-768) in TLS and internal communications to stop Store-Now-Decrypt-Later harvesting.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
              Phase 3: Digital Signatures
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Transition authentication and PKI roots to NIST FIPS 204 (ML-DSA) and FIPS 205 (SLH-DSA). Update token verification endpoints.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
              Phase 4: Agility Architecture
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Consolidate hardcoded algorithm invocations into centralized crypto provider modules for ongoing cryptographic agility.
            </p>
          </div>
        </div>
      </div>

      {/* Manual Algorithm Registration Modal */}
      <AddAlgorithmModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
