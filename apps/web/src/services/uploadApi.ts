import { apiService, endpoints } from './api'

export interface FileUploadData {
  fileType: 'image' | 'video' | 'audio' | 'document'
  fileName: string
  mimeType: string
  fileSize: number
}

export interface PresignedUrlResponse {
  uploadUrl: string
  objectKey: string
  publicUrl: string
  expiresIn: number
}

export interface FileProcessingResult {
  objectKey: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  publicUrl: string
  thumbnailUrl?: string
  previewUrl?: string
  metadata: {
    fileName: string
    mimeType: string
    sizeBytes: number
    width?: number
    height?: number
    durationMs?: number
  }
  scanResult: {
    status: 'pending' | 'scanning' | 'clean' | 'infected' | 'error'
    scannedAt: Date
    threats?: string[]
    scanEngine: string
  }
  processedAt: Date
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

class UploadApiService {
  /**
   * Generate presigned URL for file upload
   */
  async generatePresignedUrl(data: FileUploadData): Promise<PresignedUrlResponse> {
    return apiService.post<PresignedUrlResponse>(endpoints.upload.presignedUrl, data)
  }

  /**
   * Upload file to S3 using presigned URL
   */
  async uploadToS3(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            }
            onProgress(progress)
          }
        })
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'))
      })

      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  /**
   * Process uploaded file (scan, generate thumbnails, etc.)
   */
  async processFile(objectKey: string, fileType: string): Promise<FileProcessingResult> {
    return apiService.post<FileProcessingResult>(endpoints.upload.process, {
      objectKey,
      fileType
    })
  }

  /**
   * Complete file upload workflow
   */
  async uploadFile(
    file: File,
    fileType: 'image' | 'video' | 'audio' | 'document',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileProcessingResult> {
    // Step 1: Generate presigned URL
    const presignedData = await this.generatePresignedUrl({
      fileType,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size
    })

    // Step 2: Upload to S3
    await this.uploadToS3(presignedData.uploadUrl, file, onProgress)

    // Step 3: Process file
    const result = await this.processFile(presignedData.objectKey, fileType)

    return result
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(objectKey: string): Promise<void> {
    return apiService.delete(`${endpoints.upload.process}/${encodeURIComponent(objectKey)}`)
  }

  /**
   * Get file type from MIME type
   */
  getFileTypeFromMime(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      video: 50 * 1024 * 1024, // 50MB
      audio: 20 * 1024 * 1024, // 20MB
      document: 25 * 1024 * 1024 // 25MB
    }

    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
      video: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
      audio: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a'],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv'
      ]
    }

    const fileType = this.getFileTypeFromMime(file.type)
    
    // Check file type
    if (!allowedTypes[fileType].includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not supported for ${fileType} files`
      }
    }

    // Check file size
    if (file.size > maxSizes[fileType]) {
      const maxSizeMB = maxSizes[fileType] / (1024 * 1024)
      return {
        valid: false,
        error: `File size too large. Maximum size for ${fileType} files is ${maxSizeMB}MB`
      }
    }

    // Check minimum size
    if (file.size < 100) {
      return {
        valid: false,
        error: 'File is too small'
      }
    }

    return { valid: true }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Format duration for display
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    }
    
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }
}

export const uploadApiService = new UploadApiService()