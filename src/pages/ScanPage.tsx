import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  UploadCloud,
  FileArchive,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { BusinessCriticality, RiskWeights } from '../types';

export const ScanPage: React.FC = () => {
  const {
    scanned,
    repoName,
    fileCount,
    findings,
    stats,
    applyUpdatedScanResult,
    setActivePage,
    settings,
  } = useApp();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const SCAN_STAGES = [
    'Uploading',
    'Extracting',
    'Scanning',
    'Classifying',
    'Context Analysis',
    'Risk Analysis',
    'Recommendation Analysis',
    'CBOM Generation',
    'Complete',
  ];

  // Scan configuration state
  const [weights, setWeights] = useState<RiskWeights>(settings.weights);
  const [businessCriticality, setBusinessCriticality] = useState<BusinessCriticality>(
    settings.defaultBusinessCriticality
  );
  const [dataLifetime, setDataLifetime] = useState<number>(settings.defaultDataLifetime);
  const [migrationTime, setMigrationTime] = useState<number>(settings.defaultMigrationTime);
  const [threatHorizon, setThreatHorizon] = useState<number>(settings.threatHorizon);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(settings.confidenceThreshold);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Please select a valid .ZIP repository archive.');
      return;
    }

    const maxBytes = settings.maxUploadSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(
        `File exceeds maximum upload size of ${settings.maxUploadSizeMb}MB. Please configure higher limit in Settings or compress sub-directories.`
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const startScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setErrorMessage(null);
    setScanStepIndex(0);
    setScanProgress(10);
    setScanStep('Uploading repository archive to backend API...');

    // Progress sequencing through the 9 stages
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => {
      setScanStepIndex(1);
      setScanProgress(25);
      setScanStep('Extracting safely: verifying path traversal & zip bomb constraints...');
    }, 250));

    timers.push(setTimeout(() => {
      setScanStepIndex(2);
      setScanProgress(40);
      setScanStep('Scanning source files and configuration manifests...');
    }, 550));

    timers.push(setTimeout(() => {
      setScanStepIndex(3);
      setScanProgress(55);
      setScanStep('Classifying cryptographic primitives against 90 reference definitions...');
    }, 850));

    timers.push(setTimeout(() => {
      setScanStepIndex(4);
      setScanProgress(70);
      setScanStep('Context Analysis: isolating active invocations vs. symbol references...');
    }, 1150));

    timers.push(setTimeout(() => {
      setScanStepIndex(5);
      setScanProgress(80);
      setScanStep('Risk Analysis: calculating 5-factor risk scores and Mosca horizons...');
    }, 1450));

    timers.push(setTimeout(() => {
      setScanStepIndex(6);
      setScanProgress(90);
      setScanStep('Recommendation Analysis: generating NIST PQC and hybrid migration paths...');
    }, 1750));

    timers.push(setTimeout(() => {
      setScanStepIndex(7);
      setScanProgress(95);
      setScanStep('CBOM Generation: building CycloneDX 1.6 Cryptographic Bill of Materials...');
    }, 2050));

    try {
      const result = await api.uploadZip(selectedFile, {
        weights,
        defaultBusinessCriticality: businessCriticality,
        defaultDataLifetime: dataLifetime,
        defaultMigrationTime: migrationTime,
        threatHorizon,
        confidenceThreshold,
      });

      timers.forEach(clearTimeout);
      setScanStepIndex(8);
      setScanProgress(100);
      setScanStep('Complete: Repository scan finished successfully!');

      setTimeout(() => {
        setIsScanning(false);
        applyUpdatedScanResult(result);
      }, 600);
    } catch (err: any) {
      timers.forEach(clearTimeout);
      setIsScanning(false);
      setErrorMessage(err.message || 'Scan failed. Please verify the ZIP format.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
          Scan Repository Archive
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload an enterprise source code repository (ZIP) to discover cryptographic assets, detect quantum vulnerabilities, and produce a CycloneDX CBOM.
        </p>
      </div>

      {/* Active Scan Notice */}
      {scanned && !isScanning && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Active Repository: {repoName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {fileCount} files analyzed • {findings.length} findings identified
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePage('dashboard')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.005]'
            : selectedFile
            ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/20'
            : 'border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4">
          <UploadCloud className="w-8 h-8" />
        </div>

        {selectedFile ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
              <FileArchive className="w-4 h-4" />
              <span>{selectedFile.name}</span>
              <span className="opacity-80">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ready to scan. Click below to initiate discovery analysis, or select a different archive.
            </p>
          </div>
        ) : (
          <div>
            <div className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Drag &amp; drop repository .ZIP here, or click to browse
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Supports codebases in Python, JavaScript/TypeScript, Java, Go, C/C++, Rust, C#, PHP, Ruby, and configuration files. Maximum size: {settings.maxUploadSizeMb} MB.
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar & Pipeline Stepper (during scan) */}
      {isScanning && (
        <div className="p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/10 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              {scanStep}
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              {scanProgress}%
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${scanProgress}%` }}
            />
          </div>

          {/* 9-Stage Pipeline Status Stepper */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 pt-1">
            {SCAN_STAGES.map((stage, idx) => {
              const isDone = idx < scanStepIndex;
              const isCurrent = idx === scanStepIndex;
              return (
                <div
                  key={stage}
                  className={`p-1.5 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold scale-[1.02]'
                      : isDone
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/40 text-slate-400'
                  }`}
                >
                  <div className="text-[10px] truncate leading-tight">{stage}</div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Applying path traversal sanitization, zip bomb verification, and deterministic pattern matching across the 90-entry cryptographic catalog.
          </div>
        </div>
      )}

      {/* Advanced Scan Settings Toggle */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            <span>Scan &amp; Risk Engine Parameters</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (Business criticality, Mosca timeline, weights)
            </span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Business Criticality
                </label>
                <select
                  value={businessCriticality}
                  onChange={(e) => setBusinessCriticality(e.target.value as BusinessCriticality)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="CRITICAL">Critical (100 pts)</option>
                  <option value="HIGH">High (75 pts)</option>
                  <option value="MEDIUM">Medium (50 pts)</option>
                  <option value="LOW">Low (25 pts)</option>
                </select>
                <span className="text-[10px] text-slate-400">
                  Base criticality assigned to detected files
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Shelf-Life (X in yrs)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={dataLifetime}
                  onChange={(e) => setDataLifetime(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  Mosca variable X: duration data must stay secret
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Migration Duration (Y in yrs)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={migrationTime}
                  onChange={(e) => setMigrationTime(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  Mosca variable Y: years required to migrate
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Planning Horizon (Z in yrs)
                </label>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={threatHorizon}
                  onChange={(e) => setThreatHorizon(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  Mosca variable Z: target post-quantum horizon
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Confidence Threshold: {confidenceThreshold}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {confidenceThreshold >= 50 ? 'Strict (Omit comment mentions)' : 'Permissive (Include comments)'}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={startScan}
          disabled={!selectedFile || isScanning}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all shadow-sm cursor-pointer ${
            !selectedFile || isScanning
              ? 'bg-slate-400 dark:bg-slate-800 text-slate-300 cursor-not-allowed opacity-60'
              : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20 active:scale-[0.99]'
          }`}
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Scanning Repository...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              Run Cryptographic Discovery Scan
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
