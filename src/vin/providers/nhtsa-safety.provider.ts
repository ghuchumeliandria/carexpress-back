import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DecodedVehicle, SafetyRating } from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * NHTSA NCAP Safety Ratings — free, no key.
 * Two-step:
 *   1) /SafetyRatings/modelyear/{year}/make/{make}/model/{model}
 *      → list of {VehicleId, VehicleDescription}
 *   2) /SafetyRatings/VehicleId/{VehicleId}
 *      → full 5-star ratings
 *
 * https://api.nhtsa.gov/SafetyRatings
 */
@Injectable()
export class NhtsaSafetyProvider implements IVinProvider {
  readonly name = 'nhtsa-safety';
  readonly priority = 10;
  readonly capabilities = new Set<VinCapability>(['safety_ratings']);
  private readonly log = new Logger(NhtsaSafetyProvider.name);

  isEnabled() {
    return true;
  }

  async getSafetyRatings(_vin: string, decoded: DecodedVehicle): Promise<SafetyRating[]> {
    if (!decoded.make || !decoded.model || !decoded.year) return [];
    try {
      const listUrl =
        `https://api.nhtsa.gov/SafetyRatings/modelyear/${decoded.year}` +
        `/make/${encodeURIComponent(decoded.make)}` +
        `/model/${encodeURIComponent(decoded.model)}`;
      const { data: listData } = await axios.get(listUrl, { timeout: 10_000 });
      const candidates: Array<{ VehicleId: number; VehicleDescription: string }> =
        listData?.Results ?? [];
      if (candidates.length === 0) return [];

      const results = await Promise.all(
        candidates.map(async (c) => {
          try {
            const { data } = await axios.get(
              `https://api.nhtsa.gov/SafetyRatings/VehicleId/${c.VehicleId}`,
              { timeout: 10_000 },
            );
            const r = data?.Results?.[0] as NhtsaSafetyResult | undefined;
            if (!r) return null;
            return mapSafety(r, c.VehicleDescription);
          } catch (e: any) {
            this.log.warn(`safety detail failed: ${e?.message || e}`);
            return null;
          }
        }),
      );
      return results.filter((x): x is SafetyRating => x !== null);
    } catch (e: any) {
      this.log.warn(`nhtsa-safety failed: ${e?.message || e}`);
      return [];
    }
  }
}

interface NhtsaSafetyResult {
  VehicleDescription?: string;
  OverallRating?: string;
  OverallFrontCrashRating?: string;
  OverallSideCrashRating?: string;
  RolloverRating?: string;
  RolloverPossibility?: number;
  FrontCrashDriversideRating?: string;
  FrontCrashPassengersideRating?: string;
  SideCrashDriversideRating?: string;
  SideCrashPassengersideRating?: string;
  SidePoleCrashRating?: string;
}

function mapSafety(r: NhtsaSafetyResult, vd?: string): SafetyRating {
  const num = (s?: string): number | string | undefined => {
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : s;
  };
  return {
    vehicleDescription: r.VehicleDescription || vd,
    overallRating: num(r.OverallRating),
    overallFrontCrashRating: num(r.OverallFrontCrashRating),
    overallSideCrashRating: num(r.OverallSideCrashRating),
    rolloverRating: num(r.RolloverRating),
    rolloverRiskPercent: r.RolloverPossibility,
    frontCrashDriversideRating: num(r.FrontCrashDriversideRating),
    frontCrashPassengersideRating: num(r.FrontCrashPassengersideRating),
    sideCrashDriversideRating: num(r.SideCrashDriversideRating),
    sideCrashPassengersideRating: num(r.SideCrashPassengersideRating),
    sidePoleCrashRating: num(r.SidePoleCrashRating),
    source: 'NHTSA',
  };
}
