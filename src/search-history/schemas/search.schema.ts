import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type SearchDocument = HydratedDocument<Search>;

@Schema({ collection: 'searches', timestamps: { createdAt: true, updatedAt: false } })
export class Search {
  @Prop({ required: true, uppercase: true, index: true, length: 17 })
  vin!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true, default: null })
  userId!: MongooseSchema.Types.ObjectId | null;

  @Prop() ipHash?: string;
}

export const SearchSchema = SchemaFactory.createForClass(Search);
SearchSchema.index({ createdAt: -1 });
