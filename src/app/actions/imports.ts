"use server";

import { extractProductFromImage } from "@/lib/ai-extract";
import type { ActionResult, OcrExtraction } from "@/lib/types";

export async function extractProductFromImageAction(
  formData: FormData
): Promise<ActionResult<OcrExtraction>> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      message: "Choose an image to analyze."
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      message: "Upload a product box, label, or invoice image."
    };
  }

  try {
    const extraction = await extractProductFromImage(file);

    return {
      ok: true,
      message:
        extraction.confidence >= 90
          ? "High-confidence extraction ready."
          : extraction.confidence >= 75
            ? "Review the extracted values before creating a product."
            : "Low-confidence extraction. Manual entry is required.",
      data: extraction
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Image extraction failed."
    };
  }
}
