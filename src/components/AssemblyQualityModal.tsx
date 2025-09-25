import React, { useState } from 'react'
import { X, Shield, Save, Camera, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AssemblyQualityModalProps {
  task: {
    id: string
    task_name: string
    assembly?: {
      poz_code: string
      description: string
    }
  }
  onClose: () => void
  onQualitySaved: () => void
}

export function AssemblyQualityModal({ 
  task, 
  onClose, 
  onQualitySaved 
}: AssemblyQualityModalProps) {
  const [formData, setFormData] = useState({
    check_type: 'during_assembly' as 'pre_assembly' | 'during_assembly' | 'post_assembly' | 'final_inspection',
    is_passed: true,
    check_notes: '',
    issues_found: '',
    corrective_actions: '',
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
          const filePath = `assembly-quality/${task.id}/${fileName}`

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

      // Create quality check entry
      const qualityData = {
        assembly_task_id: task.id,
        checker_id: (await supabase.auth.getUser()).data.user?.id,
        check_type: formData.check_type,
        is_passed: formData.is_passed,
        check_notes: formData.check_notes || null,
        issues_found: formData.issues_found ? formData.issues_found.split(',').map(s => s.trim()).filter(s => s) : [],
        corrective_actions: formData.corrective_actions ? formData.corrective_actions.split(',').map(s => s.trim()).filter(s => s) : [],
        photos: photoUrls
      }

      const { error } = await supabase
        .from('assembly_quality_checks')
        .insert([qualityData])

      if (error) throw error

      onQualitySaved()
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

  const getCheckTypeText = (type: string) => {
    switch (type) {
      case 'pre_assembly': return 'Montaj Öncesi Kontrol'
      case 'during_assembly': return 'Montaj Sırası Kontrol'
      case 'post_assembly': return 'Montaj Sonrası Kontrol'
      case 'final_inspection': return 'Final Kontrol'
      default: return type
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Kalite Kontrolü</h3>
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
            </div>
          </div>

          {/* Kontrol Türü */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Kontrol Bilgileri</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kontrol Türü *
              </label>
              <select
                required
                value={formData.check_type}
                onChange={(e) => handleInputChange('check_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pre_assembly">Montaj Öncesi Kontrol</option>
                <option value="during_assembly">Montaj Sırası Kontrol</option>
                <option value="post_assembly">Montaj Sonrası Kontrol</option>
                <option value="final_inspection">Final Kontrol</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kontrol Sonucu *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="is_passed"
                    checked={formData.is_passed === true}
                    onChange={() => handleInputChange('is_passed', true)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <span className="ml-2 flex items-center text-green-700">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Başarılı
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="is_passed"
                    checked={formData.is_passed === false}
                    onChange={() => handleInputChange('is_passed', false)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-2 flex items-center text-red-700">
                    <XCircle className="w-4 h-4 mr-1" />
                    Başarısız
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Kontrol Notları */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Kontrol Detayları</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kontrol Notları *
              </label>
              <textarea
                required
                value={formData.check_notes}
                onChange={(e) => handleInputChange('check_notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kontrol sırasında yapılan gözlemler ve ölçümler..."
              />
            </div>

            {!formData.is_passed && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tespit Edilen Sorunlar
                  </label>
                  <input
                    type="text"
                    value={formData.issues_found}
                    onChange={(e) => handleInputChange('issues_found', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Boyut hatası, kaynak kalitesi, yüzey pürüzlülüğü (virgülle ayırın)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Düzeltme Eylemleri
                  </label>
                  <input
                    type="text"
                    value={formData.corrective_actions}
                    onChange={(e) => handleInputChange('corrective_actions', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Yeniden işleme, kaynak düzeltme, boyama (virgülle ayırın)"
                  />
                </div>
              </>
            )}
          </div>

          {/* Kalite Standartları Kontrol Listesi */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Kalite Standartları Kontrol Listesi</h4>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Boyut toleransları kontrol edildi</span>
                  <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Kaynak kalitesi kontrol edildi</span>
                  <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Yüzey pürüzlülüğü uygun</span>
                  <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Paslanmazlık kontrolü yapıldı</span>
                  <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Montaj doğruluğu kontrol edildi</span>
                  <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Güvenlik standartları sağlandı</span>
                  <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Fotoğraf Yükleme */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Kontrol Fotoğrafları</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kalite Kontrol Fotoğrafları
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Kontrol fotoğraflarını sürükleyip bırakın veya seçin
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="quality-photo-upload"
                  />
                  <label
                    htmlFor="quality-photo-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 mr-2" />
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>
                {saving ? 'Kaydediliyor...' : 
                 uploadingPhotos ? 'Fotoğraflar yükleniyor...' : 'Kontrol Kaydet'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
