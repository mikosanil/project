import React, { useState, useEffect } from 'react'
import { Plus, Search, Settings } from 'lucide-react'
import { ProjectCard } from './ProjectCard'
import { NewProjectModal } from './NewProjectModal'
import { EditProjectModal } from './EditProjectModal'
import { AssignUsersModal } from './AssignUsersModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Database } from '../lib/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectListProps {
  onProjectSelect: (project: Project) => void
  onAdminPanel: () => void
}

export function ProjectList({ onProjectSelect, onAdminPanel }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [assigningProject, setAssigningProject] = useState<Project | null>(null)
  const [projectProgress, setProjectProgress] = useState<Record<string, number>>({})
  const [projectWeights, setProjectWeights] = useState<Record<string, { total: number, completed: number }>>({})
  const { isAdmin, userProfile } = useAuth()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setProjects(data || [])
      
      // Calculate progress for each project
      if (data) {
        const progressMap: Record<string, number> = {}
        const weightsMap: Record<string, { total: number, completed: number }> = {}
        
        for (const project of data) {
          const progress = await calculateProjectProgress(project.id)
          progressMap[project.id] = progress
          
          const weights = await calculateProjectWeights(project.id)
          weightsMap[project.id] = weights
        }
        
        setProjectProgress(progressMap)
        setProjectWeights(weightsMap)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProjectProgress = async (projectId: string): Promise<number> => {
    try {
      // Get all assemblies for this project
      const { data: assemblies, error: assembliesError } = await supabase
        .from('assemblies')
        .select('id, total_quantity')
        .eq('project_id', projectId)

      if (assembliesError || !assemblies?.length) return 0

      // Get progress entries for all assemblies
      const assemblyIds = assemblies.map(a => a.id)
      const { data: progressEntries, error: progressError } = await supabase
        .from('progress_entries')
        .select('assembly_id, work_stage_id, quantity_completed')
        .in('assembly_id', assemblyIds)

      if (progressError) return 0

      // Calculate total possible work (only assemblies, not multiplied by stages)
      const totalPossibleWork = assemblies.reduce((total, assembly) => {
        return total + assembly.total_quantity
      }, 0)

      if (totalPossibleWork === 0) return 0

      // Calculate completed work
      const completedWork = progressEntries?.reduce((total, entry) => {
        return total + entry.quantity_completed
      }, 0) || 0

      return Math.min((completedWork / totalPossibleWork) * 100, 100)
    } catch (error) {
      console.error('Error calculating progress:', error)
      return 0
    }
  }

  const calculateProjectWeights = async (projectId: string): Promise<{ total: number, completed: number }> => {
    try {
      // Get imalat stage for this project
      const { data: imalatStage, error: stageError } = await supabase
        .from('project_stages')
        .select('id')
        .eq('project_id', projectId)
        .eq('stage_name', 'imalat')
        .single()

      if (stageError || !imalatStage) return { total: 0, completed: 0 }

      // Get only imalat assemblies with weights
      const { data: assemblies, error: assembliesError } = await supabase
        .from('assemblies')
        .select('id, total_quantity, weight_per_unit')
        .eq('project_id', projectId)
        .eq('stage_id', imalatStage.id)

      if (assembliesError || !assemblies?.length) return { total: 0, completed: 0 }

      // Calculate total weight for imalat stage only
      const totalWeight = assemblies.reduce((total, assembly) => {
        return total + (assembly.total_quantity * (assembly.weight_per_unit || 0))
      }, 0)

      // For now, just return total weight with 0 completed
      return { total: totalWeight, completed: 0 }
    } catch (error) {
      console.error('Error calculating weights:', error)
      return { total: 0, completed: 0 }
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleProjectCreated = async () => {
    setShowNewProject(false)
    await loadProjects()
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
  }

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`"${project.name}" projesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error
      await loadProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Proje silinirken hata oluştu')
    }
  }

  const handleAssignUsers = (project: Project) => {
    setAssigningProject(project)
  }

  const handleProjectUpdated = () => {
    setEditingProject(null)
    loadProjects()
  }

  const handleAssignmentUpdated = () => {
    setAssigningProject(null)
    loadProjects()
  }

  const canEditProject = (project: Project) => {
    return isAdmin
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projeler</h2>
          <p className="text-gray-600 mt-1">İmalat projelerinizi yönetin ve takip edin</p>
        </div>
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <button
              onClick={onAdminPanel}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Admin Panel</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowNewProject(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Proje</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Proje ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Proje bulunamadı' : 'Henüz proje yok'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Arama kriterlerinize uygun proje bulunamadı.' : 'İlk projenizi oluşturun ve imalat takibine başlayın.'}
          </p>
          {!searchTerm && isAdmin && (
            <button
              onClick={() => setShowNewProject(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>İlk Projeyi Oluştur</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={onProjectSelect}
              onEdit={canEditProject(project) ? handleEditProject : undefined}
              onDelete={canEditProject(project) ? handleDeleteProject : undefined}
              onAssignUsers={isAdmin ? handleAssignUsers : undefined}
              completionPercentage={projectProgress[project.id] || 0}
              totalWeight={projectWeights[project.id]?.total || 0}
              completedWeight={projectWeights[project.id]?.completed || 0}
              canEdit={canEditProject(project)}
            />
          ))}
        </div>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onProjectUpdated={handleProjectUpdated}
        />
      )}

      {assigningProject && (
        <AssignUsersModal
          project={assigningProject}
          onClose={() => setAssigningProject(null)}
          onAssignmentUpdated={handleAssignmentUpdated}
        />
      )}
    </div>
  )
}