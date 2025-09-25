import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Clock, Users, Target, AlertTriangle, Calendar, BarChart3 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface PerformanceAnalysisProps {
  projectId: string
}

interface WorkerPerformance {
  workerId: string
  workerName: string
  assignedTasks: number
  completedTasks: number
  totalQuantityCompleted: number
  assignedWeight: number // Atanan toplam kg
  completedWeight: number // Tamamlanan toplam kg
  dailyWeightAverage: number // Günlük ortalama kg
  averageCompletionTime: number
  performanceScore: number
  isOnTrack: boolean
  dailyProgress: Array<{
    date: string
    completed: number
    expected: number
    completedWeight: number // O gün tamamlanan kg
    expectedWeight: number // O gün beklenen kg
  }>
}

interface ProjectStats {
  totalDuration: number
  daysElapsed: number
  daysRemaining: number
  totalAssemblies: number
  completedAssemblies: number
  expectedProgress: number
  actualProgress: number
  isOnSchedule: boolean
}

export function PerformanceAnalysis({ projectId }: PerformanceAnalysisProps) {
  const [workerPerformances, setWorkerPerformances] = useState<WorkerPerformance[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  useEffect(() => {
    loadPerformanceData()
  }, [projectId, selectedTimeframe])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      
      // Load project basic info
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      // Load assemblies
      const { data: assemblies, error: assembliesError } = await supabase
        .from('assemblies')
        .select('id, total_quantity, stage_id, weight_per_unit')
        .eq('project_id', projectId)

      if (assembliesError) throw assembliesError

      // Load progress entries with worker info
      const assemblyIds = assemblies?.map(a => a.id) || []
      const { data: progressEntries, error: progressError } = await supabase
        .from('progress_entries')
        .select(`
          *,
          assemblies (poz_code, total_quantity, stage_id, project_stages (stage_name))
        `)
        .in('assembly_id', assemblyIds)
        .order('completion_date', { ascending: false })

      if (progressError) throw progressError

      // Load task assignments without nested join first
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_task_assignments')
        .select('*')
        .eq('project_id', projectId)

      if (assignmentsError) throw assignmentsError

      console.log('Assignments loaded:', assignments)

      // Load users separately
      const userIds = assignments?.map(a => a.user_id).filter(Boolean) || []
      let users: any[] = []
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds)
        
        if (usersError) throw usersError
        users = usersData || []
      }

      // Load project stages separately
      const stageIds = assignments?.map(a => a.work_stage_id).filter(Boolean) || []
      let workStages: any[] = []
      if (stageIds.length > 0) {
        const { data: workStagesData, error: workStagesError } = await supabase
          .from('project_stages')
          .select('id, stage_name')
          .in('id', stageIds)

        if (workStagesError) throw workStagesError
        workStages = workStagesData || []
      }

      console.log('Users loaded:', users)
      console.log('Work stages loaded:', workStages)

      // Calculate project statistics
      const startDate = new Date(project.start_date || '')
      const endDate = new Date(project.target_completion_date || '')
      const today = new Date()
      
      const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysRemaining = Math.max(0, totalDuration - daysElapsed)
      
      const totalAssemblies = assemblies?.length || 0
      const uniqueCompletedAssemblies = new Set(progressEntries?.map(e => e.assembly_id)).size
      
      const expectedProgress = totalDuration > 0 ? (daysElapsed / totalDuration) * 100 : 0
      const actualProgress = totalAssemblies > 0 ? (uniqueCompletedAssemblies / totalAssemblies) * 100 : 0

      const projectStatsData: ProjectStats = {
        totalDuration,
        daysElapsed: Math.max(0, daysElapsed),
        daysRemaining,
        totalAssemblies,
        completedAssemblies: uniqueCompletedAssemblies,
        expectedProgress: Math.min(expectedProgress, 100),
        actualProgress,
        isOnSchedule: actualProgress >= expectedProgress * 0.9 // 10% tolerance
      }

      // Calculate worker performances
      const workerStats: Record<string, WorkerPerformance> = {}

      // Initialize workers from assignments
      assignments?.forEach(assignment => {
        const workerId = assignment.user_id
        const user = users?.find(u => u.id === workerId)
        const workerName = user?.full_name || 'Bilinmeyen Kullanıcı'
        
        if (!workerStats[workerId]) {
          workerStats[workerId] = {
            workerId,
            workerName,
            assignedTasks: 0,
            completedTasks: 0,
            totalQuantityCompleted: 0,
            assignedWeight: 0,
            completedWeight: 0,
            dailyWeightAverage: 0,
            averageCompletionTime: 0,
            performanceScore: 0,
            isOnTrack: true,
            dailyProgress: []
          }
        }
        
        // Bu aşamadaki pozların toplam adet sayısını ve ağırlığını hesapla
        const stageAssemblies = assemblies?.filter(a => a.stage_id === assignment.work_stage_id) || []
        const stageTotalQuantity = stageAssemblies.reduce((sum, a) => sum + a.total_quantity, 0)
        const stageTotalWeight = stageAssemblies.reduce((sum, a) => sum + (a.total_quantity * (a.weight_per_unit || 0)), 0)
        
        workerStats[workerId].assignedTasks += stageTotalQuantity
        workerStats[workerId].assignedWeight += stageTotalWeight
      })

      // Calculate completion stats
      progressEntries?.forEach(entry => {
        // Try to find worker by user_id first, then by worker_name
        let workerId = entry.user_id
        let worker = workerStats[workerId]
        
        if (!worker && entry.worker_name) {
          // Try to find by worker name
          const workerByName = Object.values(workerStats).find(w => 
            w.workerName.toLowerCase() === entry.worker_name.toLowerCase()
          )
          if (workerByName) {
            workerId = workerByName.workerId
            worker = workerByName
          }
        }
        
        if (worker) {
          worker.totalQuantityCompleted += entry.quantity_completed
          worker.completedTasks += entry.quantity_completed // Tamamlanan adet sayısını ekle
          
          // Tamamlanan kg hesapla
          const assembly = assemblies?.find(a => a.id === entry.assembly_id)
          if (assembly && assembly.weight_per_unit) {
            const completedWeight = entry.quantity_completed * assembly.weight_per_unit
            worker.completedWeight += completedWeight
          }
        }
      })

      // Calculate performance scores and daily progress
      Object.values(workerStats).forEach(worker => {
        const workerEntries = progressEntries?.filter(e => 
          e.user_id === worker.workerId || 
          (e.worker_name && e.worker_name.toLowerCase() === worker.workerName.toLowerCase())
        ) || []
        
        // Detaylı performans hesaplaması
        if (worker.assignedTasks === 0) {
          worker.performanceScore = 0
          worker.isOnTrack = false
          return
        }

        // 1. Temel tamamlama oranı
        const completionRate = (worker.completedTasks / worker.assignedTasks) * 100

        // 2. Günlük minimum gereksinim hesaplaması
        const dailyMinimumRequired = worker.assignedTasks / totalDuration // Günlük minimum tamamlaması gereken adet
        const actualDailyAverage = worker.completedTasks / Math.max(daysElapsed, 1) // Gerçek günlük ortalama
        
        // 2.1. Günlük kg hesaplaması
        const dailyWeightRequired = worker.assignedWeight / totalDuration // Günlük minimum kg
        const actualDailyWeightAverage = worker.completedWeight / Math.max(daysElapsed, 1) // Gerçek günlük kg ortalaması
        worker.dailyWeightAverage = actualDailyWeightAverage

        // 3. Zamanlama performansı (günlük minimuma göre)
        const dailyPerformanceRatio = actualDailyAverage / dailyMinimumRequired
        let timePerformanceScore = 0
        
        if (dailyPerformanceRatio >= 1.2) {
          timePerformanceScore = 100 // %120+ = Mükemmel
        } else if (dailyPerformanceRatio >= 1.0) {
          timePerformanceScore = 80 + (dailyPerformanceRatio - 1.0) * 100 // %100-120 = İyi
        } else if (dailyPerformanceRatio >= 0.8) {
          timePerformanceScore = 60 + (dailyPerformanceRatio - 0.8) * 100 // %80-100 = Orta
        } else if (dailyPerformanceRatio >= 0.6) {
          timePerformanceScore = 40 + (dailyPerformanceRatio - 0.6) * 100 // %60-80 = Zayıf
        } else {
          timePerformanceScore = Math.max(0, dailyPerformanceRatio * 66.67) // %60 altı = Çok zayıf
        }

        // 4. Tutarlılık faktörü (düzenli çalışma)
        const workingDays = new Set(workerEntries.map(e => e.completion_date.split('T')[0])).size
        const consistencyRatio = workingDays / Math.max(daysElapsed, 1)
        const consistencyBonus = Math.min(20, consistencyRatio * 20) // Maksimum %20 bonus

        // 5. Kg performans faktörü
        const weightPerformanceRatio = dailyWeightRequired > 0 ? actualDailyWeightAverage / dailyWeightRequired : 1
        const weightBonus = Math.min(25, weightPerformanceRatio * 25) // Maksimum %25 bonus

        // 6. Tamamlama oranı faktörü
        const completionBonus = Math.min(30, completionRate * 0.3) // Maksimum %30 bonus

        // 7. Final performans skoru
        const baseScore = Math.min(timePerformanceScore, 100)
        const finalScore = baseScore + consistencyBonus + completionBonus + weightBonus
        
        worker.performanceScore = Math.min(Math.max(finalScore, 0), 100)
        worker.isOnTrack = dailyPerformanceRatio >= 0.8

        // Debug bilgileri (geliştirme için)
        worker.debugInfo = {
          assignedTasks: worker.assignedTasks,
          completedTasks: worker.completedTasks,
          completionRate: Math.round(completionRate * 100) / 100,
          dailyMinimumRequired: Math.round(dailyMinimumRequired * 100) / 100,
          actualDailyAverage: Math.round(actualDailyAverage * 100) / 100,
          dailyPerformanceRatio: Math.round(dailyPerformanceRatio * 100) / 100,
          timePerformanceScore: Math.round(timePerformanceScore * 100) / 100,
          consistencyRatio: Math.round(consistencyRatio * 100) / 100,
          consistencyBonus: Math.round(consistencyBonus * 100) / 100,
          completionBonus: Math.round(completionBonus * 100) / 100,
          workingDays: workingDays,
          totalDays: daysElapsed,
          // Kg bilgileri
          assignedWeight: Math.round(worker.assignedWeight * 100) / 100,
          completedWeight: Math.round(worker.completedWeight * 100) / 100,
          dailyWeightRequired: Math.round(dailyWeightRequired * 100) / 100,
          actualDailyWeightAverage: Math.round(actualDailyWeightAverage * 100) / 100,
          weightPerformanceRatio: Math.round(weightPerformanceRatio * 100) / 100,
          weightBonus: Math.round(weightBonus * 100) / 100
        }

        // Generate daily progress data for the last 7 days
        const last7Days = Array.from({length: 7}, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (6 - i))
          return date
        })

        worker.dailyProgress = last7Days.map(date => {
          const dateStr = date.toISOString().split('T')[0]
          const dayEntries = workerEntries.filter(e => 
            e.completion_date.startsWith(dateStr)
          )
          const completed = dayEntries.reduce((sum, e) => sum + e.quantity_completed, 0)
          const expected = worker.debugInfo?.dailyMinimumRequired || 0
          
          // Günlük kg hesaplaması
          const completedWeight = dayEntries.reduce((sum, e) => {
            const assembly = assemblies?.find(a => a.id === e.assembly_id)
            return sum + (e.quantity_completed * (assembly?.weight_per_unit || 0))
          }, 0)
          const expectedWeight = worker.debugInfo?.dailyWeightRequired || 0
          
          return {
            date: dateStr,
            completed,
            expected,
            completedWeight,
            expectedWeight
          }
        })
      })

      setProjectStats(projectStatsData)
      setWorkerPerformances(Object.values(workerStats))
    } catch (error) {
      console.error('Error loading performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Project Overview */}
      {projectStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Proje Süresi</p>
                <p className="text-3xl font-bold">{projectStats.daysElapsed}</p>
                <p className="text-blue-100 text-xs">/ {projectStats.totalDuration} gün</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className={`p-6 rounded-xl text-white ${
            projectStats.isOnSchedule 
              ? 'bg-gradient-to-r from-green-500 to-green-600' 
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Zamanlama</p>
                <p className="text-3xl font-bold">{projectStats.actualProgress.toFixed(0)}%</p>
                <p className="text-white/80 text-xs">Hedef: {projectStats.expectedProgress.toFixed(0)}%</p>
              </div>
              {projectStats.isOnSchedule ? (
                <TrendingUp className="w-8 h-8 text-white/80" />
              ) : (
                <TrendingDown className="w-8 h-8 text-white/80" />
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Tamamlanan</p>
                <p className="text-3xl font-bold">{projectStats.completedAssemblies}</p>
                <p className="text-purple-100 text-xs">/ {projectStats.totalAssemblies} parça</p>
              </div>
              <Target className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm">Kalan Süre</p>
                <p className="text-3xl font-bold">{projectStats.daysRemaining}</p>
                <p className="text-gray-100 text-xs">gün</p>
              </div>
              <Clock className="w-8 h-8 text-gray-200" />
            </div>
          </div>
        </div>
      )}

      {/* Performance Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Çalışan Performans Analizi
            </h3>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          {workerPerformances.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz performans verisi yok</h3>
              <p className="text-gray-600">
                Çalışanlara görev atayın ve ilerleme kayıtları eklendikçe performans analizi görünecek.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workerPerformances.map((worker) => (
                <div key={worker.workerId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {worker.workerName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{worker.workerName}</h4>
                        <p className="text-sm text-gray-600">
                          {worker.completedTasks} / {worker.assignedTasks} görev tamamlandı
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(worker.performanceScore)}`}>
                        {worker.performanceScore.toFixed(0)}% Performans
                      </span>
                      {worker.isOnTrack ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm">Hedefte</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">Geride</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Atanan Görev</p>
                      <p className="text-lg font-semibold text-gray-900">{worker.assignedTasks} adet</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tamamlanan</p>
                      <p className="text-lg font-semibold text-gray-900">{worker.completedTasks} adet</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Günlük Minimum</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {worker.debugInfo?.dailyMinimumRequired?.toFixed(1) || 0} adet/gün
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Günlük Ortalama</p>
                      <p className="text-lg font-semibold text-green-600">
                        {worker.debugInfo?.actualDailyAverage?.toFixed(1) || 0} adet/gün
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Günlük Min. Kg</p>
                      <p className="text-lg font-semibold text-cyan-600">
                        {worker.debugInfo?.dailyWeightRequired?.toFixed(1) || 0} kg/gün
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Atanan Ağırlık</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {worker.debugInfo?.assignedWeight?.toFixed(1) || 0} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tamamlanan Ağırlık</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {worker.debugInfo?.completedWeight?.toFixed(1) || 0} kg
                      </p>
                    </div>
                  </div>

                  {/* Detaylı performans bilgileri */}
                  {worker.debugInfo && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">Performans Detayları</h5>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
                        <div>
                          <p className="text-gray-600">Günlük Performans Oranı</p>
                          <p className="font-semibold text-gray-900">
                            {worker.debugInfo.dailyPerformanceRatio?.toFixed(2)}x
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Zamanlama Skoru</p>
                          <p className="font-semibold text-gray-900">
                            {worker.debugInfo.timePerformanceScore?.toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tutarlılık Bonusu</p>
                          <p className="font-semibold text-gray-900">
                            +{worker.debugInfo.consistencyBonus?.toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Çalışma Günleri</p>
                          <p className="font-semibold text-gray-900">
                            {worker.debugInfo.workingDays}/{worker.debugInfo.totalDays} gün
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Günlük Kg Ortalaması</p>
                          <p className="font-semibold text-purple-600">
                            {worker.debugInfo.actualDailyWeightAverage?.toFixed(1)} kg/gün
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Kg Performans Bonusu</p>
                          <p className="font-semibold text-orange-600">
                            +{worker.debugInfo.weightBonus?.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daily progress chart would go here */}
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Son 7 Günlük İlerleme</p>
                    <div className="flex items-end space-x-1 h-16">
                      {worker.dailyProgress.map((day, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div 
                            className="w-full bg-blue-200 rounded-t"
                            style={{ height: `${Math.max((day.completed / Math.max(...worker.dailyProgress.map(d => d.completed), 1)) * 60, 2)}px` }}
                          />
                          <span className="text-xs text-gray-500 mt-1">
                            {new Date(day.date).getDate()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
