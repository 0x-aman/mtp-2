import type { OcrExtraction } from "@/lib/types";

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    brand: { type: "string" },
    category: { type: "string" },
    costPrice: { type: "number" },
    sellingPrice: { type: "number" },
    quantity: { type: "number" },
    confidence: { type: "number", minimum: 0, maximum: 100 }
  },
  required: ["title", "brand", "category", "costPrice", "sellingPrice", "quantity", "confidence"]
};

function coerceExtraction(value: Partial<OcrExtraction>): OcrExtraction {
  return {
    title: value.title ?? "",
    brand: value.brand ?? "",
    category: value.category ?? "",
    costPrice: Number(value.costPrice ?? 0),
    sellingPrice: Number(value.sellingPrice ?? 0),
    quantity: Number(value.quantity ?? 1),
    confidence: Number(value.confidence ?? 0)
  };
}

function readOutputText(response: unknown) {
  const data = response as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (data.output_text) {
    return data.output_text;
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text" && content.text)?.text ?? ""
  );
}

export async function extractProductFromImage(file: File): Promise<OcrExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_VISION_MODEL;

  if (!apiKey || apiKey.includes("replace") || !model || model.includes("replace")) {
    return {
      title: "",
      brand: "",
      category: "",
      costPrice: 0,
      sellingPrice: 0,
      quantity: 1,
      confidence: 0
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Extract inventory fields from this power tools product image, box, label, or supplier invoice. Return only the requested JSON."
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "high"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "product_inventory_extraction",
          strict: true,
          schema: extractionSchema
        }
      },
      store: false
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "OpenAI extraction failed.");
  }

  const json = await response.json();
  const outputText = readOutputText(json);

  if (!outputText) {
    throw new Error("OpenAI did not return structured extraction text.");
  }

  return coerceExtraction(JSON.parse(outputText) as Partial<OcrExtraction>);
}
