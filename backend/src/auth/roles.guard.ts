import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { JwtRequestUser } from './interfaces/jwt-request-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // Si la route n'a pas @Roles(), accès libre (si passe JwtAuthGuard)
    }
    
    const request = context.switchToHttp().getRequest<{user: JwtRequestUser}>();
    const user = request.user;
    
    if (!user || !user.role) {
      return false; // Pas d'utilisateur authentifié ou pas de rôle
    }
    
    return requiredRoles.includes(user.role);
  }
}
