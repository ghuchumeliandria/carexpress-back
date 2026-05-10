import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  AccidentEvent,
  DecodedVehicle,
  HistoryEvent,
  OwnerRecord,
  Recall,
  ReportSummary,
  SalvageRecord,
  ServiceHighlight,
  VehicleImage,
} from '@/common/types/vehicle.types';

export type VehicleDocument = HydratedDocument<Vehicle>;

/**
 * TTL-cached aggregated report. Mongo deletes docs once `expiresAt` passes.
 */
@Schema({ collection: 'vehicles', timestamps: true })
export class Vehicle {
  @Prop({ required: true, unique: true, index: true, uppercase: true, length: 17 })
  vin!: string;

  @Prop({ type: Object }) decoded!: DecodedVehicle;
  @Prop({ type: [Object], default: [] }) history!: HistoryEvent[];
  @Prop({ type: [Object], default: [] }) salvage!: SalvageRecord[];
  @Prop({ type: [Object], default: [] }) images!: VehicleImage[];
  @Prop({ type: [String], default: [] }) providers!: string[];

  // Carfax-style enriched fields — optional, populated by providers that supply them.
  @Prop() mileage?: number;
  @Prop() windowStickerUrl?: string;
  @Prop({ type: Object }) retailValue?: { amount: number; currency: string };
  @Prop({ type: Object }) summary?: ReportSummary;
  @Prop({ type: [Object], default: undefined }) owners?: OwnerRecord[];
  @Prop({ type: [Object], default: undefined }) accidentEvents?: AccidentEvent[];
  @Prop({ type: [Object], default: undefined }) recalls?: Recall[];
  @Prop({ type: [Object], default: undefined }) serviceHighlights?: ServiceHighlight[];

  @Prop({ default: () => new Date() }) fetchedAt!: Date;
  @Prop({ index: { expires: 0 } }) expiresAt!: Date;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
