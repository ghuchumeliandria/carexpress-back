import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import { Roles, RolesGuard } from '@/auth/guards/roles.guard';
import { UsersService } from '@/users/users.service';
import { SearchHistoryService } from '@/search-history/search-history.service';
import { IVinProvider, VIN_PROVIDERS } from '@/vin/providers/vin-provider.interface';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly searches: SearchHistoryService,
    @Inject(VIN_PROVIDERS) private readonly providers: IVinProvider[],
  ) {}

  @Get('stats')
  async stats() {
    const [users, searches, top] = await Promise.all([
      this.users.count(),
      this.searches.count(),
      this.searches.topVins(10),
    ]);
    return { users, searches, topVins: top };
  }

  @Get('users')
  listUsers() {
    return this.users.list({ limit: 100 });
  }

  @Get('searches')
  recentSearches() {
    return this.searches.recent(100);
  }

  @Get('providers')
  listProviders() {
    return this.providers.map((p) => ({
      name: p.name,
      priority: p.priority,
      enabled: p.isEnabled(),
      capabilities: Array.from(p.capabilities),
    }));
  }
}
