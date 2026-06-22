/**
 * migrate-stock-entrepot.ts
 *
 * Data migration script: Populates the StockEntrepot table
 * by replaying all existing FluxDeStock records.
 *
 * This is a one-time script. Run it ONCE after deploying the
 * new schema (after `prisma db push` / `prisma migrate deploy`).
 *
 * How it works:
 *   1. Fetch all FluxDeStock records (ordered chronologically)
 *   2. Apply the same delta logic as FluxDeStockService:
 *        vente, perte         → negative delta (outgoing)
 *        achat, retour        → positive delta (incoming)
 *        correction_inventaire→ signed as-is
 *   3. Group by (produitId × entrepotId) and accumulate the balance
 *   4. Upsert each balance into StockEntrepot (idempotent — safe to re-run)
 *
 * Usage (from the backend/ directory):
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-stock-entrepot.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Same delta logic as FluxDeStockService.computeDelta() ────────
const OUTGOING = ['vente', 'perte'];
const INCOMING = ['achat', 'retour'];

function computeDelta(type: string, quantite: number): number {
  if (OUTGOING.includes(type)) return -Math.abs(quantite);
  if (INCOMING.includes(type)) return Math.abs(quantite);
  // correction_inventaire: keep sign as provided
  return quantite;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log(' StockEntrepot — Data Migration');
  console.log('='.repeat(60));

  // Step 1: Fetch all flux records ordered chronologically
  console.log('\n[1/4] Fetching all FluxDeStock records...');
  const fluxList = await prisma.fluxDeStock.findMany({
    select: {
      id: true,
      produitId: true,
      entrepotId: true,
      type: true,
      quantite: true,
      date: true,
    },
    orderBy: { date: 'asc' }, // Chronological order matters for correctness
  });

  console.log(`      → ${fluxList.length} records found.`);

  if (fluxList.length === 0) {
    console.log('\n✅ No FluxDeStock records. Nothing to migrate.');
    return;
  }

  // Step 2: Accumulate balance per (produitId, entrepotId) pair
  console.log('\n[2/4] Computing balances per (produit × entrepôt)...');

  // Key format: "produitId::entrepotId"
  const balanceMap = new Map<
    string,
    { produitId: string; entrepotId: string; quantite: number }
  >();

  for (const flux of fluxList) {
    const key = `${flux.produitId}::${flux.entrepotId}`;
    const delta = computeDelta(flux.type, flux.quantite);

    if (balanceMap.has(key)) {
      balanceMap.get(key)!.quantite += delta;
    } else {
      balanceMap.set(key, {
        produitId: flux.produitId,
        entrepotId: flux.entrepotId,
        quantite: delta,
      });
    }
  }

  console.log(`      → ${balanceMap.size} unique (produit × entrepôt) pairs computed.`);

  // Step 3: Clamp negative balances to 0 and warn
  console.log('\n[3/4] Validating balances (clamping negatives to 0)...');
  let warningCount = 0;

  for (const [key, entry] of balanceMap.entries()) {
    if (entry.quantite < 0) {
      console.warn(
        `  ⚠ Negative balance detected for pair [${key}]: ` +
          `${entry.quantite} → clamped to 0. ` +
          `(Data inconsistency in FluxDeStock history)`,
      );
      entry.quantite = 0;
      warningCount++;
    }
  }

  if (warningCount === 0) {
    console.log('      → All balances are valid (non-negative).');
  } else {
    console.warn(`      → ${warningCount} pair(s) had negative balances and were clamped.`);
  }

  // Step 4: Upsert all balances into StockEntrepot
  console.log('\n[4/4] Upserting into StockEntrepot...');

  const entries = Array.from(balanceMap.values());
  let upsertedCount = 0;
  let errorCount = 0;

  // Process sequentially to avoid connection pool exhaustion on large datasets
  for (const entry of entries) {
    try {
      await prisma.stockEntrepot.upsert({
        where: {
          produitId_entrepotId: {
            produitId: entry.produitId,
            entrepotId: entry.entrepotId,
          },
        },
        create: {
          produitId: entry.produitId,
          entrepotId: entry.entrepotId,
          quantite: entry.quantite,
        },
        update: {
          quantite: entry.quantite, // Overwrite with recomputed value
        },
      });
      upsertedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `  ✗ Failed to upsert [${entry.produitId} × ${entry.entrepotId}]: ${msg}`,
      );
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(' Migration Summary');
  console.log('='.repeat(60));
  console.log(`  FluxDeStock processed : ${fluxList.length}`);
  console.log(`  Pairs computed        : ${balanceMap.size}`);
  console.log(`  StockEntrepot upserted: ${upsertedCount}`);
  if (warningCount > 0)
    console.log(`  Warnings (clamped)    : ${warningCount}`);
  if (errorCount > 0)
    console.log(`  Errors                : ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n✅ Migration completed successfully!');
  } else {
    console.error(
      `\n⚠ Migration completed with ${errorCount} error(s). Check logs above.`,
    );
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('\n❌ Fatal error during migration:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
