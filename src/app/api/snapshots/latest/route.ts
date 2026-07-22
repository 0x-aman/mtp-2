import { NextResponse } from "next/server";

import { ensureBackupSnapshotTable, snapshotTableErrorMessage } from "@/lib/backup-snapshot-table";
import { prisma } from "@/lib/db";
import { getPostgresConfigError } from "@/lib/server-db-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const configError = getPostgresConfigError();

  if (configError) {
    return NextResponse.json(
      {
        ok: false,
        message: configError
      },
      {
        status: 503
      }
    );
  }

  try {
    await ensureBackupSnapshotTable();

    const snapshot = await prisma.backupSnapshot.findFirst({
      orderBy: {
        updatedAt: "desc"
      }
    });

    if (!snapshot) {
      return NextResponse.json(
        {
          ok: false,
          message: "No backup snapshot found."
        },
        {
          status: 404
        }
      );
    }

    return NextResponse.json({
      ok: true,
      snapshot: JSON.parse(snapshot.data),
      dataHash: snapshot.dataHash,
      deviceId: snapshot.deviceId,
      snapshotDate: snapshot.snapshotDate,
      updatedAt: snapshot.updatedAt.toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: snapshotTableErrorMessage(error)
      },
      {
        status: 503
      }
    );
  }
}
