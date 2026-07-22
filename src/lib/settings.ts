import { prisma } from "@/lib/db";
import { defaultDisplaySettings, shopDetails } from "@/lib/app-config";
import type { DisplaySettings } from "@/lib/types";

export { defaultDisplaySettings, shopDetails };

export async function getDisplaySettings(): Promise<DisplaySettings> {
  try {
    const settings = await prisma.appSetting.upsert({
      where: {
        id: "app"
      },
      update: {},
      create: defaultDisplaySettings
    });

    return {
      showCostPrice: settings.showCostPrice,
      showMargin: settings.showMargin
    };
  } catch {
    return defaultDisplaySettings;
  }
}
