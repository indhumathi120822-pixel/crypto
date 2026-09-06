import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Sliders,
  Check,
  RotateCcw,
  Trash2,
  AlertCircle,
  Shield,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { BusinessCriticality, RiskWeights, UserSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, scanned, resetScan, refreshStatus } = useApp();

  const [weights, setWeights] = useState<RiskWeights>(settings.weights);
  const [threatHorizon, setThreatHorizon] = useState<number>(settings.threatHorizon);
  const [dataLifetime, setDataLifetime] = useState<number>(settings.defaultDataLifetime);
  const [migrationTime, setMigrationTime] = useState<number>(settings.defaultMigrationTime);
  const [businessCriticality, setBusinessCriticality] = useState<BusinessCriticality>(
    settings.defaultBusinessCriticality
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(
    settings.confidenceThreshold
  );
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState<number>(settings.maxUploadSizeMb);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Compute weight sum
  const weightSum =
    Math.round(
      (weights.quantumRelevance +
        weights.algorithmConcern +
        weights.businessCriticality +
        weights.dataLifetime +
        weights.migrationEffort) *
        100
    ) / 100;

  const isWeightValid = Math.abs(weightSum - 1.0) < 0.01;

  const handleNormalizeWeights = () => {
    if (weightSum === 0) return;
    setWeights({
      quantumRelevance: Math.round((weights.quantumRelevance / weightSum) * 100) / 100,
      algorithmConcern: Math.round((weights.algorithmConcern / weightSum) * 100) / 100,
      businessCriticality: Math.round((weights.businessCriticality / weightSum) * 100) / 100,
      dataLifetime: Math.round((weights.dataLifetime / weightSum) * 100) / 100,
      migrationEffort: Math.round((weights.migrationEffort / weightSum) * 100) / 100,
    });
  };

  const handleSave = async () => {
    const updated: UserSettings = {
      ...settings,
      weights,
      threatHorizon,
      defaultDataLifetime: dataLifetime,
      defaultMigrationTime: migrationTime,
      defaultBusinessCriticality: businessCriticality,
      confidenceThreshold,
      maxUploadSizeMb,
    };
    updateSettings(updated);

    if (scanned) {
      try {
        await api.recalculateRisk({
          weights,
          threatHorizon,
        });
        await refreshStatus();
      } catch (err) {
        console.error('Failed to update active scan risk weights:', err);
      }
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePurgeSession = async () => {
    if (!window.confirm('Are you sure you want to clear the active repository scan data?')) return;
    setIsResetting(true);
    try {
      await resetScan();
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
          Engine &amp; Risk Model Settings
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize weighted risk scoring coefficients, Mosca timeline defaults, and repository upload quotas.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center gap-2 text-xs">
          <Check className="w-4 h-4 shrink-0" />
          <span>Settings saved successfully! Active scan recalculated with updated weights.</span>
        </div>
      )}

      {/* 5-Factor Risk Weights */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Five-Factor Weighted Risk Scoring Model
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Weights represent relative importance in generating the composite 0–100 risk score (must sum to 1.00 / 100%).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-bold px-2 py-1 rounded-md ${
                isWeightValid
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}
            >
              Sum: {Math.round(weightSum * 100)}%
            </span>

            {!isWeightValid && (
              <button
                onClick={handleNormalizeWeights}
                className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Auto-Normalize
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Factor 1 */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Quantum Relevance Factor: {Math.round(weights.quantumRelevance * 100)}%
              </span>
              <span className="text-slate-400 text-[11px]">Shor broken public key vs Grover halving</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={weights.quantumRelevance}
              onChange={(e) =>
                setWeights({ ...weights, quantumRelevance: Number(e.target.value) })
              }
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Factor 2 */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Algorithm Concern Factor: {Math.round(weights.algorithmConcern * 100)}%
              </span>
              <span className="text-slate-400 text-[11px]">Classical deprecation (MD5, SHA-1, DES)</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={weights.algorithmConcern}
              onChange={(e) =>
                setWeights({ ...weights, algorithmConcern: Number(e.target.value) })
              }
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Factor 3 */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Business Criticality Factor: {Math.round(weights.businessCriticality * 100)}%
              </span>
              <span className="text-slate-400 text-[11px]">Organizational sensitivity of source module</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={weights.businessCriticality}
              onChange={(e) =>
                setWeights({ ...weights, businessCriticality: Number(e.target.value) })
              }
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Factor 4 */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Data Lifetime Factor: {Math.round(weights.dataLifetime * 100)}%
              </span>
              <span className="text-slate-400 text-[11px]">Exposure window for Store-Now-Decrypt-Later</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={weights.dataLifetime}
              onChange={(e) =>
                setWeights({ ...weights, dataLifetime: Number(e.target.value) })
              }
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Factor 5 */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Migration Effort Factor: {Math.round(weights.migrationEffort * 100)}%
              </span>
              <span className="text-slate-400 text-[11px]">Engineering complexity to transition algorithm</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={weights.migrationEffort}
              onChange={(e) =>
                setWeights({ ...weights, migrationEffort: Number(e.target.value) })
              }
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* Mosca & Scanner Defaults */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Mosca Planning &amp; Scanner Defaults
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Baseline Quantum Threat Horizon (Z in Years)
            </label>
            <input
              type="number"
              min="3"
              max="30"
              value={threatHorizon}
              onChange={(e) => setThreatHorizon(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Years until a cryptanalytically relevant quantum computer (CRQC) is assumed active.
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Default Data Shelf-Life (X in Years)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={dataLifetime}
              onChange={(e) => setDataLifetime(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              How long confidential payloads must remain protected against harvesting.
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Default Migration Duration (Y in Years)
            </label>
            <input
              type="number"
              min="1"
              max="15"
              value={migrationTime}
              onChange={(e) => setMigrationTime(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Expected enterprise lead time to deploy PQC algorithms in production.
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Default Module Criticality
            </label>
            <select
              value={businessCriticality}
              onChange={(e) => setBusinessCriticality(e.target.value as BusinessCriticality)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="CRITICAL">Critical (Authentication, Tokens, Vaults)</option>
              <option value="HIGH">High (Primary APIs, Databases)</option>
              <option value="MEDIUM">Medium (Internal Microservices)</option>
              <option value="LOW">Low (Utilities, Testing Tools)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2">
        {scanned ? (
          <button
            onClick={handlePurgeSession}
            disabled={isResetting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Active Scan &amp; Reset Session
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={handleSave}
          disabled={!isWeightValid}
          className={`inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer ${
            !isWeightValid
              ? 'bg-slate-400 dark:bg-slate-800 text-slate-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          <Check className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
};
