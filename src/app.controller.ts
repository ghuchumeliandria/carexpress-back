import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return {
      status: 'ok',
      message: 'CarExpress API is running 🚀',
      docs: 'GET /api/vin/:vin/full for a full report',
    };
  }
}
