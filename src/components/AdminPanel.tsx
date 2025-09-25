import React, { useState, useEffect } from 'react'
import { Users, Shield, Building, BarChart3, Settings, UserCheck, ArrowLeft, UserPlus, X, Edit2, FileText, Brain, Database } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { UserEditModal } from './UserEditModal'
import { GlobalUserPerformanceReport } from './GlobalUserPerformanceReport'
import { AnalyticsPrediction } from './AnalyticsPrediction'
import { DataQualityReport } from './DataQualityReport'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'user'
  department: string | null
  created_at: string
  updated_at: string
}

interface AdminStats {
  totalUsers: number
  totalProjects: number
  totalAssemblies: number
  totalProgressEntries: number
}

interface AdminPanelProps {
  onBack: () => void
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'analytics' | 'data-quality'>('users')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    department: ''
  })
  const [addingUser, setAddingUser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load users with explicit error handling
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error loading users:', usersError)
        setError(`Kullanıcılar yüklenirken hata: ${usersError.message}`)
        throw usersError
      }

      console.log('Loaded users:', usersData) // Debug log
      console.log('User names check:', usersData?.map(u => ({ 
        id: u.id, 
        email: u.email, 
        full_name: u.full_name, 
        hasName: !!u.full_name 
      })))

      // Load stats
      const [projectsResult, assembliesResult, progressResult] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('assemblies').select('id', { count: 'exact', head: true }),
        supabase.from('progress_entries').select('id', { count: 'exact', head: true })
      ])

      setUsers(usersData || [])
      setStats({
        totalUsers: usersData?.length || 0,
        totalProjects: projectsResult.count || 0,
        totalAssemblies: assembliesResult.count || 0,
        totalProgressEntries: progressResult.count || 0
      })
    } catch (error) {
      console.error('Error loading admin data:', error)
      setError('Veri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: 'admin' | 'manager' | 'user') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error
      
      await loadData()
    } catch (error) {
      console.error('Error updating user role:', error)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingUser(true)
    setError(null)

    try {
      // For now, show instructions to create users manually
      setError('Kullanıcı oluşturma işlemi şu anda desteklenmiyor. Yeni kullanıcılar kendi hesaplarını oluşturmalı ve daha sonra admin tarafından rol ataması yapılmalıdır.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAddingUser(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield
      case 'manager': return UserCheck
      default: return Users
    }
  }

  const tabs = [
    { id: 'users', label: 'Kullanıcı Yönetimi', icon: Users },
    { id: 'reports', label: 'Performans Raporları', icon: FileText },
    { id: 'analytics', label: 'Analitik Tahminleme', icon: Brain },
    { id: 'data-quality', label: 'Veri Kalitesi', icon: Database },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Paneli</h2>
            <p className="text-gray-600 mt-1">Sistem yönetimi ve kullanıcı kontrolü</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'users' && (
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto"
            >
              <UserPlus className="w-5 h-5" />
              <span>Kullanıcı Ekle</span>
            </button>
          )}
          <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg">
            <Shield className="w-5 h-5" />
            <span className="font-medium">Admin Yetkisi</span>
          </div>
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
      {activeTab === 'users' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Toplam Kullanıcı</p>
                  <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Toplam Proje</p>
                  <p className="text-3xl font-bold">{stats?.totalProjects || 0}</p>
                </div>
                <Building className="w-8 h-8 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Montaj Parçası</p>
                  <p className="text-3xl font-bold">{stats?.totalAssemblies || 0}</p>
                </div>
                <Settings className="w-8 h-8 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">İlerleme Kaydı</p>
                  <p className="text-3xl font-bold">{stats?.totalProgressEntries || 0}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-200" />
              </div>
            </div>
          </div>

          {/* Users Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Kullanıcı Yönetimi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 sm:px-6 font-medium text-gray-700 whitespace-nowrap">Kullanıcı</th>
                    <th className="text-left py-3 px-4 sm:px-6 font-medium text-gray-700 whitespace-nowrap">Rol</th>
                    <th className="text-left py-3 px-4 sm:px-6 font-medium text-gray-700 whitespace-nowrap">Departman</th>
                    <th className="text-left py-3 px-4 sm:px-6 font-medium text-gray-700 whitespace-nowrap">Kayıt Tarihi</th>
                    <th className="text-center py-3 px-4 sm:px-6 font-medium text-gray-700 whitespace-nowrap">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const RoleIcon = getRoleIcon(user.role)
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-gray-600 font-medium text-sm">
                                {(user.full_name || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.full_name || 'İsimsiz'}
                                {!user.full_name && (
                                  <span className="text-xs text-red-500 ml-2">(İsim eksik)</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center space-x-2">
                            <RoleIcon className="w-4 h-4" />
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                              {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Yönetici' : 'Kullanıcı'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-gray-700">
                          {user.department || '-'}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-gray-700 whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Kullanıcıyı Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="user">Kullanıcı</option>
                              <option value="manager">Yönetici</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'reports' && (
        <GlobalUserPerformanceReport />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsPrediction />
      )}

      {activeTab === 'data-quality' && (
        <DataQualityReport />
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Yeni Kullanıcı Ekle</h3>
              <button
                onClick={() => {
                  setShowAddUserModal(false)
                  setError(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta *
                </label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="kullanici@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre *
                </label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kullanıcı adı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">Kullanıcı</option>
                  <option value="manager">Yönetici</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departman
                </label>
                <input
                  type="text"
                  value={newUserData.department}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="İmalat, Kalite, vb."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false)
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {addingUser ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUserUpdated={loadData}
        />
      )}
    </div>
  )
}