import React, { useState } from 'react'
import { X, Plus, Calendar, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AddStageModalProps {
  projectId: string
  onClose: () => void
  onStageAdded: () => void
}

const STAGE_OPTIONS = [
  { value: 'kesim', label: 'Kesim', order: 1 },
  { value: 'imalat', label: 'İmalat', order: 2 },
  { value: 'kaynak', label: 'Kaynak', order: 3 },
  { value: 'boya', label: 'Boya', order: 4 }
]

export function AddStageModal({ projectId, onClose, onStageAdded }: AddStageModalProps) {
  const [stageName, setStageName] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stageName) {
      alert('Lütfen aşama adı seçin')
      return
    }

    try {
      setLoading(true)
      
      const selectedStage = STAGE_OPTIONS.find(s => s.value === stageName)
      
      const { error } = await supabase
        .from('project_stages')
        .insert({
          project_id: projectId,
          stage_name: stageName,
          stage_order: selectedStage?.order || 1,
          target_completion_date: targetDate || null,
          notes: notes || null,
          status: 'pending'
        })

      if (error) throw error

      alert('Aşama başarıyla eklendi!')
      onStageAdded()
      onClose()
    } catch (error: any) {
      console.error('Error adding stage:', error)
      
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        const shouldShowGuide = confirm(
          'Veritabanı tablosu henüz oluşturulmamış.\n\n' +
          'Kurulum rehberini görmek ister misiniz?'
        )
        if (shouldShowGuide) {
          window.open('DATABASE_SETUP.md', '_blank')
        }
      } else if (error.message?.includes('permission denied') || error.message?.includes('insufficient_privilege')) {
        alert('Bu işlem için yetkiniz bulunmuyor.')
      } else {
        alert(`Aşama eklenirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Yeni Aşama Ekle</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Stage Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aşama Türü *
            </label>
            <select
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Aşama seçin</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Hedef Tamamlanma Tarihi
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Aşama hakkında notlar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Ekleniyor...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Aşama Ekle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
