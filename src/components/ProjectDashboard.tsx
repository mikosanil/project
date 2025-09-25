import React, { useState, useEffect } from 'react'
import { BarChart3, PieChart, TrendingUp, Package, Users, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ProjectDashboardProps {
  projectId: string
}

interface DashboardData {
  totalAssemblies: number
  totalQuantity: number
  totalWeight: number
  workStageProgress: Array<{
    id: string
    name: string
    color: string
    completed: number
    total: number
    percentage: number
    completedWeight: number
    totalWeight: number
    weightPercentage: number
  }>
  recentWorkers: Array<{
    name: string
    entries: number
    lastWork: string
  }>
  overallProgress: number
  overallWeightProgress: number
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const getStageColor = (stageName: string) => {
    const colors = {
      'kesim': '#EF4444',
      'imalat': '#F59E0B', 
      'kaynak': '#3B82F6',
      'boya': '#10B981'
    }
    return colors[stageName as keyof typeof colors] || '#6B7280'
  }

  useEffect(() => {
    loadDashboardData()
  }, [projectId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load assemblies
      const { data: assemblies, error: assembliesError } = await supabase
        .from('assemblies')
        .select('*')
        .eq('project_id', projectId)

      if (assembliesError) throw assembliesError

      if (!assemblies?.length) {
        setData({
          totalAssemblies: 0,
          totalQuantity: 0,
          totalWeight: 0,
          workStageProgress: [],
          recentWorkers: [],
          overallProgress: 0,
          overallWeightProgress: 0
        })
        return
      }

      // Load project stages
      const { data: workStages, error: stagesError } = await supabase
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId)
        .order('stage_order')

      if (stagesError) throw stagesError

      // Load progress entries
      const assemblyIds = assemblies.map(a => a.id)
      const { data: progressEntries, error: progressError } = await supabase
        .from('progress_entries')
        .select('*')
        .in('assembly_id', assemblyIds)

      if (progressError) throw progressError

      // Calculate metrics
      const totalAssemblies = assemblies.length
      const totalQuantity = assemblies.reduce((sum, a) => sum + a.total_quantity, 0)
      
      // Calculate total weight - sadece imalat aşamasındaki pozlar
      const imalatStage = workStages?.find(stage => stage.stage_name === 'imalat')
      const imalatAssemblies = imalatStage ? assemblies.filter(a => a.stage_id === imalatStage.id) : []
      const totalWeight = imalatAssemblies.reduce((sum, a) => sum + (a.total_quantity * (a.weight_per_unit || 0)), 0)

      // Calculate work stage progress with weights - her aşama sadece kendi pozlarını hesaplar
      const workStageProgress = workStages?.map(stage => {
        const stageEntries = progressEntries?.filter(e => e.work_stage_id === stage.id) || []
        const stageAssemblies = assemblies.filter(a => a.stage_id === stage.id) // Sadece bu aşamaya ait pozlar
        
        const completed = stageEntries.reduce((sum, e) => sum + e.quantity_completed, 0)
        const total = stageAssemblies.reduce((sum, a) => sum + a.total_quantity, 0) // Sadece bu aşamadaki pozların toplamı
        const percentage = total > 0 ? (completed / total) * 100 : 0

        // Calculate weight for this stage - sadece bu aşamadaki pozlar
        let completedWeight = 0
        stageEntries.forEach(entry => {
          const assembly = assemblies.find(a => a.id === entry.assembly_id)
          if (assembly) {
            completedWeight += entry.quantity_completed * (assembly.weight_per_unit || 0)
          }
        })

        const totalWeightForStage = stageAssemblies.reduce((sum, a) => sum + (a.total_quantity * (a.weight_per_unit || 0)), 0)
        const weightPercentage = totalWeightForStage > 0 ? (completedWeight / totalWeightForStage) * 100 : 0

        return {
          id: stage.id,
          name: stage.stage_name,
          color: getStageColor(stage.stage_name),
          completed,
          total,
          percentage: Math.min(percentage, 100),
          completedWeight,
          totalWeight: totalWeightForStage,
          weightPercentage: Math.min(weightPercentage, 100)
        }
      }) || []

      // Calculate recent workers
      const workerStats: Record<string, { entries: number; lastWork: string }> = {}
      progressEntries?.forEach(entry => {
        if (!workerStats[entry.worker_name]) {
          workerStats[entry.worker_name] = {
            entries: 0,
            lastWork: entry.completion_date
          }
        }
        workerStats[entry.worker_name].entries++
        if (new Date(entry.completion_date) > new Date(workerStats[entry.worker_name].lastWork)) {
          workerStats[entry.worker_name].lastWork = entry.completion_date
        }
      })

      const recentWorkers = Object.entries(workerStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => new Date(b.lastWork).getTime() - new Date(a.lastWork).getTime())
        .slice(0, 5)

      // Calculate overall progress - her poz sadece kendi aşamasında çalışır
      const totalPossibleWork = totalQuantity // Sadece toplam miktar, aşama sayısı ile çarpma
      const totalCompletedWork = progressEntries?.reduce((sum, e) => sum + e.quantity_completed, 0) || 0
      const overallProgress = totalPossibleWork > 0 ? (totalCompletedWork / totalPossibleWork) * 100 : 0

      // Calculate overall weight progress - sadece imalat aşamasındaki ağırlık ilerlemesi
      const imalatStageProgress = workStageProgress.find(stage => stage.name === 'imalat')
      const totalPossibleWeight = totalWeight // Sadece imalat aşamasındaki toplam ağırlık
      const totalCompletedWeight = imalatStageProgress ? imalatStageProgress.completedWeight : 0
      const overallWeightProgress = totalPossibleWeight > 0 ? (totalCompletedWeight / totalPossibleWeight) * 100 : 0

      setData({
        totalAssemblies,
        totalQuantity,
        totalWeight,
        workStageProgress,
        recentWorkers,
        overallProgress: Math.min(overallProgress, 100),
        overallWeightProgress: Math.min(overallWeightProgress, 100)
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data || data.totalAssemblies === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard için veri yok</h3>
        <p className="text-gray-600">Montaj parçaları ve ilerleme kayıtları ekleyerek dashboard'u aktif hale getirin.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Genel İlerleme</p>
              <p className="text-3xl font-bold">{data.overallProgress.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Ağırlık İlerlemesi</p>
              <p className="text-3xl font-bold">{data.overallWeightProgress.toFixed(1)}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Toplam Ağırlık</p>
              <p className="text-3xl font-bold">{data.totalWeight.toFixed(0)}</p>
              <p className="text-green-100 text-xs">kg</p>
            </div>
            <Package className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Toplam Adet</p>
              <p className="text-3xl font-bold">{data.totalQuantity}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Work Stage Weight Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Package className="w-5 h-5 mr-2" />
          İş Aşamalarına Göre Ağırlık Dağılımı
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.workStageProgress.map((stage) => (
            <div key={stage.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm font-medium text-gray-700">{stage.name}</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">
                  {stage.completedWeight.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500">
                  / {stage.totalWeight.toFixed(0)} kg
                </div>
                <div className="text-xs text-gray-600">
                  {stage.weightPercentage.toFixed(1)}% tamamlandı
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${stage.weightPercentage}%`,
                      backgroundColor: stage.color 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Stage Progress */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            İş Aşaması İlerlemesi
          </h3>
          <div className="space-y-4">
            {data.workStageProgress.map((stage) => (
              <div key={stage.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>{stage.completed}/{stage.total} adet ({stage.percentage.toFixed(1)}%)</div>
                    <div>{stage.completedWeight.toFixed(0)} kg ({stage.weightPercentage.toFixed(1)}%)</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${stage.percentage}%`,
                      backgroundColor: stage.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Workers */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Aktif Çalışanlar
          </h3>
          <div className="space-y-3">
            {data.recentWorkers.length === 0 ? (
              <p className="text-gray-600 text-sm">Henüz çalışan kaydı yok</p>
            ) : (
              data.recentWorkers.map((worker, index) => (
                <div key={worker.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {worker.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{worker.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <span>{worker.entries} kayıt</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(worker.lastWork).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Progress Pie Chart Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PieChart className="w-5 h-5 mr-2" />
          İş Aşaması Dağılımı
        </h3>
        <div className="flex flex-wrap justify-center items-center space-x-8">
          {data.workStageProgress.map((stage, index) => {
            const circumference = 2 * Math.PI * 45
            const strokeDasharray = `${(stage.percentage / 100) * circumference} ${circumference}`
            
            return (
              <div key={stage.id} className="flex flex-col items-center m-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke={stage.color}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={strokeDasharray}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-700">
                      {stage.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900">{stage.name}</p>
                  <p className="text-xs text-gray-600">{stage.completed}/{stage.total} adet</p>
                  <p className="text-xs text-gray-500">{stage.completedWeight.toFixed(0)} kg</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}