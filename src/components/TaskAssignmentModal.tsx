import React, { useState, useEffect } from 'react'
import { X, User, Settings, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface TaskAssignmentModalProps {
  projectId: string
  onClose: () => void
  onTasksAssigned: () => void
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
}

interface ProjectStage {
  id: string
  stage_name: string
  stage_order: number
  status: string
}

interface TaskAssignment {
  id: string
  user_id: string
  work_stage_id: string
  users: UserProfile
  project_stages: ProjectStage
}

export function TaskAssignmentModal({ projectId, onClose, onTasksAssigned }: TaskAssignmentModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [workStages, setWorkStages] = useState<ProjectStage[]>([])
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedStage, setSelectedStage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load users from public.users table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error loading users:', usersError)
        throw usersError
      }

      console.log('Loaded users for task assignment:', usersData)

      // Load project stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId)
        .order('stage_order')

      if (stagesError) {
        console.error('Error loading work stages:', stagesError)
        throw stagesError
      }

      // Load existing assignments with manual join
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_task_assignments')
        .select('*')
        .eq('project_id', projectId)

      if (assignmentsError) {
        console.error('Error loading assignments:', assignmentsError)
        throw assignmentsError
      }

      // Manually join user and work stage data
      let assignmentsWithDetails: TaskAssignment[] = []
      if (assignmentsData && assignmentsData.length > 0) {
        // Get user details for assignments
        const assignmentUserIds = assignmentsData.map(a => a.user_id)
        const { data: assignmentUsers, error: assignmentUsersError } = await supabase
          .from('users')
          .select('*')
          .in('id', assignmentUserIds)

        if (assignmentUsersError) {
          console.error('Error loading assignment users:', assignmentUsersError)
          throw assignmentUsersError
        }

        // Get project stage details for assignments
        const assignmentStageIds = assignmentsData.map(a => a.work_stage_id)
        const { data: assignmentStages, error: assignmentStagesError } = await supabase
          .from('project_stages')
          .select('*')
          .in('id', assignmentStageIds)

        if (assignmentStagesError) {
          console.error('Error loading assignment stages:', assignmentStagesError)
          throw assignmentStagesError
        }

        // Combine the data
        assignmentsWithDetails = assignmentsData.map(assignment => ({
          ...assignment,
          users: assignmentUsers?.find(u => u.id === assignment.user_id) || {} as UserProfile,
          project_stages: assignmentStages?.find(s => s.id === assignment.work_stage_id) || {} as ProjectStage
        }))
      }

      setUsers(usersData || [])
      setWorkStages(stagesData || [])
      setAssignments(assignmentsWithDetails)
      
      if (stagesData?.length > 0) {
        setSelectedStage(stagesData[0].id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError(`Veri yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !selectedStage) return

    setSubmitting(true)
    setError(null)

    try {
      const currentUser = await supabase.auth.getUser()
      if (!currentUser.data.user) {
        throw new Error('Kullanıcı oturumu bulunamadı')
      }

      console.log('TaskAssignmentModal - Assigning task:', {
        project_id: projectId,
        user_id: selectedUser,
        work_stage_id: selectedStage,
        assigned_by: currentUser.data.user.id
      })

      const { data, error } = await supabase
        .from('project_task_assignments')
        .insert({
          project_id: projectId,
          user_id: selectedUser,
          work_stage_id: selectedStage,
          assigned_by: currentUser.data.user.id
        })
        .select()

      if (error) throw error

      console.log('TaskAssignmentModal - Task assigned successfully:', data)

      setSelectedUser('')
      await loadData()
    } catch (err: any) {
      if (err.code === '23505') {
        setError('Bu kullanıcı bu göreve zaten atanmış')
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Bu görev atamasını kaldırmak istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('project_task_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Error removing assignment:', error)
      setError('Atama kaldırılırken hata oluştu')
    }
  }

  const getStageColor = (stageName: string) => {
    const colors = {
      'kesim': '#EF4444',
      'imalat': '#F59E0B', 
      'kaynak': '#3B82F6',
      'boya': '#10B981'
    }
    const color = colors[stageName as keyof typeof colors] || '#6B7280'
    return {
      backgroundColor: color + '20',
      color: color,
      borderColor: color + '40'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Görev Atamaları</h2>
            <p className="text-sm text-gray-600 mt-1">Kullanıcılara kesim, imalat, kaynak ve boya görevlerini atayın</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add Task Assignment Form */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-3 flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Görev Ata
            </h3>
            
            <form onSubmit={handleAssignTask} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  required
                >
                  <option value="">Kullanıcı seçin</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name ? `${user.full_name} (${user.email})` : user.email}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  required
                >
                  {workStages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.stage_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedUser || !selectedStage}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {submitting ? 'Atanıyor...' : 'Görev Ata'}
              </button>
            </form>
          </div>

          {/* Current Assignments by Stage */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">
              Mevcut Görev Atamaları ({assignments.length})
            </h3>
            
            {workStages.map(stage => {
              const stageAssignments = assignments.filter(a => a.work_stage_id === stage.id)
              
              return (
                <div key={stage.id} className="mb-4">
                  <div 
                    className="flex items-center space-x-2 mb-2 px-3 py-2 rounded-lg border"
                    style={getStageColor(stage.stage_name)}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="font-medium">{stage.stage_name}</span>
                    <span className="text-sm opacity-75">({stageAssignments.length} kişi)</span>
                  </div>
                  
                  {stageAssignments.length === 0 ? (
                    <div className="ml-6 text-sm text-gray-500 mb-2">
                      Bu göreve henüz kimse atanmamış
                    </div>
                  ) : (
                    <div className="ml-6 space-y-2 mb-2">
                      {stageAssignments.map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium">
                              {assignment.users.full_name || assignment.users.email}
                            </span>
                            <span className="text-xs text-gray-500">
                              {assignment.users.email}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}