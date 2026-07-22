import { NextResponse } from "next/server";

import { ensureBackupSnapshotTable, snapshotTableErrorMessage } from "@/lib/backup-snapshot-table";
import { prisma } from "@/lib/db";
import { getPostgresConfigError } from "@/lib/server-db-config";

export const dynamic = "force-dynamic";

function snapshotKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
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
    const body = (await request.json()) as {
      deviceId?: string;
      snapshot?: unknown;
      dataHash?: string;
    };

    if (!body.deviceId || !body.snapshot) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing backup payload."
        },
        {
          status: 400
        }
      );
    }

    await ensureBackupSnapshotTable();

    await prisma.backupSnapshot.upsert({
      where: {
        deviceId_snapshotDate: {
          deviceId: body.deviceId,
          snapshotDate: snapshotKey()
        }
      },
      create: {
        deviceId: body.deviceId,
        snapshotDate: snapshotKey(),
        data: JSON.stringify(body.snapshot),
        dataHash: body.dataHash ?? "",
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null
      },
      update: {
        data: JSON.stringify(body.snapshot),
        dataHash: body.dataHash ?? "",
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null
      }
    });

    return NextResponse.json({
      ok: true
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
