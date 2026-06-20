import { Test, TestingModule } from '@nestjs/testing';
import { FluxDeStockService } from './flux-de-stock.service';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionService } from '../ai/prediction/prediction.service';
import { PropositionCommandeService } from '../proposition-commande/proposition-commande.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FluxDeStockService', () => {
  let service: FluxDeStockService;
  let prisma: any;
  let notificationsGateway: jest.Mocked<NotificationsGateway>;

  const mockFlux = {
    id: 'flux-1',
    quantite: 10,
    type: 'vente',
    note: 'Vente test',
    date: new Date(),
    produitId: 'prod-1',
    entrepotId: 'ent-1',
    creerParId: 'user-1',
    commandeId: null,
    entrepotLieId: null,
    produit: { id: 'prod-1', nom: 'Produit Test' },
    entrepot: { id: 'ent-1', nom: 'Entrepôt Test', capaciteMax: 5000 },
    creerPar: { id: 'user-1', name: 'Admin', email: 'admin@email.com' },
  };

  const mockStockEntrepot = {
    quantite: 50,
    produitId: 'prod-1',
    entrepotId: 'ent-1',
  };

  const mockEntrepot = {
    id: 'ent-1',
    nom: 'Entrepôt Test',
    capaciteMax: 5000,
  };

  const mockProduit = {
    id: 'prod-1',
    nom: 'Produit Test',
    stockAlert: 5,
    prixAchatMoyen: 45.0,
  };

  // Default tx mock for $transaction callbacks
  const createTx = () => ({
    entrepot: {
      findUnique: jest.fn().mockResolvedValue(mockEntrepot),
    },
    produit: {
      findUnique: jest.fn().mockResolvedValue(mockProduit),
    },
    stockEntrepot: {
      findUnique: jest.fn().mockResolvedValue(mockStockEntrepot),
      upsert: jest.fn().mockResolvedValue(mockStockEntrepot),
      aggregate: jest.fn().mockResolvedValue({ _sum: { quantite: 50 } }),
    },
    fluxDeStock: {
      create: jest.fn().mockResolvedValue(mockFlux),
      findUnique: jest.fn().mockResolvedValue(mockFlux),
      update: jest.fn().mockResolvedValue(mockFlux),
      delete: jest.fn().mockResolvedValue(mockFlux),
    },
    commandeLigne: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    fournisseurProduit: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FluxDeStockService,
        {
          provide: PrismaService,
          useValue: {
            fluxDeStock: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            stockEntrepot: {
              aggregate: jest.fn().mockResolvedValue({ _sum: { quantite: 50 } }),
            },
            produit: {
              findUnique: jest.fn().mockResolvedValue(mockProduit),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: PredictionService,
          useValue: {
            generatePrediction: jest.fn().mockResolvedValue({ predictionId: 'pred-1' }),
          },
        },
        {
          provide: PropositionCommandeService,
          useValue: {
            generateProposition: jest.fn().mockResolvedValue({ id: 'prop-1' }),
          },
        },
        {
          provide: NotificationsGateway,
          useValue: {
            alertStockBas: jest.fn(),
            alertCommandeLivree: jest.fn(),
            alertNouvelleProposition: jest.fn(),
            sendToRoles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FluxDeStockService>(FluxDeStockService);
    prisma = module.get(PrismaService);
    notificationsGateway = module.get(NotificationsGateway);
  });

  // ── create() ──────────────────────────────────────────────────────

  describe('create()', () => {
    it('lève BadRequestException si le type est "achat" (automatique uniquement)', async () => {
      const dto = {
        type: 'achat',
        quantite: 10,
        produitId: 'prod-1',
        entrepotId: 'ent-1',
        creerParId: 'user-1',
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('crée un flux "vente" avec mise à jour du stock', async () => {
      const dto = {
        type: 'vente',
        quantite: 5,
        produitId: 'prod-1',
        entrepotId: 'ent-1',
        creerParId: 'user-1',
        note: 'Vente client',
      };

      const tx = createTx();
      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      const result = await service.create(dto as any);

      expect(result.id).toBe('flux-1');
      expect(tx.stockEntrepot.upsert).toHaveBeenCalled();
      expect(tx.fluxDeStock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'vente', quantite: 5 }),
        }),
      );
    });

    it('lève NotFoundException si lentrepôt nexiste pas', async () => {
      const dto = {
        type: 'perte',
        quantite: 5,
        produitId: 'prod-1',
        entrepotId: 'ent-inexistant',
        creerParId: 'user-1',
      };

      const tx = createTx();
      tx.entrepot.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(service.create(dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève NotFoundException si le produit nexiste pas', async () => {
      const dto = {
        type: 'perte',
        quantite: 5,
        produitId: 'prod-inexistant',
        entrepotId: 'ent-1',
        creerParId: 'user-1',
      };

      const tx = createTx();
      tx.produit.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(service.create(dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève BadRequestException si le stock local devient négatif', async () => {
      const dto = {
        type: 'vente',
        quantite: 200, // Stock local = 50, vente = 200 -> négatif
        produitId: 'prod-1',
        entrepotId: 'ent-1',
        creerParId: 'user-1',
      };

      const tx = createTx();
      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève BadRequestException si la capacité de lentrepôt est dépassée', async () => {
      const dto = {
        type: 'retour',
        quantite: 10000,
        produitId: 'prod-1',
        entrepotId: 'ent-1',
        creerParId: 'user-1',
      };

      const tx = createTx();
      // Mock aggregate to return a high current total
      // Current total = 4900, retour = 10000 -> 14900 > 5000
      tx.stockEntrepot.aggregate.mockResolvedValue({ _sum: { quantite: 4900 } });
      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('crée un flux "correction_inventaire" avec le signe conservé', async () => {
      const dto = {
        type: 'correction_inventaire',
        quantite: -5,
        produitId: 'prod-1',
        entrepotId: 'ent-1',
        creerParId: 'user-1',
      };

      const tx = createTx();
      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      const result = await service.create(dto as any);

      expect(result.id).toBe('flux-1');
      // Delta = -5 (conservé pour correction_inventaire)
      expect(tx.stockEntrepot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { quantite: { increment: -5 } },
        }),
      );
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne tous les flux de stock', async () => {
      prisma.fluxDeStock.findMany.mockResolvedValue([mockFlux]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prisma.fluxDeStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date: 'desc' } }),
      );
    });

    it('retourne un tableau vide si aucun flux', async () => {
      prisma.fluxDeStock.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('retourne le flux quand lID existe', async () => {
      prisma.fluxDeStock.findUnique.mockResolvedValue(mockFlux);

      const result = await service.findOne('flux-1');

      expect(result.id).toBe('flux-1');
      expect(result.type).toBe('vente');
    });

    it('lève NotFoundException quand lID nexiste pas', async () => {
      prisma.fluxDeStock.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── update() ──────────────────────────────────────────────────────

  describe('update()', () => {
    it('met à jour un flux avec recalcul du delta net', async () => {
      const tx = {
        fluxDeStock: {
          findUnique: jest.fn().mockResolvedValue(mockFlux),
          update: jest.fn()
            .mockResolvedValue({ ...mockFlux, quantite: 15, type: 'vente' }),
        },
        stockEntrepot: {
          findUnique: jest.fn().mockResolvedValue(mockStockEntrepot),
          upsert: jest.fn().mockResolvedValue(mockStockEntrepot),
        },
        entrepot: {
          findUnique: jest.fn().mockResolvedValue(mockEntrepot),
        },
        produit: {
          findUnique: jest.fn().mockResolvedValue(mockProduit),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );
      // For stock alert check after update
      prisma.fluxDeStock.findUnique.mockResolvedValue(mockFlux);

      const result = await service.update('flux-1', { quantite: 15 } as any);

      // Old delta: vente 10 -> -10
      // New delta: vente 15 -> -15
      // Net delta: -(-10) + (-15) = -5
      expect(tx.stockEntrepot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { quantite: { increment: -5 } },
        }),
      );
    });

    it('lève NotFoundException si le flux nexiste pas', async () => {
      const tx = {
        fluxDeStock: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(
        service.update('id-inexistant', { quantite: 5 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si achat sans commandeId', async () => {
      const existingFlux = {
        ...mockFlux,
        type: 'achat',
        commandeId: null,
      };
      const tx = {
        fluxDeStock: {
          findUnique: jest.fn().mockResolvedValue(existingFlux),
        },
        entrepot: { findUnique: jest.fn() },
        produit: { findUnique: jest.fn() },
        stockEntrepot: {
          findUnique: jest.fn(),
          upsert: jest.fn(),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(
        service.update('flux-1', { type: 'achat' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── remove() ──────────────────────────────────────────────────────

  describe('remove()', () => {
    it('supprime un flux avec inversion du delta', async () => {
      const tx = {
        fluxDeStock: {
          findUnique: jest.fn().mockResolvedValue(mockFlux),
          delete: jest.fn().mockResolvedValue(mockFlux),
        },
        stockEntrepot: {
          findUnique: jest.fn().mockResolvedValue(mockStockEntrepot),
          upsert: jest.fn().mockResolvedValue(mockStockEntrepot),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      const result = await service.remove('flux-1');

      expect(result.id).toBe('flux-1');
      // Old delta: vente 10 -> -10
      // Reversed delta: +10
      expect(tx.stockEntrepot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { quantite: { increment: 10 } },
        }),
      );
    });

    it('lève NotFoundException si le flux nexiste pas', async () => {
      const tx = {
        fluxDeStock: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(service.remove('id-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── transfert() ───────────────────────────────────────────────────

  describe('transfert()', () => {
    it('lève BadRequestException si source = destination', async () => {
      const dto = {
        produitId: 'prod-1',
        quantite: 10,
        entrepotSourceId: 'ent-1',
        entrepotDestinationId: 'ent-1', // Identique !
        creerParId: 'user-1',
      };

      await expect(service.transfert(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('réalise un transfert entre deux entrepôts', async () => {
      const tx = {
        entrepot: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ id: 'ent-1', nom: 'Source', capaciteMax: 5000 })
            .mockResolvedValueOnce({ id: 'ent-2', nom: 'Destination', capaciteMax: 5000 }),
        },
        produit: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', nom: 'Produit Test' }),
        },
        stockEntrepot: {
          findUnique: jest.fn().mockResolvedValue({ quantite: 50 }),
          update: jest.fn().mockResolvedValue({}),
          upsert: jest.fn().mockResolvedValue({}),
          aggregate: jest.fn().mockResolvedValue({ _sum: { quantite: 100 } }),
        },
        fluxDeStock: {
          create: jest
            .fn()
            .mockResolvedValueOnce({ id: 'flux-out' })
            .mockResolvedValueOnce({ id: 'flux-in' }),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      const result = await service.transfert({
        produitId: 'prod-1',
        quantite: 10,
        entrepotSourceId: 'ent-1',
        entrepotDestinationId: 'ent-2',
        creerParId: 'user-1',
      } as any);

      expect(result.fluxSortie.id).toBe('flux-out');
      expect(result.fluxEntree.id).toBe('flux-in');
      expect(tx.fluxDeStock.create).toHaveBeenCalledTimes(2);
      expect(tx.stockEntrepot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quantite: { decrement: 10 } },
        }),
      );
    });

    it('lève BadRequestException si stock source insuffisant', async () => {
      const tx = {
        entrepot: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ id: 'ent-1', nom: 'Source', capaciteMax: 5000 })
            .mockResolvedValueOnce({ id: 'ent-2', nom: 'Destination', capaciteMax: 5000 }),
        },
        produit: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prod-1', nom: 'Produit Test' }),
        },
        stockEntrepot: {
          findUnique: jest.fn().mockResolvedValue({ quantite: 5 }), // Seulement 5 en stock
          aggregate: jest.fn().mockResolvedValue({ _sum: { quantite: 100 } }),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(
        service.transfert({
          produitId: 'prod-1',
          quantite: 10,
          entrepotSourceId: 'ent-1',
          entrepotDestinationId: 'ent-2',
          creerParId: 'user-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si entrepôt source introuvable', async () => {
      const tx = {
        entrepot: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        produit: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prod-1' }),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      await expect(
        service.transfert({
          produitId: 'prod-1',
          quantite: 10,
          entrepotSourceId: 'ent-inexistant',
          entrepotDestinationId: 'ent-2',
          creerParId: 'user-1',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
