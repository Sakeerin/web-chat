# File Upload and Media Processing Service

This module provides comprehensive file upload and media processing capabilities for the Telegram-like web chat application. It handles secure file uploads, virus scanning, media optimization, and thumbnail/preview generation.

## Features

### Core Upload Functionality
- **Presigned URL Generation**: Direct S3 uploads with secure presigned URLs
- **File Type Validation**: Comprehensive MIME type and file size validation
- **Content Validation**: Deep file content validation to prevent malicious uploads
- **Virus Scanning**: Integration with ClamAV for malware detection
- **Media Processing**: Automatic thumbnail and preview generation

### Supported File Types
- **Images**: JPEG, PNG, WebP, GIF, BMP (up to 10MB)
- **Videos**: MP4, WebM, OGG, AVI, MOV (up to 50MB)
- **Audio**: MP3, WAV, OGG, AAC, M4A (up to 20MB)
- **Documents**: PDF, DOC, DOCX, TXT, CSV (up to 25MB)
- **Avatars**: JPEG, PNG, WebP (up to 5MB)

### Security Features
- **Antivirus Scanning**: ClamAV integration with configurable settings
- **Content Validation**: File header and structure validation
- **Secure Storage**: AES-256 encryption at rest
- **Access Control**: JWT-based authentication for all endpoints
- **Rate Limiting**: Built-in protection against abuse

### Media Optimization
- **Image Processing**: Sharp-based image optimization and resizing
- **Thumbnail Generation**: Automatic thumbnail creation for images
- **Video Previews**: FFmpeg-based video preview generation
- **Format Conversion**: WebP conversion for optimal performance
- **Metadata Extraction**: Comprehensive file metadata extraction

## Architecture

### Services

#### UploadService
Main service orchestrating the upload workflow:
- Presigned URL generation
- File processing coordination
- Avatar management
- Health monitoring

#### MediaProcessingService
Handles media file processing:
- Metadata extraction
- Image optimization
- Video preview generation
- Content validation

#### AntivirusService
Provides malware scanning capabilities:
- ClamAV integration
- File and buffer scanning
- Threat detection and reporting

#### S3Service
Manages object storage operations:
- Presigned URL generation
- File upload/download
- Object management
- Health monitoring

## API Endpoints

### Avatar Upload
```http
POST /upload/avatar
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileName": "avatar.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 1048576
}
```

### General File Upload
```http
POST /upload/presigned-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileType": "image",
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 2097152
}
```

### File Processing
```http
POST /upload/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "objectKey": "images/uuid/photo.jpg",
  "fileType": "image"
}
```

### Thumbnail Generation
```http
POST /upload/thumbnail/:objectKey
Authorization: Bearer <token>
Content-Type: application/json

{
  "width": 300,
  "height": 300,
  "format": "webp",
  "quality": 85
}
```

### Video Preview Generation
```http
POST /upload/video-preview/:objectKey
Authorization: Bearer <token>
Content-Type: application/json

{
  "timestampSeconds": 10,
  "width": 640,
  "height": 480,
  "format": "jpeg"
}
```

### File Deletion
```http
DELETE /upload/:objectKey
Authorization: Bearer <token>
```

### Health Check
```http
GET /upload/health
Authorization: Bearer <token>
```

## Configuration

### Environment Variables

#### S3 Configuration
```env
S3_BUCKET_NAME=chat-uploads
CDN_URL=https://cdn.example.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=http://localhost:9000  # For MinIO in development
```

#### Antivirus Configuration
```env
ANTIVIRUS_ENABLED=true
CLAMD_HOST=localhost
CLAMD_PORT=3310
CLAMD_TIMEOUT=60000
CLAMD_SOCKET=/var/run/clamav/clamd.ctl
```

#### Processing Configuration
```env
TEMP_DIR=/tmp/uploads
```

## Usage Examples

### Basic File Upload Flow

1. **Request Presigned URL**:
```typescript
const uploadData = {
  fileType: FileType.IMAGE,
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 2097152
};

const response = await fetch('/upload/presigned-url', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(uploadData)
});

const { uploadUrl, objectKey, publicUrl } = await response.json();
```

