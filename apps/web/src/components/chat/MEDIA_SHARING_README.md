# Media Sharing and File Upload Interface

This document describes the implementation of the media sharing and file upload interface for the Telegram-like web chat application.

## Overview

The media sharing system provides a comprehensive file upload and sharing experience with the following features:

- **Drag-and-drop file upload interface**
- **Image preview and thumbnail display**
- **Video player with controls and preview**
- **File attachment display with download capabilities**
- **Upload progress indicators and error handling**
- **Media gallery view for conversation media**

## Components

### 1. FileUploadZone & FileUploadButton

**Location**: `apps/web/src/components/chat/FileUploadZone.tsx`

Provides drag-and-drop and click-to-upload functionality:

```tsx
import { FileUploadZone, FileUploadButton } from '@/components/chat'

// Full upload zone
<FileUploadZone
  onFilesSelected={(files) => handleFiles(files)}
  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
  multiple={true}
  maxFiles={10}
/>

// Compact button
<FileUploadButton
  onFilesSelected={(files) => handleFiles(files)}
  variant="outline"
>
  Attach Files
</FileUploadButton>
```

**Features**:
- Drag-and-drop with visual feedback
- File type and size validation
- Multiple file selection
- Keyboard accessibility
- Custom styling support

### 2. UploadProgress & UploadProgressList

**Location**: `apps/web/src/components/chat/UploadProgress.tsx`

Displays upload progress with real-time updates:

```tsx
import { UploadProgress, UploadProgressList } from '@/components/chat'

// Single upload progress
<UploadProgress
  upload={uploadState}
  onCancel={(id) => cancelUpload(id)}
  onRetry={(id) => retryUpload(id)}
  onRemove={(id) => removeUpload(id)}
/>

// List of uploads
<UploadProgressList
  uploads={uploads}
  onCancel={cancelUpload}
  onRetry={retryUpload}
  onRemove={removeUpload}
  onClearCompleted={clearCompleted}
/>
```

**Features**:
- Real-time progress tracking
- Error handling with retry functionality
- File type icons
- Cancel/remove actions
- Batch operations

### 3. MediaPreview & FileAttachmentPreview

**Location**: `apps/web/src/components/chat/MediaPreview.tsx`

Renders different types of media with appropriate controls:

```tsx
import { MediaPreview, FileAttachmentPreview } from '@/components/chat'

// Media preview (images, videos, audio)
<MediaPreview
  src="/api/files/image.jpg"
  type="image"
  fileName="vacation.jpg"
  fileSize={2048576}
  thumbnailSrc="/api/files/image_thumb.webp"
  onDownload={() => downloadFile()}
  onFullscreen={() => openFullscreen()}
/>

// File attachment (documents, etc.)
<FileAttachmentPreview
  fileName="document.pdf"
  fileSize={5242880}
  mimeType="application/pdf"
  downloadUrl="/api/files/document.pdf"
/>
```

**Features**:
- Image preview with fullscreen support
- Video player with controls and thumbnails
- Audio player with play/pause controls
- Document preview with download
- Responsive design

### 4. MediaGallery & MediaGalleryButton

**Location**: `apps/web/src/components/chat/MediaGallery.tsx`

Provides a comprehensive media gallery for conversations:

```tsx
import { MediaGallery, MediaGalleryButton } from '@/components/chat'

// Gallery trigger button
<MediaGalleryButton
  conversationId="conv-123"
  mediaCount={42}
/>

// Full gallery modal
<MediaGallery
  conversationId="conv-123"
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

**Features**:
- Filter by media type (images, videos, audio, documents)
- Grid layout with thumbnails
- Full-size viewer with navigation
- Download functionality
- Search and pagination support

## Hooks

### useFileUpload

**Location**: `apps/web/src/hooks/useFileUpload.ts`

Manages file upload state and operations:

```tsx
import { useFileUpload } from '@/hooks/useFileUpload'

const {
  uploads,           // Array of upload states
  uploadFile,        // Upload single file
  uploadFiles,       // Upload multiple files
  removeUpload,      // Remove upload from list
  cancelUpload,      // Cancel ongoing upload
  retryUpload,       // Retry failed upload
  clearCompleted,    // Clear completed uploads
  clearAll,          // Clear all uploads
  isUploading        // Global uploading state
} = useFileUpload({
  onSuccess: (result) => console.log('Upload completed:', result),
  onError: (error) => console.error('Upload failed:', error),
  onProgress: (progress) => console.log('Progress:', progress.percentage)
})
```

**Features**:
- File validation before upload
- Progress tracking with callbacks
- Error handling and retry logic
- Upload state management
- Optimistic UI updates

## Services

### uploadApiService

**Location**: `apps/web/src/services/uploadApi.ts`

Handles API communication for file uploads:

```tsx
import { uploadApiService } from '@/services/uploadApi'

