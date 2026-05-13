import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DecodedVehicle, Recall } from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * NHTSA Recalls API — free, no key required.
 * https://api.nhtsa.gov/recalls/recallsByVehicle?make=X&model=Y&modelYear=Z
 * Keyed by make/model/year, so we rely on the decoded vehicle from the
 * NhtsaProvider (or any other decoder) being populated first.
 */
@Injectable()
export class NhtsaRecallsProvider implements IVinProvider {
  readonly name = 'nhtsa-recalls';
  readonly priority = 10;
  readonly capabilities = new Set<VinCapability>(['recalls']);
  private readonly log = new Logger(NhtsaRecallsProvider.name);

  isEnabled() {
    return true;
  }

  async getRecalls(_vin: string, decoded: DecodedVehicle): Promise<Recall[]> {
    if (!decoded.make || !decoded.model || !decoded.year) return [];
    const url =
      `https://api.nhtsa.gov/recalls/recallsByVehicle` +
      `?make=${encodeURIComponent(decoded.make)}` +
      `&model=${encodeURIComponent(decoded.model)}` +
      `&modelYear=${decoded.year}`;
    try {
      const { data } = await axios.get(url, { timeout: 10_000 });
      const results: NhtsaRecall[] = data?.results ?? [];
      return results.map((r) => ({
        date: r.ReportReceivedDate,
        nhtsaId: r.NHTSACampaignNumber,
        description: r.Summary || r.Component,
        component: r.Component,
        consequence: r.Consequence,
        remedy: r.Remedy,
        source: r.Manufacturer || 'NHTSA',
        status: 'Issued',
      }));
    } catch (e: any) {
      this.log.warn(`nhtsa-recalls failed: ${e?.message || e}`);
      return [];
    }
  }
}

interface NhtsaRecall {
  Manufacturer?: string;
  NHTSACampaignNumber?: string;
  ReportReceivedDate?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  Notes?: string;
  ModelYear?: string;
  Make?: string;
  Model?: string;
}
