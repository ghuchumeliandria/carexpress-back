import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  DecodedVehicle,
  HistoryEvent,
  SalvageRecord,
  VehicleImage,
} from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * EpicVIN — paid Carfax-like vehicle history provider.
 *
 * Setup: sign up at https://epicvin.com/api, set EPICVIN_API_KEY in .env.
 * The endpoint + response field names below follow EpicVIN's public docs at
 * the time of writing; if their schema differs for your account, only the
 * `mapDecoded` / `mapHistory` / `mapSalvage` / `mapImages` functions need to
 * change — everything else is provider-agnostic.
 */
@Injectable()
export class EpicVinProvider implements IVinProvider {
  readonly name = 'epicvin';
  readonly priority = 80; // paid > free decoders (nhtsa=10, autodev=20)
  readonly capabilities = new Set<VinCapability>(['decode', 'history', 'salvage', 'images']);
  private readonly log = new Logger(EpicVinProvider.name);
  private readonly key = process.env.EPICVIN_API_KEY || '';
  private readonly baseUrl = process.env.EPICVIN_BASE_URL || 'https://api.epicvin.com/v1';

  isEnabled() {
    return Boolean(this.key);
  }

  private async fetchReport(vin: string): Promise<EpicVinReport | null> {
    if (!this.isEnabled()) return null;
    try {
      const { data } = await axios.get<EpicVinReport>(`${this.baseUrl}/report/${vin}`, {
        headers: { Authorization: `Bearer ${this.key}` },
        timeout: 15_000,
      });
      return data ?? null;
    } catch (e: any) {
      this.log.warn(`epicvin fetch failed for ${vin}: ${e?.response?.status || ''} ${e?.message || e}`);
      return null;
    }
  }

  async decode(vin: string): Promise<Partial<DecodedVehicle>> {
    const r = await this.fetchReport(vin);
    return r ? mapDecoded(vin, r) : {};
  }

  async getHistory(vin: string): Promise<HistoryEvent[]> {
    const r = await this.fetchReport(vin);
    return r ? mapHistory(r) : [];
  }

  async getSalvage(vin: string): Promise<SalvageRecord[]> {
    const r = await this.fetchReport(vin);
    return r ? mapSalvage(r) : [];
  }

  async getImages(vin: string): Promise<VehicleImage[]> {
    const r = await this.fetchReport(vin);
    return r ? mapImages(r) : [];
  }
}

// ---------- response shape (adjust to match your EpicVIN account) ----------

interface EpicVinReport {
  vehicle?: {
    make?: string;
    model?: string;
    year?: number;
    trim?: string;
    bodyClass?: string;
    driveType?: string;
    transmission?: string;
    manufacturer?: string;
    plantCountry?: string;
    plantCity?: string;
    doors?: number;
    series?: string;
    gvwr?: string;
    engine?: {
      cylinders?: number;
      displacementL?: number;
      fuelType?: string;
      horsepower?: number;
    };
  };
  titleRecords?: Array<{
    date?: string;
    state?: string;
    brand?: string;
    mileage?: number;
  }>;
  accidentRecords?: Array<{
    date?: string;
    location?: string;
    severity?: string;
    description?: string;
  }>;
  odometerRecords?: Array<{
    date?: string;
    mileage?: number;
    source?: string;
  }>;
  saleRecords?: Array<{
    date?: string;
    location?: string;
    price?: number;
    description?: string;
  }>;
  salvageRecords?: Array<{
    auction?: string;
    saleDate?: string;
    finalBid?: number;
    primaryDamage?: string;
    secondaryDamage?: string;
    odometer?: number;
    status?: string;
    images?: string[];
  }>;
  images?: Array<{ url: string; caption?: string }>;
}

function mapDecoded(vin: string, r: EpicVinReport): Partial<DecodedVehicle> {
  const v = r.vehicle ?? {};
  return {
    vin,
    make: v.make,
    model: v.model,
    year: v.year,
    trim: v.trim,
    bodyClass: v.bodyClass,
    driveType: v.driveType,
    transmission: v.transmission,
    manufacturer: v.manufacturer,
    plantCountry: v.plantCountry,
    plantCity: v.plantCity,
    doors: v.doors,
    series: v.series,
    gvwr: v.gvwr,
    engine: v.engine,
    raw: r as unknown as Record<string, unknown>,
  };
}

function mapHistory(r: EpicVinReport): HistoryEvent[] {
  const events: HistoryEvent[] = [];

  for (const t of r.titleRecords ?? []) {
    if (!t.date) continue;
    events.push({
      date: t.date,
      type: 'title',
      source: 'epicvin',
      location: t.state,
      mileage: t.mileage,
      description: t.brand,
    });
  }
  for (const a of r.accidentRecords ?? []) {
    if (!a.date) continue;
    events.push({
      date: a.date,
      type: 'accident',
      source: 'epicvin',
      location: a.location,
      description: [a.severity, a.description].filter(Boolean).join(' — ') || undefined,
    });
  }
  for (const o of r.odometerRecords ?? []) {
    if (!o.date) continue;
    events.push({
      date: o.date,
      type: 'mileage',
      source: 'epicvin',
      mileage: o.mileage,
      description: o.source,
    });
  }
  for (const s of r.saleRecords ?? []) {
    if (!s.date) continue;
    events.push({
      date: s.date,
      type: 'sale',
      source: 'epicvin',
      location: s.location,
      description: s.description,
      data: s.price !== undefined ? { price: s.price } : undefined,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function mapSalvage(r: EpicVinReport): SalvageRecord[] {
  return (r.salvageRecords ?? []).map((s) => ({
    source: 'epicvin',
    auction: s.auction,
    saleDate: s.saleDate,
    finalBid: s.finalBid,
    primaryDamage: s.primaryDamage,
    secondaryDamage: s.secondaryDamage,
    odometer: s.odometer,
    status: s.status,
    images: s.images,
  }));
}

function mapImages(r: EpicVinReport): VehicleImage[] {
  return (r.images ?? []).map((i) => ({ url: i.url, source: 'epicvin', caption: i.caption }));
}
