import React, { useState, useEffect } from 'react'
import { X, Users, Save, UserPlus, UserMinus } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AssemblyTeamModalProps {
  onClose: () => void
  onTeamSaved: () => void
  team?: {
    id: string
    name: string
    description?: string
    team_leader_id?: string
    specialization?: string
    max_capacity: number
    is_active: boolean
  }
}

interface User {
  id: string
  full_name: string
  email: string
  department?: string
}

export function AssemblyTeamModal({ 
  onClose, 
  onTeamSaved, 
  team 
}: AssemblyTeamModalProps) {
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || '',
    team_leader_id: team?.team_leader_id || '',
    specialization: team?.specialization || '',
    max_capacity: team?.max_capacity || 5,
    is_active: team?.is_active ?? true
  })
  
  const [users, setUsers] = useState<User[]>([])
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    loadUsers()
    if (team) {
      loadTeamMembers()
    }
  }, [team])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, department')
        .neq('role', 'admin')
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadTeamMembers = async () => {
    if (!team) return

    try {
      const { data, error } = await supabase
        .from('assembly_team_members')
        .select('user_id')
        .eq('team_id', team.id)

      if (error) throw error
      setTeamMembers(data?.map(m => m.user_id) || [])
    } catch (err: any) {
      console.error('Error loading team members:', err)
    }
  }

  useEffect(() => {
    // Filter out users who are already team members
    const memberIds = teamMembers
    setAvailableUsers(users.filter(user => !memberIds.includes(user.id)))
  }, [users, teamMembers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const teamData = {
        name: formData.name,
        description: formData.description || null,
        team_leader_id: formData.team_leader_id || null,
        specialization: formData.specialization || null,
        max_capacity: formData.max_capacity,
        is_active: formData.is_active
      }

      let teamId: string

      if (team) {
        // Update existing team
        const { data, error } = await supabase
          .from('assembly_teams')
          .update(teamData)
          .eq('id', team.id)
          .select('id')
          .single()

        if (error) throw error
        teamId = data.id
      } else {
        // Create new team
        const { data, error } = await supabase
          .from('assembly_teams')
          .insert([teamData])
          .select('id')
          .single()

        if (error) throw error
        teamId = data.id
      }

      // Update team members
      if (team) {
        // Remove all existing members
        await supabase
          .from('assembly_team_members')
          .delete()
          .eq('team_id', teamId)

        // Add new members
        if (teamMembers.length > 0) {
          const memberData = teamMembers.map(userId => ({
            team_id: teamId,
            user_id: userId,
            role: userId === formData.team_leader_id ? 'leader' : 'member'
          }))

          const { error: memberError } = await supabase
            .from('assembly_team_members')
            .insert(memberData)

          if (memberError) throw memberError
        }
      } else {
        // Add members for new team
        if (teamMembers.length > 0) {
          const memberData = teamMembers.map(userId => ({
            team_id: teamId,
            user_id: userId,
            role: userId === formData.team_leader_id ? 'leader' : 'member'
          }))

          const { error: memberError } = await supabase
            .from('assembly_team_members')
            .insert(memberData)

          if (memberError) throw memberError
        }
      }

      onTeamSaved()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTeamMember = (userId: string) => {
    setTeamMembers(prev => [...prev, userId])
  }

  const removeTeamMember = (userId: string) => {
    setTeamMembers(prev => prev.filter(id => id !== userId))
  }

  const getTeamMember = (userId: string) => {
    return users.find(user => user.id === userId)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {team ? 'Ekibi Düzenle' : 'Yeni Montaj Ekibi'}
              </h3>
              <p className="text-gray-600 text-sm">
                {team ? 'Mevcut ekip bilgilerini güncelleyin' : 'Saha montajı için yeni ekip oluşturun'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Temel Bilgiler */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Temel Bilgiler</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ekip Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: A Takımı, Uzman Montaj Ekibi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maksimum Kapasite
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_capacity}
                  onChange={(e) => handleInputChange('max_capacity', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ekip hakkında detaylı bilgi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uzmanlık Alanı
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => handleInputChange('specialization', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Çelik Konstrüksiyon, Betonarme, Elektrik"
              />
            </div>
          </div>

          {/* Ekip Lideri */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Ekip Lideri</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ekip Lideri Seç
              </label>
              <select
                value={formData.team_leader_id}
                onChange={(e) => handleInputChange('team_leader_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Ekip lideri seçin</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email} {user.department && `(${user.department})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ekip Üyeleri */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Ekip Üyeleri</h4>
            
            {/* Mevcut Üyeler */}
            {teamMembers.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Mevcut Üyeler ({teamMembers.length}/{formData.max_capacity})</h5>
                <div className="space-y-2">
                  {teamMembers.map(userId => {
                    const user = getTeamMember(userId)
                    if (!user) return null
                    
                    return (
                      <div key={userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || user.email}</p>
                            <p className="text-sm text-gray-500">{user.department || 'Departman belirtilmemiş'}</p>
                          </div>
                          {userId === formData.team_leader_id && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                              Lider
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(userId)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <UserMinus className="w-5 h-5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Kullanıcı Ekleme */}
            {teamMembers.length < formData.max_capacity && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Kullanıcı Ekle</h5>
                {loadingUsers ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || user.email}</p>
                            <p className="text-sm text-gray-500">{user.department || 'Departman belirtilmemiş'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addTeamMember(user.id)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {availableUsers.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        Eklenecek kullanıcı bulunamadı
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Durum */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Durum</h4>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Ekip aktif
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Kaydediliyor...' : (team ? 'Güncelle' : 'Oluştur')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
