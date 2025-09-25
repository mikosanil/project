import React, { useState, useEffect } from 'react'
import { 
  MapPin, 
  Users, 
  Calendar, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Settings,
  Plus,
  Filter,
  Search,
  BarChart3,
  FileText,
  Wrench,
  Shield
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AssemblyLocationModal } from './AssemblyLocationModal'
import { AssemblyTeamModal } from './AssemblyTeamModal'
import { AssemblyTaskModal } from './AssemblyTaskModal'
import { AssemblyProgressModal } from './AssemblyProgressModal'
import { AssemblyQualityModal } from './AssemblyQualityModal'
import { AssemblyDocumentationModal } from './AssemblyDocumentationModal'
import { AssemblyReportsModal } from './AssemblyReportsModal'

interface AssemblyLocation {
  id: string
  project_id: string
  name: string
  address: string
  city?: string
  district?: string
  coordinates?: { lat: number; lng: number }
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  access_notes?: string
  special_requirements?: string
}

interface AssemblyTeam {
  id: string
  name: string
  description?: string
  team_leader_id?: string
  specialization?: string
  max_capacity: number
  is_active: boolean
  team_leader?: {
    full_name: string
    email: string
  }
  member_count: number
}

interface AssemblyTask {
  id: string
  project_id: string
  assembly_id: string
  location_id?: string
  team_id?: string
  task_name: string
  description?: string
  assembly_type: 'field' | 'workshop' | 'prefabricated'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  estimated_duration_hours?: number
  actual_duration_hours?: number
  weather_dependency: boolean
  special_equipment?: string[]
  safety_requirements?: string[]
  quality_standards?: string[]
  created_by?: string
  location?: AssemblyLocation
  team?: AssemblyTeam
  assembly?: {
    poz_code: string
    description: string
  }
  progress_percentage: number
  quality_checks_passed: number
  quality_checks_total: number
  issue_count: number
}

interface AssemblyTrackingProps {
  projectId: string
}

