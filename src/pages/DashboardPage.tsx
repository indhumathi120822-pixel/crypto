import React from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/common/EmptyState';
import { CisoDashboard } from '../components/dashboard/CisoDashboard';
import { DeveloperDashboard } from '../components/dashboard/DeveloperDashboard';

export const DashboardPage: React.FC = () => {
  const { scanned, viewMode, setActivePage } = useApp();

  if (!scanned) {
    return (
      <div className="py-6">
        <EmptyState
          title="No Repository Scanned Yet"
          description="Upload a ZIP archive containing source code or configuration files to discover cryptographic assets, assess quantum risk, and generate your Cryptographic Bill of Materials (CBOM)."
          onNavigateScan={() => setActivePage('scan')}
          onNavigateKnowledgeBase={() => setActivePage('knowledge-base')}
          viewContext="dashboard"
        />
      </div>
    );
  }

  return (
    <div className="py-4">
      {viewMode === 'ciso' ? <CisoDashboard /> : <DeveloperDashboard />}
    </div>
  );
};
