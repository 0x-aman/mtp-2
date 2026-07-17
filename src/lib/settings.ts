import { prisma } from "@/lib/db";
import type { DisplaySettings, ShopDetails } from "@/lib/types";

export const defaultDisplaySettings: DisplaySettings = {
  showCostPrice: true,
  showMargin: true
};

export const shopDetails: ShopDetails = {
  name: "Mahalakshmi Power Tools",
  address: "Hayatnagar Bus Stand, opposite to Srinivasa Hospital, Veerabhadra Colony",
  contact: "8309-024-275"
};

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