export function AssemblyTracking({ projectId }: AssemblyTrackingProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'locations' | 'teams' | 'reports'>('tasks')
  const [tasks, setTasks] = useState<AssemblyTask[]>([])
  const [locations, setLocations] = useState<AssemblyLocation[]>([])
  const [teams, setTeams] = useState<AssemblyTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  
  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showQualityModal, setShowQualityModal] = useState(false)
  const [showDocumentationModal, setShowDocumentationModal] = useState(false)
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AssemblyTask | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadTasks(),
        loadLocations(),
        loadTeams()
      ])
    } catch (error) {
      console.error('Error loading assembly tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from('assembly_tasks')
      .select(`
        *,
        location:assembly_locations(*),
        team:assembly_teams(*),
        assembly:assemblies(poz_code, description)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate additional metrics
    const tasksWithMetrics = await Promise.all(
      (data || []).map(async (task) => {
        // Get progress percentage
        const { data: progressData } = await supabase
          .from('assembly_progress_entries')
          .select('progress_percentage')
          .eq('assembly_task_id', task.id)
          .order('entry_date', { ascending: false })
          .limit(1)

        // Get quality checks
        const { data: qualityData } = await supabase
          .from('assembly_quality_checks')
          .select('is_passed')
          .eq('assembly_task_id', task.id)

        // Get issue count
        const { data: issueData } = await supabase
          .from('assembly_issue_reports')
          .select('id')
          .eq('assembly_task_id', task.id)
          .eq('status', 'open')

        return {
          ...task,
          progress_percentage: progressData?.[0]?.progress_percentage || 0,
          quality_checks_passed: qualityData?.filter(q => q.is_passed).length || 0,
          quality_checks_total: qualityData?.length || 0,
          issue_count: issueData?.length || 0
        }
      })
    )

    setTasks(tasksWithMetrics)
  }

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from('assembly_locations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    setLocations(data || [])
  }

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from('assembly_teams')
      .select(`
        *,
        team_leader:users!assembly_teams_team_leader_id_fkey(full_name, email)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get member counts
    const teamsWithCounts = await Promise.all(
      (data || []).map(async (team) => {
        const { count } = await supabase
          .from('assembly_team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)

        return {
          ...team,
          member_count: count || 0
        }
      })
    )

    setTeams(teamsWithCounts)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planned': return 'Planlandı'
      case 'in_progress': return 'Devam Ediyor'
      case 'completed': return 'Tamamlandı'
      case 'on_hold': return 'Beklemede'
      case 'cancelled': return 'İptal Edildi'
      default: return status
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Acil'
      case 'high': return 'Yüksek'
      case 'medium': return 'Orta'
      case 'low': return 'Düşük'
      default: return priority
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assembly?.poz_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const tabs = [
    { id: 'tasks', label: 'Montaj Görevleri', icon: Wrench },
    { id: 'locations', label: 'Montaj Lokasyonları', icon: MapPin },
    { id: 'teams', label: 'Montaj Ekipleri', icon: Users },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Montaj Takip Sistemi</h2>
          <p className="text-gray-600 mt-1">Saha montajı planlama, takip ve yönetimi</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowReportsModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Raporlar</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Montaj görevi ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="planned">Planlandı</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="on_hold">Beklemede</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Öncelikler</option>
                <option value="urgent">Acil</option>
                <option value="high">Yüksek</option>
                <option value="medium">Orta</option>
                <option value="low">Düşük</option>
              </select>
            </div>
            
            <button
              onClick={() => setShowTaskModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Görev</span>
            </button>
          </div>

          {/* Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{task.task_name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{task.assembly?.poz_code}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityText(task.priority)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>İlerleme</span>
                    <span>{task.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{task.quality_checks_passed}/{task.quality_checks_total}</div>
                    <div className="text-xs text-gray-500">Kalite Kontrol</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{task.issue_count}</div>
                    <div className="text-xs text-gray-500">Açık Sorun</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {task.estimated_duration_hours || 0}h
                    </div>
                    <div className="text-xs text-gray-500">Tahmini Süre</div>
                  </div>
                </div>

                {/* Location and Team */}
                <div className="space-y-2 mb-4">
                  {task.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span className="truncate">{task.location.name}</span>
                    </div>
                  )}
                  {task.team && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="truncate">{task.team.name}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setSelectedTask(task)
                      setShowProgressModal(true)
                    }}
                    className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    İlerleme
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(task)
                      setShowQualityModal(true)
                    }}
                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Kalite
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(task)
                      setShowDocumentationModal(true)
                    }}
                    className="w-full sm:flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                  >
                    Doküman
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Montaj görevi bulunamadı</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Arama kriterlerinize uygun görev bulunamadı.' : 'Henüz montaj görevi oluşturulmamış.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>İlk Görevi Oluştur</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'locations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Montaj Lokasyonları</h3>
            <button
              onClick={() => setShowLocationModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Lokasyon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <div key={location.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">{location.name}</h4>
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="line-clamp-2">{location.address}</p>
                  {location.city && <p>{location.city}, {location.district}</p>}
                  {location.contact_person && (
                    <p className="font-medium">{location.contact_person}</p>
                  )}
                  {location.contact_phone && (
                    <p>{location.contact_phone}</p>
                  )}
                </div>

                {location.special_requirements && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Özel Gereksinimler:</strong> {location.special_requirements}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {locations.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Lokasyon bulunamadı</h3>
              <p className="text-gray-600 mb-4">Henüz montaj lokasyonu eklenmemiş.</p>
              <button
                onClick={() => setShowLocationModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>İlk Lokasyonu Ekle</span>
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Montaj Ekipleri</h3>
            <button
              onClick={() => setShowTeamModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Ekip</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div key={team.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">{team.name}</h4>
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {team.description && <p className="line-clamp-2">{team.description}</p>}
                  {team.specialization && (
                    <p><strong>Uzmanlık:</strong> {team.specialization}</p>
                  )}
                  {team.team_leader && (
                    <p><strong>Ekip Lideri:</strong> {team.team_leader.full_name}</p>
                  )}
                  <p><strong>Üye Sayısı:</strong> {team.member_count}/{team.max_capacity}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    team.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {team.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      Düzenle
                    </button>
                    <button className="text-gray-600 hover:text-gray-800 text-sm">
                      Detay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {teams.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ekip bulunamadı</h3>
              <p className="text-gray-600 mb-4">Henüz montaj ekibi oluşturulmamış.</p>
              <button
                onClick={() => setShowTeamModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>İlk Ekibi Oluştur</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showLocationModal && (
        <AssemblyLocationModal
          projectId={projectId}
          onClose={() => setShowLocationModal(false)}
          onLocationSaved={loadLocations}
        />
      )}

      {showTeamModal && (
        <AssemblyTeamModal
          onClose={() => setShowTeamModal(false)}
          onTeamSaved={loadTeams}
        />
      )}

      {showTaskModal && (
        <AssemblyTaskModal
          projectId={projectId}
          locations={locations}
          teams={teams}
          onClose={() => setShowTaskModal(false)}
          onTaskSaved={loadTasks}
        />
      )}

      {showProgressModal && selectedTask && (
        <AssemblyProgressModal
          task={selectedTask}
          onClose={() => {
            setShowProgressModal(false)
            setSelectedTask(null)
          }}
          onProgressSaved={loadTasks}
        />
      )}

      {showQualityModal && selectedTask && (
        <AssemblyQualityModal
          task={selectedTask}
          onClose={() => {
            setShowQualityModal(false)
            setSelectedTask(null)
          }}
          onQualitySaved={loadTasks}
        />
      )}

      {showDocumentationModal && selectedTask && (
        <AssemblyDocumentationModal
          task={selectedTask}
          onClose={() => {
            setShowDocumentationModal(false)
            setSelectedTask(null)
          }}
          onDocumentationSaved={loadTasks}
        />
      )}

      {showReportsModal && (
        <AssemblyReportsModal
          projectId={projectId}
          tasks={tasks}
          locations={locations}
          teams={teams}
          onClose={() => setShowReportsModal(false)}
        />
      )}
    </div>
  )
}
