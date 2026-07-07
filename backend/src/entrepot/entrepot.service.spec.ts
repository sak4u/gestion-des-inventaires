import { Test, TestingModule } from '@nestjs/testing';
import { EntrepotService } from './entrepot.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('EntrepotService', () => {
  let service: EntrepotService;
  let prisma: any;

  // ── Mock data ─────────────────────────────────────────────────────

  const mockEntrepot = {
    id: 'ent-1',
    nom: 'Entrepôt Principal',
    adresse: 'Zone Industrielle',
    capaciteMax: 5000,
    createdAt: new Date(),
    updatedAt: new Date(),
    stockEntrepots: [
      { quantite: 20, produit: { id: 'prod-1', nom: 'Produit A' } },
      { quantite: 15, produit: { id: 'prod-2', nom: 'Produit B' } },
    ],
    fluxDeStocks: [
      { id: 'flux-1', produit: { id: 'prod-1', nom: 'Produit A' } },
    ],
  };

  const mockEntrepotWithoutStock = {
    ...mockEntrepot,
    stockEntrepots: [],
  };

  // ── Test module setup ─────────────────────────────────────────────

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntrepotService,
        {
          provide: PrismaService,
          useValue: {
            entrepot: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EntrepotService>(EntrepotService);
    prisma = module.get(PrismaService);
  });

  // ── create() ──────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée et retourne un entrepôt avec les données fournies', async () => {
      const dto = {
        nom: 'Entrepôt Principal',
        adresse: 'Zone Industrielle',
        capaciteMax: 5000,
      };

      prisma.entrepot.create.mockResolvedValue(mockEntrepot);

      const result = await service.create(dto as any);

      expect(result.id).toBe('ent-1');
      expect(result.nom).toBe('Entrepôt Principal');
      expect(prisma.entrepot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: dto,
          include: { fluxDeStocks: true },
        }),
      );
    });

    it('crée un entrepôt sans adresse ni capaciteMax (champs optionnels)', async () => {
      const dto = { nom: 'Mini Entrepôt' };
      const created = { ...mockEntrepot, id: 'ent-2', nom: 'Mini Entrepôt', adresse: null, capaciteMax: null };

      prisma.entrepot.create.mockResolvedValue(created);

      const result = await service.create(dto as any);

      expect(result.nom).toBe('Mini Entrepôt');
      expect(result.adresse).toBeNull();
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne tous les entrepôts sans filtre avec stockTotal calculé', async () => {
      prisma.entrepot.findMany.mockResolvedValue([mockEntrepot]);

      const result = await service.findAll({});

      expect(result).toHaveLength(1);
      // stockTotalEntrepot = 20 + 15 = 35
      expect(result[0].stockTotalEntrepot).toBe(35);
    });

    it('filtre par adresse (insensitive)', async () => {
      prisma.entrepot.findMany.mockResolvedValue([mockEntrepot]);

      await service.findAll({ adresse: 'industrielle' });

      expect(prisma.entrepot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            adresse: {
              contains: 'industrielle',
              mode: 'insensitive',
            },
          },
        }),
      );
    });

    it('filtre par capaciteMax', async () => {
      prisma.entrepot.findMany.mockResolvedValue([mockEntrepot]);

      await service.findAll({ capaciteMax: 5000 });

      expect(prisma.entrepot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { capaciteMax: 5000 },
        }),
      );
    });

    it('retourne stockTotalEntrepot = 0 si aucun stock', async () => {
      prisma.entrepot.findMany.mockResolvedValue([mockEntrepotWithoutStock]);

      const result = await service.findAll({});

      expect(result[0].stockTotalEntrepot).toBe(0);
    });

    it('retourne un tableau vide si aucun entrepôt', async () => {
      prisma.entrepot.findMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result).toHaveLength(0);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne l\'entrepôt avec stockTotalEntrepot calculé', async () => {
      prisma.entrepot.findUnique.mockResolvedValue(mockEntrepot);

      const result = await service.findOne('ent-1');

      expect(result.id).toBe('ent-1');
      expect(result.stockTotalEntrepot).toBe(35);
      expect(result.fluxDeStocks).toHaveLength(1);
    });

    it('lève NotFoundException si l\'ID n\'existe pas', async () => {
      prisma.entrepot.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── update() ──────────────────────────────────────────────────────

  describe('update()', () => {
    it('met à jour et retourne l\'entrepôt modifié', async () => {
      const updated = { ...mockEntrepot, nom: 'Entrepôt Modifié' };
      prisma.entrepot.update.mockResolvedValue(updated);

      const result = await service.update('ent-1', { nom: 'Entrepôt Modifié' } as any);

      expect(result.nom).toBe('Entrepôt Modifié');
      expect(prisma.entrepot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ent-1' },
          data: { nom: 'Entrepôt Modifié' },
        }),
      );
    });

    it('lève NotFoundException si l\'ID n\'existe pas', async () => {
      prisma.entrepot.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        service.update('id-inexistant', { nom: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove() ──────────────────────────────────────────────────────

  describe('remove()', () => {
    it('supprime et retourne l\'entrepôt', async () => {
      prisma.entrepot.delete.mockResolvedValue(mockEntrepot);

      const result = await service.remove('ent-1');

      expect(result.id).toBe('ent-1');
      expect(prisma.entrepot.delete).toHaveBeenCalledWith({
        where: { id: 'ent-1' },
      });
    });

    it('lève NotFoundException si l\'ID n\'existe pas', async () => {
      prisma.entrepot.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.remove('id-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
