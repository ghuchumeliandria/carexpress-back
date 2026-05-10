import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Attaches user if a valid JWT is present, but never blocks anonymous requests. */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<T = any>(_err: any, user: T) {
    return user || (undefined as unknown as T);
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as any;
  }
}
