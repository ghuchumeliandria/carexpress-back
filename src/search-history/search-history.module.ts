import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Search, SearchSchema } from './schemas/search.schema';
import { SearchHistoryService } from './search-history.service';
import { SearchHistoryController } from './search-history.controller';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Search.name, schema: SearchSchema }]),
    AuthModule,
  ],
  controllers: [SearchHistoryController],
  providers: [SearchHistoryService],
  exports: [SearchHistoryService],
})
export class SearchHistoryModule {}
