import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DecodedVehicle } from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * Auto.dev free tier (https://auto.dev) — set AUTODEV_API_KEY to enable.
 * Falls back to disabled if no key present.
 */
@Injectable()
export class AutoDevProvider implements IVinProvider {
  readonly name = 'autodev';
  readonly priority = 20;
  readonly capabilities = new Set<VinCapability>(['decode']);
  private readonly log = new Logger(AutoDevProvider.name);
  private readonly key = process.env.AUTODEV_API_KEY || '';

  isEnabled() {
    return Boolean(this.key);
  }

  async decode(vin: string): Promise<Partial<DecodedVehicle>> {
    if (!this.isEnabled()) return {};
    const url = `https://auto.dev/api/vin/${vin}?apikey=${this.key}`;
    try {
      const { data } = await axios.get(url, { timeout: 10_000 });
      return {
        vin,
        make: data?.make?.name,
        model: data?.model?.name,
        year: data?.years?.[0]?.year,
        trim: data?.years?.[0]?.styles?.[0]?.trim,
        raw: data,
      };
    } catch (e: any) {
      this.log.warn(`autodev failed: ${e?.message || e}`);
      return {};
    }
  }
}
