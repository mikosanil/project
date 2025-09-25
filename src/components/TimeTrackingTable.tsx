import React, { useState, useEffect } from 'react'
import { 
  Clock, 
  User, 
  Calendar, 
  Package, 
  TrendingUp, 
  BarChart3,
  Download,
  Filter,
  Search
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface TimeEntry {
  id: string
  assembly_id: string
  work_stage_id: string
  user_id: string
  worker_name: string
  quantity_completed: number
  time_spent: number
  completion_date: string
  notes?: string
  assembly: {
    poz_code: string
    description: string
    total_quantity: number
  }
  stage: {
    stage_name: string
  }
}

interface TimeTrackingTableProps {
  projectId: string
  stageId?: string
}

export function TimeTrackingTable({ projectId, stageId }: TimeTrackingTableProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'time' | 'worker' | 'stage'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadTimeEntries()
  }, [projectId, stageId])

  const loadTimeEntries = async () => {
    try {
      setLoading(true)
      
      // Önce assembly ID'lerini al
      const assemblyIds = await getAssemblyIds()
      
      if (assemblyIds.length === 0) {
        setTimeEntries([])
        return
      }
      
      // Progress entries'leri al
      let progressQuery = supabase
        .from('progress_entries')
        .select('*')
        .in('assembly_id', assemblyIds)

      if (stageId) {
        progressQuery = progressQuery.eq('work_stage_id', stageId)
      }

      const { data: progressData, error: progressError } = await progressQuery
        .order('completion_date', { ascending: false })

      if (progressError) throw progressError

      if (!progressData || progressData.length === 0) {
        setTimeEntries([])
        return
      }

      // Assembly verilerini al
      const { data: assembliesData, error: assembliesError } = await supabase
        .from('assemblies')
        .select('id, poz_code, description, total_quantity, weight_per_unit')
        .in('id', assemblyIds)

      if (assembliesError) throw assembliesError

      // Stage verilerini al
      const stageIds = [...new Set(progressData.map(p => p.work_stage_id))]
      const { data: stagesData, error: stagesError } = await supabase
        .from('project_stages')
        .select('id, stage_name')
        .in('id', stageIds)

      if (stagesError) throw stagesError

      // Verileri birleştir
      const enrichedData = progressData.map(entry => ({
        ...entry,
        assembly: assembliesData?.find(a => a.id === entry.assembly_id) || null,
        stage: stagesData?.find(s => s.id === entry.work_stage_id) || null
      }))

      console.log('TimeTrackingTable - Time entries loaded:', enrichedData.length)
      console.log('TimeTrackingTable - Sample assembly weight:', enrichedData[0]?.assembly?.weight_per_unit)
      
      setTimeEntries(enrichedData)
    } catch (error) {
      console.error('Error loading time entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAssemblyIds = async () => {
    const { data: assemblies } = await supabase
      .from('assemblies')
      .select('id')
      .eq('project_id', projectId)
    
    return assemblies?.map(a => a.id) || []
  }

  const filteredEntries = timeEntries.filter(entry => {
    const matchesSearch = 
      entry.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.assembly?.poz_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.assembly?.description || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStage = stageFilter === 'all' || entry.work_stage_id === stageFilter

    const matchesDate = (() => {
      if (dateFilter === 'all') return true
      const entryDate = new Date(entry.completion_date)
      const now = new Date()
      
      switch (dateFilter) {
        case 'today':
          return entryDate.toDateString() === now.toDateString()
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return entryDate >= weekAgo
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return entryDate >= monthAgo
        default:
          return true
      }
    })()

    return matchesSearch && matchesStage && matchesDate
  })

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.completion_date).getTime()
        bValue = new Date(b.completion_date).getTime()
        break
      case 'time':
        aValue = a.time_spent
        bValue = b.time_spent
        break
      case 'worker':
        aValue = a.worker_name
        bValue = b.worker_name
        break
      case 'stage':
        aValue = a.stage.stage_name
        bValue = b.stage.stage_name
        break
      default:
        return 0
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const getTotalTime = () => {
    return filteredEntries.reduce((sum, entry) => sum + entry.time_spent, 0)
  }

  const getAverageTime = () => {
    const totalTime = getTotalTime()
    const totalQuantity = filteredEntries.reduce((sum, entry) => sum + entry.quantity_completed, 0)
    return totalQuantity > 0 ? totalTime / totalQuantity : 0
  }

  const getAverageTimePerKg = () => {
    const totalTime = getTotalTime()
    const totalWeight = filteredEntries.reduce((sum, entry) => {
      const assembly = entry.assembly
      const weightPerUnit = assembly?.weight_per_unit || 0
      return sum + (entry.quantity_completed * weightPerUnit)
    }, 0)
    return totalWeight > 0 ? totalTime / totalWeight : 0
  }

  const getWorkerStats = () => {
    const workerStats: { [key: string]: { totalTime: number, totalQuantity: number, totalWeight: number, entries: number } } = {}
    
    filteredEntries.forEach(entry => {
      if (!workerStats[entry.worker_name]) {
        workerStats[entry.worker_name] = { totalTime: 0, totalQuantity: 0, totalWeight: 0, entries: 0 }
      }
      workerStats[entry.worker_name].totalTime += entry.time_spent
      workerStats[entry.worker_name].totalQuantity += entry.quantity_completed
      workerStats[entry.worker_name].entries += 1
      
      // Ağırlık hesaplaması
      const assembly = entry.assembly
      const weightPerUnit = assembly?.weight_per_unit || 0
      workerStats[entry.worker_name].totalWeight += entry.quantity_completed * weightPerUnit
    })

    return Object.entries(workerStats).map(([worker, stats]) => ({
      worker,
      ...stats,
      averageTime: stats.totalQuantity > 0 ? stats.totalTime / stats.totalQuantity : 0,
      averageTimePerKg: stats.totalWeight > 0 ? stats.totalTime / stats.totalWeight : 0
    }))
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`
  }

  const formatTimeDecimal = (minutes: number) => {
    return `${minutes.toFixed(2)} dk`
  }

  const formatDate = (dateString: string) => {
    console.log('Original dateString:', dateString)
    
    // Eğer sadece tarih varsa (YYYY-MM-DD formatı)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return {
        date: new Date(dateString).toLocaleDateString('tr-TR'),
        time: 'Saat yok'
      }
    }
    
    // Eğer tarih+saat varsa - 3 saat geri al
    const date = new Date(dateString)
    console.log('Parsed date:', date)
    console.log('Date UTC:', date.toISOString())
    console.log('Date local:', date.toString())
    
    // 3 saat geri al (UTC+3 sorunu için)
    const adjustedDate = new Date(date.getTime() - (3 * 60 * 60 * 1000))
    console.log('Adjusted date:', adjustedDate)
    
    const datePart = adjustedDate.toLocaleDateString('tr-TR')
    const timePart = adjustedDate.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    console.log('Final date:', datePart, 'time:', timePart)
    
    return {
      date: datePart,
      time: timePart
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Süre Takibi
          </h3>
          <p className="text-sm text-gray-600">Kesim aşamasındaki süre kayıtları</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Toplam Süre</p>
              <p className="text-2xl font-bold text-blue-900">{formatTime(getTotalTime())}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Ortalama Süre</p>
              <p className="text-2xl font-bold text-green-900">{formatTimeDecimal(getAverageTime())}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Ortalama Süre/kg</p>
              <p className="text-2xl font-bold text-orange-900">{formatTimeDecimal(getAverageTimePerKg())}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Toplam Kayıt</p>
              <p className="text-2xl font-bold text-purple-900">{filteredEntries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Çalışan, poz kodu..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tümü</option>
              <option value="today">Bugün</option>
              <option value="week">Son 7 Gün</option>
              <option value="month">Son 30 Gün</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Tarih</option>
              <option value="time">Süre</option>
              <option value="worker">Çalışan</option>
              <option value="stage">Aşama</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sıra</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Çalışan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aşama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Süre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adet/Saat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notlar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{formatDate(entry.completion_date).date}</div>
                      <div className="text-gray-500 text-xs">{formatDate(entry.completion_date).time}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      {entry.worker_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{entry.assembly?.poz_code || 'Bilinmeyen'}</div>
                      <div className="text-gray-500 text-xs">{entry.assembly?.description || 'Açıklama yok'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {entry.stage?.stage_name || 'Bilinmeyen Aşama'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.quantity_completed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      {formatTime(entry.time_spent)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.time_spent > 0 ? (entry.quantity_completed / (entry.time_spent / 60)).toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedEntries.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Süre kaydı bulunamadı</h3>
            <p className="text-gray-600">Bu proje için henüz süre kaydı girilmemiş.</p>
          </div>
        )}
      </div>

      {/* Worker Stats */}
      {getWorkerStats().length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Çalışan İstatistikleri
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getWorkerStats().map((worker) => (
              <div key={worker.worker} className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">{worker.worker}</h5>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Toplam Süre: {formatTime(worker.totalTime)}</div>
                  <div>Toplam Adet: {worker.totalQuantity}</div>
                  <div>Toplam Ağırlık: {worker.totalWeight.toFixed(2)} kg</div>
                  <div>Ortalama: {formatTimeDecimal(worker.averageTime)}/adet</div>
                  <div>Ortalama: {formatTimeDecimal(worker.averageTimePerKg)}/kg</div>
                  <div>Kayıt Sayısı: {worker.entries}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
