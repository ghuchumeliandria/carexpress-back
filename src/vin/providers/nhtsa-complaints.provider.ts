import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Complaint, DecodedVehicle } from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * NHTSA Complaints API — free, no key required.
 * https://api.nhtsa.gov/complaints/complaintsByVehicle?make=X&model=Y&modelYear=Z
 *
 * Popular vehicles can have hundreds of complaints; we cap at MAX_RESULTS
 * after sorting newest-first so the report stays a reasonable size.
 */
@Injectable()
export class NhtsaComplaintsProvider implements IVinProvider {
  readonly name = 'nhtsa-complaints';
  readonly priority = 10;
  readonly capabilities = new Set<VinCapability>(['complaints']);
  private readonly log = new Logger(NhtsaComplaintsProvider.name);
  private readonly MAX_RESULTS = 50;

  isEnabled() {
    return true;
  }

  async getComplaints(_vin: string, decoded: DecodedVehicle): Promise<Complaint[]> {
    if (!decoded.make || !decoded.model || !decoded.year) return [];
    const url =
      `https://api.nhtsa.gov/complaints/complaintsByVehicle` +
      `?make=${encodeURIComponent(decoded.make)}` +
      `&model=${encodeURIComponent(decoded.model)}` +
      `&modelYear=${decoded.year}`;
    try {
      const { data } = await axios.get(url, { timeout: 15_000 });
      const results: NhtsaComplaint[] = data?.results ?? [];
      return results
        .map(
          (c): Complaint => ({
            date: c.dateOfIncident || c.dateComplaintFiled,
            component: c.components,
            summary: c.summary,
            crash: c.crash === 'Yes' || c.crash === true,
            fire: c.fire === 'Yes' || c.fire === true,
            injured: c.numberOfInjuries ? Number(c.numberOfInjuries) : undefined,
            deaths: c.numberOfDeaths ? Number(c.numberOfDeaths) : undefined,
            source: 'NHTSA',
          }),
        )
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
        .slice(0, this.MAX_RESULTS);
    } catch (e: any) {
      this.log.warn(`nhtsa-complaints failed: ${e?.message || e}`);
      return [];
    }
  }
}

interface NhtsaComplaint {
  dateOfIncident?: string;
  dateComplaintFiled?: string;
  components?: string;
  summary?: string;
  crash?: string | boolean;
  fire?: string | boolean;
  numberOfInjuries?: string | number;
  numberOfDeaths?: string | number;
}
