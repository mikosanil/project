import { useState, useEffect } from 'react'
import { Plus, User, Clock, Package, BarChart3, AlertTriangle, Search, Filter, Grid, List } from 'lucide-react'
import { ProgressEntryModal } from './ProgressEntryModal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface ProgressTrackingProps {
  projectId: string
}

export function ProgressTracking({ projectId }: ProgressTrackingProps) {
  const { user, loading: authLoading } = useAuth()
  const [assemblies, setAssemblies] = useState<any[]>([])
  const [workStages, setWorkStages] = useState<any[]>([])
  const [progressEntries, setProgressEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [selectedAssembly, setSelectedAssembly] = useState<any>(null)
  const [assignedTasks, setAssignedTasks] = useState<string[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('')
  const [progressFilter, setProgressFilter] = useState('all') // all, completed, in-progress, not-started
  const [stageFilter, setStageFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('poz_code') // poz_code, progress, name
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
      loadAssignedTasks()
    }
  }, [projectId, authLoading, user])

  const loadAssignedTasks = async () => {
    try {
      setLoadingTasks(true)
      
      console.log('=== ProgressTracking Debug ===')
      console.log('User from auth:', user)
      console.log('User ID (auth):', user?.id)
      console.log('Project ID:', projectId)
      
      if (!user?.id) {
        console.error('User ID is undefined')
        return
      }
      
      // Kullanıcının bu projede atandığı görevleri getir
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_task_assignments')
        .select('work_stage_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)

      if (assignmentsError) {
        console.error('Error loading assigned tasks:', assignmentsError)
        return
      }

      console.log('Found assignments:', assignments)

      const assignedStageIds = assignments?.map(a => a.work_stage_id) || []
      console.log('Assigned stage IDs:', assignedStageIds)
      setAssignedTasks(assignedStageIds)
    } catch (error) {
      console.error('Error loading assigned tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load assemblies with their stages
      const { data: assembliesData, error: assembliesError } = await supabase
        .from('assemblies')
        .select(`
          *,
          project_stages (
            id,
            stage_name,
            status
          )
        `)
        .eq('project_id', projectId)
        .order('poz_code')

      if (assembliesError) throw assembliesError

      // Load project stages (instead of work_stages)
      const { data: stagesData, error: stagesError } = await supabase
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId)
        .order('stage_order')

      if (stagesError) throw stagesError

      // Load progress entries
      const assemblyIds = assembliesData?.map(a => a.id) || []
      let progressData: any[] = []
      
      if (assemblyIds.length > 0) {
        const { data, error: progressError } = await supabase
          .from('progress_entries')
          .select(`
            *,
            assemblies (poz_code, stage_id, project_stages (stage_name))
          `)
          .in('assembly_id', assemblyIds)
          .order('completion_date', { ascending: false })

        if (progressError) throw progressError
        progressData = data || []
      }

      console.log('ProgressTracking - Assemblies loaded:', assembliesData?.length)
      console.log('ProgressTracking - Stages loaded:', stagesData?.length)
      console.log('ProgressTracking - Progress entries loaded:', progressData.length)
      console.log('ProgressTracking - Sample progress entry:', progressData[0])
      
      setAssemblies(assembliesData || [])
      setWorkStages(stagesData || []) // Now using project_stages instead of work_stages
      setProgressEntries(progressData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAssemblyProgress = (assemblyId: string) => {
    const assembly = assemblies.find(a => a.id === assemblyId)
    if (!assembly) return {}

    const entries = progressEntries.filter(e => e.assembly_id === assemblyId)
    const stageProgress: Record<string, number> = {}

    // Sadece pozun ait olduğu aşamadaki ilerlemeyi hesapla
    if (assembly.stage_id) {
      const stageEntries = entries.filter(e => e.work_stage_id === assembly.stage_id)
      const totalCompleted = stageEntries.reduce((sum, entry) => sum + entry.quantity_completed, 0)
      // Pozun sadece kendi aşamasındaki ilerlemesi (0-100%)
      stageProgress[assembly.stage_id] = Math.min((totalCompleted / assembly.total_quantity) * 100, 100)
    }

    return stageProgress
  }

  const handleProgressAdded = async () => {
    setShowProgressModal(false)
    setSelectedAssembly(null)
    await loadData()
  }

  // Kullanıcının atandığı görevleri filtrele (kullanılmıyor ama gelecekte kullanılabilir)
  // const availableWorkStages = workStages.filter(stage => assignedTasks.includes(stage.id))

  // Filter and sort assemblies
  const getFilteredAndSortedAssemblies = () => {
    console.log('ProgressTracking - Filtering assemblies:')
    console.log('Total assemblies:', assemblies.length)
    console.log('Assigned tasks (stage IDs):', assignedTasks)
    
    let filtered = assemblies.filter(assembly => {
      // Assignment filter - sadece kullanıcıya atanan pozlar
      if (assignedTasks.length > 0 && !assignedTasks.includes(assembly.stage_id)) {
        console.log(`Assembly ${assembly.poz_code} (stage: ${assembly.stage_id}) - NOT assigned to user`)
        return false
      }
      
      console.log(`Assembly ${assembly.poz_code} (stage: ${assembly.stage_id}) - assigned to user`)

      // Search filter
      const matchesSearch = assembly.poz_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (assembly.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      if (!matchesSearch) return false

      // Progress filter
      if (progressFilter !== 'all') {
        const stageProgress = calculateAssemblyProgress(assembly.id)
        const overallProgress = Object.values(stageProgress).reduce((sum: number, progress: any) => sum + progress, 0)

        switch (progressFilter) {
          case 'completed':
            if (overallProgress < 95) return false
            break
          case 'in-progress':
            if (overallProgress === 0 || overallProgress >= 95) return false
            break
          case 'not-started':
            if (overallProgress > 0) return false
            break
        }
      }

      // Stage filter
      if (stageFilter !== 'all') {
        if (assembly.stage_id !== stageFilter) return false
      }

      return true
    })

    // Sort assemblies
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'poz_code':
          return a.poz_code.localeCompare(b.poz_code)
        case 'progress':
          const aProgress = Object.values(calculateAssemblyProgress(a.id)).reduce((sum: number, progress: any) => sum + progress, 0)
          const bProgress = Object.values(calculateAssemblyProgress(b.id)).reduce((sum: number, progress: any) => sum + progress, 0)
          return bProgress - aProgress // Descending
        case 'name':
          return (a.description || '').localeCompare(b.description || '')
        default:
          return 0
      }
    })

    return filtered
  }

  const filteredAssemblies = getFilteredAndSortedAssemblies()

  // Filter and sort progress entries for history tab
  const getFilteredAndSortedProgressEntries = () => {
    let filtered = progressEntries.filter(entry => {
      // Search filter
      const matchesSearch = 
        entry.assemblies?.poz_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.worker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      if (!matchesSearch) return false

      // Stage filter
      if (stageFilter !== 'all' && entry.work_stage_id !== stageFilter) {
        return false
      }

      return true
    })

    // Sort entries
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'completion_date':
          return new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
        case 'poz_code':
          return (a.assemblies?.poz_code || '').localeCompare(b.assemblies?.poz_code || '')
        case 'worker_name':
          return (a.worker_name || '').localeCompare(b.worker_name || '')
        case 'quantity_completed':
          return b.quantity_completed - a.quantity_completed
        default:
          return 0
      }
    })

    return filtered
  }

  const filteredProgressEntries = getFilteredAndSortedProgressEntries()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (assemblies.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">İlerleme takibi için montaj parçası gerekli</h3>
        <p className="text-gray-600">Önce montaj parçalarını ekleyin, sonra ilerleme takibine başlayın.</p>
      </div>
    )
  }

  // Kullanıcının hiç görevi yoksa uyarı göster
  if (!loadingTasks && assignedTasks.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Görev Atanmamış</h3>
        <p className="text-gray-600 mb-4">
          Bu projede size henüz görev atanmamış. İlerleme kaydı eklemek için önce bir göreve atanmanız gerekiyor.
        </p>
        <div className="text-sm text-gray-500">
          Proje yöneticisi ile iletişime geçerek görev ataması talep edebilirsiniz.
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Genel Bakış</span>
              <span className="sm:hidden">Genel</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">İlerleme Geçmişi</span>
              <span className="sm:hidden">Geçmiş</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-col lg:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="POZ kodu veya açıklama ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Filters - Mobile Stacked */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex gap-2">
              <select
                value={progressFilter}
                onChange={(e) => setProgressFilter(e.target.value)}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="not-started">Başlanmamış</option>
                <option value="in-progress">Devam Eden</option>
                <option value="completed">Tamamlanan</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
              >
                <option value="poz_code">POZ Koduna Göre</option>
                <option value="progress">İlerlemye Göre</option>
                <option value="name">İsme Göre</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-none px-3 py-2 border rounded-lg text-xs sm:text-sm flex items-center justify-center space-x-1 transition-colors ${
                  showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Filtreler</span>
                <span className="sm:hidden">Filtre</span>
              </button>

              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2 sm:px-3 py-2 text-xs sm:text-sm transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Grid className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 sm:px-3 py-2 text-xs sm:text-sm transition-colors border-l border-gray-300 ${
                    viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">İş Aşaması</label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                >
                  <option value="all">Tüm Aşamalar</option>
                  {workStages.map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.stage_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end sm:col-span-2">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setProgressFilter('all')
                    setStageFilter('all')
                    setSortBy('poz_code')
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="mt-3 text-xs sm:text-sm text-gray-600">
          {filteredAssemblies.length} parça gösteriliyor (toplam {assemblies.length})
        </div>
      </div>

      {/* Assembly Progress Cards */}
      {filteredAssemblies.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Arama kriterlerinize uygun parça bulunamadı</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Arama terimlerinizi değiştirin veya filtreleri temizleyin.
          </p>
          <button
            onClick={() => {
              setSearchTerm('')
              setProgressFilter('all')
              setStageFilter('all')
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6' : 'space-y-3 sm:space-y-4'}>
          {filteredAssemblies.map((assembly) => {
          const stageProgress = calculateAssemblyProgress(assembly.id)
          const overallProgress = Object.values(stageProgress).reduce((sum: number, progress: any) => sum + progress, 0) // Her poz sadece kendi aşamasında çalışır

          if (viewMode === 'list') {
            return (
              <div key={assembly.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1 sm:gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{assembly.poz_code}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">{assembly.description || 'Açıklama yok'}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-medium text-gray-900">{overallProgress.toFixed(1)}%</p>
                          <p className="text-xs text-gray-600">{assembly.total_quantity} adet</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${overallProgress}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {(() => {
                            const assemblyStage = assemblies.find(a => a.id === assembly.id)?.project_stages
                            if (!assemblyStage) return null
                            
                            const isAssigned = assignedTasks.includes(assemblyStage.id)
                            const progress = stageProgress[assemblyStage.id] || 0
                            
                            return (
                              <div 
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  !isAssigned ? 'opacity-50' : ''
                                }`}
                                style={{ 
                                  backgroundColor: progress > 90 ? '#3B82F6' : '#3B82F620',
                                  color: progress > 90 ? 'white' : '#3B82F6'
                                }}
                                title={`${assemblyStage.stage_name}: ${progress.toFixed(0)}%${!isAssigned ? ' (Atanmamış)' : ''}`}
                              >
                                {progress.toFixed(0)}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  {assignedTasks.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedAssembly(assembly)
                        setShowProgressModal(true)
                      }}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>İlerleme Ekle</span>
                    </button>
                  )}
                </div>
              </div>
            )
          }

          // Grid view
          return (
            <div key={assembly.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{assembly.poz_code}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{assembly.total_quantity} adet</p>
                    {assembly.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{assembly.description}</p>
                    )}
                  </div>
                </div>
                {assignedTasks.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedAssembly(assembly)
                      setShowProgressModal(true)
                    }}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>İlerleme Ekle</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Genel İlerleme</span>
                  <span className="font-medium">{overallProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3 sm:mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {(() => {
                    const assemblyStage = assemblies.find(a => a.id === assembly.id)?.project_stages
                    if (!assemblyStage) return null
                    
                    const isAssigned = assignedTasks.includes(assemblyStage.id)
                    const progress = stageProgress[assemblyStage.id] || 0
                    
                    return (
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div 
                            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: '#3B82F6' }}
                          />
                          <span className={`text-gray-700 truncate ${!isAssigned ? 'opacity-50' : ''}`}>
                            {assemblyStage.stage_name}
                            {!isAssigned && ' (Atanmamış)'}
                          </span>
                        </div>
                        <span className="font-medium flex-shrink-0 ml-2">{progress.toFixed(0)}%</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )
        })}
        </div>
      )}

        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4 sm:space-y-6">
          {/* History Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-col lg:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="POZ kodu, çalışan veya not ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex gap-2">
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="all">Tüm İş Aşamaları</option>
                    {workStages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.stage_name}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 sm:flex-none px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="completion_date">Tarihe Göre</option>
                    <option value="poz_code">POZ Koduna Göre</option>
                    <option value="worker_name">Çalışana Göre</option>
                    <option value="quantity_completed">Miktara Göre</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStageFilter('all')
                    setSortBy('completion_date')
                  }}
                  className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          </div>

          {/* Progress History */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">İlerleme Geçmişi</h3>
                <div className="text-xs sm:text-sm text-gray-600">
                  {filteredProgressEntries.length} kayıt (toplam {progressEntries.length})
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
              {filteredProgressEntries.length === 0 ? (
                <div className="p-4 sm:p-8 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    {progressEntries.length === 0 ? 'Henüz ilerleme kaydı yok' : 'Arama kriterlerinize uygun kayıt bulunamadı'}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    {progressEntries.length === 0 
                      ? 'İlerleme kaydı eklediğinizde burada görünecek.'
                      : 'Arama terimlerinizi değiştirin veya filtreleri temizleyin.'
                    }
                  </p>
                </div>
              ) : (
                filteredProgressEntries.map((entry) => (
                  <div key={entry.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
                        <div 
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: entry.work_stages?.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {entry.assemblies?.poz_code}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span 
                                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: '#3B82F6' }}
                              >
                                {entry.assemblies?.project_stages?.stage_name || 'Bilinmeyen Aşama'}
                              </span>
                              <span className="text-sm sm:text-lg font-bold text-gray-900">
                                {entry.quantity_completed} adet
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <User className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="truncate">{entry.worker_name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>{new Date(entry.completion_date).toLocaleDateString('tr-TR')}</span>
                            </div>
                            <div className="flex items-center space-x-2 sm:col-span-1">
                              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">ID: {entry.id.slice(0, 8)}...</span>
                              <span className="sm:hidden">#{entry.id.slice(0, 6)}</span>
                            </div>
                          </div>
                          
                          {entry.notes && (
                            <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs sm:text-sm text-gray-700">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-left sm:text-right text-xs sm:text-sm text-gray-500">
                        <div>{new Date(entry.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Entry Modal */}
      {showProgressModal && selectedAssembly && (
        <ProgressEntryModal
          assembly={selectedAssembly}
          workStages={workStages} // Bu artık project_stages
          onClose={() => {
            setShowProgressModal(false)
            setSelectedAssembly(null)
          }}
          onProgressAdded={handleProgressAdded}
        />
      )}
    </div>
  )
}