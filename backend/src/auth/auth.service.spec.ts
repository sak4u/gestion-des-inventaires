import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: jest.Mocked<JwtService>;

  // Utilisateur de test — mot de passe haché avant les tests
  const mockUser = {
    id:           'user-1',
    name:         'Admin Test',
    email:        'admin@email.com',
    password:     '',   // rempli dans beforeAll
    isActive:     true,
    dateCreation: new Date(),
    roleId:       'role-1',
    resetCode:    null,
    resetExpires: null,
    role: { id: 'role-1', name: 'ADMIN' },
  };

  beforeAll(async () => {
    mockUser.password = await bcrypt.hash('admin123', 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany:   jest.fn(),
              create:     jest.fn(),
              update:     jest.fn(),
              delete:     jest.fn(),
            },
            role: {
              count:     jest.fn().mockResolvedValue(3),
              findMany:  jest.fn(),
              findUnique: jest.fn(),
              upsert:    jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
        },
        {
          provide: MailService,
          useValue: {
            sendResetCode:           jest.fn().mockResolvedValue(undefined),
            sendCommandeNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service    = module.get<AuthService>(AuthService);
    prisma     = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  // ── login() ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('retourne un token JWT pour des credentials valides', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login('admin@email.com', 'admin123');

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user.email).toBe('admin@email.com');
      expect(result.user.role.name).toBe('ADMIN');
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'admin@email.com',
        sub:   'user-1',
        role:  'ADMIN',
      });
    });

    it('lève UnauthorizedException si le mot de passe est incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login('admin@email.com', 'mauvaisPass'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si l\'utilisateur est introuvable', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('inexistant@test.com', 'n\'importe'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si le compte est désactivé (isActive = false)', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login('admin@email.com', 'admin123'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ── forgotPassword() ───────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('retourne un message générique si l\'email n\'existe pas (sécurité)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('inexistant@test.com');

      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    });

    it('génère un resetCode et envoie un email si l\'utilisateur existe', async () => {
      const mailService = service['mailService'] as jest.Mocked<MailService>;
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, resetCode: '123456' });

      const result = await service.forgotPassword('admin@email.com');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(mailService.sendResetCode).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
    });
  });

  // ── resetPassword() ────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('lève UnauthorizedException si le code est invalide', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        resetCode:    '999999',
        resetExpires: new Date(Date.now() + 180_000), // non expiré
      });

      await expect(
        service.resetPassword({ email: 'admin@email.com', code: '111111', newPassword: 'NewPass123!' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si le code est expiré', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        resetCode:    '123456',
        resetExpires: new Date(Date.now() - 1000), // déjà expiré
      });

      await expect(
        service.resetPassword({ email: 'admin@email.com', code: '123456', newPassword: 'NewPass123!' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('met à jour le mot de passe si le code est valide et non expiré', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        resetCode:    '123456',
        resetExpires: new Date(Date.now() + 180_000),
      });
      prisma.user.update.mockResolvedValue({ ...mockUser, resetCode: null, resetExpires: null });

      const result = await service.resetPassword({
        email: 'admin@email.com',
        code: '123456',
        newPassword: 'NouveauPass123!',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'admin@email.com' },
          data: expect.objectContaining({ resetCode: null, resetExpires: null }),
        }),
      );
      expect(result).toHaveProperty('message');
    });
  });

  // ── getRoles() ─────────────────────────────────────────────────────────────

  describe('getRoles()', () => {
    it('retourne les 3 rôles disponibles', async () => {
      const mockRoles = [
        { id: '1', name: 'ADMIN',             description: 'Administrateur principal' },
        { id: '2', name: 'RESPONSABLE_STOCK', description: 'Manager de stock' },
        { id: '3', name: 'ACHAT',             description: 'Gestionnaire Achat' },
      ];
      prisma.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.getRoles();

      expect(result).toHaveLength(3);
      expect(result.map((r: any) => r.name)).toContain('ADMIN');
      expect(result.map((r: any) => r.name)).toContain('RESPONSABLE_STOCK');
      expect(result.map((r: any) => r.name)).toContain('ACHAT');
    });
  });

  // ── getUsers() ─────────────────────────────────────────────────────────────

  describe('getUsers()', () => {
    it('retourne la liste de tous les utilisateurs', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.getUsers();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  // ── createUserByAdmin() ────────────────────────────────────────────────────

  describe('createUserByAdmin()', () => {
    it('lève BadRequestException si l\'email existe déjà', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser); // email déjà pris

      await expect(
        service.createUserByAdmin({
          name: 'Nouveau User',
          email: 'admin@email.com',
          password: 'Pass123!',
          roleName: 'ACHAT',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si le rôle est invalide', async () => {
      prisma.user.findUnique.mockResolvedValue(null);   // email libre
      prisma.role.findUnique.mockResolvedValue(null);   // rôle inexistant

      await expect(
        service.createUserByAdmin({
          name: 'Nouveau User',
          email: 'nouveau@email.com',
          password: 'Pass123!',
          roleName: 'ROLE_INEXISTANT',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── toggleActive() ─────────────────────────────────────────────────────────

  describe('toggleActive()', () => {
    it('lève NotFoundException si l\'utilisateur n\'existe pas', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.toggleActive('id-inexistant'))
        .rejects.toThrow(NotFoundException);
    });

    it('bascule isActive de true à false', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.toggleActive('user-1');

      expect(result.user.isActive).toBe(false);
    });
  });
});
