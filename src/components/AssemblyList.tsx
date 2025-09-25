import React from 'react'
import { Package, Edit2, Trash2, Plus } from 'lucide-react'
import { useState } from 'react'
import { EditAssemblyModal } from './EditAssemblyModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Database } from '../lib/supabase'

type Assembly = Database['public']['Tables']['assemblies']['Row']

interface AssemblyListProps {
  projectId: string
  assemblies: Assembly[]
  onAssemblyUpdate: () => void
  canEdit?: boolean
}

export function AssemblyList({ projectId, assemblies, onAssemblyUpdate, canEdit = false }: AssemblyListProps) {
  const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null)
  const [showNewAssembly, setShowNewAssembly] = useState(false)
  const { isAdmin } = useAuth()

  const handleDelete = async (assemblyId: string) => {
    if (!confirm('Bu montaj parçasını silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('assemblies')
        .delete()
        .eq('id', assemblyId)

      if (error) throw error
      onAssemblyUpdate()
    } catch (error) {
      console.error('Error deleting assembly:', error)
      alert('Montaj parçası silinirken hata oluştu')
    }
  }

  const handleAssemblyUpdated = () => {
    setEditingAssembly(null)
    setShowNewAssembly(false)
    onAssemblyUpdate()
  }

  if (assemblies.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz montaj parçası yok</h3>
        <p className="text-gray-600">Projeniz için montaj parçalarını ekleyin ve imalat takibine başlayın.</p>
        {canEdit && (
          <button
            onClick={() => setShowNewAssembly(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>İlk Parçayı Ekle</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Poz Kodu</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Açıklama</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Toplam Adet</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Birim Ağırlık (kg)</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Toplam Ağırlık (kg)</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {assemblies.map((assembly) => (
              <tr key={assembly.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">{assembly.poz_code}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-700">{assembly.description || '-'}</td>
                <td className="py-3 px-4 text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                    {assembly.total_quantity}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-gray-700">
                  {assembly.weight_per_unit ? assembly.weight_per_unit.toFixed(3) : '0.000'}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {((assembly.weight_per_unit || 0) * assembly.total_quantity).toFixed(2)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {canEdit && (
                      <>
                        <button 
                          onClick={() => setEditingAssembly(assembly)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                      <Edit2 className="w-4 h-4" />
                    </button>
                        <button 
                          onClick={() => handleDelete(assembly.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                      <Trash2 className="w-4 h-4" />
                    </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Toplam {assemblies.length} montaj parçası
      </div>

      {/* Modals */}
      {editingAssembly && (
        <EditAssemblyModal
          assembly={editingAssembly}
          onClose={() => setEditingAssembly(null)}
          onAssemblyUpdated={handleAssemblyUpdated}
        />
      )}

      {showNewAssembly && (
        <EditAssemblyModal
          projectId={projectId}
          onClose={() => setShowNewAssembly(false)}
          onAssemblyUpdated={handleAssemblyUpdated}
        />
      )}
    </div>
  )
}