import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadApiService, type FileProcessingResult, type UploadProgress } from '@/services/uploadApi'

export interface FileUploadState {
  file: File
  progress: UploadProgress
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  result?: FileProcessingResult
  error?: string
  id: string
}

export interface UseFileUploadOptions {
  onSuccess?: (result: FileProcessingResult) => void
  onError?: (error: string) => void
  onProgress?: (progress: UploadProgress) => void
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const [uploads, setUploads] = useState<Map<string, FileUploadState>>(new Map())
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      fileType, 
      uploadId 
    }: { 
      file: File
      fileType: 'image' | 'video' | 'audio' | 'document'
      uploadId: string 
    }) => {
      // Update status to uploading
      setUploads(prev => {
        const newMap = new Map(prev)
        const upload = newMap.get(uploadId)
        if (upload) {
          newMap.set(uploadId, { ...upload, status: 'uploading' })
        }
        return newMap
      })

      // Upload file with progress tracking
      const result = await uploadApiService.uploadFile(
        file,
        fileType,
        (progress) => {
          setUploads(prev => {
            const newMap = new Map(prev)
            const upload = newMap.get(uploadId)
            if (upload) {
              newMap.set(uploadId, { ...upload, progress })
            }
            return newMap
          })
          options.onProgress?.(progress)
        }
      )

      // Update status to processing
      setUploads(prev => {
        const newMap = new Map(prev)
        const upload = newMap.get(uploadId)
        if (upload) {
          newMap.set(uploadId, { 
            ...upload, 
            status: 'processing',
            progress: { loaded: file.size, total: file.size, percentage: 100 }
          })
        }
        return newMap
      })

      return { result, uploadId }
    },
    onSuccess: ({ result, uploadId }) => {
      setUploads(prev => {
        const newMap = new Map(prev)
        const upload = newMap.get(uploadId)
        if (upload) {
          newMap.set(uploadId, { 
            ...upload, 
            status: 'completed',
            result
          })
        }
        return newMap
      })
      options.onSuccess?.(result)
    },
    onError: (error: Error, { uploadId }) => {
      const errorMessage = error.message || 'Upload failed'
      setUploads(prev => {
        const newMap = new Map(prev)
        const upload = newMap.get(uploadId)
        if (upload) {
          newMap.set(uploadId, { 
            ...upload, 
            status: 'error',
            error: errorMessage
          })
        }
        return newMap
      })
      options.onError?.(errorMessage)
    }
  })

  const uploadFile = useCallback((file: File) => {
    // Validate file
    const validation = uploadApiService.validateFile(file)
    if (!validation.valid) {
      options.onError?.(validation.error!)
      return null
    }

    // Generate unique upload ID
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Determine file type
    const fileType = uploadApiService.getFileTypeFromMime(file.type)

    // Initialize upload state
    const uploadState: FileUploadState = {
      file,
      progress: { loaded: 0, total: file.size, percentage: 0 },
      status: 'pending',
      id: uploadId
    }

    setUploads(prev => new Map(prev).set(uploadId, uploadState))

    // Start upload
    uploadMutation.mutate({ file, fileType, uploadId })

    return uploadId
  }, [uploadMutation, options])

  const uploadFiles = useCallback((files: File[]) => {
    return files.map(file => uploadFile(file)).filter(Boolean) as string[]
  }, [uploadFile])

  const removeUpload = useCallback((uploadId: string) => {
    setUploads(prev => {
      const newMap = new Map(prev)
      newMap.delete(uploadId)
      return newMap
    })
  }, [])

  const cancelUpload = useCallback((uploadId: string) => {
    // TODO: Implement upload cancellation if needed
    removeUpload(uploadId)
  }, [removeUpload])

  const retryUpload = useCallback((uploadId: string) => {
    const upload = uploads.get(uploadId)
    if (upload && upload.status === 'error') {
      const fileType = uploadApiService.getFileTypeFromMime(upload.file.type)
      
      // Reset upload state
      setUploads(prev => {
        const newMap = new Map(prev)
        newMap.set(uploadId, {
          ...upload,
          status: 'pending',
          error: undefined,
          progress: { loaded: 0, total: upload.file.size, percentage: 0 }
        })
        return newMap
      })

      // Retry upload
      uploadMutation.mutate({ 
        file: upload.file, 
        fileType, 
        uploadId 
      })
    }
  }, [uploads, uploadMutation])

  const clearCompleted = useCallback(() => {
    setUploads(prev => {
      const newMap = new Map()
      for (const [id, upload] of prev) {
        if (upload.status !== 'completed') {
          newMap.set(id, upload)
        }
      }
      return newMap
    })
  }, [])

  const clearAll = useCallback(() => {
    setUploads(new Map())
  }, [])

  return {
    uploads: Array.from(uploads.values()),
    uploadFile,
    uploadFiles,
    removeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    clearAll,
    isUploading: uploadMutation.isPending
  }
}