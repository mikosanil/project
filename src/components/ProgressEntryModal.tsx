import React, { useState, useEffect } from 'react'
import { X, Calendar, Hash, MessageSquare, AlertTriangle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface ProgressEntryModalProps {
  assembly: any
  workStages: any[] // Bu aslında project_stages olacak
  onClose: () => void
  onProgressAdded: () => void
}

export function ProgressEntryModal({ assembly, workStages, onClose, onProgressAdded }: ProgressEntryModalProps) {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    work_stage_id: '',
    quantity_completed: '',
    completion_date: new Date().toISOString().split('T')[0], // Otomatik mevcut tarih
    completion_time: new Date().toTimeString().split(' ')[0].substring(0, 5), // Otomatik mevcut saat
    time_spent: '', // Boş başlangıç - kullanıcı girmek zorunda
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignedTasks, setAssignedTasks] = useState<string[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [existingProgress, setExistingProgress] = useState<{[key: string]: number}>({})
  const [loadingProgress, setLoadingProgress] = useState(true)

  useEffect(() => {
    if (!authLoading && user) {
      loadAssignedTasks()
      loadExistingProgress()
    }
  }, [assembly.project_id, authLoading, user])

  const loadAssignedTasks = async () => {
    try {
      setLoadingTasks(true)
      
      console.log('ProgressEntryModal - Loading assigned tasks for user:', user?.id, 'project:', assembly.project_id)
      
      if (!user?.id) {
        console.error('User ID is undefined')
        return
      }
      
      // Pozun ait olduğu aşamayı kontrol et
      if (!assembly.stage_id) {
        console.error('Assembly has no stage_id')
        return
      }
      
      // Kullanıcının bu projede atandığı görevleri getir
      const { data: assignments, error } = await supabase
        .from('project_task_assignments')
        .select('work_stage_id')
        .eq('project_id', assembly.project_id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading assigned tasks:', error)
        return
      }

      console.log('ProgressEntryModal - Found assignments:', assignments)

      const assignedStageIds = assignments?.map(a => a.work_stage_id) || []
      console.log('ProgressEntryModal - Assigned stage IDs:', assignedStageIds)
      
      // Sadece pozun ait olduğu aşamaya atanmışsa göster
      if (assignedStageIds.includes(assembly.stage_id)) {
        setAssignedTasks([assembly.stage_id])
        setFormData(prev => ({
          ...prev,
          work_stage_id: assembly.stage_id
        }))
      } else {
        setAssignedTasks([])
      }
    } catch (error) {
      console.error('Error loading assigned tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const loadExistingProgress = async () => {
    try {
      setLoadingProgress(true)
      
      // Bu parça için mevcut ilerleme miktarlarını getir
      const { data: progressEntries, error } = await supabase
        .from('progress_entries')
        .select('work_stage_id, quantity_completed')
        .eq('assembly_id', assembly.id)

      if (error) {
        console.error('Error loading existing progress:', error)
        return
      }

      // Her iş aşaması için toplam tamamlanan miktarı hesapla
      const progressMap: {[key: string]: number} = {}
      progressEntries?.forEach(entry => {
        if (progressMap[entry.work_stage_id]) {
          progressMap[entry.work_stage_id] += entry.quantity_completed
        } else {
          progressMap[entry.work_stage_id] = entry.quantity_completed
        }
      })

      console.log('Existing progress for assembly:', progressMap)
      setExistingProgress(progressMap)
    } catch (error) {
      console.error('Error loading existing progress:', error)
    } finally {
      setLoadingProgress(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Kullanıcının bu göreve atanıp atanmadığını kontrol et
      if (!assignedTasks.includes(formData.work_stage_id)) {
        setError('Bu göreve atanmamışsınız. Sadece size atanan görevlerden ilerleme kaydedebilirsiniz.')
        return
      }

      const quantity = parseInt(formData.quantity_completed)
      if (quantity <= 0) {
        setError('Adet 1\'den büyük olmalıdır')
        return
      }

      const timeSpent = parseInt(formData.time_spent)
      if (!timeSpent || timeSpent < 1) {
        setError('Harcanan süre en az 1 dakika olmalıdır')
        return
      }

      // Mevcut ilerleme miktarını kontrol et
      const currentProgress = existingProgress[formData.work_stage_id] || 0
      const remainingQuantity = assembly.total_quantity - currentProgress

      if (quantity > remainingQuantity) {
        setError(`Bu iş aşaması için maksimum ${remainingQuantity} adet girebilirsiniz. (Mevcut: ${currentProgress}/${assembly.total_quantity})`)
        return
      }

      if (remainingQuantity === 0) {
        setError('Bu iş aşaması zaten tamamlanmış. Yeni ilerleme kaydı ekleyemezsiniz.')
        return
      }

              // Tarih ve saati birleştir
        const completionDateTime = `${formData.completion_date}T${formData.completion_time}:00`

        const { error } = await supabase
          .from('progress_entries')
          .insert([{
            assembly_id: assembly.id,
            work_stage_id: formData.work_stage_id,
            quantity_completed: quantity,
            user_id: user?.id,
            worker_name: userProfile?.full_name || user?.email || 'Bilinmeyen Kullanıcı',
            completion_date: completionDateTime,
            time_spent: timeSpent,
            notes: formData.notes.trim()
          }])

      if (error) throw error

      // İlerleme verilerini yeniden yükle
      await loadExistingProgress()
      onProgressAdded()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      }
      
      // İş aşaması değiştiğinde miktar alanını sıfırla
      if (name === 'work_stage_id') {
        newData.quantity_completed = ''
      }
      
      return newData
    })
  }

  // Kullanıcının atandığı görevleri filtrele - sadece pozun ait olduğu aşama
  const availableWorkStages = workStages.filter(stage => 
    assignedTasks.includes(stage.id) && stage.id === assembly.stage_id
  )

  if (loadingTasks || loadingProgress) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Görevler yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  // Kullanıcının hiç görevi yoksa uyarı göster
  if (availableWorkStages.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">İlerleme Kaydı Ekle</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Görev Atanmamış</h3>
            <p className="text-gray-600 mb-4">
              Bu projede size henüz görev atanmamış. İlerleme kaydı eklemek için önce bir göreve atanmanız gerekiyor.
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-4 sm:my-8 min-h-[200px]">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">İlerleme Kaydı Ekle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)] overflow-y-auto scroll-smooth">
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h3 className="font-medium text-blue-900 mb-1 text-sm sm:text-base">{assembly.poz_code}</h3>
            <p className="text-xs sm:text-sm text-blue-700">{assembly.description}</p>
            <p className="text-xs sm:text-sm text-blue-600 mt-1">Toplam: {assembly.total_quantity} adet</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="work_stage_id" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                İş Aşaması *
              </label>
              <select
                id="work_stage_id"
                name="work_stage_id"
                required
                value={formData.work_stage_id}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Görev seçin</option>
                {availableWorkStages.map(stage => {
                  const currentProgress = existingProgress[stage.id] || 0
                  const remaining = assembly.total_quantity - currentProgress
                  const isCompleted = remaining === 0
                  return (
                    <option key={stage.id} value={stage.id} disabled={isCompleted}>
                      {stage.stage_name} {isCompleted ? '(Tamamlandı)' : `(${remaining} kaldı)`}
                    </option>
                  )
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Sadece size atanan görevler görünmektedir
              </p>
              
              {/* Seçili iş aşaması için ilerleme bilgisi */}
              {formData.work_stage_id && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  {(() => {
                    const currentProgress = existingProgress[formData.work_stage_id] || 0
                    const remaining = assembly.total_quantity - currentProgress
                    const isCompleted = remaining === 0
                    const selectedStage = workStages.find(s => s.id === formData.work_stage_id)
                    
                    return (
                      <div className="text-xs sm:text-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
                          <span className="font-medium text-gray-700">{selectedStage?.stage_name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isCompleted 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isCompleted ? 'Tamamlandı' : `${remaining} kaldı`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              isCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${(currentProgress / assembly.total_quantity) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {currentProgress} / {assembly.total_quantity} adet tamamlandı
                        </p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="quantity_completed" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                <Hash className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                Tamamlanan Adet *
              </label>
              <input
                type="number"
                id="quantity_completed"
                name="quantity_completed"
                required
                min="1"
                max={formData.work_stage_id ? (() => {
                  const currentProgress = existingProgress[formData.work_stage_id] || 0
                  return assembly.total_quantity - currentProgress
                })() : assembly.total_quantity}
                value={formData.quantity_completed}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                disabled={formData.work_stage_id ? (() => {
                  const currentProgress = existingProgress[formData.work_stage_id] || 0
                  return (assembly.total_quantity - currentProgress) === 0
                })() : false}
              />
              {formData.work_stage_id && (() => {
                const currentProgress = existingProgress[formData.work_stage_id] || 0
                const remaining = assembly.total_quantity - currentProgress
                return remaining > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimum {remaining} adet girebilirsiniz
                  </p>
                ) : (
                  <p className="text-xs text-red-500 mt-1">
                    Bu iş aşaması tamamlanmış
                  </p>
                )
              })()}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Çalışan
              </label>
              <div className="w-full px-2 sm:px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 text-sm sm:text-base">
                {userProfile?.full_name || user?.email || 'Bilinmeyen Kullanıcı'}
              </div>
            </div>

            <div>
              <label htmlFor="time_spent" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                Harcanan Süre (dakika) *
              </label>
              <input
                type="number"
                id="time_spent"
                name="time_spent"
                required
                min="1"
                value={formData.time_spent}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dakika cinsinden süre girin"
              />
              <p className="text-xs text-gray-500 mt-1">
                Bu iş için harcadığınız süreyi dakika cinsinden girin (zorunlu)
              </p>
            </div>

            {/* Tarih ve saat alanları gizlendi - otomatik olarak mevcut tarih/saat kullanılacak */}

            <div>
              <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                Notlar
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ek notlar (opsiyonel)"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || !formData.work_stage_id || (formData.work_stage_id ? (() => {
                  const currentProgress = existingProgress[formData.work_stage_id] || 0
                  return (assembly.total_quantity - currentProgress) === 0
                })() : false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}