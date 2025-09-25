import React, { useState } from 'react'
import { X, MapPin, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AssemblyLocationModalProps {
  projectId: string
  onClose: () => void
  onLocationSaved: () => void
  location?: {
    id: string
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
}

export function AssemblyLocationModal({ 
  projectId, 
  onClose, 
  onLocationSaved, 
  location 
}: AssemblyLocationModalProps) {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    city: location?.city || '',
    district: location?.district || '',
    lat: location?.coordinates?.lat?.toString() || '',
    lng: location?.coordinates?.lng?.toString() || '',
    contact_person: location?.contact_person || '',
    contact_phone: location?.contact_phone || '',
    contact_email: location?.contact_email || '',
    access_notes: location?.access_notes || '',
    special_requirements: location?.special_requirements || ''
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const locationData = {
        project_id: projectId,
        name: formData.name,
        address: formData.address,
        city: formData.city || null,
        district: formData.district || null,
        coordinates: (formData.lat && formData.lng) ? {
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng)
        } : null,
        contact_person: formData.contact_person || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        access_notes: formData.access_notes || null,
        special_requirements: formData.special_requirements || null
      }

      if (location) {
        // Update existing location
        const { error } = await supabase
          .from('assembly_locations')
          .update(locationData)
          .eq('id', location.id)

        if (error) throw error
      } else {
        // Create new location
        const { error } = await supabase
          .from('assembly_locations')
          .insert([locationData])

        if (error) throw error
      }

      onLocationSaved()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {location ? 'Lokasyonu Düzenle' : 'Yeni Montaj Lokasyonu'}
              </h3>
              <p className="text-gray-600 text-sm">
                {location ? 'Mevcut lokasyon bilgilerini güncelleyin' : 'Saha montajı için yeni lokasyon ekleyin'}
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
                  Lokasyon Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Örn: Ana Fabrika, Şantiye A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şehir
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="İstanbul"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adres *
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tam adres bilgisi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İlçe
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kadıköy"
              />
            </div>
          </div>

          {/* Koordinat Bilgileri */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Koordinat Bilgileri</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enlem (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => handleInputChange('lat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="41.0082"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Boylam (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.lng}
                  onChange={(e) => handleInputChange('lng', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="28.9784"
                />
              </div>
            </div>
          </div>

          {/* İletişim Bilgileri */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">İletişim Bilgileri</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İletişim Kişisi
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+90 555 123 45 67"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ahmet@example.com"
              />
            </div>
          </div>

          {/* Özel Notlar */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Özel Notlar</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Erişim Notları
              </label>
              <textarea
                value={formData.access_notes}
                onChange={(e) => handleInputChange('access_notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Ana kapıdan giriş, güvenlik kartı gerekli, 08:00-17:00 arası erişim"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Özel Gereksinimler
              </label>
              <textarea
                value={formData.special_requirements}
                onChange={(e) => handleInputChange('special_requirements', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Özel ekipman gerekli, güvenlik eğitimi şart, çevre izni gerekli"
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Kaydediliyor...' : (location ? 'Güncelle' : 'Kaydet')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
