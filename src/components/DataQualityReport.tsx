import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Database, Users, Package, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface DataQualityMetrics {
  users: {
    total: number
    withName: number
    withEmail: number
    withRole: number
    completeness: number
  }
  projects: {
    total: number
    withDescription: number
    withTargetDate: number
    completeness: number
  }
  assemblies: {
    total: number
    withPozCode: number
    withWeight: number
    completeness: number
  }
  progressEntries: {
    total: number
    withUserId: number
    withTimeSpent: number
    completeness: number
  }
}

interface DataQualityAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  category: string
  message: string
  count: number
  action: string
}

export function DataQualityReport() {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null)
  const [alerts, setAlerts] = useState<DataQualityAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState(false)

  useEffect(() => {
    loadDataQualityMetrics()
  }, [])

  const loadDataQualityMetrics = async () => {
    try {
      setLoading(true)
      console.log('DataQualityReport: Loading data quality metrics...')

      // Kullanıcı veri kalitesi
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, role, department')

      if (usersError) {
        console.error('Error loading users:', usersError)
      }
      console.log('Users loaded:', users?.length || 0)

      const userMetrics = {
        total: users?.length || 0,
        withName: users?.filter(u => u.full_name?.trim()).length || 0,
        withEmail: users?.filter(u => u.email?.trim()).length || 0,
        withRole: users?.filter(u => u.role?.trim()).length || 0,
        completeness: 0
      }
      userMetrics.completeness = userMetrics.total > 0 
        ? Math.round(((userMetrics.withName + userMetrics.withEmail + userMetrics.withRole) / (userMetrics.total * 3)) * 100)
        : 0

      console.log('User metrics:', userMetrics)

      // Proje veri kalitesi
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, description, start_date')

      if (projectsError) {
        console.error('Error loading projects:', projectsError)
      }
      console.log('Projects loaded:', projects?.length || 0)
      console.log('Projects data:', projects)

      const projectMetrics = {
        total: projects?.length || 0,
        withDescription: projects?.filter(p => p.description?.trim()).length || 0,
        withStartDate: projects?.filter(p => p.start_date).length || 0,
        completeness: 0
      }
      projectMetrics.completeness = projectMetrics.total > 0
        ? Math.round(((projectMetrics.withDescription + projectMetrics.withStartDate) / (projectMetrics.total * 2)) * 100)
        : 0

      console.log('Project metrics:', projectMetrics)

      // Assembly veri kalitesi
      const { data: assemblies, error: assembliesError } = await supabase
        .from('assemblies')
        .select('id, poz_code, weight_per_unit')

      if (assembliesError) {
        console.error('Error loading assemblies:', assembliesError)
      }
      console.log('Assemblies loaded:', assemblies?.length || 0)

      const assemblyMetrics = {
        total: assemblies?.length || 0,
        withPozCode: assemblies?.filter(a => a.poz_code?.trim()).length || 0,
        withWeight: assemblies?.filter(a => a.weight_per_unit && a.weight_per_unit > 0).length || 0,
        completeness: 0
      }
      assemblyMetrics.completeness = assemblyMetrics.total > 0
        ? Math.round(((assemblyMetrics.withPozCode + assemblyMetrics.withWeight) / (assemblyMetrics.total * 2)) * 100)
        : 0

      console.log('Assembly metrics:', assemblyMetrics)

      // Progress entries veri kalitesi
      const { data: progressEntries, error: progressError } = await supabase
        .from('progress_entries')
        .select('id, user_id, time_spent')

      if (progressError) {
        console.error('Error loading progress entries:', progressError)
      }
      console.log('Progress entries loaded:', progressEntries?.length || 0)

      const progressMetrics = {
        total: progressEntries?.length || 0,
        withUserId: progressEntries?.filter(p => p.user_id).length || 0,
        withTimeSpent: progressEntries?.filter(p => p.time_spent && p.time_spent > 0).length || 0,
        completeness: 0
      }
      progressMetrics.completeness = progressMetrics.total > 0
        ? Math.round(((progressMetrics.withUserId + progressMetrics.withTimeSpent) / (progressMetrics.total * 2)) * 100)
        : 0

      console.log('Progress metrics:', progressMetrics)

      setMetrics({
        users: userMetrics,
        projects: projectMetrics,
        assemblies: assemblyMetrics,
        progressEntries: progressMetrics
      })

      // Uyarıları oluştur
      generateAlerts(userMetrics, projectMetrics, assemblyMetrics, progressMetrics)

    } catch (error) {
      console.error('Error loading data quality metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAlerts = (users: any, projects: any, assemblies: any, progress: any) => {
    const newAlerts: DataQualityAlert[] = []

    // Kullanıcı uyarıları
    if (users.total - users.withName > 0) {
      newAlerts.push({
        id: 'users-missing-names',
        type: 'warning',
        category: 'Kullanıcılar',
        message: `${users.total - users.withName} kullanıcının ismi eksik`,
        count: users.total - users.withName,
        action: 'Düzelt'
      })
    }

    if (users.total - users.withEmail > 0) {
      newAlerts.push({
        id: 'users-missing-emails',
        type: 'error',
        category: 'Kullanıcılar',
        message: `${users.total - users.withEmail} kullanıcının email adresi eksik`,
        count: users.total - users.withEmail,
        action: 'Düzelt'
      })
    }

    // Assembly uyarıları
    if (assemblies.total - assemblies.withPozCode > 0) {
      newAlerts.push({
        id: 'assemblies-missing-poz',
        type: 'warning',
        category: 'Pozlar',
        message: `${assemblies.total - assemblies.withPozCode} pozun kodu eksik`,
        count: assemblies.total - assemblies.withPozCode,
        action: 'Düzelt'
      })
    }

    if (assemblies.total - assemblies.withWeight > 0) {
      newAlerts.push({
        id: 'assemblies-missing-weight',
        type: 'warning',
        category: 'Pozlar',
        message: `${assemblies.total - assemblies.withWeight} pozun ağırlığı eksik`,
        count: assemblies.total - assemblies.withWeight,
        action: 'Düzelt'
      })
    }

    setAlerts(newAlerts)
  }

  const fixDataQuality = async () => {
    try {
      setFixing(true)
      
      // Veri düzeltme işlemlerini burada yapabilirsiniz
      // Örneğin: eksik isimleri email'den oluşturma
      
      // Sayfayı yenile
      await loadDataQualityMetrics()
      
    } catch (error) {
      console.error('Error fixing data quality:', error)
    } finally {
      setFixing(false)
    }
  }

  const getQualityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getQualityBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Veri Kalitesi Raporu</h2>
            <p className="text-gray-600">Sistem verilerinin kalite durumu ve iyileştirme önerileri</p>
          </div>
        </div>
        <button
          onClick={fixDataQuality}
          disabled={fixing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {fixing ? 'Düzeltiliyor...' : 'Veri Kalitesini Düzelt'}
        </button>
      </div>

      {/* Uyarılar */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Tespit Edilen Sorunlar</h3>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.type === 'error' 
                  ? 'bg-red-50 border-red-400' 
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-400'
                  : 'bg-blue-50 border-blue-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {alert.type === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    <span className="font-medium text-gray-900">{alert.message}</span>
                    <span className="text-sm text-gray-600 ml-2">({alert.category})</span>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 font-medium">
                  {alert.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrikler */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Kullanıcı Veri Kalitesi */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Kullanıcılar</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Toplam</span>
                <span className="font-medium">{metrics.users.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">İsim Var</span>
                <span className="font-medium">{metrics.users.withName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email Var</span>
                <span className="font-medium">{metrics.users.withEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Rol Var</span>
                <span className="font-medium">{metrics.users.withRole}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Kalite</span>
                  <span className={`text-sm font-bold ${getQualityColor(metrics.users.completeness)}`}>
                    %{metrics.users.completeness}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getQualityBgColor(metrics.users.completeness)}`}
                    style={{ width: `${metrics.users.completeness}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Proje Veri Kalitesi */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center space-x-3 mb-4">
              <Package className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Projeler</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Toplam</span>
                <span className="font-medium">{metrics.projects.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Açıklama Var</span>
                <span className="font-medium">{metrics.projects.withDescription}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Başlangıç Tarihi Var</span>
                <span className="font-medium">{metrics.projects.withStartDate}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Kalite</span>
                  <span className={`text-sm font-bold ${getQualityColor(metrics.projects.completeness)}`}>
                    %{metrics.projects.completeness}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getQualityBgColor(metrics.projects.completeness)}`}
                    style={{ width: `${metrics.projects.completeness}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Assembly Veri Kalitesi */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center space-x-3 mb-4">
              <Package className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Pozlar</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Toplam</span>
                <span className="font-medium">{metrics.assemblies.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Poz Kodu Var</span>
                <span className="font-medium">{metrics.assemblies.withPozCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ağırlık Var</span>
                <span className="font-medium">{metrics.assemblies.withWeight}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Kalite</span>
                  <span className={`text-sm font-bold ${getQualityColor(metrics.assemblies.completeness)}`}>
                    %{metrics.assemblies.completeness}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getQualityBgColor(metrics.assemblies.completeness)}`}
                    style={{ width: `${metrics.assemblies.completeness}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Entries Veri Kalitesi */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">İlerleme Kayıtları</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Toplam</span>
                <span className="font-medium">{metrics.progressEntries.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Kullanıcı ID Var</span>
                <span className="font-medium">{metrics.progressEntries.withUserId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Süre Var</span>
                <span className="font-medium">{metrics.progressEntries.withTimeSpent}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Kalite</span>
                  <span className={`text-sm font-bold ${getQualityColor(metrics.progressEntries.completeness)}`}>
                    %{metrics.progressEntries.completeness}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getQualityBgColor(metrics.progressEntries.completeness)}`}
                    style={{ width: `${metrics.progressEntries.completeness}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Genel Veri Kalitesi Özeti */}
      {metrics && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Genel Veri Kalitesi Özeti</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {Math.round((
                  metrics.users.completeness + 
                  metrics.projects.completeness + 
                  metrics.assemblies.completeness + 
                  metrics.progressEntries.completeness
                ) / 4)}%
              </div>
              <div className="text-sm text-gray-600">Ortalama Kalite</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {alerts.filter(a => a.type === 'error').length}
              </div>
              <div className="text-sm text-gray-600">Kritik Sorun</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {alerts.filter(a => a.type === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">Uyarı</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
