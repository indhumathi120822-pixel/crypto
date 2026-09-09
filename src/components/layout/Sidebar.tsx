import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  History,
  FileSearch,
  Layers,
  Code2,
  FileSpreadsheet,
  Atom,
  GitPullRequestDraft,
  FlaskConical,
  BookOpen,
  Settings as SettingsIcon,
  ShieldAlert,
} from 'lucide-react';
import { useApp, PageId } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, scanned, findings, stats } = useApp();

  const navItems: {
    id: PageId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'scan',
      label: 'Scan Repository',
      icon: UploadCloud,
      badge: scanned ? 'Active' : undefined,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'history',
      label: 'Scan History & Compare',
      icon: History,
      badge: 'Audit',
      badgeColor: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    },
    {
      id: 'findings',
      label: 'Findings Explorer',
      icon: FileSearch,
      badge: scanned ? findings.length : undefined,
      badgeColor: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    },
    {
      id: 'matrix',
      label: 'Vision 1 vs 2 (PQC Matrix)',
      icon: Layers,
      badge: scanned ? 'PQC' : undefined,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'developer',
      label: 'Code Editor',
      icon: Code2,
    },
    {
      id: 'cbom',
      label: 'CBOM Inventory',
      icon: FileSpreadsheet,
      badge: scanned ? 'CycloneDX' : undefined,
      badgeColor: 'bg-slate-800 text-slate-300 border border-slate-700',
    },
    {
      id: 'quantum',
      label: 'Quantum Risk & Mosca',
      icon: Atom,
      badge: stats?.criticalRisks ? `${stats.criticalRisks} Crit` : undefined,
      badgeColor: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    },
    {
      id: 'recommendations',
      label: 'Remediation Roadmap',
      icon: GitPullRequestDraft,
    },
    {
      id: 'simulator',
      label: 'Migration Simulator',
      icon: FlaskConical,
    },
    {
      id: 'knowledge-base',
      label: 'Knowledge Base (90)',
      icon: BookOpen,
      badge: 'Ref',
      badgeColor: 'bg-slate-800 text-slate-400 border border-slate-700',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050812]/90 p-3 flex flex-col justify-between shrink-0 select-none">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 border border-transparent dark:border-indigo-500/30 shadow-xs'
                  : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                    item.badgeColor || 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Post-Quantum Status Banner in bottom of Sidebar */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
        {scanned && stats ? (
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Quantum Exposure</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {stats.overallQuantumPosture === 'HIGH_EXPOSURE'
                  ? 'High'
                  : stats.overallQuantumPosture === 'MODERATE_EXPOSURE'
                  ? 'Moderate'
                  : 'Low'}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  stats.overallQuantumPosture === 'HIGH_EXPOSURE'
                    ? 'bg-rose-500 w-4/5'
                    : stats.overallQuantumPosture === 'MODERATE_EXPOSURE'
                    ? 'bg-amber-500 w-1/2'
                    : 'bg-emerald-500 w-1/4'
                }`}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Avg Risk:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {stats.averageRiskScore}/100
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              Empty Catalog State
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              No active scan. Ready for user ZIP archive.
            </p>
          </div>
        )}

        <div className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-600">
          CRYPTOVISTA v1.0 • NIST FIPS 203/204/205
        </div>
      </div>
    </aside>
  );
};
