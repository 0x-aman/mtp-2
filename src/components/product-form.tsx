"use client";

import { useMemo, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createProductAction,
  updateProductAction
} from "@/app/actions/products";
import { OptionSelectInput } from "@/components/option-select-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductFormOptions, ProductFormSuggestion, ProductRecord } from "@/lib/types";
import { calculateMarginPercent, formatCurrency } from "@/lib/utils";
import { productSchema, type ProductInput } from "@/lib/validation";

function fieldValue(value: string | null | undefined) {
  return value ?? "";
}

const emptyFormOptions: ProductFormOptions = {
  brands: [],
  categories: [],
  products: [],
  skus: [],
  titles: []
};

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function OptionalMark() {
  return <span className="text-xs font-normal text-muted-foreground">(optional)</span>;
}

export function ProductForm({
  product,
  defaultSku,
  formOptions = emptyFormOptions
}: {
  product?: ProductRecord | null;
  defaultSku: string;
  formOptions?: ProductFormOptions;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title ?? "",
      sku: product?.sku ?? defaultSku,
      brand: fieldValue(product?.brand),
      category: fieldValue(product?.category),
      description: fieldValue(product?.description),
      costPrice: product?.costPrice ?? 0,
      sellingPrice: product?.sellingPrice ?? 0,
      quantity: product?.quantity ?? 0,
      reorderLevel: product?.reorderLevel ?? 5,
      isMachine: product?.isMachine ?? false,
      defaultRentDeposit: product?.defaultRentDeposit ?? 0,
      defaultDailyRent: product?.defaultDailyRent ?? 0,
      imageUrl: fieldValue(product?.imageUrl)
    }
  });

  const costPrice = form.watch("costPrice");
  const sellingPrice = form.watch("sellingPrice");
  const brand = form.watch("brand") ?? "";
  const category = form.watch("category") ?? "";
  const margin = useMemo(
    () => calculateMarginPercent(Number(costPrice), Number(sellingPrice)),
    [costPrice, sellingPrice]
  );

  const skuOptions = useMemo(() => uniqueOptions([defaultSku, ...formOptions.skus]), [defaultSku, formOptions.skus]);

  const findSuggestion = (field: "title" | "sku", value: string): ProductFormSuggestion | undefined => {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
      return undefined;
    }

    return formOptions.products.find((item) => item[field].trim().toLowerCase() === normalizedValue);
  };

  const applySuggestion = (field: "title" | "sku", value: string) => {
    if (product) {
      return;
    }

    const suggestion = findSuggestion(field, value);

    if (!suggestion) {
      return;
    }

    if (field === "sku") {
      form.setValue("title", suggestion.title, { shouldDirty: true });
    }

    form.setValue("brand", fieldValue(suggestion.brand), { shouldDirty: true });
    form.setValue("category", fieldValue(suggestion.category), { shouldDirty: true });
    form.setValue("costPrice", suggestion.costPrice, { shouldDirty: true });
    form.setValue("sellingPrice", suggestion.sellingPrice, { shouldDirty: true });
    form.setValue("quantity", suggestion.quantity, { shouldDirty: true });
  };

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const nextValues: ProductInput = {
        ...values,
        reorderLevel: product?.reorderLevel ?? values.reorderLevel ?? 5,
        isMachine: false,
        defaultRentDeposit: 0,
        defaultDailyRent: 0,
        imageUrl: product?.imageUrl ?? values.imageUrl ?? ""
      };

      const result = product
        ? await updateProductAction(product.id, nextValues)
        : await createProductAction(nextValues);

      if (!result.ok) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (messages?.[0]) {
              form.setError(field as keyof ProductInput, {
                message: messages[0]
              });
            }
          });
        }

        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push(product ? `/products/${product.id}` : "/");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5 pb-20 sm:pb-0">
      <Card>
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-2 sm:p-5 sm:pt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="title">Product Title</Label>
              <Input
                id="title"
                list="product-title-options"
                {...form.register("title", {
                  onBlur: (event) => applySuggestion("title", event.target.value)
                })}
                placeholder="Rainbow Cutting Blade"
              />
              <datalist id="product-title-options">
                {formOptions.titles.map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
              {form.formState.errors.title ? (
                <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                list="product-sku-options"
                {...form.register("sku", {
                  onBlur: (event) => applySuggestion("sku", event.target.value)
                })}
              />
              <datalist id="product-sku-options">
                {skuOptions.map((sku) => (
                  <option key={sku} value={sku} />
                ))}
              </datalist>
              {form.formState.errors.sku ? (
                <p className="text-xs text-red-600">{form.formState.errors.sku.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min={0} {...form.register("quantity", { valueAsNumber: true })} />
              {form.formState.errors.quantity ? (
                <p className="text-xs text-red-600">{form.formState.errors.quantity.message}</p>
              ) : null}
            </div>

            <OptionSelectInput
              id="brand"
              label="Brand"
              value={brand}
              options={formOptions.brands}
              placeholder="Powerbilt"
              optionalMark={<OptionalMark />}
              onChange={(value) => form.setValue("brand", value, { shouldDirty: true })}
            />

            <OptionSelectInput
              id="category"
              label="Category"
              value={category}
              options={formOptions.categories}
              placeholder="Cutting Blades"
              optionalMark={<OptionalMark />}
              onChange={(value) => form.setValue("category", value, { shouldDirty: true })}
            />

            <div className="grid gap-2">
              <Label htmlFor="costPrice">Cost Price</Label>
              <Input
                id="costPrice"
                type="number"
                min={0}
                step="0.01"
                {...form.register("costPrice", { valueAsNumber: true })}
              />
              {form.formState.errors.costPrice ? (
                <p className="text-xs text-red-600">{form.formState.errors.costPrice.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sellingPrice">Selling Price</Label>
              <Input
                id="sellingPrice"
                type="number"
                min={0}
                step="0.01"
                {...form.register("sellingPrice", { valueAsNumber: true })}
              />
              {form.formState.errors.sellingPrice ? (
                <p className="text-xs text-red-600">{form.formState.errors.sellingPrice.message}</p>
              ) : null}
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Margin</p>
                <p className="text-lg font-semibold">{margin}%</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Profit per unit: {formatCurrency(Math.max(0, Number(sellingPrice) - Number(costPrice)))}
              </p>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="description" className="flex items-center gap-1.5">
                Description <OptionalMark />
              </Label>
              <Textarea id="description" {...form.register("description")} placeholder="Notes for this item" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-[calc(4.2rem+env(safe-area-inset-bottom))] z-20 -mx-2.5 grid grid-cols-2 gap-2 border-t bg-background/95 p-2.5 backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? <Loader2 className="animate-spin" /> : <Save />}
          {product ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
