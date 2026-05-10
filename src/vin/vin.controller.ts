import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { VinService } from './vin.service';
import { VinParamDto } from './dto/vin.dto';
import { OptionalJwtGuard } from '@/auth/guards/optional-jwt.guard';
import { SearchHistoryService } from '@/search-history/search-history.service';

@Controller('vin')
@UseGuards(OptionalJwtGuard)
export class VinController {
  constructor(
    private readonly vin: VinService,
    private readonly searches: SearchHistoryService,
  ) {}

  @Get(':vin')
  async decode(@Param() p: VinParamDto, @Req() req: Request) {
    const out = await this.vin.decodeOnly(p.vin);
    await this.recordSearch(req, p.vin);
    return out;
  }

  @Get(':vin/full')
  async full(@Param() p: VinParamDto, @Req() req: Request) {
    const out = await this.vin.getReport(p.vin);
    await this.recordSearch(req, p.vin);
    return out;
  }

  @Get(':vin/history')
  async history(@Param() p: VinParamDto) {
    const out = await this.vin.getReport(p.vin);
    return { vin: out.vin, history: out.history, providers: out.providers };
  }

  @Get(':vin/salvage')
  async salvage(@Param() p: VinParamDto) {
    const out = await this.vin.getReport(p.vin);
    return { vin: out.vin, salvage: out.salvage, providers: out.providers };
  }

  @Get(':vin/images')
  async images(@Param() p: VinParamDto) {
    const out = await this.vin.getReport(p.vin);
    return { vin: out.vin, images: out.images, providers: out.providers };
  }

  private async recordSearch(req: Request, vin: string) {
    const userId = (req as any).user?.userId;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    await this.searches.record({ vin, userId, ip });
  }
}
