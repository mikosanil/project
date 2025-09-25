import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Package, BarChart3, Users, Calendar, Settings, TrendingUp } from 'lucide-react'
import { AssemblyList } from './AssemblyList'
import { StagesList } from './StagesList'
import { ProgressTracking } from './ProgressTracking'
import { ProjectDashboard } from './ProjectDashboard'
import { PerformanceAnalysis } from './PerformanceAnalysis'
import { UserPerformanceReport } from './UserPerformanceReport'
import { BulkAssemblyModal } from './BulkAssemblyModal'
import { TaskAssignmentModal } from './TaskAssignmentModal'
import { AddStageModal } from './AddStageModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Database } from '../lib/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectDetailProps {
  projectId: string
  onBack: () => void
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<'stages' | 'progress' | 'dashboard' | 'tasks' | 'performance' | 'user-reports'>('stages')
  const [showBulkAssembly, setShowBulkAssembly] = useState(false)
  const [showTaskAssignment, setShowTaskAssignment] = useState(false)
  const [showAddStage, setShowAddStage] = useState(false)
  const [assemblies, setAssemblies] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const { isAdmin, userProfile } = useAuth()

  useEffect(() => {
    loadProject()
    loadStages()
    loadAssemblies()
  }, [projectId])

  const loadProject = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStages = async () => {
    try {
      const { data, error } = await supabase
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId)
        .order('stage_order')

      if (error) throw error
      setStages(data || [])
    } catch (error) {
      console.error('Error loading stages:', error)
    }
  }

  const loadAssemblies = async () => {
    try {
      const { data, error } = await supabase
        .from('assemblies')
        .select('*')
        .eq('project_id', projectId)
        .order('poz_code')

      if (error) throw error
      setAssemblies(data || [])
    } catch (error) {
      console.error('Error loading assemblies:', error)
    }
  }

  const handleAssembliesAdded = () => {
    setShowBulkAssembly(false)
    loadAssemblies()
  }

  const canEditProject = () => {
    if (!project || !userProfile) return false
    return isAdmin || project.created_by === userProfile.id
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-gray-600 bg-gray-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'on_hold': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return 'Planlama'
      case 'in_progress': return 'Devam Ediyor'
      case 'completed': return 'Tamamlandı'
      case 'on_hold': return 'Beklemede'
      default: return status
    }
  }

  const tabs = [
    { id: 'stages', label: 'Proje Aşamaları', icon: Package },
    { id: 'progress', label: 'İlerleme Takibi', icon: BarChart3 },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'tasks', label: 'Görev Atamaları', icon: Settings },
    ...(isAdmin ? [
      { id: 'performance', label: 'Performans Analizi', icon: TrendingUp },
      { id: 'user-reports', label: 'Kullanıcı Raporları', icon: Users }
    ] : []),
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Proje bulunamadı</p>
        <button
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Geri Dön
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button
            onClick={onBack}
            className="mt-1 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status || 'planning')}`}>
                {getStatusText(project.status || 'planning')}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{project.description}</p>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Başlangıç: {new Date(project.start_date || '').toLocaleDateString('tr-TR')}</span>
              </div>
              {project.target_completion_date && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Hedef: {new Date(project.target_completion_date).toLocaleDateString('tr-TR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'stages' && canEditProject() && (
          <button
            onClick={() => setShowAddStage(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Aşama Ekle</span>
          </button>
        )}
        
        {activeTab === 'tasks' && canEditProject() && (
          <button
            onClick={() => setShowTaskAssignment(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Görev Ata</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.label === 'Proje Aşamaları' ? 'Aşamalar' :
                   tab.label === 'İlerleme Takibi' ? 'İlerleme' :
                   tab.label === 'Görev Atamaları' ? 'Görevler' :
                   tab.label === 'Performans Analizi' ? 'Performans' :
                   tab.label === 'Kullanıcı Raporları' ? 'Raporlar' :
                   tab.label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {activeTab === 'stages' && (
          <StagesList 
            projectId={projectId} 
            stages={stages} 
            assemblies={assemblies}
            onStagesUpdated={loadStages}
            onAssembliesUpdated={loadAssemblies}
            canEdit={canEditProject()}
            onAddStage={() => setShowAddStage(true)}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressTracking projectId={projectId} />
        )}
        {activeTab === 'dashboard' && (
          <ProjectDashboard projectId={projectId} />
        )}
        {activeTab === 'tasks' && (
          <div className="p-6">
            <div className="text-center py-8">
              <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Görev Atamaları</h3>
              <p className="text-gray-600 mb-4">
                Kullanıcılara kesim, imalat, kaynak ve boya görevlerini atayın.
              </p>
              {canEditProject() && (
                <button
                  onClick={() => setShowTaskAssignment(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>İlk Görevi Ata</span>
                </button>
              )}
            </div>
          </div>
        )}
        {activeTab === 'performance' && isAdmin && (
          <PerformanceAnalysis projectId={projectId} />
        )}
        {activeTab === 'user-reports' && isAdmin && (
          <UserPerformanceReport projectId={projectId} />
        )}
      </div>

      {/* Modals */}
      {showBulkAssembly && canEditProject() && (
        <BulkAssemblyModal
          projectId={projectId}
          onClose={() => setShowBulkAssembly(false)}
          onAssembliesAdded={handleAssembliesAdded}
        />
      )}
      
      {showTaskAssignment && canEditProject() && (
        <TaskAssignmentModal
          projectId={projectId}
          onClose={() => setShowTaskAssignment(false)}
          onTasksAssigned={() => setShowTaskAssignment(false)}
        />
      )}
      
      {showAddStage && canEditProject() && (
        <AddStageModal
          projectId={projectId}
          onClose={() => setShowAddStage(false)}
          onStageAdded={() => {
            setShowAddStage(false)
            loadStages()
          }}
        />
      )}
    </div>
  )
}