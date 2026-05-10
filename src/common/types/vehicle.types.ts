/**
 * Provider-neutral vehicle data shape.
 * Every provider returns Partial<DecodedVehicle>; the aggregator merges them.
 */
export interface DecodedVehicle {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  trim?: string;
  bodyClass?: string;
  vehicleType?: string;
  driveType?: string;
  transmission?: string;
  engine?: {
    cylinders?: number;
    displacementL?: number;
    fuelType?: string;
    horsepower?: number;
  };
  manufacturer?: string;
  plantCountry?: string;
  plantCity?: string;
  doors?: number;
  series?: string;
  gvwr?: string;
  raw?: Record<string, unknown>;
}

export interface HistoryEvent {
  date: string; // ISO
  type: 'sale' | 'auction' | 'accident' | 'registration' | 'mileage' | 'title' | 'other';
  source: string;
  location?: string;
  mileage?: number;
  description?: string;
  data?: Record<string, unknown>;
}

export interface SalvageRecord {
  source: string;
  auction?: string;
  saleDate?: string;
  finalBid?: number;
  damage?: string;
  primaryDamage?: string;
  secondaryDamage?: string;
  odometer?: number;
  status?: string;
  images?: string[];
}

export interface VehicleImage {
  url: string;
  source: string;
  caption?: string;
}

/**
 * Carfax-style status flags. Matches the wording used in their report
 * matrices ("No Issues Reported", "Damage Reported", "Severe Damage", etc.).
 * Strings are intentional so they can be rendered + colored client-side.
 */
export type StatusFlag =
  | 'no_issues'
  | 'damage_reported'
  | 'severe_damage'
  | 'recall_reported'
  | 'no_recalls'
  | 'warranty_active'
  | 'warranty_voided';

export type BrandStatus = 'no_problem' | 'alert' | 'problem';

export interface OwnerEvent {
  date?: string;          // ISO or 'Not Reported'
  mileage?: number;
  source?: string;        // dealer name or DMV
  sourceLocation?: string; // 'Van Nuys, CA'
  sourceContact?: string;  // phone, website
  rating?: { stars?: number; count?: number };
  comments?: string[];     // bulleted comments under the entry
  damage?: {
    severity?: 'minor' | 'moderate' | 'severe';
    location?: 'front' | 'rear' | 'left' | 'right';
    description?: string;
  };
}

export interface OwnerRecord {
  index: number;
  yearPurchased?: number;
  type?: 'Personal' | 'Commercial' | 'Lease' | 'Rental';
  lengthMonths?: number;
  states?: string[];
  milesPerYear?: number;
  lastOdometer?: number;
  events?: OwnerEvent[];
  damageBrands?: BrandStatus;
  odometerBrands?: BrandStatus;
  additional?: {
    totalLoss?: StatusFlag;
    structuralDamage?: StatusFlag;
    airbagDeployment?: StatusFlag;
    odometerCheck?: StatusFlag;
    accidentDamage?: StatusFlag;
    manufacturerRecall?: StatusFlag;
    basicWarranty?: StatusFlag;
  };
}

export interface Recall {
  date?: string;
  nhtsaId?: string;
  recallNumber?: string;
  description?: string;
  status?: string;
  source?: string;
}

export interface ServiceHighlight {
  date: string;
  service: string;
  comments?: string;
}

export interface AccidentEvent {
  index: number;
  date: string;
  severity?: 'minor' | 'moderate' | 'severe';
  description?: string;
}

export interface ReportSummary {
  oilChangesRegular?: boolean;
  openRecalls?: number;
  previousOwners?: number;
  useType?: 'Personal' | 'Commercial' | 'Lease' | 'Rental';
  lastOwnedState?: string;
  brandedTitle?: boolean;
  salvage?: boolean;
}

export interface FullReport {
  vin: string;
  decoded: DecodedVehicle;
  history: HistoryEvent[];
  salvage: SalvageRecord[];
  images: VehicleImage[];
  providers: string[];
  fetchedAt: string;
  cached: boolean;

  // Carfax-style enriched fields. Optional — only present when a provider
  // (or sample data) populates them.
  mileage?: number;
  windowStickerUrl?: string;
  retailValue?: { amount: number; currency: string };
  summary?: ReportSummary;
  owners?: OwnerRecord[];
  accidentEvents?: AccidentEvent[];
  recalls?: Recall[];
  serviceHighlights?: ServiceHighlight[];
}
