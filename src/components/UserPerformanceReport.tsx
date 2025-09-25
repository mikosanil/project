import React, { useState, useEffect } from 'react'
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Award, 
  AlertTriangle,
  Calendar,
  BarChart3,
  Package,
  Weight,
  Timer,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface UserPerformanceReportProps {
  projectId: string
}

interface DetailedUserPerformance {
  userId: string
  userName: string
  department: string
  role: string
  totalAssignedTasks: number
  totalCompletedTasks: number
  totalQuantityCompleted: number
  totalAssignedWeight: number // Atanan toplam kg
  totalCompletedWeight: number // Tamamlanan toplam kg
  dailyWeightAverage: number // Günlük ortalama kg
  performanceScore: number
  efficiency: number
  qualityScore: number
  averageTaskTime: number
  isOnTrack: boolean
  dailyProgress: Array<{
    date: string
    completed: number
    expected: number
    completedWeight: number // O gün tamamlanan kg
    expectedWeight: number // O gün beklenen kg
    tasks: Array<{
      taskName: string
      stage: string
      quantity: number
      weight: number // Görev ağırlığı
      timeSpent: number
    }>
  }>
  weeklyStats: {
    week: string
    completed: number
    expected: number
    efficiency: number
  }[]
  monthlyStats: {
    month: string
    completed: number
    expected: number
    efficiency: number
  }[]
  taskBreakdown: Array<{
    stage: string
    assigned: number
    completed: number
    efficiency: number
    averageTime: number
  }>
  achievements: string[]
  improvements: string[]
}

