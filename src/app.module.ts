import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VinModule } from './vin/vin.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    CacheModule.register({ isGlobal: true, ttl: 60_000 }),
    AuthModule,
    UsersModule,
    VinModule,
    SearchHistoryModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
