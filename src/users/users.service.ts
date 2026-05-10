import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  findById(id: string) {
    return this.model.findById(id).lean();
  }

  findByEmail(email: string, withHash = false) {
    const q = this.model.findOne({ email: email.toLowerCase() });
    return withHash ? q.select('+passwordHash').lean() : q.lean();
  }

  async create(input: { email: string; password: string; name?: string }) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.model.create({
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name ?? '',
    });
  }

  async verifyPassword(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }

  list({ skip = 0, limit = 50 } = {}) {
    return this.model.find().skip(skip).limit(limit).sort({ createdAt: -1 }).lean();
  }

  count() {
    return this.model.estimatedDocumentCount();
  }
}