export function UserPerformanceReport({ projectId }: UserPerformanceReportProps) {
  const [userPerformances, setUserPerformances] = useState<DetailedUserPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadDetailedPerformanceData()
  }, [projectId, dateRange])

  const loadDetailedPerformanceData = async () => {
    try {
      setLoading(true)
      
      // Load project info
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) {
        console.error('Project error:', projectError)
        throw projectError
      }

      // Load users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin')

      if (usersError) {
        console.error('Users error:', usersError)
        throw usersError
      }

      // Load assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_task_assignments')
        .select('*')
        .eq('project_id', projectId)

      if (assignmentsError) {
        console.error('Assignments error:', assignmentsError)
        throw assignmentsError
      }

      // Load assemblies
      const { data: assemblies, error: assembliesError } = await supabase
        .from('assemblies')
        .select('*')
        .eq('project_id', projectId)

      if (assembliesError) {
        console.error('Assemblies error:', assembliesError)
        throw assembliesError
      }

      // Load progress entries
      const { data: progressEntries, error: progressError } = await supabase
        .from('progress_entries')
        .select('*')
        .gte('completion_date', dateRange.start)
        .lte('completion_date', dateRange.end + 'T23:59:59')

      if (progressError) {
        console.error('Progress entries error:', progressError)
        throw progressError
      }

      // Load work stages
      const { data: workStages, error: stagesError } = await supabase
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId)

      if (stagesError) {
        console.error('Work stages error:', stagesError)
        throw stagesError
      }

      console.log('UserPerformanceReport - Data loaded:', {
        users: users?.length,
        assignments: assignments?.length,
        assemblies: assemblies?.length,
        progressEntries: progressEntries?.length,
        workStages: workStages?.length
      })

      // Calculate detailed performance for each user
      const detailedPerformances: DetailedUserPerformance[] = []

      users?.forEach(user => {
        const userAssignments = assignments?.filter(a => a.user_id === user.id) || []
        const userProgressEntries = progressEntries?.filter(e => e.user_id === user.id) || []
        
        if (userAssignments.length === 0) return

        // Calculate basic stats - atanan aşamalardaki toplam parça adedi (her parça bir görev)
        const assignedStageIds = userAssignments.map(a => a.work_stage_id)
        const assignedAssemblies = assemblies?.filter(a => assignedStageIds.includes(a.stage_id)) || []
        const totalAssignedTasks = assignedAssemblies.reduce((sum, a) => sum + a.total_quantity, 0) // Toplam parça adedi
        
        // DÜZELTME: Daha basit ve doğru kg hesaplama
        const totalAssignedWeight = assignedAssemblies.reduce((sum, a) => sum + (a.total_quantity * (a.weight_per_unit || 0)), 0)
        
        const totalCompletedTasks = userProgressEntries.reduce((sum, e) => sum + e.quantity_completed, 0) // Tamamlanan adet sayısı
        const totalQuantityCompleted = userProgressEntries.reduce((sum, e) => sum + e.quantity_completed, 0)
        
        // Tamamlanan kg hesapla
        const totalCompletedWeight = userProgressEntries.reduce((sum, e) => {
          const assembly = assemblies?.find(a => a.id === e.assembly_id)
          return sum + (e.quantity_completed * (assembly?.weight_per_unit || 0))
        }, 0)
        
        // Calculate performance score
        const completionRate = totalAssignedTasks > 0 ? (totalCompletedTasks / totalAssignedTasks) * 100 : 0
        const performanceScore = Math.min(completionRate, 100)
        
        // DÜZELTME: Gerçek çalışılan günleri hesapla
        const workDays = new Set(userProgressEntries.map(e => e.completion_date.split('T')[0])).size
        const daysWorked = Math.max(1, workDays)
        const efficiency = totalCompletedTasks / daysWorked
        
        // Günlük kg ortalaması
        const dailyWeightAverage = totalCompletedWeight / daysWorked
        
        // Calculate quality score (based on completion rate and consistency)
        const qualityScore = Math.min(performanceScore * 0.8 + (efficiency > 1 ? 20 : 0), 100)
        
        // Calculate average task time (dakika cinsinden)
        // Her ilerleme kaydındaki time_spent değerlerini toplar ve tamamlanan adet sayısına böler
        const totalTimeSpent = userProgressEntries.reduce((sum, e) => sum + (e.time_spent || 0), 0)
        const averageTaskTime = totalCompletedTasks > 0 ? totalTimeSpent / totalCompletedTasks : 0
        
        // Check if on track
        const expectedDailyTasks = totalAssignedTasks / daysWorked
        const actualDailyTasks = totalCompletedTasks / daysWorked
        const isOnTrack = actualDailyTasks >= expectedDailyTasks * 0.8

        // Generate daily progress
        const dailyProgress = generateDailyProgress(userProgressEntries, dateRange, expectedDailyTasks, assemblies || [])
        
        // Generate weekly stats
        const weeklyStats = generateWeeklyStats(userProgressEntries, dateRange)
        
        // Generate monthly stats
        const monthlyStats = generateMonthlyStats(userProgressEntries, dateRange)
        
        // Generate task breakdown by stage
        const taskBreakdown = generateTaskBreakdown(userAssignments, userProgressEntries, workStages, assemblies || [])
        
        // Generate achievements and improvements
        const achievements = generateAchievements(performanceScore, efficiency, qualityScore)
        const improvements = generateImprovements(performanceScore, efficiency, qualityScore)

        detailedPerformances.push({
          userId: user.id,
          userName: user.full_name || 'Bilinmeyen Kullanıcı',
          department: user.department || 'Belirtilmemiş',
          role: user.role || 'user',
          totalAssignedTasks,
          totalCompletedTasks,
          totalQuantityCompleted,
          totalAssignedWeight,
          totalCompletedWeight,
          dailyWeightAverage,
          performanceScore,
          efficiency,
          qualityScore,
          averageTaskTime,
          isOnTrack,
          dailyProgress,
          weeklyStats,
          monthlyStats,
          taskBreakdown,
          achievements,
          improvements
        })
      })

      setUserPerformances(detailedPerformances)
    } catch (error) {
      console.error('Error loading detailed performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateDailyProgress = (userProgressEntries: any[], dateRange: any, expectedDailyTasks: number, assemblies: any[]) => {
    const progressMap = new Map()
    
    // Initialize all dates in range
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      progressMap.set(dateStr, {
        date: dateStr,
        completed: 0,
        expected: expectedDailyTasks,
        completedWeight: 0,
        expectedWeight: 0,
        tasks: []
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Fill in actual progress
    userProgressEntries.forEach(entry => {
      const dateStr = entry.completion_date.split('T')[0]
      if (progressMap.has(dateStr)) {
        const dayProgress = progressMap.get(dateStr)
        dayProgress.completed += entry.quantity_completed
        
        const assembly = assemblies.find(a => a.id === entry.assembly_id)
        if (assembly) {
          dayProgress.completedWeight += entry.quantity_completed * (assembly.weight_per_unit || 0)
          dayProgress.tasks.push({
            taskName: assembly.poz_code || 'Bilinmeyen Poz',
            stage: assembly.stage_id || 'Bilinmeyen Aşama',
            quantity: entry.quantity_completed,
            weight: entry.quantity_completed * (assembly.weight_per_unit || 0),
            timeSpent: entry.time_spent || 0
          })
        }
      }
    })
    
    return Array.from(progressMap.values())
  }

  const generateWeeklyStats = (userProgressEntries: any[], dateRange: any) => {
    const weeklyMap = new Map()
    
    userProgressEntries.forEach(entry => {
      const date = new Date(entry.completion_date)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: weekKey,
          completed: 0,
          expected: 0,
          efficiency: 0
        })
      }
      
      const weekStats = weeklyMap.get(weekKey)
      weekStats.completed += entry.quantity_completed
    })
    
    return Array.from(weeklyMap.values())
  }

  const generateMonthlyStats = (userProgressEntries: any[], dateRange: any) => {
    const monthlyMap = new Map()
    
    userProgressEntries.forEach(entry => {
      const date = new Date(entry.completion_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          completed: 0,
          expected: 0,
          efficiency: 0
        })
      }
      
      const monthStats = monthlyMap.get(monthKey)
      monthStats.completed += entry.quantity_completed
    })
    
    return Array.from(monthlyMap.values())
  }

  const generateTaskBreakdown = (userAssignments: any[], userProgressEntries: any[], workStages: any[], assemblies: any[]) => {
    const breakdownMap = new Map()
    
    userAssignments.forEach(assignment => {
      const stage = workStages.find(s => s.id === assignment.work_stage_id)
      if (stage) {
        breakdownMap.set(stage.id, {
          stage: stage.stage_name,
          assigned: 0,
          completed: 0,
          efficiency: 0,
          averageTime: 0
        })
      }
    })
    
    userProgressEntries.forEach(entry => {
      const assembly = assemblies.find(a => a.id === entry.assembly_id)
      if (assembly && breakdownMap.has(assembly.stage_id)) {
        const breakdown = breakdownMap.get(assembly.stage_id)
        breakdown.completed += entry.quantity_completed
      }
    })
    
    return Array.from(breakdownMap.values())
  }

  const generateAchievements = (performanceScore: number, efficiency: number, qualityScore: number) => {
    const achievements = []
    
    if (performanceScore >= 90) achievements.push('Mükemmel Performans')
    if (efficiency >= 5) achievements.push('Yüksek Verimlilik')
    if (qualityScore >= 85) achievements.push('Kaliteli İş')
    if (performanceScore >= 100) achievements.push('Hedef Aşıldı')
    
    return achievements
  }

  const generateImprovements = (performanceScore: number, efficiency: number, qualityScore: number) => {
    const improvements = []
    
    if (performanceScore < 50) improvements.push('Performans artırılmalı')
    if (efficiency < 2) improvements.push('Verimlilik iyileştirilmeli')
    if (qualityScore < 70) improvements.push('Kalite kontrolü gerekli')
    
    return improvements
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (userPerformances.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Performans verisi bulunamadı</h3>
        <p className="text-gray-600">Bu projede henüz kullanıcı performans verisi bulunmuyor.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Detaylı Kullanıcı Performans Raporu</h2>
          <p className="text-gray-600 mt-1">Proje bazında kullanıcı performans analizi</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {userPerformances.map((performance) => (
          <div key={performance.userId} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{performance.userName}</h3>
                  <p className="text-sm text-gray-500">{performance.department}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                performance.isOnTrack 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {performance.isOnTrack ? 'Hedefte' : 'Gecikmeli'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Performans</span>
                <span className="font-medium">{performance.performanceScore.toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Verimlilik</span>
                <span className="font-medium">{performance.efficiency.toFixed(1)} görev/gün</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Günlük Kg</span>
                <span className="font-medium">{performance.dailyWeightAverage.toFixed(1)} kg</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ortalama Süre</span>
                <span className="font-medium">{performance.averageTaskTime.toFixed(0)} dk</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tamamlanan</span>
                <span className="font-medium">{performance.totalCompletedTasks} / {performance.totalAssignedTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (performance.totalCompletedTasks / performance.totalAssignedTasks) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detaylı Performans Analizi</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görevler</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kg</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performans</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verimlilik</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalite</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userPerformances.map((performance) => (
                <tr key={performance.userId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{performance.userName}</div>
                        <div className="text-sm text-gray-500">{performance.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{performance.totalCompletedTasks}</div>
                    <div className="text-sm text-gray-500">/ {performance.totalAssignedTasks}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{performance.totalCompletedWeight.toFixed(1)} kg</div>
                    <div className="text-sm text-gray-500">/ {performance.totalAssignedWeight.toFixed(1)} kg</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${performance.performanceScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{performance.performanceScore.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm font-medium text-gray-900">{performance.efficiency.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Award className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="text-sm font-medium text-gray-900">{performance.qualityScore.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      performance.isOnTrack 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {performance.isOnTrack ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Hedefte
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Gecikmeli
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Achievements and Improvements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 text-yellow-500 mr-2" />
            Başarılar
          </h3>
          <div className="space-y-2">
            {userPerformances.map((performance) => (
              <div key={performance.userId} className="border-b border-gray-200 pb-2 last:border-b-0">
                <div className="font-medium text-gray-900">{performance.userName}</div>
                <div className="text-sm text-gray-600">
                  {performance.achievements.length > 0 ? (
                    performance.achievements.join(', ')
                  ) : (
                    'Henüz başarı yok'
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
            İyileştirme Önerileri
          </h3>
          <div className="space-y-2">
            {userPerformances.map((performance) => (
              <div key={performance.userId} className="border-b border-gray-200 pb-2 last:border-b-0">
                <div className="font-medium text-gray-900">{performance.userName}</div>
                <div className="text-sm text-gray-600">
                  {performance.improvements.length > 0 ? (
                    performance.improvements.join(', ')
                  ) : (
                    'İyileştirme gerekmiyor'
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}