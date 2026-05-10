import { Injectable } from '@nestjs/common';
import { HistoryEvent, SalvageRecord, VehicleImage } from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * Placeholder for paid history/auction/image providers (Carfax, AutoCheck,
 * Copart/IAAI scrapers). Returns empty arrays today; replace with a real
 * provider class — controllers and aggregator stay untouched.
 */
@Injectable()
export class StubHistoryProvider implements IVinProvider {
  readonly name = 'stub-history';
  readonly priority = 1;
  readonly capabilities = new Set<VinCapability>(['history', 'salvage', 'images']);

  isEnabled() {
    return true;
  }

  async getHistory(_vin: string): Promise<HistoryEvent[]> {
    return [];
  }
  async getSalvage(_vin: string): Promise<SalvageRecord[]> {
    return [];
  }
  async getImages(_vin: string): Promise<VehicleImage[]> {
    return [];
  }
}
