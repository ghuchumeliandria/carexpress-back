import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DecodedVehicle, Investigation } from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * NHTSA Investigations — free, no key.
 * https://api.nhtsa.gov/investigations/investigationsByVehicle
 *
 * Returns federal investigations (PE, EA, RQ, DP) opened against a
 * make/model/year — distinct from recalls (which are remediation campaigns).
 */
@Injectable()
export class NhtsaInvestigationsProvider implements IVinProvider {
  readonly name = 'nhtsa-investigations';
  readonly priority = 10;
  readonly capabilities = new Set<VinCapability>(['investigations']);
  private readonly log = new Logger(NhtsaInvestigationsProvider.name);

  isEnabled() {
    return true;
  }

  async getInvestigations(
    _vin: string,
    decoded: DecodedVehicle,
  ): Promise<Investigation[]> {
    if (!decoded.make || !decoded.model || !decoded.year) return [];
    const url =
      `https://api.nhtsa.gov/investigations/investigationsByVehicle` +
      `?make=${encodeURIComponent(decoded.make)}` +
      `&model=${encodeURIComponent(decoded.model)}` +
      `&modelYear=${decoded.year}`;
    try {
      const { data } = await axios.get(url, { timeout: 10_000 });
      const results: NhtsaInvestigation[] = data?.results ?? [];
      return results
        .map(
          (i): Investigation => ({
            date: i.dateOpened || i.dateClosed,
            campaignNumber: i.actionNumber,
            type: i.investigationType,
            status: i.status,
            component: i.component,
            summary: i.summary,
            source: 'NHTSA',
          }),
        )
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    } catch (e: any) {
      this.log.warn(`nhtsa-investigations failed: ${e?.message || e}`);
      return [];
    }
  }
}

interface NhtsaInvestigation {
  actionNumber?: string;
  investigationType?: string;
  status?: string;
  dateOpened?: string;
  dateClosed?: string;
  component?: string;
  summary?: string;
}
