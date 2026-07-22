import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await prisma.backupSnapshot.findFirst({
      orderBy: {
        createdAt: "desc"
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
      snapshot: JSON.parse(snapshot.data)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Cloud restore failed."
      },
      {
        status: 503
      }
    );
  }
}
