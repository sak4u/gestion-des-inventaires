import { Test, TestingModule } from '@nestjs/testing';
import { CommandeService } from './commande.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PredictionService } from '../ai/prediction/prediction.service';
import { PropositionCommandeService } from '../proposition-commande/proposition-commande.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EtatCommande, TypeCommande } from '@prisma/client';

describe('CommandeService', () => {
  let service: CommandeService;
  let prisma: any;
  let mailService: jest.Mocked<MailService>;
  let notificationsGateway: jest.Mocked<NotificationsGateway>;

  // ── Mock data ─────────────────────────────────────────────────────

  const mockCommande = {
    id: 'cmd-1',
    type: TypeCommande.ACHAT,
    etat: EtatCommande.EN_COURS,
    dateCreation: new Date(),
    updatedAt: new Date(),
    userId: 'user-1',
    fournisseurId: 'four-1',
    entrepotId: 'ent-1',
    propositionId: null,
    user: { id: 'user-1', name: 'Admin Test', email: 'admin@email.com' },
    fournisseur: { id: 'four-1', nom: 'Fournisseur Test', email: 'four@test.com' },
    entrepot: { id: 'ent-1', nom: 'Entrepôt Test', capaciteMax: 5000 },
    commandesLigne: [
      {
        id: 'ligne-1',
        quantite: 10,
        prixUnitaire: 50.0,
        commandeId: 'cmd-1',
        produitId: 'prod-1',
        produit: { id: 'prod-1', nom: 'Produit Test', prixAchatMoyen: 45.0 },
      },
    ],
    fluxDeStocks: [],
  };

  const mockStockEntrepot = {
    id: 'stock-1',
    quantite: 20,
    produitId: 'prod-1',
    entrepotId: 'ent-1',
  };

  const mockProduit = {
    id: 'prod-1',
    nom: 'Produit Test',
    stockAlert: 5,
    prixAchatMoyen: 45.0,
  };

  // ── Test module setup ─────────────────────────────────────────────

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandeService,
        {
          provide: PrismaService,
          useValue: {
            commande: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            stockEntrepot: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              aggregate: jest.fn(),
            },
            produit: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            fluxDeStock: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendResetCode: jest.fn().mockResolvedValue(undefined),
            sendCommandeNotification: jest.fn().mockResolvedValue(undefined),
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
      ],
    }).compile();

    service = module.get<CommandeService>(CommandeService);
    prisma = module.get(PrismaService);
    mailService = module.get(MailService);
    notificationsGateway = module.get(NotificationsGateway);
  });

  // ── create() ──────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée et retourne une commande avec les données fournies', async () => {
      const dto = {
        type: TypeCommande.ACHAT,
        userId: 'user-1',
        fournisseurId: 'four-1',
        entrepotId: 'ent-1',
      };

      prisma.commande.create.mockResolvedValue(mockCommande);

      const result = await service.create(dto as any);

      expect(result.id).toBe('cmd-1');
      expect(result.type).toBe(TypeCommande.ACHAT);
      expect(prisma.commande.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('lève BadRequestException si ACHAT sans fournisseurId', async () => {
      const dto = {
        type: TypeCommande.ACHAT,
        userId: 'user-1',
        entrepotId: 'ent-1',
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève BadRequestException si ACHAT sans entrepotId', async () => {
      const dto = {
        type: TypeCommande.ACHAT,
        userId: 'user-1',
        fournisseurId: 'four-1',
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepte une commande VENTE sans fournisseurId ni entrepotId', async () => {
      const dto = {
        type: TypeCommande.VENTE,
        userId: 'user-1',
      };

      prisma.commande.create.mockResolvedValue({
        ...mockCommande,
        type: TypeCommande.VENTE,
        fournisseurId: null,
        entrepotId: null,
      });

      const result = await service.create(dto as any);

      expect(result.type).toBe(TypeCommande.VENTE);
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('retourne toutes les commandes sans filtre', async () => {
      prisma.commande.findMany.mockResolvedValue([mockCommande]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prisma.commande.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { dateCreation: 'desc' },
        }),
      );
    });

    it('filtre par type ACHAT', async () => {
      prisma.commande.findMany.mockResolvedValue([mockCommande]);

      const result = await service.findAll(TypeCommande.ACHAT);

      expect(result).toHaveLength(1);
      expect(prisma.commande.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: TypeCommande.ACHAT },
        }),
      );
    });

    it('filtre par etat EN_COURS', async () => {
      const ventesEnCours = [{ ...mockCommande, etat: EtatCommande.EN_COURS }];
      prisma.commande.findMany.mockResolvedValue(ventesEnCours);

      const result = await service.findAll(undefined, EtatCommande.EN_COURS);

      expect(prisma.commande.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { etat: EtatCommande.EN_COURS },
        }),
      );
    });

    it('retourne un tableau vide si aucune commande', async () => {
      prisma.commande.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });
  });

  // ── findOne() ─────────────────────────────────────────────────────

  describe('findOne()', () => {
    it("retourne la commande quand l'ID existe", async () => {
      prisma.commande.findUnique.mockResolvedValue(mockCommande);

      const result = await service.findOne('cmd-1');

      expect(result.id).toBe('cmd-1');
      expect(result.fournisseur.nom).toBe('Fournisseur Test');
    });

    it("lève NotFoundException quand l'ID n'existe pas", async () => {
      prisma.commande.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getFinancialStats() ───────────────────────────────────────────

  describe('getFinancialStats()', () => {
    it('calcule les statistiques financières à partir des ventes livrées', async () => {
      const deliveredSale = {
        ...mockCommande,
        type: TypeCommande.VENTE,
        etat: EtatCommande.LIVREE,
        commandesLigne: [
          {
            quantite: 10,
            prixUnitaire: 100.0,
            produit: { prixAchatMoyen: 45.0 },
          },
        ],
      };

      prisma.commande.findMany.mockResolvedValue([deliveredSale]);

      const result = await service.getFinancialStats();

      // revenue = 10 * 100 = 1000
      // cogs = 10 * 45 = 450
      // profit = 1000 - 450 = 550
      // margin = (550 / 1000) * 100 = 55
      expect(result.revenue).toBe(1000);
      expect(result.cogs).toBe(450);
      expect(result.profit).toBe(550);
      expect(result.margin).toBeCloseTo(55, 10);
    });

    it('retourne des stats à zéro si aucune vente livrée', async () => {
      prisma.commande.findMany.mockResolvedValue([]);

      const result = await service.getFinancialStats();

      expect(result.revenue).toBe(0);
      expect(result.cogs).toBe(0);
      expect(result.profit).toBe(0);
      expect(result.margin).toBe(0);
    });
  });

  // ── update() ──────────────────────────────────────────────────────

  describe('update()', () => {
    it("lève NotFoundException si la commande n'existe pas", async () => {
      prisma.commande.findUnique.mockResolvedValue(null);

      await expect(
        service.update('id-inexistant', { etat: EtatCommande.FERMEE } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si la commande est déjà LIVREE', async () => {
      prisma.commande.findUnique.mockResolvedValue({
        ...mockCommande,
        etat: EtatCommande.LIVREE,
      });

      await expect(
        service.update('cmd-1', { etat: EtatCommande.ANNULEE } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si la commande est déjà ANNULEE', async () => {
      prisma.commande.findUnique.mockResolvedValue({
        ...mockCommande,
        etat: EtatCommande.ANNULEE,
      });

      await expect(
        service.update('cmd-1', { etat: EtatCommande.EN_COURS } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('passe la commande à LIVREE avec flux de stock et alertes', async () => {
      prisma.commande.findUnique.mockResolvedValue(mockCommande);

      // Mock $transaction to execute the callback with a mock tx
      const tx = {
        commande: {
          findUnique: jest.fn().mockResolvedValue(mockCommande),
          update: jest.fn().mockResolvedValue({ ...mockCommande, etat: EtatCommande.LIVREE }),
        },
        stockEntrepot: {
          findUnique: jest.fn().mockResolvedValue(mockStockEntrepot),
          upsert: jest.fn().mockResolvedValue(mockStockEntrepot),
          aggregate: jest.fn().mockResolvedValue({ _sum: { quantite: 50 } }),
        },
        produit: {
          findUnique: jest.fn().mockResolvedValue(mockProduit),
          update: jest.fn().mockResolvedValue(mockProduit),
        },
        fluxDeStock: {
          create: jest.fn().mockResolvedValue({ id: 'flux-1' }),
        },
      };

      prisma.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(tx),
      );

      const result = await service.update('cmd-1', {
        etat: EtatCommande.LIVREE,
      } as any);

      expect(result.etat).toBe(EtatCommande.LIVREE);
      // Vérifie que les alertes de stock ont été déclenchées
      expect(notificationsGateway.alertCommandeLivree).toHaveBeenCalledWith(
        'cmd-1',
      );
    });

    it('met à jour les champs standards (ex: FERMEE) et envoie un email', async () => {
      prisma.commande.findUnique.mockResolvedValue(mockCommande);
      prisma.commande.update.mockResolvedValue({
        ...mockCommande,
        etat: EtatCommande.FERMEE,
      });

      const result = await service.update('cmd-1', {
        etat: EtatCommande.FERMEE,
      } as any);

      expect(result.etat).toBe(EtatCommande.FERMEE);
      // Vérifie que l'email est envoyé pour FERMEE
      expect(mailService.sendCommandeNotification).toHaveBeenCalled();
    });

    it("met à jour une commande sans envoyer d'email si pas FERMEE", async () => {
      prisma.commande.findUnique.mockResolvedValue(mockCommande);
      prisma.commande.update.mockResolvedValue(mockCommande);

      await service.update('cmd-1', { entrepotId: 'ent-2' } as any);

      expect(mailService.sendCommandeNotification).not.toHaveBeenCalled();
    });
  });

  // ── remove() ──────────────────────────────────────────────────────

  describe('remove()', () => {
    it("lève NotFoundException si la commande n'existe pas", async () => {
      prisma.commande.findUnique.mockResolvedValue(null);

      await expect(service.remove('id-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève BadRequestException si la commande est LIVREE', async () => {
      prisma.commande.findUnique.mockResolvedValue({
        ...mockCommande,
        etat: EtatCommande.LIVREE,
      });

      await expect(service.remove('cmd-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('supprime et retourne la commande si elle existe et modifiable', async () => {
      prisma.commande.findUnique.mockResolvedValue(mockCommande);
      prisma.commande.delete.mockResolvedValue(mockCommande);

      const result = await service.remove('cmd-1');

      expect(result.id).toBe('cmd-1');
      expect(prisma.commande.delete).toHaveBeenCalledWith({
        where: { id: 'cmd-1' },
      });
    });
  });
});
