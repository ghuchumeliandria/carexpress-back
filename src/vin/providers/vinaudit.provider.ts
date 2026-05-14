import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  DecodedVehicle,
  HistoryEvent,
  ReportSummary,
  SalvageRecord,
} from '@/common/types/vehicle.types';
import { IVinProvider, VinCapability } from './vin-provider.interface';

/**
 * VinAudit — paid (cheap) NMVTIS-licensed history + market value provider.
 *
 * Setup:
 *   1. Sign up at https://www.vinaudit.com/api (free signup, free tier ~5 reports/mo)
 *   2. Set VINAUDIT_API_KEY in env
 *   3. Optionally override VINAUDIT_BASE_URL
 *
 * NOTE: the exact endpoint + response shape depends on the plan tier and
 * has changed over time. The mappers below are best-guess based on their
 * historical public docs. After you have a real key, run:
 *
 *   curl 'https://api.vinaudit.com/v2/?key=$VINAUDIT_API_KEY&format=json&id=SOMEVIN'
 *
 * and adjust the `map*` functions if the field names differ. The provider
 * structure stays the same.
 *
 * Capabilities: history (sale listings + title events), salvage (insurance
 * total-loss records). VinAudit doesn't report accidents or service
 * history — those are only in commercial Carfax/EpicVIN data.
 */
@Injectable()
export class VinAuditProvider implements IVinProvider {
  readonly name = 'vinaudit';
  readonly priority = 60; // > free providers, < commercial (EpicVIN=80)
  readonly capabilities = new Set<VinCapability>(['history', 'salvage']);
  private readonly log = new Logger(VinAuditProvider.name);
  private readonly key = process.env.VINAUDIT_API_KEY || '';
  private readonly baseUrl = process.env.VINAUDIT_BASE_URL || 'https://api.vinaudit.com/v2';

  isEnabled() {
    return Boolean(this.key);
  }

  private async fetchReport(vin: string): Promise<VinAuditReport | null> {
    if (!this.isEnabled()) return null;
    try {
      const { data } = await axios.get<VinAuditReport>(this.baseUrl, {
        params: { key: this.key, format: 'json', id: vin, include: 'titlebrands,jsi,marketvalue' },
        timeout: 15_000,
      });
      if (data?.success === false) {
        this.log.warn(`vinaudit error for ${vin}: ${data.error || 'unknown'}`);
        return null;
      }
      return data ?? null;
    } catch (e: any) {
      this.log.warn(`vinaudit fetch failed for ${vin}: ${e?.response?.status || ''} ${e?.message || e}`);
      return null;
    }
  }

  async getHistory(vin: string): Promise<HistoryEvent[]> {
    const r = await this.fetchReport(vin);
    return r ? mapHistory(r) : [];
  }

  async getSalvage(vin: string): Promise<SalvageRecord[]> {
    const r = await this.fetchReport(vin);
    return r ? mapSalvage(r) : [];
  }
}

// ---------- response shape (verify after signup) ----------

interface VinAuditReport {
  success?: boolean;
  error?: string;
  vin?: string;
  titlerecords?: Array<{
    state?: string;
    titledate?: string;
    titlenumber?: string;
    mileage?: number;
    current?: boolean;
  }>;
  jsirecords?: Array<{
    // junk / salvage / insurance loss records
    reportingentity?: string;
    obtaineddate?: string;
    losstype?: string;
    state?: string;
    odometer?: number;
  }>;
  brandrecords?: Array<{
    state?: string;
    branddate?: string;
    name?: string; // e.g. "SALVAGE", "FLOOD", "REBUILT"
  }>;
  salerecords?: Array<{
    listdate?: string;
    saledate?: string;
    location?: string;
    price?: number;
    odometer?: number;
  }>;
  marketvalue?: {
    mean?: number;
    median?: number;
    low?: number;
    high?: number;
  };
}

function mapHistory(r: VinAuditReport): HistoryEvent[] {
  const events: HistoryEvent[] = [];

  for (const t of r.titlerecords ?? []) {
    if (!t.titledate) continue;
    events.push({
      date: t.titledate,
      type: 'title',
      source: 'vinaudit',
      location: t.state,
      mileage: t.mileage,
      description: t.current ? 'Current title' : 'Title issued',
    });
  }
  for (const b of r.brandrecords ?? []) {
    if (!b.branddate) continue;
    events.push({
      date: b.branddate,
      type: 'title',
      source: 'vinaudit',
      location: b.state,
      description: b.name ? `Title brand: ${b.name}` : 'Title brand recorded',
    });
  }
  for (const s of r.salerecords ?? []) {
    const date = s.saledate || s.listdate;
    if (!date) continue;
    events.push({
      date,
      type: 'sale',
      source: 'vinaudit',
      location: s.location,
      mileage: s.odometer,
      description: s.price ? `Listed/sold @ $${s.price.toLocaleString()}` : 'Sale listing',
      data: s.price !== undefined ? { price: s.price } : undefined,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function mapSalvage(r: VinAuditReport): SalvageRecord[] {
  return (r.jsirecords ?? []).map((j) => ({
    source: j.reportingentity || 'vinaudit',
    saleDate: j.obtaineddate,
    primaryDamage: j.losstype,
    odometer: j.odometer,
    status: j.losstype,
  }));
}

// Future: surface marketvalue + brandrecords into the report `summary` and
// `retailValue` fields once the response shape is verified.
export function mapVinAuditSummary(r: VinAuditReport): {
  summary?: Partial<ReportSummary>;
  retailValue?: { amount: number; currency: string };
} {
  const out: ReturnType<typeof mapVinAuditSummary> = {};
  const brands = (r.brandrecords ?? []).map((b) => (b.name || '').toUpperCase());
  if (brands.length) {
    out.summary = {
      brandedTitle: true,
      salvage: brands.some((n) => /SALVAGE|JUNK|REBUILT/.test(n)),
    };
  }
  if (r.marketvalue?.mean) {
    out.retailValue = { amount: Math.round(r.marketvalue.mean), currency: 'USD' };
  }
  return out;
}
