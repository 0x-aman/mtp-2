import { prisma } from "@/lib/db";

let ensureTablePromise: Promise<void> | null = null;

async function createBackupSnapshotTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BackupSnapshot" (
      "id" TEXT NOT NULL,
      "deviceId" TEXT NOT NULL,
      "snapshotDate" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "dataHash" TEXT NOT NULL,
      "appVersion" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,

      CONSTRAINT "BackupSnapshot_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "BackupSnapshot_deviceId_snapshotDate_key"
    ON "BackupSnapshot"("deviceId", "snapshotDate");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BackupSnapshot_deviceId_createdAt_idx"
    ON "BackupSnapshot"("deviceId", "createdAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BackupSnapshot_createdAt_idx"
    ON "BackupSnapshot"("createdAt");
  `);
}

export async function ensureBackupSnapshotTable() {
  ensureTablePromise ??= createBackupSnapshotTable();

  try {
    await ensureTablePromise;
  } catch (error) {
    ensureTablePromise = null;
    throw error;
  }
}

export function snapshotTableErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Backup failed.";

  if (message.toLowerCase().includes("permission denied")) {
    return "BackupSnapshot table is missing and the database user cannot create it. Run `npx prisma db push` once against this Postgres database.";
  }

  return message;
}
