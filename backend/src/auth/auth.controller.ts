import {
  Controller, Post, Body, UseGuards, Request,
  Get, Patch, Delete, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtRequestUser } from './interfaces/jwt-request-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ── Connexion ──────────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  // ── Mot de passe oublié ────────────────────────────────────────────────────
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  // ── Profil connecté ────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: { user: JwtRequestUser }) {
    return req.user;
  }

  // ── Rôles disponibles ──────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('roles')
  getRoles() {
    return this.authService.getRoles();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  GESTION DES UTILISATEURS (ADMIN uniquement)
  // ══════════════════════════════════════════════════════════════════════════

  /** Lister tous les utilisateurs */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('users')
  getUsers() {
    return this.authService.getUsers();
  }

  /** Créer un utilisateur avec un rôle imposé par l'admin */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('users')
  createUser(
    @Body() body: { name: string; email: string; password: string; roleName: string },
  ) {
    return this.authService.createUserByAdmin(body);
  }

  /** Modifier le nom, l'email et/ou le rôle d'un utilisateur */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; roleName?: string },
  ) {
    return this.authService.updateUser(id, body);
  }

  /** Désactiver ou réactiver un compte (toggle isActive) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('users/:id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.authService.toggleActive(id);
  }

  /** Suppression définitive (conservée) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }
}
