import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { AuthPage } from './pages/AuthPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ScanPage } from './pages/ScanPage';
import { HistoryPage } from './pages/HistoryPage';
import { FindingsPage } from './pages/FindingsPage';
import { RoadmapMatrixPage } from './pages/RoadmapMatrixPage';
import { DeveloperViewPage } from './pages/DeveloperViewPage';
import { QuantumRiskPage } from './pages/QuantumRiskPage';
import { CbomPage } from './pages/CbomPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { MigrationSimulatorPage } from './pages/MigrationSimulatorPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { SettingsPage } from './pages/SettingsPage';
import { ShieldCheck } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { activePage } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <p className="text-sm font-medium text-slate-400">Initializing Cryptographic Workspace...</p>
      </div>
    );
  }

  // Strict route protection: If user is not authenticated, redirect to Login
  if (!user) {
    return <AuthPage />;
  }

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'scan':
        return <ScanPage />;
      case 'history':
        return <HistoryPage />;
      case 'findings':
        return <FindingsPage />;
      case 'matrix':
        return <RoadmapMatrixPage />;
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
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
