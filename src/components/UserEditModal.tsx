import React, { useState, useEffect } from 'react'
import { X, User, Mail, Phone, MapPin, Building, Calendar, Shield, Eye, EyeOff, Save, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type UserProfile = Database['public']['Tables']['users']['Row']

interface UserEditModalProps {
  user: UserProfile
  onClose: () => void
  onUserUpdated: () => void
}

export function UserEditModal({ user, onClose, onUserUpdated }: UserEditModalProps) {
  const { user: currentUser, userProfile } = useAuth()
  const isAdmin = userProfile?.role === 'admin'
  
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    department: user.department || '',
    role: user.role || 'user'
  })
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'permissions'>('profile')
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  // Veri validasyonu
  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    // İsim validasyonu
    if (!formData.full_name?.trim()) {
      errors.full_name = 'İsim zorunludur'
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = 'İsim en az 2 karakter olmalıdır'
    } else if (formData.full_name.trim().length > 50) {
      errors.full_name = 'İsim en fazla 50 karakter olabilir'
    }

    // Email validasyonu
    if (!formData.email?.trim()) {
      errors.email = 'Email adresi zorunludur'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Geçerli bir email adresi girin'
    } else if (formData.email.trim().length > 100) {
      errors.email = 'Email adresi en fazla 100 karakter olabilir'
    }

    // Departman validasyonu
    if (formData.department?.trim() && formData.department.trim().length > 50) {
      errors.department = 'Departman en fazla 50 karakter olabilir'
    }

    // Rol validasyonu
    if (!formData.role) {
      errors.role = 'Rol seçin'
    } else if (!['admin', 'manager', 'user'].includes(formData.role)) {
      errors.role = 'Geçerli bir rol seçin'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Şifre validasyonu
  const validatePassword = () => {
    const errors: {[key: string]: string} = {}

    if (passwordData.newPassword) {
      if (passwordData.newPassword.length < 8) {
        errors.newPassword = 'Şifre en az 8 karakter olmalıdır'
      } else if (passwordData.newPassword.length > 100) {
        errors.newPassword = 'Şifre en fazla 100 karakter olabilir'
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
        errors.newPassword = 'Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        errors.confirmPassword = 'Şifreler eşleşmiyor'
      }
    }

    setValidationErrors(prev => ({ ...prev, ...errors }))
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    setValidationErrors({})

    // Form validasyonu
    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      console.log('=== USER UPDATE DEBUG ===')
      console.log('Updating user:', user.id, 'with data:', formData)
      console.log('Current user ID:', currentUser?.id)
      console.log('Current user profile:', userProfile)
      console.log('Is admin:', isAdmin)
      console.log('Can update:', isAdmin || currentUser?.id === user.id)
      console.log('========================')
      
      // Admin can update any user, regular users can only update themselves
      if (!isAdmin && currentUser?.id !== user.id) {
        throw new Error('Bu kullanıcıyı güncelleme yetkiniz yok')
      }
      
      // Update user profile (email is not updatable from users table)
      const { data: updateData, error: profileError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          department: formData.department,
          role: formData.role as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()

      console.log('Update result:', { data: updateData, error: profileError })

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw profileError
      }

      // Update password if provided
      if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          throw new Error('Şifreler eşleşmiyor')
        }

        if (passwordData.newPassword.length < 6) {
          throw new Error('Şifre en az 6 karakter olmalıdır')
        }

        // Admin can update passwords, regular users cannot
        if (isAdmin) {
          try {
            const { error: passwordError } = await supabase.auth.admin.updateUserById(
              user.id,
              { password: passwordData.newPassword }
            )

            if (passwordError) {
              console.error('Password update error:', passwordError)
              throw new Error(`Şifre güncellenemedi: ${passwordError.message}`)
            }
            
            setSuccess('Kullanıcı ve şifre başarıyla güncellendi')
          } catch (passwordErr: any) {
            console.error('Password update failed:', passwordErr)
            setSuccess('Profil güncellendi. Şifre güncellenemedi.')
          }
        } else {
          setSuccess('Profil güncellendi. Şifre güncelleme için admin yetkisi gereklidir.')
        }
      } else {
        setSuccess('Kullanıcı başarıyla güncellendi')
      }
      setTimeout(() => {
        onUserUpdated()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Deleting user:', user.id)
      console.log('Current user is admin:', isAdmin)
      
      // Check if current user can delete this user
      if (!isAdmin) {
        throw new Error('Kullanıcı silme yetkiniz yok')
      }
      
      // Prevent admin from deleting themselves
      if (currentUser?.id === user.id) {
        throw new Error('Kendinizi silemezsiniz')
      }
      
      // Delete user from users table
      const { data: deleteData, error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
        .select()

      console.log('Delete result:', { data: deleteData, error })

      if (error) {
        console.error('Delete error:', error)
        throw new Error(`Kullanıcı silinemedi: ${error.message}`)
      }

      setSuccess('Kullanıcı başarıyla silindi')
      setTimeout(() => {
        onUserUpdated()
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Delete user error:', err)
      setError(err.message || 'Kullanıcı silinirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'user': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield
      case 'manager': return Building
      case 'user': return User
      default: return User
    }
  }

  const RoleIcon = getRoleIcon(formData.role)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Kullanıcı Düzenle</h2>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profil Bilgileri', icon: User },
              { id: 'security', label: 'Güvenlik', icon: Shield },
              { id: 'permissions', label: 'İzinler', icon: Building }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Ad Soyad *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.full_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Kullanıcı adı"
                    />
                    {validationErrors.full_name && (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      E-posta *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      placeholder="kullanici@email.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      E-posta adresi değiştirilemez
                    </p>
                  </div>



                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="w-4 h-4 inline mr-2" />
                      Departman
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.department ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Departman seçin</option>
                      <option value="İmalat">İmalat</option>
                      <option value="Kalite">Kalite</option>
                      <option value="Mühendislik">Mühendislik</option>
                      <option value="Satış">Satış</option>
                      <option value="İnsan Kaynakları">İnsan Kaynakları</option>
                      <option value="Muhasebe">Muhasebe</option>
                      <option value="IT">IT</option>
                      <option value="Yönetim">Yönetim</option>
                    </select>
                    {validationErrors.department && (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.department}</p>
                    )}
                  </div>








                </div>


              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-medium text-yellow-800">Şifre Değiştirme</h3>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Yeni şifre belirlemek için aşağıdaki alanları doldurun. Boş bırakırsanız mevcut şifre korunur.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yeni Şifre
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {isAdmin ? 'Admin olarak şifre güncelleyebilirsiniz' : 'Şifre güncelleme için admin yetkisi gereklidir'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Şifre Tekrar
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-red-800">Tehlikeli Bölge</h3>
                      <p className="text-sm text-red-700 mt-1">
                        Bu kullanıcıyı deaktive etmek için aşağıdaki butona tıklayın.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Kullanıcıyı Sil</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Kullanıcı Rolü
                  </label>
                  {!isAdmin && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-700">
                        Rol değiştirme yetkiniz yok. Sadece admin kullanıcılar rol değiştirebilir.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { value: 'user', label: 'Kullanıcı', description: 'Temel işlemler', color: 'bg-gray-100 text-gray-800' },
                      { value: 'manager', label: 'Yönetici', description: 'Proje yönetimi', color: 'bg-blue-100 text-blue-800' },
                      { value: 'admin', label: 'Admin', description: 'Tam yetki', color: 'bg-red-100 text-red-800' }
                    ].map((role) => (
                      <div
                        key={role.value}
                        className={`p-4 border-2 rounded-lg transition-colors ${
                          formData.role === role.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        } ${isAdmin ? 'cursor-pointer hover:border-gray-300' : 'opacity-50 cursor-not-allowed'}`}
                        onClick={isAdmin ? () => setFormData(prev => ({ ...prev, role: role.value as any })) : undefined}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="role"
                            value={role.value}
                            checked={formData.role === role.value}
                            onChange={handleChange}
                            disabled={!isAdmin}
                            className={`w-4 h-4 text-blue-600 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{role.label}</h3>
                            <p className="text-sm text-gray-600">{role.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">Rol Yetkileri</h3>
                  <div className="space-y-2 text-sm">
                    {formData.role === 'admin' && (
                      <>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Tüm projeleri görüntüleme ve düzenleme</span>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Kullanıcı yönetimi</span>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Sistem ayarları</span>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Performans analizi</span>
                        </div>
                      </>
                    )}
                    {formData.role === 'manager' && (
                      <>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Atanan projeleri yönetme</span>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Görev atama</span>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>İlerleme takibi</span>
                        </div>
                      </>
                    )}
                    {formData.role === 'user' && (
                      <>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>Atanan görevleri görüntüleme</span>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>İlerleme kaydetme</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <RoleIcon className="w-4 h-4" />
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(formData.role)}`}>
                {formData.role === 'admin' ? 'Admin' : formData.role === 'manager' ? 'Yönetici' : 'Kullanıcı'}
              </span>

            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
