import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { DatabaseModule } from '../database/database.module';
import { MediaProcessingService, AntivirusService, S3Service } from './services';

@Module({
  imports: [DatabaseModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    MediaProcessingService,
    AntivirusService,
    S3Service,
  ],
  exports: [
    UploadService,
    MediaProcessingService,
    AntivirusService,
    S3Service,
  ],
})
export class UploadModule {}