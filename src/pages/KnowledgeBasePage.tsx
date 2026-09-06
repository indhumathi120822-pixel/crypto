import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CryptoAlgorithmDef, QuantumStatus } from '../types';
import { QuantumBadge, ClassicalSecurityBadge } from '../components/common/Badge';
import {
  BookOpen,
  Search,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const KnowledgeBasePage: React.FC = () => {
  const [algorithms, setAlgorithms] = useState<CryptoAlgorithmDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedQuantum, setSelectedQuantum] = useState<string>('ALL');
  const [selectedAlgo, setSelectedAlgo] = useState<CryptoAlgorithmDef | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getKnowledgeBase()
      .then((data) => {
        if (mounted) {
          const list = data.algorithms || [];
          setAlgorithms(list);
          if (list.length > 0) setSelectedAlgo(list[0]);
        }
      })
      .catch((err) => console.error('Failed to load KB:', err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const categories = ['ALL', ...Array.from(new Set(algorithms.map((a) => a.category)))];

  const filtered = algorithms.filter((algo) => {
    if (selectedCategory !== 'ALL' && algo.category !== selectedCategory) return false;
    if (selectedQuantum !== 'ALL' && algo.quantum_status !== selectedQuantum) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        algo.name.toLowerCase().includes(q) ||
        algo.id.toLowerCase().includes(q) ||
        algo.notes.toLowerCase().includes(q) ||
        algo.recommended_replacement.some((r) => r.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="py-4 space-y-6">
      {/* Header */}
      <div className="p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                Cryptographic Reference Encyclopedia
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Cryptographic Standards &amp; PQC Catalog
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Curated encyclopedia of 90 cryptographic primitives, classical key lengths, quantum attack mechanisms (Shor/Grover), and NIST Post-Quantum Cryptography (FIPS 203, 204, 205) migration replacements.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono font-bold text-2xl text-slate-900 dark:text-slate-100">
              {algorithms.length}
            </span>
            <span className="text-xs text-slate-400 block">Standards Indexed</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search algorithm, primitive, PQC replacement, standard..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            <select
              value={selectedQuantum}
              onChange={(e) => setSelectedQuantum(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Quantum Statuses</option>
              <option value="VULNERABLE_SHOR">Shor Vulnerable</option>
              <option value="PARTIALLY_VULNERABLE_GROVER">Grover Halved</option>
              <option value="QUANTUM_RESISTANT">Quantum Resistant</option>
              <option value="QUANTUM_SAFE">Post-Quantum Safe (FIPS)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Two Column Layout: List and Detail */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          Loading cryptographic catalog...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Filtered List */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filtered.map((algo) => {
              const isSelected = selectedAlgo?.id === algo.id;
              return (
                <div
                  key={algo.id}
                  onClick={() => setSelectedAlgo(algo)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-indigo-500/80 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {algo.name}
                    </span>
                    <QuantumBadge status={algo.quantum_status} size="sm" />
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {algo.notes}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                    <span className="text-slate-400 font-mono">{algo.category}</span>
                    <ClassicalSecurityBadge security={algo.classical_security} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Detail Card */}
          <div className="lg:col-span-7">
            {selectedAlgo ? (
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 sticky top-20 shadow-xs">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                      {selectedAlgo.category}
                    </span>
                    <QuantumBadge status={selectedAlgo.quantum_status} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedAlgo.name}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                    {selectedAlgo.notes}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Classical Security</span>
                    <div className="mt-1">
                      <ClassicalSecurityBadge security={selectedAlgo.classical_security} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Standard Key Sizes</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-1 block">
                      {selectedAlgo.key_sizes.length > 0 ? selectedAlgo.key_sizes.join(', ') : 'Variable'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primitive Type</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 mt-1 block">
                      {selectedAlgo.type}
                    </span>
                  </div>
                </div>

                {/* NIST Post-Quantum Replacement */}
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      Recommended Post-Quantum Alternative
                    </span>
                  </div>
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {selectedAlgo.recommended_replacement.join(' / ') || 'None needed (Quantum Safe)'}
                  </div>
                </div>

                {/* Aliases & Pattern identifiers */}
                {selectedAlgo.aliases && selectedAlgo.aliases.length > 0 && (
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block mb-2">
                      Detection Keywords &amp; Known Identifiers
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedAlgo.aliases.map((alias, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
                        >
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl">
                Select an algorithm from the catalog to inspect specifications.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
