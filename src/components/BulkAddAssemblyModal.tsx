import React, { useState } from 'react'
import { X, Plus, Upload, Download, Package, Hash, FileText, Clipboard, Trash2, Weight } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface BulkAddAssemblyModalProps {
  projectId: string
  stageId: string
  onClose: () => void
  onAssembliesAdded: () => void
}

interface AssemblyData {
  partNumber: string
  description: string
  totalQuantity: number
  weightPerUnit?: number
}

export function BulkAddAssemblyModal({ projectId, stageId, onClose, onAssembliesAdded }: BulkAddAssemblyModalProps) {
  const [assemblies, setAssemblies] = useState<AssemblyData[]>([
    { partNumber: '', description: '', totalQuantity: 1, weightPerUnit: undefined }
  ])
  const [loading, setLoading] = useState(false)
  const [excelData, setExcelData] = useState('')

  const addAssembly = () => {
    setAssemblies([...assemblies, { partNumber: '', description: '', totalQuantity: 1, weightPerUnit: undefined }])
  }

  const removeAssembly = (index: number) => {
    if (assemblies.length > 1) {
      setAssemblies(assemblies.filter((_, i) => i !== index))
    }
  }

  const updateAssembly = (index: number, field: keyof AssemblyData, value: any) => {
    const updated = [...assemblies]
    updated[index] = { ...updated[index], [field]: value }
    setAssemblies(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validasyon
    const validAssemblies = assemblies.filter(a => a.partNumber && a.description && a.totalQuantity > 0)
    if (validAssemblies.length === 0) {
      alert('En az bir geçerli poz eklemelisiniz')
      return
    }

    try {
      setLoading(true)
      
      const assemblyData = validAssemblies.map(assembly => ({
        project_id: projectId,
        stage_id: stageId,
        part_number: assembly.partNumber,
        description: assembly.description,
        total_quantity: assembly.totalQuantity,
        completed_quantity: 0,
        unit: 'adet',
        weight_per_unit: assembly.weightPerUnit || null,
        material: null,
        poz_code: assembly.partNumber // poz_code olarak part_number kullan
      }))

      const { error } = await supabase
        .from('assemblies')
        .insert(assemblyData)

      if (error) throw error

      alert(`${validAssemblies.length} poz başarıyla eklendi!`)
      onAssembliesAdded()
      onClose()
    } catch (error: any) {
      console.error('Error adding assemblies:', error)
      alert(`Pozlar eklenirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setLoading(false)
    }
  }

  const generateSampleData = () => {
    const sampleData: AssemblyData[] = [
      { partNumber: 'P001', description: 'Ana Parça 1', totalQuantity: 50, weightPerUnit: 2.5 },
      { partNumber: 'P002', description: 'Ana Parça 2', totalQuantity: 30, weightPerUnit: 1.8 },
      { partNumber: 'P003', description: 'Bağlantı Elemanı', totalQuantity: 100, weightPerUnit: 0.5 }
    ]
    setAssemblies(sampleData)
  }

  const clearAll = () => {
    setAssemblies([{ partNumber: '', description: '', totalQuantity: 1, weightPerUnit: undefined }])
  }

  const parseExcelData = () => {
    if (!excelData.trim()) {
      alert('Lütfen Excel verilerini yapıştırın')
      return
    }

    try {
      const lines = excelData.trim().split('\n')
      const parsedAssemblies: AssemblyData[] = []

      for (const line of lines) {
        const columns = line.split('\t') // Tab ile ayrılmış
        if (columns.length >= 3) {
          const partNumber = columns[0].trim()
          const description = columns[1].trim()
          const quantity = parseInt(columns[2].trim()) || 1
          
          // Kg parsing - virgül ve nokta desteği
          let weight: number | undefined = undefined
          if (columns[3] && columns[3].trim()) {
            const weightStr = columns[3].trim()
            // Virgülü noktaya çevir (Türkçe Excel formatı)
            const normalizedWeight = weightStr.replace(',', '.')
            const parsedWeight = parseFloat(normalizedWeight)
            if (!isNaN(parsedWeight) && parsedWeight > 0) {
              weight = parsedWeight
            }
          }

          if (partNumber && description) {
            parsedAssemblies.push({
              partNumber,
              description,
              totalQuantity: quantity,
              weightPerUnit: weight
            })
          }
        }
      }

      if (parsedAssemblies.length > 0) {
        setAssemblies(parsedAssemblies)
        setExcelData('')
        alert(`${parsedAssemblies.length} poz Excel'den başarıyla yüklendi!`)
      } else {
        alert('Geçerli poz verisi bulunamadı. Format: Poz No | Açıklama | Miktar | Ağırlık (opsiyonel)')
      }
    } catch (error) {
      alert('Excel verileri işlenirken hata oluştu. Lütfen formatı kontrol edin.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Toplu Poz Ekle</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Excel Import Section */}
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clipboard className="w-5 h-5 mr-2" />
            Excel'den Kopyala-Yapıştır
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excel verilerini buraya yapıştırın (Format: Poz No | Açıklama | Miktar | Ağırlık)
              </label>
              <textarea
                value={excelData}
                onChange={(e) => setExcelData(e.target.value)}
                placeholder="P001	Ana Parça 1	50	2,2&#10;P002	Ana Parça 2	30	1,8&#10;P003	Bağlantı Elemanı	100	0,5&#10;P004	Hafif Parça	25	0,3"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={parseExcelData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Clipboard className="w-4 h-4" />
                <span>Excel Verilerini Yükle</span>
              </button>
              <span className="text-sm text-gray-600">
                Excel'den kopyaladığınız verileri yukarıdaki alana yapıştırın
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={addAssembly}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Manuel Poz Ekle</span>
              </button>
              <button
                type="button"
                onClick={generateSampleData}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Örnek Veri</span>
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Temizle</span>
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Toplam {assemblies.length} poz
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {assemblies.map((assembly, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Poz #{index + 1}</h3>
                  {assemblies.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAssembly(index)}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Part Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Hash className="w-4 h-4 inline mr-1" />
                      Poz Numarası *
                    </label>
                    <input
                      type="text"
                      value={assembly.partNumber}
                      onChange={(e) => updateAssembly(index, 'partNumber', e.target.value)}
                      placeholder="P001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Açıklama *
                    </label>
                    <input
                      type="text"
                      value={assembly.description}
                      onChange={(e) => updateAssembly(index, 'description', e.target.value)}
                      placeholder="Poz açıklaması"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Package className="w-4 h-4 inline mr-1" />
                      Miktar *
                    </label>
                    <input
                      type="number"
                      value={assembly.totalQuantity}
                      onChange={(e) => updateAssembly(index, 'totalQuantity', parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Weight per Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Weight className="w-4 h-4 inline mr-1" />
                      Ağırlık (kg)
                    </label>
                    <input
                      type="number"
                      value={assembly.weightPerUnit || ''}
                      onChange={(e) => updateAssembly(index, 'weightPerUnit', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
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
                  <Upload className="w-4 h-4" />
                  <span>Toplu Poz Ekle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
