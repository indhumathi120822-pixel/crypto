import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/common/EmptyState';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  TrendingDown,
  Layers,
  Clock,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { RiskBadge, QuantumBadge } from '../components/common/Badge';

interface TargetAlgorithmUpgrade {
  originalId: string;
  originalName: string;
  replacementName: string;
  pqcStandard: string;
  count: number;
  selected: boolean;
  effortWeeks: number;
}

export const MigrationSimulatorPage: React.FC = () => {
  const { scanned, findings, stats, repoName, setActivePage } = useApp();

  // Find unique algorithms in current findings to offer as upgrade targets
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

  if (!scanned || !stats) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Data to Simulate"
          description="Upload and scan a repository to simulate post-quantum migrations and calculate projected risk reductions."
          onNavigateScan={() => setActivePage('scan')}
          onNavigateKnowledgeBase={() => setActivePage('knowledge-base')}
          viewContext="simulator"
        />
      </div>
    );
  }

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

  // Compute simulated results safely with fallback values
  const currentRiskScore = stats.averageRiskScore ?? 0;
  const currentShor = stats.quantumStatusDistribution?.['VULNERABLE_SHOR'] || 0;
  const currentCritical = stats.criticalRisks ?? stats.riskDistribution?.critical ?? 0;
  const currentHigh = stats.highRisks ?? stats.riskDistribution?.high ?? 0;

  let simulatedMigratedCount = 0;
  let simulatedEffortWeeks = 0;

  for (const t of targets) {
    if (t.selected) {
      simulatedMigratedCount += t.count;
      simulatedEffortWeeks += t.effortWeeks;
    }
  }

  // Calculate projected risk reduction
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
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                Interactive What-If Modeling
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Post-Quantum Migration Simulator
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Select cryptographic upgrades to simulate real-time risk reduction, Shor vulnerability mitigation, and estimated engineering velocity for {repoName}.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
            >
              Simulate Full PQC
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

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
          <span className="text-xs text-slate-500">
            Check or uncheck algorithm families to test migration impact
          </span>
        </div>

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
      </div>

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
    </div>
  );
};
