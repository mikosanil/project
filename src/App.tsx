import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { AdminPanel } from './components/AdminPanel';
import { AssemblyTrackingPage } from './components/AssemblyTrackingPage';
import type { Database } from './lib/supabase';

type Project = Database['public']['Tables']['projects']['Row'];

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'projects' | 'project-detail' | 'admin' | 'assembly-tracking'>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const handleProjectSelect = (project: Project) => {
    setSelectedProjectId(project.id);
    setCurrentView('project-detail');
  };

  const handleBackToProjects = () => {
    setCurrentView('projects');
    setSelectedProjectId(null);
  };

  const handleAdminPanel = () => {
    setCurrentView('admin');
  };

  const handleAssemblyTracking = () => {
    setCurrentView('assembly-tracking');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'project-detail':
        return selectedProjectId ? (
          <ProjectDetail 
            projectId={selectedProjectId} 
            onBack={handleBackToProjects}
          />
        ) : (
          <ProjectList onProjectSelect={handleProjectSelect} onAdminPanel={handleAdminPanel} />
        );
      case 'admin':
        return <AdminPanel onBack={handleBackToProjects} />;
      case 'assembly-tracking':
        return <AssemblyTrackingPage onBack={handleBackToProjects} />;
      default:
        return <ProjectList onProjectSelect={handleProjectSelect} onAdminPanel={handleAdminPanel} />;
    }
  };

  return (
    <Layout onAdminPanel={handleAdminPanel} onAssemblyTracking={handleAssemblyTracking} onHome={handleBackToProjects}>
      {renderContent()}
    </Layout>
  );
}

export default App;