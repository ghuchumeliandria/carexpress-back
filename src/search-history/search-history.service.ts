import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { Search, SearchDocument } from './schemas/search.schema';

@Injectable()
export class SearchHistoryService {
  constructor(@InjectModel(Search.name) private readonly model: Model<SearchDocument>) {}

  async record(input: { vin: string; userId?: string; ip?: string }) {
    return this.model.create({
      vin: input.vin.toUpperCase(),
      userId: input.userId ?? null,
      ipHash: input.ip ? createHash('sha256').update(input.ip).digest('hex').slice(0, 24) : undefined,
    });
  }

  forUser(userId: string, limit = 50) {
    return this.model.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  recent(limit = 100) {
    return this.model.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  count() {
    return this.model.estimatedDocumentCount();
  }

  topVins(limit = 10) {
    return this.model.aggregate([
      { $group: { _id: '$vin', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }
}
