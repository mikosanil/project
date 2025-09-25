import React, { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit2, 
  Trash2, 
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AddAssemblyModal } from './AddAssemblyModal'
import { BulkAddAssemblyModal } from './BulkAddAssemblyModal'
import { EditAssemblyModal } from './EditAssemblyModal'
import { TimeTrackingTable } from './TimeTrackingTable'

interface Stage {
  id: string
  project_id: string
  stage_name: string
  stage_order: number
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold'
  start_date?: string
  target_completion_date?: string
  actual_completion_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

interface Assembly {
  id: string
  project_id: string
  stage_id?: string
  part_number: string
  description: string
  total_quantity: number
  completed_quantity: number
  unit: string
  weight_per_unit?: number
  material?: string
  created_at: string
  updated_at: string
}

interface StagesListProps {
  projectId: string
  stages: Stage[]
  assemblies: Assembly[]
  onStagesUpdated: () => void
  onAssembliesUpdated: () => void
  canEdit: boolean
  onAddStage?: () => void
}

export function StagesList({ 
  projectId, 
  stages, 
  assemblies, 
  onStagesUpdated, 
  onAssembliesUpdated, 
  canEdit,
  onAddStage
}: StagesListProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [editingStage, setEditingStage] = useState<string | null>(null)
  const [showAddAssembly, setShowAddAssembly] = useState<string | null>(null)
  const [showBulkAddAssembly, setShowBulkAddAssembly] = useState<string | null>(null)
  const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null)
  const [activeTab, setActiveTab] = useState<'stages' | 'time-tracking'>('stages')
  const [progressEntries, setProgressEntries] = useState<any[]>([])

  useEffect(() => {
    loadProgressEntries()
  }, [projectId, assemblies])

  const loadProgressEntries = async () => {
    try {
      // First get all assemblies for this project
      const assemblyIds = assemblies.map(a => a.id)
      
      if (assemblyIds.length === 0) {
        setProgressEntries([])
        return
      }

      // Then get progress entries for these assemblies
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .in('assembly_id', assemblyIds)

      if (error) {
        console.error('Error loading progress entries:', error)
        return
      }

      setProgressEntries(data || [])
    } catch (error) {
      console.error('Error loading progress entries:', error)
    }
  }

