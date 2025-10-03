import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ContactsService } from './contacts.service';
import { DatabaseModule } from '../database/database.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [DatabaseModule, SearchModule],
  controllers: [UsersController],
  providers: [UsersService, ContactsService],
  exports: [UsersService, ContactsService],
})
export class UsersModule {}