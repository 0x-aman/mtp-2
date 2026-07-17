"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Save, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { extractProductFromImageAction } from "@/app/actions/imports";
import { createProductAction, uploadProductImageAction } from "@/app/actions/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OcrExtraction } from "@/lib/types";

function confidenceVariant(confidence: number) {
  if (confidence >= 90) {
    return "success" as const;
  }

  if (confidence >= 75) {
    return "warning" as const;
  }

  return "danger" as const;
}

export function OcrImportClient({ defaultSku }: { defaultSku: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sku, setSku] = useState(defaultSku);
  const [extraction, setExtraction] = useState<OcrExtraction>({
    title: "",
    brand: "",
    category: "",
    costPrice: 0,
    sellingPrice: 0,
    quantity: 1,
    confidence: 0
  });
  const [isExtracting, startExtracting] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const chooseFile = (nextFile: File) => {
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const extract = () => {
    if (!file) {
      toast.error("Choose an image first.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    startExtracting(async () => {
      const result = await extractProductFromImageAction(formData);

      if (!result.ok || !result.data) {
        toast.error(result.message);
        return;
      }

      setExtraction(result.data);
      toast.success(result.message);
    });
  };

  const updateExtraction = (key: keyof OcrExtraction, value: string) => {
    setExtraction((current) => ({
      ...current,
      [key]: key === "title" || key === "brand" || key === "category" ? value : Number(value)
    }));
  };

  const createProduct = () => {
    startSaving(async () => {
      let imageUrl = "";

      if (file) {
        const formData = new FormData();
        formData.set("file", file);
        const upload = await uploadProductImageAction(formData);
        if (upload.ok && upload.data) {
          imageUrl = upload.data.imageUrl;
        }
      }

      const result = await createProductAction({
        title: extraction.title,
        sku,
        brand: extraction.brand,
        category: extraction.category,
        description: "Created from AI image extraction.",
        costPrice: extraction.costPrice,
        sellingPrice: extraction.sellingPrice,
        quantity: extraction.quantity,
        reorderLevel: 5,
        isMachine: false,
        defaultRentDeposit: 0,
        defaultDailyRent: 0,
        imageUrl
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push("/products");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Image Upload</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label
            className="flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40 p-4 text-center transition-colors hover:bg-muted"
            onDrop={(event) => {
              event.preventDefault();
              const nextFile = event.dataTransfer.files?.[0];
              if (nextFile) {
                chooseFile(nextFile);
              }
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-72 w-full object-contain" />
            ) : (
              <>
                <ImageUp className="mb-3 size-8 text-muted-foreground" />
                <span className="font-medium">Drop a product box, label, or invoice image</span>
                <span className="mt-1 text-sm text-muted-foreground">Editable preview appears after extraction.</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const nextFile = event.target.files?.[0];
                if (nextFile) {
                  chooseFile(nextFile);
                }
              }}
            />
          </label>
          <Button type="button" onClick={extract} disabled={isExtracting || !file}>
            {isExtracting ? <Loader2 className="animate-spin" /> : <ScanLine />}
            Extract Product
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            Extracted Product
            <Badge variant={confidenceVariant(extraction.confidence)}>{extraction.confidence}% confidence</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {extraction.confidence < 75 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Review and complete fields manually before creating this product.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="ocrTitle">Product Title</Label>
              <Input id="ocrTitle" value={extraction.title} onChange={(event) => updateExtraction("title", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ocrSku">SKU</Label>
              <Input id="ocrSku" value={sku} onChange={(event) => setSku(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ocrBrand">Brand</Label>
              <Input id="ocrBrand" value={extraction.brand} onChange={(event) => updateExtraction("brand", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ocrCategory">Category</Label>
              <Input id="ocrCategory" value={extraction.category} onChange={(event) => updateExtraction("category", event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ocrQuantity">Quantity</Label>
              <Input
                id="ocrQuantity"
                type="number"
                min={0}
                value={extraction.quantity}
                onChange={(event) => updateExtraction("quantity", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ocrCostPrice">Cost Price</Label>
              <Input
                id="ocrCostPrice"
                type="number"
                min={0}
                value={extraction.costPrice}
                onChange={(event) => updateExtraction("costPrice", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ocrSellingPrice">Selling Price</Label>
              <Input
                id="ocrSellingPrice"
                type="number"
                min={0}
                value={extraction.sellingPrice}
                onChange={(event) => updateExtraction("sellingPrice", event.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={createProduct} disabled={isSaving || !extraction.title || !sku}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
              Create Product
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
