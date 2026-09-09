import React from 'react';
import { ShieldCheck, Moon, Sun, Laptop, Trash2, UploadCloud, Eye, Terminal, LogOut, User as UserIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    scanned,
    repoName,
    fileCount,
    findings,
    viewMode,
    setViewMode,
    setActivePage,
    clearScan,
    settings,
    updateSettings,
  } = useApp();

  const toggleTheme = () => {
    if (settings.theme === 'dark') updateSettings({ theme: 'light' });
    else updateSettings({ theme: 'dark' });
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070b14] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActivePage('dashboard')}
          className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 dark:group-hover:bg-indigo-600 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-wider text-slate-900 dark:text-slate-100">
                CRYPTOVISTA
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                Enterprise PQC
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Discover. Assess. Prioritize. Prepare.
            </p>
          </div>
        </button>
      </div>

      {/* Center: CISO View vs Developer View Switch */}
      <div className="hidden md:flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => {
            setViewMode('ciso');
            setActivePage('dashboard');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'ciso'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/50 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          CISO Executive View
        </button>

        <button
          onClick={() => {
            setViewMode('developer');
            setActivePage('dashboard');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'developer'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs border border-slate-200/50 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Developer Findings View
        </button>
      </div>

      {/* Right Controls: Repo Status & Quick Actions */}
      <div className="flex items-center gap-2.5">
        {scanned ? (
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
                {repoName}
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-slate-600 dark:text-slate-400">{fileCount} files</span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {findings.length} findings
              </span>
            </div>

            <button
              onClick={() => setActivePage('scan')}
              title="Upload new repository archive"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Scan</span>
            </button>

            <button
              onClick={clearScan}
              title="Clear scan session and reset"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActivePage('scan')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Scan Repository</span>
          </button>
        )}

        {/* Theme Toggle: Sun = Light Mode, Moon = Dark Mode */}
        <div
          id="theme-toggle-control"
          className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0a0f1d] transition-colors"
          role="group"
          aria-label="Theme switcher"
        >
          <button
            id="theme-btn-light"
            onClick={() => updateSettings({ theme: 'light' })}
            title="Light Mode (Sun)"
            aria-label="Switch to Light Mode"
            className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
              settings.theme === 'light'
                ? 'bg-white text-amber-500 shadow-xs border border-slate-200/80 font-bold'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            id="theme-btn-dark"
            onClick={() => updateSettings({ theme: 'dark' })}
            title="Dark Mode (Moon)"
            aria-label="Switch to Dark Mode"
            className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
              settings.theme === 'dark'
                ? 'bg-slate-800 text-indigo-400 shadow-xs border border-slate-700 font-bold'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile & Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                {user.displayName || user.email?.split('@')[0] || 'Security Officer'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                {user.email}
              </span>
            </div>
            <button
              id="btn-navbar-logout"
              onClick={logout}
              title="Sign Out of Workspace"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
