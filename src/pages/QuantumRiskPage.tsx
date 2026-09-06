import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { EmptyState } from '../components/common/EmptyState';
import {
  Atom,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Sliders,
  CheckCircle2,
  Info,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { RiskBadge, QuantumBadge, PriorityBadge } from '../components/common/Badge';

export const QuantumRiskPage: React.FC = () => {
  const { scanned, findings, stats, repoName, setActivePage, refreshStatus, settings } = useApp();

  const [threatHorizon, setThreatHorizon] = useState<number>(settings.threatHorizon);
  const [isUpdatingHorizon, setIsUpdatingHorizon] = useState(false);

  if (!scanned || !stats) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Quantum Risk Data Available"
          description="Upload a repository archive to assess your cryptographic exposure against Shor's and Grover's quantum algorithms and compute Mosca planning timeline deficits."
          onNavigateScan={() => setActivePage('scan')}
          onNavigateKnowledgeBase={() => setActivePage('knowledge-base')}
          viewContext="quantum"
        />
      </div>
    );
  }

  // Dynamic calculations based on threatHorizon slider
  const moscaEvaluated = findings.map((f) => {
    const totalExposureYears = f.dataLifetime + f.migrationTime;
    const isUrgent = totalExposureYears > threatHorizon;
    const deficitYears = isUrgent ? totalExposureYears - threatHorizon : 0;
    const safetyMarginYears = isUrgent ? 0 : threatHorizon - totalExposureYears;
    return {
      ...f,
      isUrgent,
      deficitYears,
      safetyMarginYears,
    };
  });

  const urgentCount = moscaEvaluated.filter((f) => f.isUrgent).length;
  const maxDeficit = Math.max(...moscaEvaluated.map((f) => f.deficitYears), 0);

  const shorCount = findings.filter((f) => f.quantumStatus === 'VULNERABLE_SHOR').length;
  const groverCount = findings.filter((f) => f.quantumStatus === 'PARTIALLY_VULNERABLE_GROVER').length;
  const resistantCount = findings.filter(
    (f) => f.quantumStatus === 'QUANTUM_RESISTANT' || f.quantumStatus === 'QUANTUM_SAFE'
  ).length;

  const handleApplyThreatHorizon = async (newVal: number) => {
    setThreatHorizon(newVal);
    setIsUpdatingHorizon(true);
    try {
      await api.recalculateRisk({ threatHorizon: newVal });
      await refreshStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingHorizon(false);
    }
  };

  return (
    <div className="py-4 space-y-6">
      {/* Header */}
      <div className="p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Atom className="w-5 h-5 text-indigo-500" />
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Quantum Threat Landscape
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Quantum Risk &amp; Mosca Planning Model
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Evaluating Store-Now-Decrypt-Later (SNDL) exposure, cryptographic shelf-life deficits, and code-level crypto agility in {repoName}.
            </p>
          </div>

          <button
            onClick={() => setActivePage('simulator')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            Open Migration Simulator
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mosca Planning Model Interactive Section */}
      <div className="p-6 rounded-xl border border-amber-800/40 dark:border-amber-700/60 bg-amber-950/15 dark:bg-[#2b1807]/70 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-amber-950 dark:text-amber-100">
                Mosca Inequality Framework (X + Y &gt; Z)
              </h2>
            </div>
            <p className="text-xs text-amber-950/90 dark:text-amber-200/90 mt-1 max-w-2xl leading-relaxed">
              If the time your data must remain secret (<strong>X: Data Shelf-life</strong>) plus the time required to complete your post-quantum migration (<strong>Y: Migration Duration</strong>) exceeds the time until a cryptanalytically relevant quantum computer emerges (<strong>Z: Threat Horizon</strong>), your data is compromised today via Store-Now-Decrypt-Later harvesting.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-200">
              {urgentCount} / {findings.length}
            </div>
            <div className="text-xs text-amber-900/70 dark:text-amber-300/70">
              Assets in Deficit Window
            </div>
          </div>
        </div>

        {/* Threat Horizon Interactive Slider */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              Adjust Threat Horizon (Z): <strong className="font-mono text-indigo-600 dark:text-indigo-400">{threatHorizon} Years</strong>
            </span>
            <span className="text-slate-400 text-[11px]">
              {isUpdatingHorizon ? 'Recalculating...' : 'Recalculates risk & deficit across entire codebase'}
            </span>
          </div>

          <input
            type="range"
            min="3"
            max="25"
            value={threatHorizon}
            onChange={(e) => handleApplyThreatHorizon(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>3 Years (Imminent)</span>
            <span>10 Years (Baseline Planning)</span>
            <span>25 Years (Conservative)</span>
          </div>
        </div>

        {/* Mosca Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Deficit Assets - Deep Red / Burgundy */}
          <div className="p-3.5 rounded-lg bg-rose-950/15 dark:bg-[#320c13]/70 border border-rose-900/30 dark:border-rose-900/60">
            <span className="text-rose-950/80 dark:text-rose-300/80 block text-[11px] font-medium">Deficit Assets (X+Y &gt; Z)</span>
            <div className="text-xl font-bold font-mono text-rose-900 dark:text-rose-100 mt-1">
              {urgentCount}
            </div>
            <span className="text-[10px] text-rose-950/70 dark:text-rose-300/60">Require immediate P1 migration attention</span>
          </div>

          {/* Maximum Exposure Deficit - Amber */}
          <div className="p-3.5 rounded-lg bg-amber-950/15 dark:bg-[#341d08]/70 border border-amber-800/30 dark:border-amber-800/60">
            <span className="text-amber-950/80 dark:text-amber-300/80 block text-[11px] font-medium">Maximum Exposure Deficit</span>
            <div className="text-xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
              {maxDeficit > 0 ? `${maxDeficit.toFixed(1)} yrs` : '0.0 yrs'}
            </div>
            <span className="text-[10px] text-amber-950/70 dark:text-amber-300/60">Peak window of vulnerable harvested data</span>
          </div>

          {/* Safe Buffer Assets - Calm Teal / Green */}
          <div className="p-3.5 rounded-lg bg-teal-950/15 dark:bg-[#092922]/70 border border-teal-800/30 dark:border-teal-800/60">
            <span className="text-teal-950/80 dark:text-teal-300/80 block text-[11px] font-medium">Safe Buffer Assets</span>
            <div className="text-xl font-bold font-mono text-teal-900 dark:text-teal-100 mt-1">
              {findings.length - urgentCount}
            </div>
            <span className="text-[10px] text-teal-950/70 dark:text-teal-300/60">Within the {threatHorizon}-year horizon window</span>
          </div>
        </div>

        {/* Mandatory Disclaimer */}
        <div className="text-[11px] text-amber-900/60 dark:text-amber-300/60 italic border-t border-amber-800/20 pt-3">
          Disclaimer: This is a planning and risk-assessment model inspired by the Mosca framework. It is not a prediction of quantum-computer availability.
        </div>
      </div>

      {/* Shor's vs Grover's Algorithm Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shor's algorithm card - Purple / Magenta Quantum Relevance */}
        <div className="p-5 rounded-xl border border-purple-900/30 dark:border-purple-800/60 bg-purple-950/5 dark:bg-[#1a0824]/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Atom className="w-5 h-5 text-purple-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Shor’s Algorithm Exposure (Public Key)
              </h3>
            </div>
            <span className="font-mono text-sm font-bold text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded bg-purple-900/20 border border-purple-800/30">
              {shorCount} instances
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Shor’s algorithm solves the discrete logarithm and integer factorization problems in polynomial time O((log N)³). All classical public key cryptography is completely broken once a cryptanalytically relevant quantum computer (CRQC) is deployed.
          </p>

          <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Impacted Primitives in Repository:</div>
            <div className="text-slate-600 dark:text-slate-400">
              RSA, ECC (secp256k1, secp256r1), ECDSA, Diffie-Hellman, ECDH, Ed25519.
            </div>
            <div className="font-semibold text-purple-700 dark:text-purple-300 pt-1">
              Migration Standard: NIST FIPS 203 (ML-KEM) &amp; FIPS 204 (ML-DSA).
            </div>
          </div>
        </div>

        {/* Grover's algorithm card - Amber / Orange Halving */}
        <div className="p-5 rounded-xl border border-amber-800/30 dark:border-amber-800/60 bg-amber-950/5 dark:bg-[#201205]/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Grover’s Algorithm Exposure (Symmetric)
              </h3>
            </div>
            <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded bg-amber-900/20 border border-amber-800/30">
              {groverCount} partial
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Grover’s algorithm provides a quadratic speedup O(√N) for brute-force key searches. This effectively halves the classical security margin of symmetric ciphers. AES-128 is reduced to 64-bit strength, while AES-256 retains 128-bit quantum security (quantum resistant).
          </p>

          <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Recommended Stance:</div>
            <div className="text-slate-600 dark:text-slate-400">
              Do not replace AES. Upgrade 128-bit keys to AES-256-GCM or ChaCha20-Poly1305. Modern hash functions (SHA-256/384/512) remain secure.
            </div>
            <div className="font-semibold text-teal-700 dark:text-teal-300 pt-1">
              Quantum Resistant Assets in Repo: {resistantCount}
            </div>
          </div>
        </div>
      </div>

      {/* Crypto Agility Analyzer Section */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
              Automated Codebase Audit
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Crypto Agility Assessment
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analyzes how easily your codebase can swap cryptographic algorithms without extensive rewrites.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">Agility Score</div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {stats.cryptoAgility.score} / 100
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
              {stats.cryptoAgility.rating}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {stats.cryptoAgility.summary}
        </p>

        {/* Agility Findings List */}
        <div className="space-y-2 pt-2">
          {stats.cryptoAgility.findings.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                item.type === 'positive'
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-slate-800 dark:text-slate-200'
                  : item.type === 'negative'
                  ? 'border-rose-500/30 bg-rose-500/5 text-slate-800 dark:text-slate-200'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200'
              }`}
            >
              {item.type === 'positive' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : item.type === 'negative' ? (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{item.title}</div>
                <div className="text-slate-600 dark:text-slate-400 mt-0.5">{item.evidence}</div>
                <div className="text-[11px] text-slate-500 mt-1 italic">{item.impact}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
