import React from 'react'
import { Calendar, Package, TrendingUp, Users, Edit2, Trash2, UserPlus, Weight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Database } from '../lib/supabase'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectCardProps {
  project: Project
  onSelect: (project: Project) => void
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onAssignUsers?: (project: Project) => void
  completionPercentage: number
  totalWeight?: number
  completedWeight?: number
  canEdit?: boolean
}

export function ProjectCard({ 
  project, 
  onSelect, 
  onEdit, 
  onDelete, 
  onAssignUsers,
  completionPercentage, 
  totalWeight = 0,
  completedWeight = 0,
  canEdit = false 
}: ProjectCardProps) {
  const { isAdmin } = useAuth()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return 'Planlama'
      case 'in_progress': return 'Devam Ediyor'
      case 'completed': return 'Tamamlandı'
      case 'on_hold': return 'Beklemede'
      default: return status
    }
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-200"
    >
      <div className="flex justify-between items-start mb-4">
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => onSelect(project)}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.name}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </span>
          {canEdit && (
            <div className="flex items-center space-x-1">
              {onAssignUsers && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAssignUsers(project)
                  }}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Kullanıcı Ata"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(project)
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Düzenle"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(project)
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div 
        className="space-y-3 cursor-pointer"
        onClick={() => onSelect(project)}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">İlerleme</span>
          <span className="font-medium text-gray-900">{completionPercentage.toFixed(1)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {totalWeight > 0 && (
          <div className="flex items-center justify-between text-sm pt-2">
            <div className="flex items-center space-x-1 text-gray-600">
              <Weight className="w-4 h-4" />
              <span>Toplam Ağırlık</span>
            </div>
            <span className="font-medium text-gray-900">
              {totalWeight.toFixed(0)} kg
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(project.start_date || '').toLocaleDateString('tr-TR')}</span>
            </div>
            {project.target_completion_date && (
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>{new Date(project.target_completion_date).toLocaleDateString('tr-TR')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}