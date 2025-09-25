import React, { useState, useEffect } from 'react'
import { X, UserPlus, User, Trash2, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'user'
  department: string | null
}

interface Assignment {
  id: string
  user_id: string
  role: 'viewer' | 'worker' | 'manager'
  assigned_at: string
  users: UserProfile
}

interface AssignUsersModalProps {
  project: Project
  onClose: () => void
  onAssignmentUpdated: () => void
}

export function AssignUsersModal({ project, onClose, onAssignmentUpdated }: AssignUsersModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'worker' | 'manager'>('worker')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [project.id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      console.log('Loaded users for assignment:', usersData) // Debug log
      // Load current assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select('*')
        .eq('project_id', project.id)

      if (assignmentsError) throw assignmentsError

      console.log('Current assignments:', assignmentsData) // Debug log
      // Load user details for assignments
      let assignmentsWithUsers: Assignment[] = []
      if (assignmentsData && assignmentsData.length > 0) {
        const userIds = assignmentsData.map(a => a.user_id)
        const { data: assignmentUsers, error: assignmentUsersError } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)

        if (assignmentUsersError) throw assignmentUsersError

        assignmentsWithUsers = assignmentsData.map(assignment => ({
          ...assignment,
          users: assignmentUsers?.find(u => u.id === assignment.user_id) || {} as UserProfile
        }))
      }

      setUsers(usersData || [])
      setAssignments(assignmentsWithUsers)
      console.log('Available users after filtering:', usersData?.filter(user => 
        !assignmentsData?.map(a => a.user_id).includes(user.id)
      )) // Debug log
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Veri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setSubmitting(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('project_assignments')
        .insert({
          project_id: project.id,
          user_id: selectedUser,
          role: selectedRole,
          assigned_by: (await supabase.auth.getUser()).data.user?.id || ''
        })

      if (error) throw error

      setSelectedUser('')
      setSelectedRole('worker')
      await loadData()
      onAssignmentUpdated()
    } catch (err: any) {
      if (err.code === '23505') {
        setError('Bu kullanıcı zaten projeye atanmış')
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Bu atamayı kaldırmak istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('project_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      await loadData()
      onAssignmentUpdated()
    } catch (error) {
      console.error('Error removing assignment:', error)
      setError('Atama kaldırılırken hata oluştu')
    }
  }

  const handleUpdateRole = async (assignmentId: string, newRole: 'viewer' | 'worker' | 'manager') => {
    try {
      const { error } = await supabase
        .from('project_assignments')
        .update({ role: newRole })
        .eq('id', assignmentId)

      if (error) throw error

      await loadData()
      onAssignmentUpdated()
    } catch (error) {
      console.error('Error updating role:', error)
      setError('Rol güncellenirken hata oluştu')
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'viewer': return 'Görüntüleyici'
      case 'worker': return 'Çalışan'
      case 'manager': return 'Yönetici'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'viewer': return 'bg-gray-100 text-gray-800'
      case 'worker': return 'bg-blue-100 text-blue-800'
      case 'manager': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const assignedUserIds = assignments.map(a => a.user_id)
  const availableUsers = users.filter(user => 
    !assignedUserIds.includes(user.id) &&
    (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())))
  )

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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Kullanıcı Atama</h2>
            <p className="text-sm text-gray-600 mt-1">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add User Form */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Yeni Kullanıcı Ata
            </h3>
            
            <form onSubmit={handleAssignUser} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                >
                  <option value="">Kullanıcı seçin</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name ? `${user.full_name} (${user.email})` : user.email}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="viewer">Görüntüleyici</option>
                  <option value="worker">Çalışan</option>
                  <option value="manager">Yönetici</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedUser}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {submitting ? 'Atanıyor...' : 'Kullanıcıyı Ata'}
              </button>
            </form>
          </div>

          {/* Current Assignments */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Mevcut Atamalar ({assignments.length})
            </h3>
            
            {assignments.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  {users.length === 0 
                    ? 'Sistemde kullanıcı bulunamadı' 
                    : searchTerm 
                      ? 'Arama kriterlerine uygun kullanıcı bulunamadı'
                      : 'Tüm kullanıcılar zaten bu projeye atanmış'
                  }
                </p>
                {users.length > 0 && (
                  <p className="text-yellow-700 text-xs mt-1">
                    Toplam {users.length} kullanıcı, {assignedUserIds.length} tanesi zaten atanmış
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {assignment.users.full_name || assignment.users.email}
                        </p>
                        <p className="text-sm text-gray-600">{assignment.users.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <select
                        value={assignment.role}
                        onChange={(e) => handleUpdateRole(assignment.id, e.target.value as any)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${getRoleColor(assignment.role)}`}
                      >
                        <option value="viewer">Görüntüleyici</option>
                        <option value="worker">Çalışan</option>
                        <option value="manager">Yönetici</option>
                      </select>
                      
                      <button
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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