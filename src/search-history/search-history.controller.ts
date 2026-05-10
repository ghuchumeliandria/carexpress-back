import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { SearchHistoryService } from './search-history.service';

@Controller('search-history')
@UseGuards(JwtGuard)
export class SearchHistoryController {
  constructor(private readonly service: SearchHistoryService) {}

  @Get()
  mine(@Req() req: Request) {
    return this.service.forUser((req as any).user.userId);
  }
}
