import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Atom,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import { userAlgorithmService } from '../../services/userAlgorithmService';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { RiskBadge, PriorityBadge, QuantumBadge } from '../common/Badge';
import { Finding } from '../../types';

interface AddAlgorithmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_ALGORITHM_TEMPLATES = [
  { name: 'RSA-2048', family: 'ASYMMETRIC_KEY_EXCHANGE', keySize: '2048', purpose: 'TLS Key Exchange / Asymmetric Encryption' },
  { name: 'RSA-4096', family: 'DIGITAL_SIGNATURES', keySize: '4096', purpose: 'Certificate & Code Signing' },
  { name: 'ECC P-256 (secp256r1)', family: 'ASYMMETRIC_KEY_EXCHANGE', keySize: '256', purpose: 'ECDH Key Agreement' },
  { name: 'ECDSA P-384', family: 'DIGITAL_SIGNATURES', keySize: '384', purpose: 'API Token & Document Signing' },
  { name: 'AES-128-CBC', family: 'SYMMETRIC_ENCRYPTION', keySize: '128', purpose: 'Legacy Database Field Encryption' },
  { name: 'AES-256-GCM', family: 'AEAD', keySize: '256', purpose: 'Authenticated Payload Encryption' },
  { name: '3DES (Triple DES)', family: 'SYMMETRIC_ENCRYPTION', keySize: '168', purpose: 'Legacy Financial POS Encryption' },
  { name: 'SHA-1', family: 'HASH_FUNCTIONS', keySize: '160', purpose: 'Legacy Data Integrity Checksum' },
  { name: 'MD5', family: 'HASH_FUNCTIONS', keySize: '128', purpose: 'Legacy Message Digest' },
];

