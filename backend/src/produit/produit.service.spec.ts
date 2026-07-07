import { Test, TestingModule } from '@nestjs/testing';
import { ProduitService } from './produit.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProduitService', () => {
  let service: ProduitService;
  let prisma: any;

  // Produit mock avec stockEntrepots pour que stockTotal soit calculable
  const mockProduit = {
    id:             'prod-1',
    nom:            'Clavier Mécanique',
    codeBare:       'KB-001',
    category:       'Informatique',
    stockAlert:     5,
    prixAchatMoyen: 45.00,
    prixVente:      79.99,
    createdAt:      new Date(),
    updatedAt:      new Date(),
    fournisseurProduits: [],
    commandesLigne:      [],
    predictions:         [],
    fluxDeStocks:        [],
    stockEntrepots: [
      { quantite: 12, entrepot: { id: 'e1', nom: 'Entrepôt A' } },
      { quantite:  8, entrepot: { id: 'e2', nom: 'Entrepôt B' } },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProduitService,
        {
          provide: PrismaService,
          useValue: {
            produit: {
              create:     jest.fn(),
              findMany:   jest.fn(),
              findUnique: jest.fn(),
              findFirst:  jest.fn(),
              update:     jest.fn(),
              delete:     jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProduitService>(ProduitService);
    prisma  = module.get(PrismaService);
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée et retourne un produit', async () => {
      prisma.produit.create.mockResolvedValue(mockProduit);

      const dto = {
        nom:        'Clavier Mécanique',
        codeBare:   'KB-001',
        category:   'Informatique',
        stockAlert: 5,
        prixVente:  79.99,
      } as any;

      const result = await service.create(dto);

      expect(result.id).toBe('prod-1');
      expect(result.nom).toBe('Clavier Mécanique');
      expect(prisma.produit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: dto }),
      );
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne la liste des produits avec stockTotal calculé (somme des entrepôts)', async () => {
      prisma.produit.findMany.mockResolvedValue([mockProduit]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      // stockTotal = 12 + 8 = 20
      expect(result[0].stockTotal).toBe(20);
    });

    it('retourne un tableau vide si aucun produit', async () => {
      prisma.produit.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });

    it('calcule stockTotal = 0 si stockEntrepots est vide', async () => {
      prisma.produit.findMany.mockResolvedValue([
        { ...mockProduit, stockEntrepots: [] },
      ]);

      const result = await service.findAll();

      expect(result[0].stockTotal).toBe(0);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne le produit avec stockTotal calculé quand l\'ID existe', async () => {
      prisma.produit.findUnique.mockResolvedValue(mockProduit);

      const result = await service.findOne('prod-1');

      expect(result.id).toBe('prod-1');
      expect(result.stockTotal).toBe(20);
    });

    it('lève NotFoundException quand l\'ID n\'existe pas', async () => {
      prisma.produit.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistant'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── findOneByCodeBare() ───────────────────────────────────────────────────

  describe('findOneByCodeBare()', () => {
    it('retourne le produit avec stockTotal si le codeBare existe', async () => {
      prisma.produit.findFirst.mockResolvedValue(mockProduit);

      const result = await service.findOneByCodeBare('KB-001');

      expect(result.codeBare).toBe('KB-001');
      expect(result.stockTotal).toBe(20);
    });

    it('lève BadRequestException si codeBare est une chaîne vide', async () => {
      await expect(service.findOneByCodeBare(''))
        .rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si codeBare est uniquement des espaces', async () => {
      await expect(service.findOneByCodeBare('   '))
        .rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si le codeBare n\'existe pas en base', async () => {
      prisma.produit.findFirst.mockResolvedValue(null);

      await expect(service.findOneByCodeBare('CODE-INEXISTANT'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('met à jour le produit et retourne les données mises à jour', async () => {
      const updatedProduit = { ...mockProduit, prixVente: 99.99 };
      prisma.produit.update.mockResolvedValue(updatedProduit);

      const result = await service.update('prod-1', { prixVente: 99.99 } as any);

      expect(result.prixVente).toBe(99.99);
      expect(prisma.produit.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prod-1' } }),
      );
    });

    it('ne modifie pas prixAchatMoyen (CUMP protégé — recalculé uniquement à la livraison)', async () => {
      const updatedProduit = { ...mockProduit };
      prisma.produit.update.mockResolvedValue(updatedProduit);

      await service.update('prod-1', { prixAchatMoyen: 999 } as any);

      // prixAchatMoyen doit être supprimé du data avant l'appel prisma
      const callArg = prisma.produit.update.mock.calls[0][0];
      expect(callArg.data).not.toHaveProperty('prixAchatMoyen');
    });

    it('lève NotFoundException si l\'ID n\'existe pas', async () => {
      prisma.produit.update.mockRejectedValue(new Error('Record not found'));

      await expect(service.update('id-inexistant', { nom: 'Test' } as any))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── remove() ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('supprime le produit et retourne ses données', async () => {
      prisma.produit.delete.mockResolvedValue(mockProduit);

      const result = await service.remove('prod-1');

      expect(result.id).toBe('prod-1');
      expect(prisma.produit.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('lève NotFoundException si l\'ID n\'existe pas', async () => {
      prisma.produit.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.remove('id-inexistant'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
