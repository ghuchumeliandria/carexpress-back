import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DecodedVehicle,
  FullReport,
  HistoryEvent,
  SalvageRecord,
  VehicleImage,
} from '@/common/types/vehicle.types';
import { IVinProvider, VIN_PROVIDERS, VinCapability } from './providers/vin-provider.interface';

/**
 * Calls every enabled provider that supports a capability, in priority order
 * (highest first), and merges their output. Higher-priority values overwrite
 * lower-priority ones for scalar fields; arrays are concatenated.
 */
@Injectable()
export class VinAggregatorService {
  private readonly log = new Logger(VinAggregatorService.name);

  constructor(@Inject(VIN_PROVIDERS) private readonly providers: IVinProvider[]) {}

  enabledFor(cap: VinCapability): IVinProvider[] {
    return this.providers
      .filter((p) => p.isEnabled() && p.capabilities.has(cap))
      .sort((a, b) => b.priority - a.priority);
  }

  async decode(vin: string): Promise<{ data: DecodedVehicle; sources: string[] }> {
    const list = this.enabledFor('decode');
    let merged: DecodedVehicle = { vin };
    const sources: string[] = [];
    // Reverse so highest priority is applied last and wins.
    for (const p of [...list].reverse()) {
      try {
        const part = await p.decode!(vin);
        merged = { ...merged, ...stripUndef(part), engine: { ...merged.engine, ...stripUndef(part.engine ?? {}) } };
        sources.push(p.name);
      } catch (e: any) {
        this.log.warn(`${p.name} decode failed: ${e?.message || e}`);
      }
    }
    return { data: merged, sources };
  }

  async history(vin: string): Promise<{ data: HistoryEvent[]; sources: string[] }> {
    return this.collectArray(vin, 'history', (p) => p.getHistory!(vin));
  }
  async salvage(vin: string): Promise<{ data: SalvageRecord[]; sources: string[] }> {
    return this.collectArray(vin, 'salvage', (p) => p.getSalvage!(vin));
  }
  async images(vin: string): Promise<{ data: VehicleImage[]; sources: string[] }> {
    return this.collectArray(vin, 'images', (p) => p.getImages!(vin));
  }

  async fullReport(vin: string): Promise<Omit<FullReport, 'cached' | 'fetchedAt'>> {
    const [d, h, s, i] = await Promise.all([
      this.decode(vin),
      this.history(vin),
      this.salvage(vin),
      this.images(vin),
    ]);
    return {
      vin,
      decoded: d.data,
      history: h.data,
      salvage: s.data,
      images: i.data,
      providers: Array.from(new Set([...d.sources, ...h.sources, ...s.sources, ...i.sources])),
    };
  }

  private async collectArray<T>(
    vin: string,
    cap: VinCapability,
    fn: (p: IVinProvider) => Promise<T[]>,
  ): Promise<{ data: T[]; sources: string[] }> {
    const list = this.enabledFor(cap);
    const data: T[] = [];
    const sources: string[] = [];
    await Promise.all(
      list.map(async (p) => {
        try {
          const out = await fn(p);
          if (out?.length) {
            data.push(...out);
            sources.push(p.name);
          }
        } catch (e: any) {
          this.log.warn(`${p.name} ${cap} failed: ${e?.message || e}`);
        }
      }),
    );
    return { data, sources };
  }
}

function stripUndef<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') out[k] = v;
  return out as T;
}
