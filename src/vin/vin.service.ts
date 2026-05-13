import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema';
import { VinAggregatorService } from './vin.aggregator';
import { DecodedVehicle, FullReport } from '@/common/types/vehicle.types';
import { isValidVin, normalizeVin } from '@/common/utils/vin';
import { MOCK_REPORTS } from './mock-reports';

const VIN_NOT_FOUND_MESSAGE =
  "We couldn't find any data for this VIN. Please double-check that it contains 17 characters and try again.";

@Injectable()
export class VinService {
  private readonly ttlMs = (Number(process.env.CACHE_TTL_HOURS) || 168) * 3600 * 1000;

  constructor(
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<VehicleDocument>,
    private readonly aggregator: VinAggregatorService,
  ) {}

  assertValid(raw: string): string {
    const vin = normalizeVin(raw);
    if (!isValidVin(vin)) throw new BadRequestException(VIN_NOT_FOUND_MESSAGE);
    return vin;
  }

  /** Empty if no provider returned a real make/model/year. */
  private isEmptyDecode(d: DecodedVehicle): boolean {
    return !d.make && !d.model && !d.year;
  }

  async getReport(rawVin: string, opts: { force?: boolean } = {}): Promise<FullReport> {
    const vin = this.assertValid(rawVin);

    // Demo seed: short-circuit for hardcoded sample VINs so the rich
    // Carfax-style report renders end-to-end without a paid provider.
    const mock = MOCK_REPORTS[vin];
    if (mock) {
      return { ...mock, fetchedAt: new Date().toISOString(), cached: false };
    }

    if (!opts.force) {
      const cached = await this.vehicleModel.findOne({ vin }).lean();
      if (cached && cached.expiresAt > new Date()) {
        // Strip Mongo metadata, then surface every persisted field
        // (recalls, complaints, owners, summary, retailValue, etc.).
        const { _id, __v, expiresAt, fetchedAt, ...rest } = cached as Record<string, unknown> & {
          fetchedAt: Date;
        };
        return {
          ...(rest as Omit<FullReport, 'fetchedAt' | 'cached'>),
          fetchedAt: fetchedAt.toISOString(),
          cached: true,
        };
      }
    }

    const report = await this.aggregator.fullReport(vin);

    if (
      this.isEmptyDecode(report.decoded) &&
      report.history.length === 0 &&
      report.salvage.length === 0 &&
      report.images.length === 0
    ) {
      throw new NotFoundException(VIN_NOT_FOUND_MESSAGE);
    }

    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + this.ttlMs);

    await this.vehicleModel.updateOne(
      { vin },
      { $set: { ...report, fetchedAt, expiresAt } },
      { upsert: true },
    );

    return { ...report, fetchedAt: fetchedAt.toISOString(), cached: false };
  }

  async decodeOnly(rawVin: string) {
    const full = await this.getReport(rawVin);
    return { vin: full.vin, decoded: full.decoded, providers: full.providers, cached: full.cached };
  }
}