// Generate presigned URL
const presignedData = await uploadApiService.generatePresignedUrl({
  fileType: 'image',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 2048576
})

// Complete upload workflow
const result = await uploadApiService.uploadFile(
  file,
  'image',
  (progress) => console.log(`${progress.percentage}%`)
)

// Validate file
const validation = uploadApiService.validateFile(file)
if (!validation.valid) {
  console.error(validation.error)
}
```

**Features**:
- Presigned URL generation
- Direct S3 upload with progress
- File processing and validation
- Type detection and validation
- Utility functions for formatting

## Integration

### MessageComposer Integration

The MessageComposer has been enhanced to support file uploads:

```tsx
// Updated interface
interface MessageComposerProps {
  onSend: (content: string, replyToId?: string, attachments?: string[]) => void
  // ... other props
}

// Features added:
// - File upload button
// - Drag-and-drop support
// - Paste file support
// - Upload progress display
// - Attachment management
```

### MessageItem Integration

Messages now display media attachments:

```tsx
// Automatically renders appropriate preview based on file type
{message.attachments.map(attachment => {
  const fileType = getFileTypeFromMime(attachment.mimeType)
  
  if (fileType === 'image' || fileType === 'video' || fileType === 'audio') {
    return <MediaPreview ... />
  } else {
    return <FileAttachmentPreview ... />
  }
})}
```

### ChatHeader Integration

Added media gallery access:

```tsx
// Media gallery button in chat header
<MediaGalleryButton
  conversationId={conversation.id}
  mediaCount={mediaCount}
/>
```

## File Type Support

### Supported File Types

- **Images**: JPEG, PNG, WebP, GIF, BMP
- **Videos**: MP4, WebM, OGG, AVI, MOV
- **Audio**: MP3, WAV, OGG, AAC, M4A
- **Documents**: PDF, DOC, DOCX, TXT, CSV

### File Size Limits

- **Images**: 10MB
- **Videos**: 50MB
- **Audio**: 20MB
- **Documents**: 25MB

### Processing Features

- **Images**: Thumbnail generation, EXIF stripping, optimization
- **Videos**: Preview frame generation, metadata extraction
- **Audio**: Metadata extraction, duration calculation
- **Documents**: Virus scanning, metadata extraction

## Security Features

- **File validation**: Type and size checking
- **Virus scanning**: ClamAV integration
- **Content sanitization**: EXIF data removal
- **Secure upload**: Presigned URLs with expiration
- **Access control**: User-based file access

## Performance Optimizations

- **Lazy loading**: Images load on demand
- **Virtual scrolling**: Efficient large media lists
- **Thumbnail caching**: CDN-served thumbnails
- **Progressive loading**: Show thumbnails first
- **Compression**: Automatic image optimization

## Accessibility Features

- **Keyboard navigation**: Full keyboard support
- **Screen reader support**: ARIA labels and descriptions
- **Focus management**: Proper focus handling
- **High contrast**: Theme-aware styling
- **Alternative text**: Descriptive alt text for images

## Error Handling

- **Network errors**: Automatic retry with exponential backoff
- **File validation**: Clear error messages
- **Upload failures**: Retry functionality
- **Virus detection**: Automatic file removal
- **Storage errors**: Graceful degradation

## Testing

Comprehensive test suite covering:

- **Unit tests**: Component functionality
- **Integration tests**: Upload workflows
- **Accessibility tests**: Screen reader compatibility
- **Performance tests**: Large file handling
- **Error scenarios**: Network failures, invalid files

## Usage Examples

### Basic File Upload

```tsx
import { FileUploadButton } from '@/components/chat'
import { useFileUpload } from '@/hooks/useFileUpload'

function MyComponent() {
  const { uploadFiles } = useFileUpload({
    onSuccess: (result) => {
      console.log('File uploaded:', result.publicUrl)
    }
  })

  return (
    <FileUploadButton
      onFilesSelected={uploadFiles}
      accept="image/*"
    >
      Upload Images
    </FileUploadButton>
  )
}
```

### Custom Upload Zone

```tsx
import { FileUploadZone } from '@/components/chat'

function CustomUploadZone() {
  return (
    <FileUploadZone
      onFilesSelected={(files) => handleFiles(files)}
      className="border-dashed border-2 border-blue-300 p-8"
    >
      <div className="text-center">
        <h3>Drop your files here</h3>
        <p>Supports images, videos, and documents</p>
      </div>
    </FileUploadZone>
  )
}
```

### Media Gallery Integration

```tsx
import { MediaGalleryButton } from '@/components/chat'

function ChatHeader({ conversationId }) {
  return (
    <div className="chat-header">
      <MediaGalleryButton
        conversationId={conversationId}
        mediaCount={25}
      />
    </div>
  )
}
```

This implementation provides a complete, production-ready media sharing and file upload system that meets all the requirements specified in task 19.