2. **Upload File to S3**:
```typescript
const file = document.getElementById('fileInput').files[0];

await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type
  },
  body: file
});
```

3. **Process Uploaded File**:
```typescript
const processResponse = await fetch('/upload/process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    objectKey,
    fileType: FileType.IMAGE
  })
});

const result = await processResponse.json();
console.log('Processing result:', result);
```

### Avatar Upload Flow

```typescript
// 1. Generate presigned URL for avatar
const avatarData = {
  fileName: 'avatar.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1048576
};

const avatarResponse = await fetch('/upload/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(avatarData)
});

const { uploadUrl, objectKey } = await avatarResponse.json();

// 2. Upload file
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/jpeg' },
  body: avatarFile
});

// 3. Process avatar
const processResponse = await fetch('/upload/avatar/process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ objectKey })
});

const { avatarUrl } = await processResponse.json();
```

## Error Handling

### Common Error Responses

#### File Too Large
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size too large. Maximum size is 10MB",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req-123"
  }
}
```

#### Invalid File Type
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Invalid MIME type for image files",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req-123"
  }
}
```

#### Malware Detected
```json
{
  "error": {
    "code": "MALWARE_DETECTED",
    "message": "File contains malware and has been deleted",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req-123"
  }
}
```

#### Processing Failed
```json
{
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "File processing failed",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req-123"
  }
}
```

## Testing

### Unit Tests
```bash
# Run upload service tests
npm test -- --testPathPattern=upload

# Run specific service tests
npm test -- upload.service.spec.ts
npm test -- media-processing.service.spec.ts
npm test -- antivirus.service.spec.ts
npm test -- s3.service.spec.ts
```

### Integration Tests
```bash
# Run upload integration tests
npm test -- upload.integration.spec.ts
```

### Test Coverage
The upload module maintains >90% test coverage across:
- Service logic
- Controller endpoints
- Error handling
- Integration flows

## Performance Considerations

### Optimization Strategies
- **Direct S3 Uploads**: Bypass server for file transfers
- **Async Processing**: Background processing for media optimization
- **CDN Distribution**: Global content delivery
- **Caching**: Aggressive caching of processed assets

### Monitoring Metrics
- Upload success/failure rates
- Processing times
- Storage usage
- Antivirus scan results
- Error rates by file type

## Security Best Practices

### File Validation
- MIME type verification
- File size limits
- Content structure validation
- Malware scanning

### Access Control
- JWT authentication required
- User-specific object keys
- Presigned URL expiration
- Rate limiting

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS)
- Secure key management
- Audit logging

## Deployment

### Dependencies
- **Sharp**: Image processing library
- **FFmpeg**: Video processing
- **ClamAV**: Antivirus scanning
- **AWS SDK**: S3 integration

### Docker Configuration
```dockerfile
# Install system dependencies
RUN apt-get update && apt-get install -y \
    clamav \
    clamav-daemon \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Update virus definitions
RUN freshclam
```

### Health Checks
The service provides comprehensive health checks for:
- S3 connectivity
- Antivirus service status
- Media processing capabilities

## Troubleshooting

### Common Issues

#### ClamAV Not Starting
```bash
# Check ClamAV status
systemctl status clamav-daemon

# Update virus definitions
freshclam

# Restart service
systemctl restart clamav-daemon
```

#### S3 Connection Issues
- Verify AWS credentials
- Check bucket permissions
- Validate region configuration
- Test network connectivity

#### Processing Failures
- Check temp directory permissions
- Verify FFmpeg installation
- Monitor memory usage
- Review error logs

### Logging
The service provides detailed logging for:
- Upload requests
- Processing status
- Security events
- Performance metrics

## Future Enhancements

### Planned Features
- **Image Recognition**: AI-powered content analysis
- **Advanced Compression**: Next-gen image formats (AVIF, HEIF)
- **Streaming Uploads**: Large file streaming support
- **Batch Processing**: Multiple file processing
- **Analytics**: Detailed usage analytics

### Performance Improvements
- **Edge Processing**: CDN-based processing
- **GPU Acceleration**: Hardware-accelerated encoding
- **Distributed Processing**: Multi-node processing
- **Smart Caching**: Predictive asset caching