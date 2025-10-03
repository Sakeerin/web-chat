import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SearchService } from './search.service'
import { SearchController } from './search.controller'
import { MeiliSearchService } from './meilisearch.service'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [SearchController],
  providers: [SearchService, MeiliSearchService],
  exports: [SearchService, MeiliSearchService],
})
export class SearchModule {}