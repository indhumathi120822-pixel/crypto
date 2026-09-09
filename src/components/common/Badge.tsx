import React from 'react';
import {
  RiskLevel,
  QuantumStatus,
  PriorityLevel,
  DetectionType,
  ClassicalSecurity,
  AlgorithmStatus,
} from '../../types';

interface BadgeProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<{ level: RiskLevel; score?: number; size?: 'sm' | 'md' | 'lg' }> = ({
  level,
  score,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  let colorClasses = '';
  switch (level) {
    case 'CRITICAL':
      // Deep red / burgundy enterprise tone
      colorClasses = 'bg-rose-950/40 text-rose-300 border border-rose-800/60 dark:bg-[#380e14] dark:text-rose-200 dark:border-rose-900/80';
      break;
    case 'HIGH':
      // Professional amber / orange
      colorClasses = 'bg-amber-950/40 text-amber-300 border border-amber-700/60 dark:bg-[#38220c] dark:text-amber-200 dark:border-amber-800/80';
      break;
    case 'MEDIUM':
      // Yellow / gold
      colorClasses = 'bg-yellow-950/35 text-yellow-300 border border-yellow-700/60 dark:bg-[#38310c] dark:text-yellow-200 dark:border-yellow-800/80';
      break;
    case 'LOW':
      // Calm green
      colorClasses = 'bg-emerald-950/35 text-emerald-300 border border-emerald-800/60 dark:bg-[#0c311e] dark:text-emerald-200 dark:border-emerald-800/80';
      break;
    case 'MINIMAL':
    default:
      // Neutral slate / low-activity blue
      colorClasses = 'bg-slate-800/40 text-slate-300 border border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800';
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-md whitespace-nowrap shadow-xs ${sizeClasses} ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-90" />
      <span>{level}</span>
      {score !== undefined && <span className="opacity-80 font-mono text-[11px]">({score})</span>}
    </span>
  );
};

export const QuantumBadge: React.FC<{ status: QuantumStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs';

  switch (status) {
    case 'VULNERABLE_SHOR':
      // HIGH Quantum Relevance -> Purple / Magenta accent (visually distinct from risk-level deep red)
      return (
        <span className={`inline-flex items-center font-medium rounded-md whitespace-nowrap bg-purple-950/40 text-purple-200 border border-purple-800/60 dark:bg-[#2b0f38] dark:text-purple-200 dark:border-purple-800/80 shadow-xs ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1.5 opacity-90" />
          Shor Vulnerable (PKI)
        </span>
      );
    case 'PARTIALLY_VULNERABLE_GROVER':
      // MEDIUM Quantum Relevance -> Amber accent
      return (
        <span className={`inline-flex items-center font-medium rounded-md whitespace-nowrap bg-amber-950/40 text-amber-200 border border-amber-800/60 dark:bg-[#331c08] dark:text-amber-200 dark:border-amber-800/80 shadow-xs ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 opacity-90" />
          Grover Halved (&lt;256b)
        </span>
      );
    case 'QUANTUM_RESISTANT':
      // LOW Quantum Relevance -> Professional Teal
      return (
        <span className={`inline-flex items-center font-medium rounded-md whitespace-nowrap bg-teal-950/40 text-teal-200 border border-teal-800/60 dark:bg-[#0c2a26] dark:text-teal-200 dark:border-teal-800/80 shadow-xs ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mr-1.5 opacity-90" />
          Quantum Resistant (256b)
        </span>
      );
    case 'QUANTUM_SAFE':
      // LOW Quantum Relevance -> Post-Quantum Safe Green
      return (
        <span className={`inline-flex items-center font-medium rounded-md whitespace-nowrap bg-emerald-950/40 text-emerald-200 border border-emerald-800/60 dark:bg-[#0a2c1b] dark:text-emerald-200 dark:border-emerald-800/80 shadow-xs ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 opacity-90" />
          Post-Quantum Safe (FIPS)
        </span>
      );
    default:
      return <span className={`inline-flex items-center rounded-md ${sizeClasses}`}>{status}</span>;
  }
};

export const PriorityBadge: React.FC<{ priority: PriorityLevel }> = ({ priority }) => {
  let color = 'bg-teal-950/40 text-teal-200 border-teal-800/60 dark:bg-[#0c2a26] dark:text-teal-200 dark:border-teal-800/80';
  let desc = 'Monitor';
  let dotColor = 'bg-teal-400';

  if (priority === 'P1') {
    // Deep red / burgundy tone
    color = 'bg-rose-950/60 text-rose-200 border-rose-800/70 dark:bg-[#380e14] dark:text-rose-100 dark:border-rose-900/90';
    desc = 'Immediate';
    dotColor = 'bg-rose-400';
  } else if (priority === 'P2') {
    // Professional amber / orange
    color = 'bg-amber-950/50 text-amber-200 border-amber-800/60 dark:bg-[#38220c] dark:text-amber-200 dark:border-amber-800/80';
    desc = 'High';
    dotColor = 'bg-amber-400';
  } else if (priority === 'P3') {
    // Professional blue
    color = 'bg-blue-950/50 text-blue-200 border-blue-800/60 dark:bg-[#0c1e36] dark:text-blue-200 dark:border-blue-800/80';
    desc = 'Planned';
    dotColor = 'bg-blue-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md border whitespace-nowrap shadow-xs ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{priority}</span>
      <span className="text-[10px] opacity-80 uppercase tracking-wider font-normal">({desc})</span>
    </span>
  );
};

export const DetectionBadge: React.FC<{ type: DetectionType; confidence?: number }> = ({
  type,
  confidence,
}) => {
  // Active usage card/badge: Professional cyan/blue or teal accent, distinct from P1/P2
  let text = 'Active Usage';
  let color = 'bg-cyan-950/40 text-cyan-200 border-cyan-800/60 dark:bg-[#0c2933] dark:text-cyan-200 dark:border-cyan-800/80';
  let dotColor = 'bg-cyan-400';

  if (type === 'LIBRARY_USAGE') {
    text = 'Import / Library';
    color = 'bg-slate-800/70 text-slate-300 border-slate-700';
    dotColor = 'bg-slate-400';
  } else if (type === 'CONFIGURATION_USAGE') {
    text = 'Configuration';
    color = 'bg-slate-800/70 text-slate-300 border-slate-700';
    dotColor = 'bg-slate-400';
  } else if (type === 'TEXTUAL_REFERENCE') {
    text = 'Comment / Doc';
    color = 'bg-zinc-800/70 text-zinc-400 border-zinc-700';
    dotColor = 'bg-zinc-500';
  } else if (type === 'UNKNOWN') {
    text = 'Unknown / Blind Spot';
    color = 'bg-stone-800/70 text-stone-300 border-stone-700';
    dotColor = 'bg-stone-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap shadow-xs ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} opacity-80`} />
      <span>{text}</span>
      {confidence !== undefined && (
        <span className="font-mono text-[10px] opacity-75">({confidence}%)</span>
      )}
    </span>
  );
};

export const ClassicalSecurityBadge: React.FC<{ security: ClassicalSecurity }> = ({ security }) => {
  let color = 'bg-slate-800 text-slate-300';
  if (security === 'BROKEN') color = 'bg-rose-950/50 text-rose-400 border-rose-800/40';
  else if (security === 'WEAK') color = 'bg-amber-950/50 text-amber-300 border-amber-800/40';
  else if (security === 'ACCEPTABLE') color = 'bg-sky-950/50 text-sky-300 border-sky-800/40';
  else if (security === 'SECURE') color = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap ${color}`}>
      {security}
    </span>
  );
};
