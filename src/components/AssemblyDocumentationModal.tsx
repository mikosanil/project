import React, { useState } from 'react'
import { X, FileText, Save, Upload, Download, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AssemblyDocumentationModalProps {
  task: {
    id: string
    task_name: string
    assembly?: {
      poz_code: string
      description: string
    }
  }
  onClose: () => void
  onDocumentationSaved: () => void
}

interface Document {
  id: string
  document_type: string
  file_url: string
  file_name: string
  file_size?: number
  mime_type?: string
  description?: string
  uploaded_by: string
  uploaded_at: string
  uploader?: {
    full_name: string
    email: string
  }
}

export function AssemblyDocumentationModal({ 
  task, 
  onClose, 
  onDocumentationSaved 
}: AssemblyDocumentationModalProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [formData, setFormData] = useState({
    document_type: 'photo' as 'photo' | 'video' | 'drawing' | 'instruction' | 'certificate',
    description: '',
    files: [] as File[]
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)

  React.useEffect(() => {
    loadDocuments()
  }, [task.id])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('assembly_documentation')
        .select(`
          *,
          uploader:users!assembly_documentation_uploaded_by_fkey(full_name, email)
        `)
        .eq('assembly_task_id', task.id)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.files.length === 0) return

    setSaving(true)
    setError(null)

    try {
      setUploadingFiles(true)
      
      // Upload files
      const uploadPromises = formData.files.map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `assembly-docs/${task.id}/${formData.document_type}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('assembly-docs')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('assembly-docs')
          .getPublicUrl(filePath)

        return {
          assembly_task_id: task.id,
          document_type: formData.document_type,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          description: formData.description || null,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        }
      })

      const documentData = await Promise.all(uploadPromises)

      // Save to database
      const { error } = await supabase
        .from('assembly_documentation')
        .insert(documentData)

      if (error) throw error

      // Reset form
      setFormData(prev => ({ ...prev, files: [], description: '' }))
      await loadDocuments()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
      setUploadingFiles(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setFormData(prev => ({ ...prev, files: [...prev.files, ...files] }))
    }
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      files: prev.files.filter((_, i) => i !== index) 
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getDocumentTypeText = (type: string) => {
    switch (type) {
      case 'photo': return 'Fotoğraf'
      case 'video': return 'Video'
      case 'drawing': return 'Çizim'
      case 'instruction': return 'Talimat'
      case 'certificate': return 'Sertifika'
      default: return type
    }
  }

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'photo': return '📷'
      case 'video': return '🎥'
      case 'drawing': return '📐'
      case 'instruction': return '📋'
      case 'certificate': return '📜'
      default: return '📄'
    }
  }

  const downloadFile = async (document: Document) => {
    try {
      const response = await fetch(document.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = document.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download error:', err)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Dokümantasyon</h3>
              <p className="text-gray-600 text-sm">{task.task_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mevcut Dokümanlar */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Mevcut Dokümanlar</h4>
            
            {documents.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Henüz doküman yüklenmemiş</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getDocumentTypeIcon(doc.document_type)}</span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{doc.file_name}</p>
                          <p className="text-xs text-gray-500">{getDocumentTypeText(doc.document_type)}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => window.open(doc.file_url, '_blank')}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadFile(doc)}
                          className="text-gray-400 hover:text-green-600 transition-colors"
                          title="İndir"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {doc.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{doc.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      {doc.uploader?.full_name || doc.uploader?.email}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Yeni Doküman Yükleme */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Yeni Doküman Yükle</h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doküman Türü *
                  </label>
                  <select
                    required
                    value={formData.document_type}
                    onChange={(e) => handleInputChange('document_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="photo">Fotoğraf</option>
                    <option value="video">Video</option>
                    <option value="drawing">Çizim</option>
                    <option value="instruction">Talimat</option>
                    <option value="certificate">Sertifika</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doküman hakkında kısa açıklama"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dosyalar
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Dosyaları sürükleyip bırakın veya seçin
                    </p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Dosya Seç
                    </label>
                  </div>
                </div>
              </div>

              {/* Seçilen Dosyalar */}
              {formData.files.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Seçilen Dosyalar</h5>
                  <div className="space-y-2">
                    {formData.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getDocumentTypeIcon(formData.document_type)}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingFiles || formData.files.length === 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>
                    {saving ? 'Kaydediliyor...' : 
                     uploadingFiles ? 'Dosyalar yükleniyor...' : 'Dosyaları Yükle'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
