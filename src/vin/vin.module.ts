import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { VinService } from './vin.service';
import { VinController } from './vin.controller';
import { VinAggregatorService } from './vin.aggregator';
import { NhtsaProvider } from './providers/nhtsa.provider';
import { NhtsaRecallsProvider } from './providers/nhtsa-recalls.provider';
import { NhtsaComplaintsProvider } from './providers/nhtsa-complaints.provider';
import { NhtsaSafetyProvider } from './providers/nhtsa-safety.provider';
import { NhtsaInvestigationsProvider } from './providers/nhtsa-investigations.provider';
import { AutoDevProvider } from './providers/autodev.provider';
import { EpicVinProvider } from './providers/epicvin.provider';
import { VinAuditProvider } from './providers/vinaudit.provider';
import { StubHistoryProvider } from './providers/stub-history.provider';
import { IVinProvider, VIN_PROVIDERS } from './providers/vin-provider.interface';
import { SearchHistoryModule } from '@/search-history/search-history.module';
import { AuthModule } from '@/auth/auth.module';

/**
 * To register a paid provider (Carfax, AutoCheck, ClearVin, etc.):
 *   1. Implement IVinProvider in providers/<name>.provider.ts
 *   2. Add the class to `providers` and to the VIN_PROVIDERS factory below
 *   3. Set its `priority` higher than free providers
 * Aggregator + controller need no changes.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vehicle.name, schema: VehicleSchema }]),
    SearchHistoryModule,
    AuthModule,
  ],
  controllers: [VinController],
  providers: [
    VinService,
    VinAggregatorService,
    NhtsaProvider,
    NhtsaRecallsProvider,
    NhtsaComplaintsProvider,
    NhtsaSafetyProvider,
    NhtsaInvestigationsProvider,
    AutoDevProvider,
    EpicVinProvider,
    VinAuditProvider,
    StubHistoryProvider,
    {
      provide: VIN_PROVIDERS,
      useFactory: (...providers: IVinProvider[]) => providers,
      inject: [
        NhtsaProvider,
        NhtsaRecallsProvider,
        NhtsaComplaintsProvider,
        NhtsaSafetyProvider,
        NhtsaInvestigationsProvider,
        AutoDevProvider,
        EpicVinProvider,
        VinAuditProvider,
        StubHistoryProvider,
      ],
    },
  ],
  exports: [VinService, VIN_PROVIDERS],
})
export class VinModule {}
