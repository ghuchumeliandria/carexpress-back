import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { DecodedVehicle } from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * NHTSA vPIC — free, no key required.
 * https://vpic.nhtsa.dot.gov/api/
 */
@Injectable()
export class NhtsaProvider implements IVinProvider {
  readonly name = 'nhtsa';
  readonly priority = 10;
  readonly capabilities = new Set<VinCapability>(['decode']);

  isEnabled() {
    return true;
  }

  async decode(vin: string): Promise<Partial<DecodedVehicle>> {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`;
    const { data } = await axios.get(url, { timeout: 10_000 });
    const r = data?.Results?.[0];
    if (!r) return { vin };

    return {
      vin,
      make: pick(r.Make),
      model: pick(r.Model),
      year: r.ModelYear ? Number(r.ModelYear) : undefined,
      trim: pick(r.Trim),
      bodyClass: pick(r.BodyClass),
      vehicleType: pick(r.VehicleType),
      driveType: pick(r.DriveType),
      transmission: pick(r.TransmissionStyle),
      manufacturer: pick(r.Manufacturer),
      plantCountry: pick(r.PlantCountry),
      plantCity: pick(r.PlantCity),
      doors: r.Doors ? Number(r.Doors) : undefined,
      series: pick(r.Series),
      gvwr: pick(r.GVWR),
      engine: {
        cylinders: r.EngineCylinders ? Number(r.EngineCylinders) : undefined,
        displacementL: r.DisplacementL ? Number(r.DisplacementL) : undefined,
        fuelType: pick(r.FuelTypePrimary),
        horsepower: r.EngineHP ? Number(r.EngineHP) : undefined,
      },
      raw: r,
    };
  }
}

function pick(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t && t !== 'Not Applicable' ? t : undefined;
}
