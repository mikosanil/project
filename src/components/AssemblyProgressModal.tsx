import React, { useState } from 'react'
import { X, Clock, Camera, Save, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AssemblyProgressModalProps {
  task: {
    id: string
    task_name: string
    assembly?: {
      poz_code: string
      description: string
    }
    location?: {
      name: string
      address: string
    }
    team?: {
      name: string
    }
  }
  onClose: () => void
  onProgressSaved: () => void
}

export function AssemblyProgressModal({ 
  task, 
  onClose, 
  onProgressSaved 
}: AssemblyProgressModalProps) {
  const [formData, setFormData] = useState({
    progress_percentage: 0,
    work_description: '',
    work_hours: 0,
    weather_conditions: '',
    equipment_used: '',
    materials_used: '',
    issues_encountered: '',
    solutions_applied: '',
    quality_notes: '',
    photos: [] as File[]
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Upload photos first
      let photoUrls: string[] = []
      if (formData.photos.length > 0) {
        setUploadingPhotos(true)
        const uploadPromises = formData.photos.map(async (photo) => {
          const fileExt = photo.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `assembly-progress/${task.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('assembly-docs')
            .upload(filePath, photo)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('assembly-docs')
            .getPublicUrl(filePath)

          return {
            url: publicUrl,
            name: photo.name,
            size: photo.size,
            type: photo.type
          }
        })

        photoUrls = await Promise.all(uploadPromises)
        setUploadingPhotos(false)
      }

      // Create progress entry
      const progressData = {
        assembly_task_id: task.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        progress_percentage: formData.progress_percentage,
        work_description: formData.work_description,
        work_hours: formData.work_hours,
        weather_conditions: formData.weather_conditions || null,
        equipment_used: formData.equipment_used ? formData.equipment_used.split(',').map(s => s.trim()).filter(s => s) : [],
        materials_used: formData.materials_used ? formData.materials_used.split(',').map(s => s.trim()).filter(s => s) : [],
        issues_encountered: formData.issues_encountered || null,
        solutions_applied: formData.solutions_applied || null,
        quality_notes: formData.quality_notes || null,
        photos: photoUrls
      }

      const { error } = await supabase
        .from('assembly_progress_entries')
        .insert([progressData])

      if (error) throw error

      onProgressSaved()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
      setUploadingPhotos(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...files] }))
    }
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      photos: prev.photos.filter((_, i) => i !== index) 
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">İlerleme Kaydı</h3>
              <p className="text-gray-600 text-sm">{task.task_name}</p>
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
          {/* Görev Bilgileri */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Görev Bilgileri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Parça:</span>
                <span className="ml-2 font-medium">{task.assembly?.poz_code}</span>
              </div>
              <div>
                <span className="text-gray-600">Açıklama:</span>
                <span className="ml-2 font-medium">{task.assembly?.description}</span>
              </div>
              {task.location && (
                <div>
                  <span className="text-gray-600">Lokasyon:</span>
                  <span className="ml-2 font-medium">{task.location.name}</span>
                </div>
              )}
              {task.team && (
                <div>
                  <span className="text-gray-600">Ekip:</span>
                  <span className="ml-2 font-medium">{task.team.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* İlerleme Bilgileri */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">İlerleme Bilgileri</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İlerleme Yüzdesi *
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) => handleInputChange('progress_percentage', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-blue-600 w-12 text-center">
                    {formData.progress_percentage}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Çalışma Saati *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={formData.work_hours}
                  onChange={(e) => handleInputChange('work_hours', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yapılan İş Açıklaması *
              </label>
              <textarea
                required
                value={formData.work_description}
                onChange={(e) => handleInputChange('work_description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bugün yapılan işleri detaylı olarak açıklayın..."
              />
            </div>
          </div>

          {/* Çevre Koşulları */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Çevre Koşulları</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hava Durumu
              </label>
              <select
                value={formData.weather_conditions}
                onChange={(e) => handleInputChange('weather_conditions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Hava durumu seçin</option>
                <option value="sunny">Güneşli</option>
                <option value="cloudy">Bulutlu</option>
                <option value="rainy">Yağmurlu</option>
                <option value="windy">Rüzgarlı</option>
                <option value="foggy">Sisli</option>
                <option value="snowy">Karlı</option>
                <option value="stormy">Fırtınalı</option>
              </select>
            </div>
          </div>

          {/* Kullanılan Ekipman ve Malzemeler */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Kullanılan Ekipman ve Malzemeler</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanılan Ekipmanlar
                </label>
                <input
                  type="text"
                  value={formData.equipment_used}
                  onChange={(e) => handleInputChange('equipment_used', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Vinc, forklift, matkap (virgülle ayırın)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanılan Malzemeler
                </label>
                <input
                  type="text"
                  value={formData.materials_used}
                  onChange={(e) => handleInputChange('materials_used', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Çelik profil, cıvata, kaynak elektrodu (virgülle ayırın)"
                />
              </div>
            </div>
          </div>

          {/* Sorunlar ve Çözümler */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Sorunlar ve Çözümler</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Karşılaşılan Sorunlar
              </label>
              <textarea
                value={formData.issues_encountered}
                onChange={(e) => handleInputChange('issues_encountered', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Çalışma sırasında karşılaşılan sorunları açıklayın..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uygulanan Çözümler
              </label>
              <textarea
                value={formData.solutions_applied}
                onChange={(e) => handleInputChange('solutions_applied', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sorunlara uygulanan çözümleri açıklayın..."
              />
            </div>
          </div>

          {/* Kalite Notları */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Kalite Notları</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kalite Kontrol Notları
              </label>
              <textarea
                value={formData.quality_notes}
                onChange={(e) => handleInputChange('quality_notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kalite kontrolü ile ilgili gözlemler ve notlar..."
              />
            </div>
          </div>

          {/* Fotoğraf Yükleme */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Fotoğraflar</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İlerleme Fotoğrafları
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Fotoğrafları sürükleyip bırakın veya seçin
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Fotoğraf Seç
                  </label>
                </div>
              </div>
            </div>

            {/* Seçilen Fotoğraflar */}
            {formData.photos.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Seçilen Fotoğraflar</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="text-white hover:text-red-400 transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">{photo.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(photo.size)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              disabled={saving || uploadingPhotos}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>
                {saving ? 'Kaydediliyor...' : 
                 uploadingPhotos ? 'Fotoğraflar yükleniyor...' : 'İlerleme Kaydet'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
