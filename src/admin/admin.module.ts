import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '@/users/users.module';
import { SearchHistoryModule } from '@/search-history/search-history.module';
import { AuthModule } from '@/auth/auth.module';
import { VinModule } from '@/vin/vin.module';

@Module({
  imports: [UsersModule, SearchHistoryModule, AuthModule, forwardRef(() => VinModule)],
  controllers: [AdminController],
})
export class AdminModule {}
