import { DecodedVehicle, HistoryEvent, SalvageRecord, VehicleImage } from '@/common/types/vehicle.types';

/**
 * Contract every VIN data source must satisfy.
 *
 * - `priority` higher = consulted first; aggregator merges in descending order
 *   so high-priority values win (paid providers > free).
 * - All capability methods are optional. The aggregator only calls what the
 *   provider declares it can do via `capabilities`.
 */
export type VinCapability = 'decode' | 'history' | 'salvage' | 'images';

export const VIN_PROVIDERS = Symbol('VIN_PROVIDERS');

export interface IVinProvider {
  readonly name: string;
  readonly priority: number;
  readonly capabilities: ReadonlySet<VinCapability>;

  isEnabled(): boolean;

  decode?(vin: string): Promise<Partial<DecodedVehicle>>;
  getHistory?(vin: string): Promise<HistoryEvent[]>;
  getSalvage?(vin: string): Promise<SalvageRecord[]>;
  getImages?(vin: string): Promise<VehicleImage[]>;
}
