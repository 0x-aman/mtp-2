"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import type { ActionResult, DisplaySettings } from "@/lib/types";
import { displaySettingsSchema } from "@/lib/validation";

const revalidatedPaths = ["/", "/more", "/settings", "/analytics", "/sales", "/bill"];

export async function updateDisplaySettingsAction(input: DisplaySettings): Promise<ActionResult<DisplaySettings>> {
  const parsed = displaySettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid display settings."
    };
  }

  try {
    const settings = await prisma.appSetting.upsert({
      where: {
        id: "app"
      },
      update: parsed.data,
      create: {
        id: "app",
        ...parsed.data
      }
    });

    for (const route of revalidatedPaths) {
      revalidatePath(route);
    }

    return {
      ok: true,
      message: "Display settings saved.",
      data: {
        showCostPrice: settings.showCostPrice,
        showMargin: settings.showMargin
      }
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Error
          ? error.message
          : "Unable to save display settings."
    };
  }
}
