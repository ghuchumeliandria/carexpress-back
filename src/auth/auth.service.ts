import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new UnauthorizedException('Email already registered');
    const user = await this.users.create(dto);
    return this.token(user._id.toString(), user.email, user.role);
  }

  async login(dto: LoginDto) {
    const u = await this.users.findByEmail(dto.email, true);
    if (!u || !u.active) throw new UnauthorizedException('Invalid credentials');
    const ok = await this.users.verifyPassword(dto.password, u.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.token(u._id.toString(), u.email, u.role);
  }

  async me(userId: string) {
    const u = await this.users.findById(userId);
    if (!u) throw new UnauthorizedException();
    return { id: u._id, email: u.email, name: u.name, role: u.role };
  }

  private token(sub: string, email: string, role: 'user' | 'admin') {
    const payload: JwtPayload = { sub, email, role };
    return { accessToken: this.jwt.sign(payload), user: { id: sub, email, role } };
  }
}
