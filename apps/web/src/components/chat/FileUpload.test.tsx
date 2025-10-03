import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { FileUploadZone, FileUploadButton } from './FileUploadZone'
import { UploadProgress } from './UploadProgress'
import { MediaPreview } from './MediaPreview'
import type { FileUploadState } from '@/hooks/useFileUpload'

// Mock the upload API service
vi.mock('@/services/uploadApi', () => ({
  uploadApiService: {
    validateFile: vi.fn(() => ({ valid: true })),
    getFileTypeFromMime: vi.fn((mimeType: string) => {
      if (mimeType.startsWith('image/')) return 'image'
      if (mimeType.startsWith('video/')) return 'video'
      if (mimeType.startsWith('audio/')) return 'audio'
      return 'document'
    }),
    formatFileSize: vi.fn((bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`),
    formatDuration: vi.fn((ms: number) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(0).padStart(2, '0')}`)
  }
}))

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('FileUploadZone', () => {
  const mockOnFilesSelected = vi.fn()

  beforeEach(() => {
    mockOnFilesSelected.mockClear()
  })

  it('renders upload zone with default content', () => {
    renderWithQueryClient(
      <FileUploadZone onFilesSelected={mockOnFilesSelected} />
    )

    expect(screen.getByText('Upload files')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop files here, or click to browse')).toBeInTheDocument()
  })

  it('handles file selection via input', () => {
    renderWithQueryClient(
      <FileUploadZone onFilesSelected={mockOnFilesSelected} />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const input = screen.getByRole('button', { name: 'Upload files' }).querySelector('input[type="file"]')
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } })
      expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
    }
  })

  it('handles drag and drop', () => {
    renderWithQueryClient(
      <FileUploadZone onFilesSelected={mockOnFilesSelected} />
    )

    const dropZone = screen.getByRole('button', { name: 'Upload files' })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { items: [{ kind: 'file' }] }
    })

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] }
    })

    expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
  })
})

describe('FileUploadButton', () => {
  const mockOnFilesSelected = vi.fn()

  beforeEach(() => {
    mockOnFilesSelected.mockClear()
  })

  it('renders upload button', () => {
    renderWithQueryClient(
      <FileUploadButton onFilesSelected={mockOnFilesSelected} />
    )

    expect(screen.getByText('Attach Files')).toBeInTheDocument()
  })

  it('handles file selection', () => {
    renderWithQueryClient(
      <FileUploadButton onFilesSelected={mockOnFilesSelected} />
    )

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const button = screen.getByText('Attach Files')
    const input = button.parentElement?.querySelector('input[type="file"]')
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } })
      expect(mockOnFilesSelected).toHaveBeenCalledWith([file])
    }
  })
})

describe('UploadProgress', () => {
  const mockUpload: FileUploadState = {
    id: 'test-upload',
    file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
    progress: { loaded: 50, total: 100, percentage: 50 },
    status: 'uploading'
  }

  it('renders upload progress', () => {
    renderWithQueryClient(
      <UploadProgress upload={mockUpload} />
    )

    expect(screen.getByText('test.jpg')).toBeInTheDocument()
    expect(screen.getByText('Uploading... 50%')).toBeInTheDocument()
  })

  it('shows completed status', () => {
    const completedUpload = { ...mockUpload, status: 'completed' as const }
    
    renderWithQueryClient(
      <UploadProgress upload={completedUpload} />
    )

    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('shows error status with retry button', () => {
    const errorUpload = { 
      ...mockUpload, 
      status: 'error' as const, 
      error: 'Upload failed' 
    }
    const mockOnRetry = vi.fn()
    
    renderWithQueryClient(
      <UploadProgress upload={errorUpload} onRetry={mockOnRetry} />
    )

    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
    
    const retryButton = screen.getByTitle('Retry upload')
    fireEvent.click(retryButton)
    expect(mockOnRetry).toHaveBeenCalledWith('test-upload')
  })
})

describe('MediaPreview', () => {
  it('renders image preview', () => {
    renderWithQueryClient(
      <MediaPreview
        src="https://example.com/image.jpg"
        type="image"
        fileName="test.jpg"
        fileSize={1024000}
      />
    )

    const image = screen.getByAltText('test.jpg')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('renders video preview with controls', () => {
    renderWithQueryClient(
      <MediaPreview
        src="https://example.com/video.mp4"
        type="video"
        fileName="test.mp4"
        fileSize={5120000}
        duration={30000}
      />
    )

    const video = document.querySelector('video') // video element
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('src', 'https://example.com/video.mp4')
    expect(video).toHaveAttribute('controls')
  })

  it('renders audio preview with play button', () => {
    renderWithQueryClient(
      <MediaPreview
        src="https://example.com/audio.mp3"
        type="audio"
        fileName="test.mp3"
        fileSize={2048000}
        duration={180000}
      />
    )

    expect(screen.getByText('test.mp3')).toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument() // formatted duration
  })
})