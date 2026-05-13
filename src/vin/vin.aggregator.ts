import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Complaint,
  DecodedVehicle,
  FullReport,
  HistoryEvent,
  Recall,
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
    return this.collectArray('history', (p) => p.getHistory!(vin));
  }
  async salvage(vin: string): Promise<{ data: SalvageRecord[]; sources: string[] }> {
    return this.collectArray('salvage', (p) => p.getSalvage!(vin));
  }
  async images(vin: string): Promise<{ data: VehicleImage[]; sources: string[] }> {
    return this.collectArray('images', (p) => p.getImages!(vin));
  }
  async recalls(
    vin: string,
    decoded: DecodedVehicle,
  ): Promise<{ data: Recall[]; sources: string[] }> {
    return this.collectArray('recalls', (p) => p.getRecalls!(vin, decoded));
  }
  async complaints(
    vin: string,
    decoded: DecodedVehicle,
  ): Promise<{ data: Complaint[]; sources: string[] }> {
    return this.collectArray('complaints', (p) => p.getComplaints!(vin, decoded));
  }

  async fullReport(vin: string): Promise<Omit<FullReport, 'cached' | 'fetchedAt'>> {
    // Decode first — recalls & complaints providers need make/model/year.
    const d = await this.decode(vin);
    const [h, s, i, r, c] = await Promise.all([
      this.history(vin),
      this.salvage(vin),
      this.images(vin),
      this.recalls(vin, d.data),
      this.complaints(vin, d.data),
    ]);
    return {
      vin,
      decoded: d.data,
      history: h.data,
      salvage: s.data,
      images: i.data,
      recalls: r.data,
      complaints: c.data,
      providers: Array.from(
        new Set([...d.sources, ...h.sources, ...s.sources, ...i.sources, ...r.sources, ...c.sources]),
      ),
    };
  }

  private async collectArray<T>(
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
