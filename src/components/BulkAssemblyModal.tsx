import React, { useState } from 'react'
import { X, Plus, Trash2, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface BulkAssemblyModalProps {
  projectId: string
  onClose: () => void
  onAssembliesAdded: () => void
}

interface AssemblyRow {
  pozCode: string
  description: string
  quantity: string
  weight: string
}

export function BulkAssemblyModal({ projectId, onClose, onAssembliesAdded }: BulkAssemblyModalProps) {
  const [assemblies, setAssemblies] = useState<AssemblyRow[]>([
    { pozCode: '', description: '', quantity: '', weight: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addRow = () => {
    setAssemblies(prev => [...prev, { pozCode: '', description: '', quantity: '', weight: '' }])
  }

  const removeRow = (index: number) => {
    if (assemblies.length > 1) {
      setAssemblies(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updateRow = (index: number, field: keyof AssemblyRow, value: string) => {
    setAssemblies(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const validAssemblies = assemblies.filter(a => 
        a.pozCode.trim() && a.quantity.trim() && !isNaN(Number(a.quantity))
      )

      if (validAssemblies.length === 0) {
        setError('En az bir geçerli montaj parçası girmelisiniz')
        return
      }

      const assembliesToInsert = validAssemblies.map(assembly => ({
        project_id: projectId,
        poz_code: assembly.pozCode.trim(),
        description: assembly.description.trim(),
        total_quantity: parseInt(assembly.quantity),
        weight_per_unit: parseFloat(assembly.weight) || 0
      }))

      const { error } = await supabase
        .from('assemblies')
        .insert(assembliesToInsert)

      if (error) throw error

      onAssembliesAdded()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasteData = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const rows = pastedText.split('\n').filter(row => row.trim())
    
    const newAssemblies: AssemblyRow[] = rows.map(row => {
      const columns = row.split('\t')
      return {
        pozCode: columns[0] || '',
        description: columns[1] || '',
        quantity: columns[2] || '',
        weight: columns[3] || ''
      }
    })

    if (newAssemblies.length > 0) {
      setAssemblies(newAssemblies)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Toplu Montaj Parçası Ekle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Upload className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Excel'den Yapıştırma İpucu:</p>
                <p>Excel'de Poz Kodu, Açıklama, Adet ve Birim Ağırlık sütunlarını seçip kopyalayın (Ctrl+C), sonra aşağıdaki tabloya yapıştırın (Ctrl+V).</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="overflow-x-auto max-h-96 border border-gray-200 rounded-lg">
              <table className="w-full" onPaste={handlePasteData}>
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Poz Kodu *</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Açıklama</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Adet *</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Birim Ağırlık (kg)</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assemblies.map((assembly, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={assembly.pozCode}
                          onChange={(e) => updateRow(index, 'pozCode', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="A-01"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={assembly.description}
                          onChange={(e) => updateRow(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Montaj parçası açıklaması"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={assembly.quantity}
                          onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.001"
                          value={assembly.weight}
                          onChange={(e) => updateRow(index, 'weight', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.000"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          disabled={assemblies.length === 1}
                          className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Satır Ekle</span>
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : `${assemblies.filter(a => a.pozCode.trim()).length} Parça Kaydet`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}