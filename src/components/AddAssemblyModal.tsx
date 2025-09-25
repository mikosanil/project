import React, { useState } from 'react'
import { X, Plus, Package, Hash, FileText, Weight, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AddAssemblyModalProps {
  projectId: string
  stageId: string
  onClose: () => void
  onAssemblyAdded: () => void
}

export function AddAssemblyModal({ projectId, stageId, onClose, onAssemblyAdded }: AddAssemblyModalProps) {
  const [partNumber, setPartNumber] = useState('')
  const [description, setDescription] = useState('')
  const [totalQuantity, setTotalQuantity] = useState('')
  const [weightPerUnit, setWeightPerUnit] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!partNumber || !description || !totalQuantity) {
      alert('Lütfen poz numarası, açıklama ve miktar alanlarını doldurun')
      return
    }

    try {
      setLoading(true)
      
      const { error } = await supabase
        .from('assemblies')
        .insert({
          project_id: projectId,
          stage_id: stageId,
          part_number: partNumber,
          description: description,
          total_quantity: parseInt(totalQuantity),
          completed_quantity: 0,
          unit: 'adet',
          weight_per_unit: weightPerUnit ? parseFloat(weightPerUnit) : null,
          material: null,
          poz_code: partNumber // poz_code olarak part_number kullan
        })

      if (error) throw error

      alert('Poz başarıyla eklendi!')
      onAssemblyAdded()
      onClose()
    } catch (error: any) {
      console.error('Error adding assembly:', error)
      alert(`Poz eklenirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Yeni Poz Ekle</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Part Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Poz Numarası *
            </label>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Örn: P001, K001, M001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Açıklama *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Poz açıklaması"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Package className="w-4 h-4 inline mr-1" />
              Miktar *
            </label>
            <input
              type="number"
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(e.target.value)}
              placeholder="0"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Weight per Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Weight className="w-4 h-4 inline mr-1" />
              Birim Ağırlık (kg)
            </label>
            <input
              type="number"
              value={weightPerUnit}
              onChange={(e) => setWeightPerUnit(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <span>Poz Ekle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
