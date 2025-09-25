import React, { useState, useEffect } from 'react'
import { X, BarChart3, Download, Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface AssemblyReportsModalProps {
  projectId: string
  tasks: Array<{
    id: string
    task_name: string
    status: string
    priority: string
    progress_percentage: number
    quality_checks_passed: number
    quality_checks_total: number
    issue_count: number
    planned_start_date?: string
    planned_end_date?: string
    actual_start_date?: string
    actual_end_date?: string
    estimated_duration_hours?: number
    actual_duration_hours?: number
    assembly_type: string
    location?: {
      name: string
    }
    team?: {
      name: string
    }
  }>
  locations: Array<{
    id: string
    name: string
    address: string
  }>
  teams: Array<{
    id: string
    name: string
    member_count: number
  }>
  onClose: () => void
}

interface ReportData {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  plannedTasks: number
  onHoldTasks: number
  cancelledTasks: number
  averageProgress: number
  totalQualityChecks: number
  passedQualityChecks: number
  totalIssues: number
  averageDuration: number
  tasksByType: Record<string, number>
  tasksByPriority: Record<string, number>
  tasksByLocation: Record<string, number>
  tasksByTeam: Record<string, number>
  overdueTasks: number
  upcomingDeadlines: Array<{
    task_name: string
    planned_end_date: string
    days_remaining: number
  }>
}

export function AssemblyReportsModal({ 
  projectId, 
  tasks, 
  locations, 
  teams, 
  onClose 
}: AssemblyReportsModalProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    calculateReportData()
  }, [tasks, selectedPeriod])

  const calculateReportData = () => {
    setLoading(true)
    
    const now = new Date()
    const filteredTasks = tasks.filter(task => {
      if (!task.planned_start_date) return true
      const taskDate = new Date(task.planned_start_date)
      
      switch (selectedPeriod) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return taskDate >= weekAgo
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return taskDate >= monthAgo
        case 'quarter':
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          return taskDate >= quarterAgo
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          return taskDate >= yearAgo
        default:
          return true
      }
    })

    const totalTasks = filteredTasks.length
    const completedTasks = filteredTasks.filter(t => t.status === 'completed').length
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length
    const plannedTasks = filteredTasks.filter(t => t.status === 'planned').length
    const onHoldTasks = filteredTasks.filter(t => t.status === 'on_hold').length
    const cancelledTasks = filteredTasks.filter(t => t.status === 'cancelled').length

    const averageProgress = totalTasks > 0 
      ? filteredTasks.reduce((sum, t) => sum + t.progress_percentage, 0) / totalTasks 
      : 0

    const totalQualityChecks = filteredTasks.reduce((sum, t) => sum + t.quality_checks_total, 0)
    const passedQualityChecks = filteredTasks.reduce((sum, t) => sum + t.quality_checks_passed, 0)
    const totalIssues = filteredTasks.reduce((sum, t) => sum + t.issue_count, 0)

    const tasksWithDuration = filteredTasks.filter(t => t.actual_duration_hours && t.estimated_duration_hours)
    const averageDuration = tasksWithDuration.length > 0
      ? tasksWithDuration.reduce((sum, t) => sum + (t.actual_duration_hours || 0), 0) / tasksWithDuration.length
      : 0

    // Group by type
    const tasksByType = filteredTasks.reduce((acc, task) => {
      acc[task.assembly_type] = (acc[task.assembly_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group by priority
    const tasksByPriority = filteredTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group by location
    const tasksByLocation = filteredTasks.reduce((acc, task) => {
      const locationName = task.location?.name || 'Lokasyon Atanmamış'
      acc[locationName] = (acc[locationName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group by team
    const tasksByTeam = filteredTasks.reduce((acc, task) => {
      const teamName = task.team?.name || 'Ekip Atanmamış'
      acc[teamName] = (acc[teamName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Overdue tasks
    const overdueTasks = filteredTasks.filter(task => {
      if (!task.planned_end_date || task.status === 'completed' || task.status === 'cancelled') return false
      return new Date(task.planned_end_date) < now
    }).length

    // Upcoming deadlines
    const upcomingDeadlines = filteredTasks
      .filter(task => {
        if (!task.planned_end_date || task.status === 'completed' || task.status === 'cancelled') return false
        const deadline = new Date(task.planned_end_date)
        const daysDiff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return daysDiff >= 0 && daysDiff <= 7
      })
      .map(task => {
        const deadline = new Date(task.planned_end_date!)
        const daysDiff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          task_name: task.task_name,
          planned_end_date: task.planned_end_date!,
          days_remaining: daysDiff
        }
      })
      .sort((a, b) => a.days_remaining - b.days_remaining)

    setReportData({
      totalTasks,
      completedTasks,
      inProgressTasks,
      plannedTasks,
      onHoldTasks,
      cancelledTasks,
      averageProgress,
      totalQualityChecks,
      passedQualityChecks,
      totalIssues,
      averageDuration,
      tasksByType,
      tasksByPriority,
      tasksByLocation,
      tasksByTeam,
      overdueTasks,
      upcomingDeadlines
    })
    
    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-yellow-600 bg-yellow-100'
      case 'planned': return 'text-blue-600 bg-blue-100'
      case 'on_hold': return 'text-orange-600 bg-orange-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı'
      case 'in_progress': return 'Devam Ediyor'
      case 'planned': return 'Planlandı'
      case 'on_hold': return 'Beklemede'
      case 'cancelled': return 'İptal Edildi'
      default: return status
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Acil'
      case 'high': return 'Yüksek'
      case 'medium': return 'Orta'
      case 'low': return 'Düşük'
      default: return priority
    }
  }

  const getAssemblyTypeText = (type: string) => {
    switch (type) {
      case 'field': return 'Saha Montajı'
      case 'workshop': return 'Atölye Montajı'
      case 'prefabricated': return 'Prefabrik Montaj'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (!reportData) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Montaj Raporları</h3>
              <p className="text-gray-600 text-sm">Detaylı performans analizi ve istatistikler</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">Son 1 Hafta</option>
              <option value="month">Son 1 Ay</option>
              <option value="quarter">Son 3 Ay</option>
              <option value="year">Son 1 Yıl</option>
            </select>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Toplam Görev</p>
                  <p className="text-3xl font-bold">{reportData.totalTasks}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Tamamlanan</p>
                  <p className="text-3xl font-bold">{reportData.completedTasks}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Ortalama İlerleme</p>
                  <p className="text-3xl font-bold">{reportData.averageProgress.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Geciken Görev</p>
                  <p className="text-3xl font-bold">{reportData.overdueTasks}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-200" />
              </div>
            </div>
          </div>

          {/* Görev Durumu Dağılımı */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Görev Durumu Dağılımı</h4>
              <div className="space-y-3">
                {Object.entries({
                  completed: reportData.completedTasks,
                  in_progress: reportData.inProgressTasks,
                  planned: reportData.plannedTasks,
                  on_hold: reportData.onHoldTasks,
                  cancelled: reportData.cancelledTasks
                }).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status).split(' ')[1]}`} />
                      <span className="text-sm font-medium text-gray-700">{getStatusText(status)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getStatusColor(status).split(' ')[1]}`}
                          style={{ width: `${reportData.totalTasks > 0 ? (count / reportData.totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Montaj Türü Dağılımı</h4>
              <div className="space-y-3">
                {Object.entries(reportData.tasksByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{getAssemblyTypeText(type)}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${reportData.totalTasks > 0 ? (count / reportData.totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kalite ve Performans */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Kalite Kontrolü</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Toplam Kontrol</span>
                  <span className="text-lg font-semibold text-gray-900">{reportData.totalQualityChecks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Başarılı Kontrol</span>
                  <span className="text-lg font-semibold text-green-600">{reportData.passedQualityChecks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Başarı Oranı</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {reportData.totalQualityChecks > 0 
                      ? ((reportData.passedQualityChecks / reportData.totalQualityChecks) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full"
                    style={{ 
                      width: `${reportData.totalQualityChecks > 0 
                        ? (reportData.passedQualityChecks / reportData.totalQualityChecks) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Performans Metrikleri</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Toplam Sorun</span>
                  <span className="text-lg font-semibold text-red-600">{reportData.totalIssues}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ortalama Süre</span>
                  <span className="text-lg font-semibold text-gray-900">{reportData.averageDuration.toFixed(1)} saat</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tamamlanma Oranı</span>
                  <span className="text-lg font-semibold text-green-600">
                    {reportData.totalTasks > 0 
                      ? ((reportData.completedTasks / reportData.totalTasks) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Yaklaşan Son Tarihler */}
          {reportData.upcomingDeadlines.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Yaklaşan Son Tarihler</h4>
              <div className="space-y-3">
                {reportData.upcomingDeadlines.map((deadline, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{deadline.task_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(deadline.planned_end_date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        deadline.days_remaining <= 1 
                          ? 'bg-red-100 text-red-800'
                          : deadline.days_remaining <= 3
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {deadline.days_remaining === 0 ? 'Bugün' : 
                         deadline.days_remaining === 1 ? '1 gün kaldı' :
                         `${deadline.days_remaining} gün kaldı`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lokasyon ve Ekip Dağılımı */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Lokasyon Dağılımı</h4>
              <div className="space-y-3">
                {Object.entries(reportData.tasksByLocation).map(([location, count]) => (
                  <div key={location} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate">{location}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${reportData.totalTasks > 0 ? (count / reportData.totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Ekip Dağılımı</h4>
              <div className="space-y-3">
                {Object.entries(reportData.tasksByTeam).map(([team, count]) => (
                  <div key={team} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate">{team}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${reportData.totalTasks > 0 ? (count / reportData.totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
