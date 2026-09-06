import React from 'react';
import { ShieldAlert, UploadCloud, ArrowRight, BookOpen, Layers, Terminal } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onNavigateScan?: () => void;
  onNavigateKnowledgeBase?: () => void;
  viewContext?: 'dashboard' | 'findings' | 'developer' | 'cbom' | 'simulator' | 'quantum';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Repository Scanned Yet',
  description = 'Upload a ZIP archive containing source code or configuration files to discover cryptographic assets, assess quantum risk, and generate your Cryptographic Bill of Materials (CBOM).',
  onNavigateScan,
  onNavigateKnowledgeBase,
  viewContext = 'dashboard',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-14 text-center max-w-2xl mx-auto my-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
        {title}
      </h2>

      <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-6 max-w-xl">
        {description}
      </p>

      {/* Highlights what the real scan engine analyzes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left mb-8">
        <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1">
            <Layers className="w-4 h-4 text-indigo-500" />
            90-Entry Catalog
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Discovers RSA, ECC, AES, SHA, post-quantum candidates, and blind spots across 18+ languages.
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1">
            <Terminal className="w-4 h-4 text-sky-500" />
            Zero Demo Data
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Only genuine findings extracted from your uploaded files are presented. No synthetic mocks.
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            CycloneDX 1.6 CBOM
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export standardized cryptographic asset inventories and post-quantum migration roadmaps.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onNavigateScan && (
          <button
            onClick={onNavigateScan}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Upload &amp; Scan Repository
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {onNavigateKnowledgeBase && (
          <button
            onClick={onNavigateKnowledgeBase}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            Browse Knowledge Base
          </button>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 text-[12px] text-slate-400 dark:text-slate-500">
        Note: You can explore the 90 reference algorithm definitions anytime in the Knowledge Base tab.
      </div>
    </div>
  );
};