  const toggleStageExpansion = (stageId: string) => {
    const newExpanded = new Set(expandedStages)
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId)
    } else {
      newExpanded.add(stageId)
    }
    setExpandedStages(newExpanded)
  }

  const getStageAssemblies = (stageId: string) => {
    return assemblies.filter(assembly => assembly.stage_id === stageId)
  }

  const getStageProgress = (stageId: string) => {
    const stageAssemblies = getStageAssemblies(stageId)
    if (stageAssemblies.length === 0) return 0
    
    const totalQuantity = stageAssemblies.reduce((sum, a) => sum + a.total_quantity, 0)
    
    // Calculate completed quantity from progress entries for this stage
    const stageProgressEntries = progressEntries?.filter(entry => entry.work_stage_id === stageId) || []
    const completedQuantity = stageProgressEntries.reduce((sum, entry) => sum + entry.quantity_completed, 0)
    
    return totalQuantity > 0 ? Math.min(100, (completedQuantity / totalQuantity) * 100) : 0
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Play className="w-5 h-5 text-blue-500" />
      case 'on_hold':
        return <Pause className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı'
      case 'in_progress':
        return 'Devam Ediyor'
      case 'on_hold':
        return 'Beklemede'
      default:
        return 'Bekliyor'
    }
  }

  const updateStageStatus = async (stageId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('project_stages')
        .update({ 
          status: newStatus,
          actual_completion_date: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', stageId)

      if (error) throw error
      onStagesUpdated()
    } catch (error) {
      console.error('Error updating stage status:', error)
    }
  }

  const deleteStage = async (stageId: string) => {
    if (!confirm('Bu aşamayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('project_stages')
        .delete()
        .eq('id', stageId)

      if (error) throw error
      onStagesUpdated()
    } catch (error) {
      console.error('Error deleting stage:', error)
    }
  }

  const deleteAssembly = async (assemblyId: string) => {
    if (!confirm('Bu pozı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('assemblies')
        .delete()
        .eq('id', assemblyId)

      if (error) throw error
      onAssembliesUpdated()
    } catch (error) {
      console.error('Error deleting assembly:', error)
    }
  }

  const moveAssemblyToStage = async (assemblyId: string, targetStageId: string) => {
    try {
      const { error } = await supabase
        .from('assemblies')
        .update({ stage_id: targetStageId })
        .eq('id', assemblyId)

      if (error) throw error
      onAssembliesUpdated()
    } catch (error) {
      console.error('Error moving assembly:', error)
    }
  }

  if (stages.length === 0) {
    return (
      <div className="p-6 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Aşama Yok</h3>
        <p className="text-gray-600 mb-4">
          Bu proje için henüz hiç aşama tanımlanmamış.
        </p>
        {canEdit && onAddStage && (
          <button
            onClick={onAddStage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>İlk Aşamayı Ekle</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Tab Navigation */}
      <div className="mb-4 sm:mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('stages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'stages'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Aşamalar
            </button>
            <button
              onClick={() => setActiveTab('time-tracking')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'time-tracking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-1" />
              Süre Takibi
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'stages' && (
        <div className="space-y-4">
        {stages.map((stage) => {
          const stageAssemblies = getStageAssemblies(stage.id)
          const progress = getStageProgress(stage.id)
          const isExpanded = expandedStages.has(stage.id)

          return (
            <div key={stage.id} className="border border-gray-200 rounded-lg">
              {/* Stage Header */}
              <div className="p-3 sm:p-4 bg-gray-50 rounded-t-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <button
                      onClick={() => toggleStageExpansion(stage.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      )}
                    </button>
                    
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {getStatusIcon(stage.status)}
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 capitalize truncate">
                        {stage.stage_name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stage.status)} flex-shrink-0`}>
                        {getStatusText(stage.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    {/* Progress */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600">İlerleme:</span>
                      <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{Math.round(progress)}%</span>
                    </div>

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => setShowAddAssembly(stage.id)}
                          className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg flex items-center space-x-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="hidden sm:inline">Poz Ekle</span>
                          <span className="sm:hidden">Ekle</span>
                        </button>
                        
                        <button
                          onClick={() => setShowBulkAddAssembly(stage.id)}
                          className="px-2 sm:px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg flex items-center space-x-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="hidden sm:inline">Toplu Poz Ekle</span>
                          <span className="sm:hidden">Toplu</span>
                        </button>
                        
                        <select
                          value={stage.status}
                          onChange={(e) => updateStageStatus(stage.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-1 sm:px-2 py-1 min-w-0"
                        >
                          <option value="pending">Bekliyor</option>
                          <option value="in_progress">Devam Ediyor</option>
                          <option value="completed">Tamamlandı</option>
                          <option value="on_hold">Beklemede</option>
                        </select>
                        
                        <button
                          onClick={() => setEditingStage(stage.id)}
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteStage(stage.id)}
                          className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stage Info */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 text-xs sm:text-sm text-gray-600">
                  <div className="flex justify-between sm:block">
                    <span className="font-medium sm:mr-1">Poz Sayısı:</span> 
                    <span className="text-gray-900">{stageAssemblies.length}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="font-medium sm:mr-1">Toplam Miktar:</span> 
                    <span className="text-gray-900">{stageAssemblies.reduce((sum, a) => sum + a.total_quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="font-medium sm:mr-1">Tamamlanan:</span> 
                    <span className="text-gray-900">{progressEntries?.filter(entry => entry.work_stage_id === stage.id).reduce((sum, entry) => sum + entry.quantity_completed, 0) || 0}</span>
                  </div>
                </div>
              </div>

              {/* Stage Assemblies */}
              {isExpanded && (
                <div className="p-4 border-t border-gray-200">
                  {stageAssemblies.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Bu aşamada henüz poz yok</p>
                      {canEdit && (
                        <button
                          onClick={() => setShowAddAssembly(stage.id)}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Poz Ekle
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stageAssemblies.map((assembly) => (
                        <div key={assembly.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white border border-gray-200 rounded-lg gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <span className="font-medium text-gray-900 truncate">{assembly.part_number}</span>
                              <span className="text-gray-600 text-sm truncate">{assembly.description}</span>
                            </div>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-gray-500">
                              <div className="flex justify-between sm:block">
                                <span className="sm:hidden">Miktar:</span>
                                <span>{assembly.total_quantity} {assembly.unit}</span>
                              </div>
                              <div className="flex justify-between sm:block">
                                <span className="sm:hidden">Tamamlanan:</span>
                                <span>{progressEntries
                                  .filter(entry => entry.assembly_id === assembly.id)
                                  .reduce((sum, entry) => sum + entry.quantity_completed, 0)
                                }</span>
                              </div>
                              {assembly.weight_per_unit && (
                                <div className="flex justify-between sm:block">
                                  <span className="sm:hidden">Ağırlık:</span>
                                  <span>{assembly.weight_per_unit} kg</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {canEdit && (
                            <div className="flex items-center justify-end sm:justify-start space-x-2">
                              <button
                                onClick={() => setEditingAssembly(assembly)}
                                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Düzenle"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => deleteAssembly(assembly.id)}
                                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              
                              <select
                                onChange={(e) => moveAssemblyToStage(assembly.id, e.target.value)}
                                value={stage.id}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                                title="Aşama Değiştir"
                              >
                                {stages.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.stage_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                      
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}

      {/* Time Tracking Tab */}
      {activeTab === 'time-tracking' && (
        <TimeTrackingTable projectId={projectId} />
      )}

      {/* Add Assembly Modal */}
      {showAddAssembly && (
        <AddAssemblyModal
          projectId={projectId}
          stageId={showAddAssembly}
          onClose={() => setShowAddAssembly(null)}
          onAssemblyAdded={() => {
            setShowAddAssembly(null)
            onAssembliesUpdated()
          }}
        />
      )}

      {/* Bulk Add Assembly Modal */}
      {showBulkAddAssembly && (
        <BulkAddAssemblyModal
          projectId={projectId}
          stageId={showBulkAddAssembly}
          onClose={() => setShowBulkAddAssembly(null)}
          onAssembliesAdded={() => {
            setShowBulkAddAssembly(null)
            onAssembliesUpdated()
          }}
        />
      )}

      {/* Edit Assembly Modal */}
      {editingAssembly && (
        <EditAssemblyModal
          assembly={editingAssembly}
          stages={stages}
          onClose={() => setEditingAssembly(null)}
          onAssemblyUpdated={() => {
            setEditingAssembly(null)
            onAssembliesUpdated()
          }}
        />
      )}
    </div>
  )
}
