import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ScanPage } from './pages/ScanPage';
import { FindingsPage } from './pages/FindingsPage';
import { DeveloperViewPage } from './pages/DeveloperViewPage';
import { QuantumRiskPage } from './pages/QuantumRiskPage';
import { CbomPage } from './pages/CbomPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { MigrationSimulatorPage } from './pages/MigrationSimulatorPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { activePage } = useApp();

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'scan':
        return <ScanPage />;
      case 'findings':
        return <FindingsPage />;
      case 'developer':
        return <DeveloperViewPage />;
      case 'quantum':
        return <QuantumRiskPage />;
      case 'cbom':
        return <CbomPage />;
      case 'recommendations':
        return <RecommendationsPage />;
      case 'simulator':
        return <MigrationSimulatorPage />;
      case 'knowledge-base':
        return <KnowledgeBasePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <Sidebar />

        {/* Dynamic Page Container */}
        <main className="flex-1 px-4 md:px-8 pb-12 overflow-x-hidden min-w-0">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
