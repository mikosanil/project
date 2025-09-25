import React, { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Assembly {
  id: string
  project_id: string
  stage_id?: string
  part_number: string
  description: string
  total_quantity: number
  completed_quantity: number
  unit: string
  weight_per_unit?: number
  material?: string
  created_at: string
  updated_at: string
}

interface EditAssemblyModalProps {
  assembly: Assembly
  stages: Array<{ id: string; stage_name: string }>
  onClose: () => void
  onAssemblyUpdated: () => void
}

export function EditAssemblyModal({ assembly, stages, onClose, onAssemblyUpdated }: EditAssemblyModalProps) {
  const [formData, setFormData] = useState({
    part_number: assembly.part_number || '',
    description: assembly.description || '',
    total_quantity: assembly.total_quantity || 1,
    weight_per_unit: assembly.weight_per_unit || 0,
    stage_id: assembly.stage_id || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('assemblies')
        .update({
          part_number: formData.part_number,
          description: formData.description,
          total_quantity: formData.total_quantity,
          weight_per_unit: formData.weight_per_unit > 0 ? formData.weight_per_unit : null,
          stage_id: formData.stage_id
        })
        .eq('id', assembly.id)

      if (error) {
        if (error.code === 'PGRST204') {
          setError('Veritabanı tablosu bulunamadı. Lütfen DATABASE_SETUP.md dosyasını kontrol edin.')
        } else {
          setError(`Hata: ${error.message}`)
        }
        return
      }

      onAssemblyUpdated()
      onClose()
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Poz Düzenle</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poz No
            </label>
            <input
              type="text"
              value={formData.part_number}
              onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Miktar
            </label>
            <input
              type="number"
              min="1"
              value={formData.total_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Birim Ağırlık (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.weight_per_unit}
              onChange={(e) => setFormData(prev => ({ ...prev, weight_per_unit: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Opsiyonel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aşama
            </label>
            <select
              value={formData.stage_id}
              onChange={(e) => setFormData(prev => ({ ...prev, stage_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Aşama Seçin</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.stage_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}