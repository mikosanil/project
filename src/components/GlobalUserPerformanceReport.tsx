import React, { useState, useEffect } from 'react'
import { 
  Download, 
  User, 
  Calendar, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  BarChart3,
  FileText,
  Printer,
  Filter,
  Search,
  Building,
  Award,
  AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface GlobalUserPerformanceReportProps {
  // No projectId needed - this covers all projects
}

interface GlobalUserPerformance {
  userId: string
  userName: string
  department: string
  role: string
  totalProjects: number
  activeProjects: number
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
  projectBreakdown: Array<{
    projectId: string
    projectName: string
    assignedTasks: number
    completedTasks: number
    assignedWeight: number // Proje atanan kg
    completedWeight: number // Proje tamamlanan kg
    performance: number
    status: string
  }>
  dailyProgress: Array<{
    date: string
    completed: number
    expected: number
    projects: string[]
  }>
  weeklyStats: {
    week: string
    completed: number
    expected: number
    efficiency: number
    projects: string[]
  }[]
  monthlyStats: {
    month: string
    completed: number
    expected: number
    efficiency: number
    projects: string[]
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
  topProjects: Array<{
    projectName: string
    performance: number
    tasksCompleted: number
  }>
}

export function GlobalUserPerformanceReport({}: GlobalUserPerformanceReportProps) {
  const [userPerformances, setUserPerformances] = useState<GlobalUserPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
    end: new Date().toISOString().split('T')[0]
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'performance' | 'name' | 'efficiency' | 'projects'>('performance')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  useEffect(() => {
    loadGlobalPerformanceData()
  }, [dateRange])

  const loadGlobalPerformanceData = async () => {
    try {
      setLoading(true)
      
      // Load all projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      // Load all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')

      if (usersError) throw usersError

      // Load all assemblies
      const { data: assemblies, error: assembliesError } = await supabase
        .from('assemblies')
        .select('id, total_quantity, project_id, stage_id, weight_per_unit, poz_code')

      if (assembliesError) throw assembliesError

      // Load progress entries for all projects
      const assemblyIds = assemblies?.map(a => a.id) || []
      const { data: progressEntries, error: progressError } = await supabase
        .from('progress_entries')
        .select(`
          *,
          assemblies (poz_code, total_quantity, project_id, stage_id, project_stages (stage_name))
        `)
        .in('assembly_id', assemblyIds)
        .gte('completion_date', dateRange.start)
        .lte('completion_date', dateRange.end)
        .order('completion_date', { ascending: false })

      if (progressError) throw progressError

      // Load all task assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('project_task_assignments')
        .select('*')

      if (assignmentsError) throw assignmentsError

      // Load project stages for all projects
      const { data: workStages, error: workStagesError } = await supabase
        .from('project_stages')
        .select('*')
        .order('stage_order')

      if (workStagesError) throw workStagesError

      // Calculate global performance for each user
      const globalPerformances: GlobalUserPerformance[] = []

      users?.forEach(user => {
        const userAssignments = assignments?.filter(a => a.user_id === user.id) || []
        const userProgressEntries = progressEntries?.filter(e => e.user_id === user.id) || []
        
        if (userAssignments.length === 0) return

        // Calculate basic stats - atanan aşamalardaki toplam parça adedi (her parça bir görev)
        const assignedStageIds = userAssignments.map(a => a.work_stage_id)
        const assignedAssemblies = assemblies?.filter(a => assignedStageIds.includes(a.stage_id)) || []
        const totalAssignedTasks = assignedAssemblies.reduce((sum, a) => sum + a.total_quantity, 0) // Toplam parça adedi
        
        // Tamamlanan görev sayısı = tamamlanan parça adedi
        const totalCompletedTasks = userProgressEntries.reduce((sum, e) => sum + e.quantity_completed, 0)
        
        // Tamamlanan adet sayısı (miktar)
        const totalQuantityCompleted = userProgressEntries.reduce((sum, e) => sum + e.quantity_completed, 0)
        
        // Kg hesaplamaları - sadece atanan aşamalardaki ağırlık
        const totalAssignedWeight = assignedAssemblies.reduce((sum, a) => sum + (a.total_quantity * (a.weight_per_unit || 0)), 0)
        
        const totalCompletedWeight = userProgressEntries.reduce((sum, e) => {
          const assembly = assemblies?.find(a => a.id === e.assembly_id)
          return sum + (e.quantity_completed * (assembly?.weight_per_unit || 0))
        }, 0)
        
        // Calculate performance score
        const completionRate = totalAssignedTasks > 0 ? (totalCompletedTasks / totalAssignedTasks) * 100 : 0
        const performanceScore = Math.min(completionRate, 100)
        
        // Calculate efficiency (tasks per day) - gerçek çalışılan günleri hesapla
        const workDays = new Set(userProgressEntries.map(e => e.completion_date.split('T')[0])).size
        const daysWorked = Math.max(1, workDays)
        const efficiency = totalCompletedTasks / daysWorked
        
        // Günlük kg ortalaması
        const dailyWeightAverage = totalCompletedWeight / daysWorked
        
        // Calculate quality score
        const qualityScore = Math.min(performanceScore * 0.8 + (efficiency > 1 ? 20 : 0), 100)
        
        // Calculate average task time
        const totalTimeSpent = userProgressEntries.reduce((sum, e) => sum + (e.time_spent || 0), 0)
        const averageTaskTime = totalCompletedTasks > 0 ? totalTimeSpent / totalCompletedTasks : 0
        
        // Check if on track
        const expectedDailyTasks = totalAssignedTasks / daysWorked
        const actualDailyTasks = totalCompletedTasks / daysWorked
        const isOnTrack = actualDailyTasks >= expectedDailyTasks * 0.8

        // Calculate project breakdown
        const projectBreakdown = generateProjectBreakdown(userAssignments, userProgressEntries, projects, assemblies)
        
        // Calculate total projects
        const userProjectIds = new Set(userAssignments.map(a => a.project_id))
        const totalProjects = userProjectIds.size
        const activeProjects = projects?.filter(p => 
          userProjectIds.has(p.id) && 
          p.status !== 'completed' && 
          p.status !== 'on_hold'
        ).length || 0

        // Generate daily progress
        const dailyProgress = generateDailyProgress(userProgressEntries, dateRange, expectedDailyTasks, projects)
        
        // Generate weekly stats
        const weeklyStats = generateWeeklyStats(userProgressEntries, dateRange, projects)
        
        // Generate monthly stats
        const monthlyStats = generateMonthlyStats(userProgressEntries, dateRange, projects)
        
        // Generate task breakdown by stage
        const taskBreakdown = generateTaskBreakdown(userAssignments, userProgressEntries, workStages)
        
        // Generate achievements and improvements
        const achievements = generateAchievements(performanceScore, efficiency, qualityScore, totalProjects)
        const improvements = generateImprovements(performanceScore, efficiency, qualityScore)
        
        // Generate top projects
        const topProjects = generateTopProjects(projectBreakdown)

        globalPerformances.push({
          userId: user.id,
          userName: user.full_name || 'Bilinmeyen Kullanıcı',
          department: user.department || 'Belirtilmemiş',
          role: user.role || 'user',
          totalProjects,
          activeProjects,
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
          projectBreakdown,
          dailyProgress,
          weeklyStats,
          monthlyStats,
          taskBreakdown,
          achievements,
          improvements,
          topProjects
        })
      })

      setUserPerformances(globalPerformances)
    } catch (error) {
      console.error('Error loading global performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateProjectBreakdown = (assignments: any[], entries: any[], projects: any[], assemblies: any[]) => {
    const breakdown: any[] = []
    const projectMap = new Map(projects?.map(p => [p.id, p]) || [])
    
    // Group assignments by project
    const projectAssignments = new Map()
    assignments.forEach(assignment => {
      if (!projectAssignments.has(assignment.project_id)) {
        projectAssignments.set(assignment.project_id, [])
      }
      projectAssignments.get(assignment.project_id).push(assignment)
    })
    
    // Group entries by project
    const projectEntries = new Map()
    entries.forEach(entry => {
      const assembly = assemblies?.find(a => a.id === entry.assembly_id)
      if (assembly) {
        if (!projectEntries.has(assembly.project_id)) {
          projectEntries.set(assembly.project_id, [])
        }
        projectEntries.get(assembly.project_id).push(entry)
      }
    })
    
    // Calculate breakdown for each project
    projectAssignments.forEach((projectAssignments, projectId) => {
      const project = projectMap.get(projectId)
      const projectEntriesList = projectEntries.get(projectId) || []
      
      if (project) {
        // Proje kg hesaplamaları
        const projectAssemblies = assemblies?.filter(a => a.project_id === projectId) || []
        const assignedWeight = projectAssemblies.reduce((sum, a) => sum + (a.total_quantity * (a.weight_per_unit || 0)), 0)
        const completedWeight = projectEntriesList.reduce((sum, e) => {
          const assembly = assemblies?.find(a => a.id === e.assembly_id)
          return sum + (e.quantity_completed * (assembly?.weight_per_unit || 0))
        }, 0)
        
        // Proje bazlı görev hesaplaması - sadece atanan aşamalardaki toplam parça adedi
        const assignedStageIds = projectAssignments.map(a => a.work_stage_id)
        const projectAssignedAssemblies = projectAssemblies.filter(a => assignedStageIds.includes(a.stage_id))
        const assignedTasks = projectAssignedAssemblies.reduce((sum, a) => sum + a.total_quantity, 0) // Toplam parça adedi
        
        // Tamamlanan görev sayısı = tamamlanan parça adedi
        const completedTasks = projectEntriesList.reduce((sum, e) => sum + e.quantity_completed, 0)
        
        breakdown.push({
          projectId: project.id,
          projectName: project.name,
          assignedTasks,
          completedTasks,
          assignedWeight,
          completedWeight,
          performance: assignedTasks > 0 ? (completedTasks / assignedTasks) * 100 : 0,
          status: project.status || 'planning'
        })
      }
    })
    
    return breakdown
  }

  const generateDailyProgress = (entries: any[], dateRange: any, expectedDaily: number, projects: any[]) => {
    const days = []
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayEntries = entries.filter(e => e.completion_date.startsWith(dateStr))
      
      // Get unique projects for this day
      const dayProjects = new Set(dayEntries.map(e => {
        const assembly = projects?.find(p => p.id === e.assemblies?.project_id)
        return assembly?.name
      }).filter(Boolean))
      
      days.push({
        date: dateStr,
        completed: dayEntries.length,
        expected: expectedDaily,
        projects: Array.from(dayProjects)
      })
    }
    
    return days
  }

  const generateWeeklyStats = (entries: any[], dateRange: any, projects: any[]) => {
    const weeks = []
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      const weekEnd = new Date(d)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const weekEntries = entries.filter(e => {
        const entryDate = new Date(e.completion_date)
        return entryDate >= d && entryDate <= weekEnd
      })
      
      // Get unique projects for this week
      const weekProjects = new Set(weekEntries.map(e => {
        const assembly = projects?.find(p => p.id === e.assemblies?.project_id)
        return assembly?.name
      }).filter(Boolean))
      
      weeks.push({
        week: `${d.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`,
        completed: weekEntries.length,
        expected: 7,
        efficiency: weekEntries.length / 7,
        projects: Array.from(weekProjects)
      })
    }
    
    return weeks
  }

  const generateMonthlyStats = (entries: any[], dateRange: any, projects: any[]) => {
    const months = []
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    
    for (let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      
      const monthEntries = entries.filter(e => {
        const entryDate = new Date(e.completion_date)
        return entryDate >= d && entryDate <= monthEnd
      })
      
      // Get unique projects for this month
      const monthProjects = new Set(monthEntries.map(e => {
        const assembly = projects?.find(p => p.id === e.assemblies?.project_id)
        return assembly?.name
      }).filter(Boolean))
      
      months.push({
        month: d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' }),
        completed: monthEntries.length,
        expected: 30,
        efficiency: monthEntries.length / 30,
        projects: Array.from(monthProjects)
      })
    }
    
    return months
  }

  const generateTaskBreakdown = (assignments: any[], entries: any[], workStages: any[]) => {
    const breakdown: any[] = []
    
    workStages?.forEach(stage => {
      const stageAssignments = assignments.filter(a => a.work_stage_id === stage.id)
      const stageEntries = entries.filter(e => e.work_stage_id === stage.id)
      
      breakdown.push({
        stage: stage.stage_name,
        assigned: stageAssignments.length,
        completed: stageEntries.length,
        efficiency: stageAssignments.length > 0 ? (stageEntries.length / stageAssignments.length) * 100 : 0,
        averageTime: stageEntries.length > 0 ? stageEntries.reduce((sum, e) => sum + (e.time_spent || 0), 0) / stageEntries.length : 0
      })
    })
    
    return breakdown
  }

  const generateAchievements = (performance: number, efficiency: number, quality: number, totalProjects: number) => {
    const achievements = []
    
    if (performance >= 90) achievements.push('Mükemmel performans gösterdi')
    if (efficiency >= 2) achievements.push('Yüksek verimlilik sağladı')
    if (quality >= 85) achievements.push('Yüksek kalite standartları')
    if (performance >= 80 && efficiency >= 1.5) achievements.push('Hedefleri aştı')
    if (totalProjects >= 5) achievements.push('Çoklu proje deneyimi')
    if (totalProjects >= 10) achievements.push('Proje uzmanı')
    
    return achievements
  }

  const generateImprovements = (performance: number, efficiency: number, quality: number) => {
    const improvements = []
    
    if (performance < 70) improvements.push('Görev tamamlama oranını artırmalı')
    if (efficiency < 1) improvements.push('Günlük verimliliği artırmalı')
    if (quality < 70) improvements.push('Kalite standartlarını yükseltmeli')
    if (performance < 80) improvements.push('Zaman yönetimini geliştirmeli')
    
    return improvements
  }

  const generateTopProjects = (projectBreakdown: any[]) => {
    return projectBreakdown
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3)
      .map(project => ({
        projectName: project.projectName,
        performance: project.performance,
        tasksCompleted: project.completedTasks
      }))
  }

  const exportToPDF = (user: GlobalUserPerformance) => {
    console.log('Exporting PDF for user:', user.userName)
  }

  const exportToExcel = (user: GlobalUserPerformance) => {
    console.log('Exporting Excel for user:', user.userName)
  }

  const printReport = (user: GlobalUserPerformance) => {
    window.print()
  }

  const filteredUsers = userPerformances
    .filter(user => {
      const matchesSearch = user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.department.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      
      return matchesSearch && matchesDepartment && matchesRole
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.performanceScore - a.performanceScore
        case 'name':
          return a.userName.localeCompare(b.userName)
        case 'efficiency':
          return b.efficiency - a.efficiency
        case 'projects':
          return b.totalProjects - a.totalProjects
        default:
          return 0
      }
    })

  const departments = [...new Set(userPerformances.map(u => u.department))].filter(Boolean)
  const roles = [...new Set(userPerformances.map(u => u.role))].filter(Boolean)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Building className="w-8 h-8 mr-3 text-blue-600" />
          Genel Kullanıcı Performans Raporları
        </h2>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-gray-500">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Departmanlar</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Roller</option>
            {roles.map(role => (
              <option key={role} value={role}>{role === 'admin' ? 'Admin' : role === 'manager' ? 'Yönetici' : 'Kullanıcı'}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="performance">Performansa Göre</option>
            <option value="name">İsme Göre</option>
            <option value="efficiency">Verimliliğe Göre</option>
            <option value="projects">Proje Sayısına Göre</option>
          </select>
        </div>
      </div>

      {/* User Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div key={user.userId} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            {/* User Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.userName}</h3>
                  <p className="text-sm text-gray-600">{user.department} • {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Yönetici' : 'Kullanıcı'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportToPDF(user)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="PDF İndir"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => printReport(user)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Yazdır"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  user.performanceScore >= 80 ? 'text-green-600' : 
                  user.performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {user.performanceScore.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600">Performans</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  user.efficiency >= 1.5 ? 'text-green-600' : 
                  user.efficiency >= 1 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {user.efficiency.toFixed(1)}
                </div>
                <div className="text-xs text-gray-600">Verimlilik</div>
              </div>
            </div>

            {/* Project Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {user.totalProjects}
                </div>
                <div className="text-xs text-gray-600">Toplam Proje</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {user.activeProjects}
                </div>
                <div className="text-xs text-gray-600">Aktif Proje</div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Atanan Görevler:</span>
                <span className="font-medium">{user.totalAssignedTasks}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tamamlanan:</span>
                <span className="font-medium">{user.totalCompletedTasks}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Toplam Miktar:</span>
                <span className="font-medium">{user.totalQuantityCompleted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Atanan Ağırlık:</span>
                <span className="font-medium text-purple-600">{user.totalAssignedWeight.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tamamlanan Ağırlık:</span>
                <span className="font-medium text-orange-600">{user.totalCompletedWeight.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Günlük Kg Ort.:</span>
                <span className="font-medium text-green-600">{user.dailyWeightAverage.toFixed(1)} kg/gün</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ortalama Süre:</span>
                <span className="font-medium">{user.averageTaskTime.toFixed(1)} dk</span>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-1 ${
                user.isOnTrack ? 'text-green-600' : 'text-red-600'
              }`}>
                {user.isOnTrack ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {user.isOnTrack ? 'Hedefte' : 'Geride'}
                </span>
              </div>
              <button
                onClick={() => setSelectedUser(selectedUser === user.userId ? null : user.userId)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {selectedUser === user.userId ? 'Gizle' : 'Detaylar'}
              </button>
            </div>

            {/* Detailed View */}
            {selectedUser === user.userId && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                {/* Top Projects */}
                {user.topProjects.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2 flex items-center">
                      <Award className="w-4 h-4 mr-1" />
                      En İyi Projeler
                    </h4>
                    <div className="space-y-2">
                      {user.topProjects.map((project, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">{project.projectName}:</span>
                          <span className="font-medium">
                            {project.performance.toFixed(0)}% ({project.tasksCompleted} görev)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements */}
                {user.achievements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Başarılar</h4>
                    <ul className="space-y-1">
                      {user.achievements.map((achievement, index) => (
                        <li key={index} className="text-sm text-green-700">• {achievement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {user.improvements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-orange-600 mb-2">İyileştirme Alanları</h4>
                    <ul className="space-y-1">
                      {user.improvements.map((improvement, index) => (
                        <li key={index} className="text-sm text-orange-700">• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Project Breakdown */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Proje Dağılımı</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {user.projectBreakdown.map((project, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600 truncate">{project.projectName}:</span>
                        <span className="font-medium">
                          {project.completedTasks}/{project.assignedTasks} ({project.performance.toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      {filteredUsers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Genel Özet İstatistikler</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredUsers.length}
              </div>
              <div className="text-sm text-gray-600">Toplam Kullanıcı</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(filteredUsers.reduce((sum, u) => sum + u.performanceScore, 0) / filteredUsers.length).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Ortalama Performans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredUsers.reduce((sum, u) => sum + u.totalCompletedTasks, 0)}
              </div>
              <div className="text-sm text-gray-600">Toplam Tamamlanan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredUsers.filter(u => u.isOnTrack).length}
              </div>
              <div className="text-sm text-gray-600">Hedefte Olan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {filteredUsers.reduce((sum, u) => sum + u.totalProjects, 0)}
              </div>
              <div className="text-sm text-gray-600">Toplam Proje</div>
            </div>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Veri bulunamadı</h3>
          <p className="text-gray-600">
            Seçilen filtreler için kullanıcı performans verisi bulunamadı.
          </p>
        </div>
      )}
    </div>
  )
}
