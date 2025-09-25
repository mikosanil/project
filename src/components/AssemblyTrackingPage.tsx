import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AssemblyTracking } from './AssemblyTracking'
import type { Database } from '../lib/supabase'
import { ArrowLeft } from 'lucide-react'

type Project = Database['public']['Tables']['projects']['Row']

interface AssemblyTrackingPageProps {
  onBack?: () => void
}

export function AssemblyTrackingPage({ onBack }: AssemblyTrackingPageProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const handleSelect = (project: Project) => {
    setSelectedProjectId(project.id)
  }

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .order('created_at', { ascending: false })

        if (error) throw error
        setProjects(data || [])
      } catch (e) {
        console.error('Projeler yüklenirken hata:', e)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="mt-1 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Geri Dön"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Montaj Takibi</h2>
          <p className="text-gray-600 mt-1">Bir proje seçin ve montaj takibini görüntüleyin</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm text-gray-600">Proje:</label>
          <select
            className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            disabled={loading}
          >
            <option value="">Proje seçiniz...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedProjectId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <AssemblyTracking projectId={selectedProjectId} />
        </div>
      )}
    </div>
  )
}


