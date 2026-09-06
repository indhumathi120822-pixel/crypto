import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { FileTreeNode, Finding } from '../types';
import { EmptyState } from '../components/common/EmptyState';
import { FindingDetailModal } from '../components/findings/FindingDetailModal';
import {
  Folder,
  FolderOpen,
  FileCode,
  Save,
  RotateCcw,
  Download,
  FileArchive,
  Search,
  AlertTriangle,
  Check,
  RefreshCw,
  Info,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { RiskBadge, QuantumBadge } from '../components/common/Badge';

export const DeveloperViewPage: React.FC = () => {
  const {
    scanned,
    fileTree,
    findings,
    repoName,
    selectedFilePath,
    setSelectedFilePath,
    selectedLineNumber,
    setSelectedLineNumber,
    setActivePage,
    refreshStatus,
  } = useApp();

  const [activeFile, setActiveFile] = useState<string | null>(selectedFilePath);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isModified, setIsModified] = useState<boolean>(false);
  const [fileFindings, setFileFindings] = useState<Finding[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [treeSearch, setTreeSearch] = useState<string>('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Finding modal inspector
  const [inspectingFinding, setInspectingFinding] = useState<Finding | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Auto-select first file if none selected
  useEffect(() => {
    if (!activeFile && fileTree.length > 0) {
      const first = findFirstFile(fileTree);
      if (first) {
        setActiveFile(first.path);
        setSelectedFilePath(first.path);
      }
    }
  }, [fileTree, activeFile]);

  // Keep in sync with selectedFilePath from context
  useEffect(() => {
    if (selectedFilePath && selectedFilePath !== activeFile) {
      setActiveFile(selectedFilePath);
    }
  }, [selectedFilePath]);

  // Expand parent directories of active file
  useEffect(() => {
    if (activeFile) {
      const parts = activeFile.split('/');
      let cur = '';
      const newExpanded = new Set(expandedDirs);
      for (let i = 0; i < parts.length - 1; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        newExpanded.add(cur);
      }
      setExpandedDirs(newExpanded);
    }
  }, [activeFile]);

  // Load file content when activeFile changes
  useEffect(() => {
    if (!activeFile || !scanned) return;

    let isMounted = true;
    setIsLoadingFile(true);
    setSaveSuccess(false);

    api
      .getFile(activeFile)
      .then((data) => {
        if (!isMounted) return;
        setContent(data.content);
        setOriginalContent(data.content);
        setIsModified(data.isModified);
        setFileFindings(data.findings);
      })
      .catch((err) => {
        console.error('Failed to load file:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeFile, scanned]);

  // Scroll to targeted line when loaded
  useEffect(() => {
    if (selectedLineNumber && editorRef.current) {
      const lines = content.split('\n');
      const targetCharPos = lines.slice(0, selectedLineNumber - 1).join('\n').length;
      editorRef.current.scrollTop = (selectedLineNumber - 3) * 20;
    }
  }, [selectedLineNumber, content]);

  if (!scanned) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Repository Loaded"
          description="Upload a ZIP archive to browse repository files, inspect detected cryptographic code, and test remediation edits."
          onNavigateScan={() => setActivePage('scan')}
          onNavigateKnowledgeBase={() => setActivePage('knowledge-base')}
          viewContext="developer"
        />
      </div>
    );
  }

  const findFirstFile = (nodes: FileTreeNode[]): FileTreeNode | null => {
    for (const node of nodes) {
      if (node.type === 'file') return node;
      if (node.children) {
        const f = findFirstFile(node.children);
        if (f) return f;
      }
    }
    return null;
  };

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      const res = await api.saveFile(activeFile, content);
      setIsModified(res.isModified);
      setFileFindings(res.findings);
      setSaveSuccess(true);
      await refreshStatus();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      const res = await api.resetFile(activeFile);
      setContent(res.content);
      setIsModified(false);
      setFileFindings(res.findings);
      await refreshStatus();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const lines = content.split('\n');
  const lineFindingMap = new Map<number, Finding>();
  for (const f of fileFindings) {
    lineFindingMap.set(f.line, f);
  }

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: FileTreeNode, depth = 0) => {
    const isDir = node.type === 'directory';
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = activeFile === node.path;

    if (treeSearch.trim()) {
      const match = node.path.toLowerCase().includes(treeSearch.toLowerCase());
      if (!match && !isDir) return null;
    }

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => {
            if (isDir) toggleDir(node.path);
            else {
              setActiveFile(node.path);
              setSelectedFilePath(node.path);
              setSelectedLineNumber(null);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded-md text-xs cursor-pointer transition-colors ${
            isSelected
              ? 'bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300 font-semibold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isDir ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
                )}
              </>
            ) : (
              <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {(node.findingCount ?? 0) > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
              {node.findingCount}
            </span>
          )}
        </div>

        {isDir && isExpanded && node.children && (
          <div>{node.children.map((child) => renderTreeNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="py-4 space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Repository Code Editor</span>
            {isModified && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                Modified
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active file: <strong className="font-mono text-slate-700 dark:text-slate-300">{activeFile || 'None'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isModified && (
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Original
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !isModified}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors shadow-xs cursor-pointer ${
              !isModified
                ? 'bg-slate-400 dark:bg-slate-800 text-slate-300 cursor-not-allowed opacity-60'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saveSuccess ? 'Saved & Re-scanned!' : 'Save & Re-scan'}
          </button>

          {activeFile && (
            <a
              href={api.getDownloadFileUrl(activeFile)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Download this file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download File</span>
            </a>
          )}

          <a
            href={api.getDownloadZipUrl()}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
            title="Download full updated repository with your edits"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Download Updated ZIP</span>
          </a>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[750px]">
        {/* Left Panel: File Tree Explorer */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Repository Files</span>
              <span className="font-mono text-slate-400 text-[11px]">{findings.length} findings total</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter files..."
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {fileTree.map((node) => renderTreeNode(node))}
          </div>
        </div>

        {/* Right Panel: Code Editor */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 flex flex-col overflow-hidden shadow-xs">
          {/* File Tab / Path Bar */}
          <div className="h-10 px-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 truncate text-slate-300">
              <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">{activeFile || 'No file selected'}</span>
            </div>

            {fileFindings.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-rose-400 flex items-center gap-1 text-[11px] font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {fileFindings.length} crypto finding{fileFindings.length > 1 ? 's' : ''} in this file
                </span>
              </div>
            )}
          </div>

          {/* Finding Quick Chips Bar (if file has findings) */}
          {fileFindings.length > 0 && (
            <div className="p-2 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-sans shrink-0">Jump to line:</span>
              {fileFindings.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedLineNumber(f.line);
                    setInspectingFinding(f);
                  }}
                  className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 font-mono transition-colors shrink-0 cursor-pointer"
                >
                  Line {f.line}: {f.algorithmName} ({f.priority})
                </button>
              ))}
            </div>
          )}

          {/* Code Viewer & Interactive Editor */}
          {isLoadingFile ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              Loading file contents...
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden font-mono text-xs">
              {/* Line Numbers with Finding Indicators */}
              <div className="w-14 bg-slate-900/60 select-none py-3 border-r border-slate-800 text-right pr-2 space-y-1 text-slate-500">
                {lines.map((_, i) => {
                  const lineNum = i + 1;
                  const f = lineFindingMap.get(lineNum);
                  const isTarget = selectedLineNumber === lineNum;

                  return (
                    <div
                      key={lineNum}
                      onClick={() => {
                        if (f) setInspectingFinding(f);
                      }}
                      className={`h-5 leading-5 flex items-center justify-end gap-1 cursor-pointer ${
                        f ? 'text-rose-400 font-bold' : isTarget ? 'text-amber-300' : 'hover:text-slate-300'
                      }`}
                      title={f ? `${f.algorithmName} (${f.priority})` : undefined}
                    >
                      {f && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                      <span>{lineNum}</span>
                    </div>
                  );
                })}
              </div>

              {/* Editable Text Area */}
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setIsModified(true);
                }}
                spellCheck={false}
                className="flex-1 p-3 bg-transparent text-slate-200 resize-none focus:outline-none leading-5 font-mono overflow-y-auto whitespace-pre selection:bg-indigo-500/30"
              />
            </div>
          )}
        </div>
      </div>

      {/* Inspecting Finding Slide-over Modal */}
      {inspectingFinding && (
        <FindingDetailModal
          finding={inspectingFinding}
          onClose={() => setInspectingFinding(null)}
        />
      )}
    </div>
  );
};
