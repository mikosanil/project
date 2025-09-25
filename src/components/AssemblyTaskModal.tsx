import React, { useState, useEffect } from 'react'
import { X, Wrench, Save, Calendar, MapPin, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AssemblyTaskModalProps {
  projectId: string
  locations: Array<{
    id: string
    name: string
    address: string
  }>
  teams: Array<{
    id: string
    name: string
    specialization?: string
  }>
  onClose: () => void
  onTaskSaved: () => void
  task?: {
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
    estimated_duration_hours?: number
    weather_dependency: boolean
    special_equipment?: string[]
    safety_requirements?: string[]
    quality_standards?: string[]
  }
}

interface Assembly {
  id: string
  poz_code: string
  description: string
  total_quantity: number
  weight_per_unit?: number
}

export function AssemblyTaskModal({ 
  projectId, 
  locations, 
  teams, 
  onClose, 
  onTaskSaved, 
  task 
}: AssemblyTaskModalProps) {
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [formData, setFormData] = useState({
    assembly_id: task?.assembly_id || '',
    location_id: task?.location_id || '',
    team_id: task?.team_id || '',
    task_name: task?.task_name || '',
    description: task?.description || '',
    assembly_type: task?.assembly_type || 'field' as 'field' | 'workshop' | 'prefabricated',
    priority: task?.priority || 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    status: task?.status || 'planned' as 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled',
    planned_start_date: task?.planned_start_date ? task.planned_start_date.split('T')[0] : '',
    planned_end_date: task?.planned_end_date ? task.planned_end_date.split('T')[0] : '',
    estimated_duration_hours: task?.estimated_duration_hours || 0,
    weather_dependency: task?.weather_dependency ?? false,
    special_equipment: task?.special_equipment?.join(', ') || '',
    safety_requirements: task?.safety_requirements?.join(', ') || '',
    quality_standards: task?.quality_standards?.join(', ') || ''
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingAssemblies, setLoadingAssemblies] = useState(false)

  useEffect(() => {
    loadAssemblies()
  }, [projectId])

  const loadAssemblies = async () => {
    try {
      setLoadingAssemblies(true)
      const { data, error } = await supabase
        .from('assemblies')
        .select('id, poz_code, description, total_quantity, weight_per_unit')
        .eq('project_id', projectId)
        .order('poz_code')

      if (error) throw error
      setAssemblies(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingAssemblies(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const taskData = {
        project_id: projectId,
        assembly_id: formData.assembly_id,
        location_id: formData.location_id || null,
        team_id: formData.team_id || null,
        task_name: formData.task_name,
        description: formData.description || null,
        assembly_type: formData.assembly_type,
        priority: formData.priority,
        status: formData.status,
        planned_start_date: formData.planned_start_date ? new Date(formData.planned_start_date).toISOString() : null,
        planned_end_date: formData.planned_end_date ? new Date(formData.planned_end_date).toISOString() : null,
        estimated_duration_hours: formData.estimated_duration_hours || null,
        weather_dependency: formData.weather_dependency,
        special_equipment: formData.special_equipment ? formData.special_equipment.split(',').map(s => s.trim()).filter(s => s) : [],
        safety_requirements: formData.safety_requirements ? formData.safety_requirements.split(',').map(s => s.trim()).filter(s => s) : [],
        quality_standards: formData.quality_standards ? formData.quality_standards.split(',').map(s => s.trim()).filter(s => s) : []
      }

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from('assembly_tasks')
          .update(taskData)
          .eq('id', task.id)

        if (error) throw error
      } else {
        // Create new task
        const { error } = await supabase
          .from('assembly_tasks')
          .insert([taskData])

        if (error) throw error
      }

      onTaskSaved()
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

  const getAssemblyTypeText = (type: string) => {
    switch (type) {
      case 'field': return 'Saha Montajı'
      case 'workshop': return 'Atölye Montajı'
      case 'prefabricated': return 'Prefabrik Montaj'
      default: return type
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {task ? 'Görevi Düzenle' : 'Yeni Montaj Görevi'}
              </h3>
              <p className="text-gray-600 text-sm">
                {task ? 'Mevcut görev bilgilerini güncelleyin' : 'Saha montajı için yeni görev oluşturun'}
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
                  Montaj Parçası *
                </label>
                {loadingAssemblies ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <select
                    required
                    value={formData.assembly_id}
                    onChange={(e) => handleInputChange('assembly_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Parça seçin</option>
                    {assemblies.map(assembly => (
                      <option key={assembly.id} value={assembly.id}>
                        {assembly.poz_code} - {assembly.description} ({assembly.total_quantity} adet)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Görev Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.task_name}
                  onChange={(e) => handleInputChange('task_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: Ana Kiriş Montajı, Kolon Yerleştirme"
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
                placeholder="Görev hakkında detaylı bilgi"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montaj Türü *
                </label>
                <select
                  required
                  value={formData.assembly_type}
                  onChange={(e) => handleInputChange('assembly_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="field">Saha Montajı</option>
                  <option value="workshop">Atölye Montajı</option>
                  <option value="prefabricated">Prefabrik Montaj</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öncelik *
                </label>
                <select
                  required
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durum *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="planned">Planlandı</option>
                  <option value="in_progress">Devam Ediyor</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="on_hold">Beklemede</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lokasyon ve Ekip */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Lokasyon ve Ekip</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montaj Lokasyonu
                </label>
                <select
                  value={formData.location_id}
                  onChange={(e) => handleInputChange('location_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Lokasyon seçin</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name} - {location.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montaj Ekibi
                </label>
                <select
                  value={formData.team_id}
                  onChange={(e) => handleInputChange('team_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Ekip seçin</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} {team.specialization && `(${team.specialization})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Zamanlama */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Zamanlama</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Planlanan Başlangıç
                </label>
                <input
                  type="date"
                  value={formData.planned_start_date}
                  onChange={(e) => handleInputChange('planned_start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Planlanan Bitiş
                </label>
                <input
                  type="date"
                  value={formData.planned_end_date}
                  onChange={(e) => handleInputChange('planned_end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tahmini Süre (Saat)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.estimated_duration_hours}
                  onChange={(e) => handleInputChange('estimated_duration_hours', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="weather_dependency"
                checked={formData.weather_dependency}
                onChange={(e) => handleInputChange('weather_dependency', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="weather_dependency" className="ml-2 block text-sm text-gray-700">
                Hava durumuna bağımlı
              </label>
            </div>
          </div>

          {/* Gereksinimler */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Gereksinimler</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Özel Ekipmanlar
              </label>
              <input
                type="text"
                value={formData.special_equipment}
                onChange={(e) => handleInputChange('special_equipment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Vinc, forklift, özel aletler (virgülle ayırın)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Güvenlik Gereksinimleri
              </label>
              <input
                type="text"
                value={formData.safety_requirements}
                onChange={(e) => handleInputChange('safety_requirements', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Güvenlik kemeri, baret, iş güvenliği eğitimi (virgülle ayırın)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kalite Standartları
              </label>
              <input
                type="text"
                value={formData.quality_standards}
                onChange={(e) => handleInputChange('quality_standards', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ISO 9001, TS EN 1090, kalite kontrol listesi (virgülle ayırın)"
              />
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
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Kaydediliyor...' : (task ? 'Güncelle' : 'Oluştur')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