export const AddAlgorithmModal: React.FC<AddAlgorithmModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { applyUpdatedScanResult, findings, stats, repoName } = useApp();

  const [algorithmName, setAlgorithmName] = useState('');
  const [algorithmFamily, setAlgorithmFamily] = useState('ASYMMETRIC_KEY_EXCHANGE');
  const [keySize, setKeySize] = useState('2048');
  const [purpose, setPurpose] = useState('TLS Session Key Exchange & Transport Security');
  const [dataSensitivity, setDataSensitivity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [expectedShelfLife, setExpectedShelfLife] = useState(5);
  const [migrationTime, setMigrationTime] = useState(2);
  const [internetExposure, setInternetExposure] = useState<'Yes' | 'No'>('Yes');

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [evaluationResult, setEvaluationResult] = useState<{
    finding: Finding;
    riskScore: number;
    riskLevel: string;
    priority: string;
    priorityReason: string;
    riskCategory: string;
    whyRiskLevel: any;
    recommendedTarget: string;
    moscaAnalysis: any;
  } | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl: typeof COMMON_ALGORITHM_TEMPLATES[0]) => {
    setAlgorithmName(tpl.name);
    setAlgorithmFamily(tpl.family);
    setKeySize(tpl.keySize);
    setPurpose(tpl.purpose);
    setEvaluationResult(null);
  };

  const handleEvaluate = async () => {
    if (!algorithmName.trim()) {
      setError('Please provide an Algorithm Name.');
      return;
    }
    try {
      setIsEvaluating(true);
      setError(null);
      const res = await api.evaluateAlgorithm({
        algorithmName,
        algorithmFamily,
        keySize,
        purpose,
        dataSensitivity,
        expectedShelfLife: Number(expectedShelfLife),
        migrationTime: Number(migrationTime),
        internetExposure: internetExposure === 'Yes',
      });
      setEvaluationResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate algorithm');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAddToInventory = async () => {
    if (!algorithmName.trim()) {
      setError('Please provide an Algorithm Name.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await api.addManualAlgorithm({
        algorithmName,
        algorithmFamily,
        keySize,
        purpose,
        dataSensitivity,
        expectedShelfLife: Number(expectedShelfLife),
        migrationTime: Number(migrationTime),
        internetExposure: internetExposure === 'Yes',
      });

      // Persist to user's private Firestore collection
      if (user) {
        await userAlgorithmService.saveAlgorithm(user.uid, res.finding, {
          algorithmName,
          algorithmFamily,
          keySize,
          purpose,
          dataSensitivity,
          expectedShelfLife: Number(expectedShelfLife),
          migrationTime: Number(migrationTime),
          internetExposure: internetExposure === 'Yes',
        });
      }

      // Update in-memory app context
      const updatedFindings = [...findings, res.finding];
      applyUpdatedScanResult({
        repoName: repoName || 'Enterprise Cryptographic Inventory',
        uploadedAt: new Date().toISOString(),
        fileCount: Math.max(1, stats?.totalFiles || 1),
        findings: updatedFindings,
        stats: res.stats,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register algorithm into inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Register Cryptographic Algorithm
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manually record and assess cryptographic assets through the deterministic risk engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Templates */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Quick Fill From Enterprise Templates
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ALGORITHM_TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => handleSelectTemplate(t)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                  algorithmName === t.name
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Algorithm Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Algorithm Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={algorithmName}
              onChange={(e) => setAlgorithmName(e.target.value)}
              placeholder="e.g. RSA-2048, ECC P-256, AES-256-GCM"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Algorithm Family */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Algorithm Family
            </label>
            <select
              value={algorithmFamily}
              onChange={(e) => setAlgorithmFamily(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ASYMMETRIC_KEY_EXCHANGE">Asymmetric Key Exchange (KEM / DH)</option>
              <option value="DIGITAL_SIGNATURES">Digital Signatures (PKI / Verification)</option>
              <option value="SYMMETRIC_ENCRYPTION">Symmetric Encryption (Block Cipher)</option>
              <option value="AEAD">Authenticated Encryption (AEAD / GCM)</option>
              <option value="HASH_FUNCTIONS">Cryptographic Hash Functions</option>
              <option value="PASSWORD_HASHING_KDF">Password Hashing & Key Derivation</option>
              <option value="PQC_KEM">Post-Quantum KEM (FIPS 203)</option>
              <option value="PQC_SIGNATURE">Post-Quantum Signatures (FIPS 204/205)</option>
            </select>
          </div>

          {/* Key Size */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Key Size (bits)
            </label>
            <input
              type="text"
              value={keySize}
              onChange={(e) => setKeySize(e.target.value)}
              placeholder="e.g. 2048, 256, 128"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Data Sensitivity */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data Sensitivity
            </label>
            <select
              value={dataSensitivity}
              onChange={(e) => setDataSensitivity(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="CRITICAL">Critical (PII, Financial, Passwords, Master Secrets)</option>
              <option value="HIGH">High (Internal Business Data, Confidential Logs)</option>
              <option value="MEDIUM">Medium (Standard Application Data)</option>
              <option value="LOW">Low (Public or Transient Session Artifacts)</option>
            </select>
          </div>

          {/* Expected Shelf Life */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Expected Shelf-Life / Data Retention (X years)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={expectedShelfLife}
              onChange={(e) => setExpectedShelfLife(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Migration Time */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estimated Migration Time (Y years)
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={migrationTime}
              onChange={(e) => setMigrationTime(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Internet Exposure */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Internet Exposure
            </label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="internetExposure"
                  checked={internetExposure === 'Yes'}
                  onChange={() => setInternetExposure('Yes')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Yes (Public Facing Endpoint / SNDL Harvest Target)
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="internetExposure"
                  checked={internetExposure === 'No'}
                  onChange={() => setInternetExposure('No')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                No (Internal / Air-gapped)
              </label>
            </div>
          </div>

          {/* Purpose */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Usage / Purpose
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Session Key Exchange for Microservice Mesh, TLS 1.2 Handshake"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Live Evaluation Preview */}
        {evaluationResult && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Risk Assessment Engine Output
              </span>
              <div className="flex items-center gap-2">
                <RiskBadge level={evaluationResult.riskLevel as any} score={evaluationResult.riskScore} />
                <PriorityBadge priority={evaluationResult.priority as any} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Risk Score:</span>{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm">
                  {evaluationResult.riskScore} / 100
                </strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Risk Category:</span>{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {evaluationResult.riskCategory}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 font-medium">Recommended Target:</span>{' '}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {evaluationResult.recommendedTarget}
                </span>
              </div>
            </div>

            {/* Why is this risk level? */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-500" />
                Why is this risk level?
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {evaluationResult.whyRiskLevel?.algorithmDetected}{' '}
                {evaluationResult.whyRiskLevel?.threatHorizon}{' '}
                {evaluationResult.priorityReason}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={isEvaluating || !algorithmName.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isEvaluating ? 'Evaluating Engine...' : 'Calculate Risk (Preview)'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddToInventory}
              disabled={isSubmitting || !algorithmName.trim()}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Registering...' : 'Add to Inventory'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
