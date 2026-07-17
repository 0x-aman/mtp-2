"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createMachineAction, updateMachineAction } from "@/app/actions/products";
import { OptionSelectInput } from "@/components/option-select-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductRecord } from "@/lib/types";
import { machineSchema, type MachineInput } from "@/lib/validation";

function fieldValue(value: string | null | undefined) {
  return value ?? "";
}

function OptionalMark() {
  return <span className="text-xs font-normal text-muted-foreground">(optional)</span>;
}

export function MachineForm({
  machine,
  defaultSku,
  brands = [],
  categories = []
}: {
  machine?: ProductRecord | null;
  defaultSku: string;
  brands?: string[];
  categories?: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<MachineInput>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      title: machine?.title ?? "",
      brand: fieldValue(machine?.brand),
      category: fieldValue(machine?.category),
      description: fieldValue(machine?.description),
      quantity: machine?.quantity ?? 1,
      defaultRentDeposit: machine?.defaultRentDeposit ?? 0,
      defaultDailyRent: machine?.defaultDailyRent ?? 0,
      imageUrl: fieldValue(machine?.imageUrl)
    }
  });
  const brand = form.watch("brand") ?? "";
  const category = form.watch("category") ?? "";

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = machine ? await updateMachineAction(machine.id, values) : await createMachineAction(values);

      if (!result.ok) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (messages?.[0]) {
              form.setError(field as keyof MachineInput, {
                message: messages[0]
              });
            }
          });
        }

        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push("/rent");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5 pb-20 sm:pb-0">
      <Card>
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
          <CardTitle>Machine Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-2 sm:p-5 sm:pt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="title">Machine Name</Label>
              <Input id="title" {...form.register("title")} placeholder="Bosch Impact Drill GSB 13 RE" />
              {form.formState.errors.title ? (
                <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={machine?.sku ?? defaultSku} readOnly className="bg-muted/60" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">Available Quantity</Label>
              <Input id="quantity" type="number" min={0} {...form.register("quantity", { valueAsNumber: true })} />
              {form.formState.errors.quantity ? (
                <p className="text-xs text-red-600">{form.formState.errors.quantity.message}</p>
              ) : null}
            </div>

            <OptionSelectInput
              id="brand"
              label="Brand"
              value={brand}
              options={brands}
              placeholder="Bosch"
              optionalMark={<OptionalMark />}
              onChange={(value) => form.setValue("brand", value, { shouldDirty: true })}
            />

            <OptionSelectInput
              id="category"
              label="Category"
              value={category}
              options={categories}
              placeholder="Drills"
              optionalMark={<OptionalMark />}
              onChange={(value) => form.setValue("category", value, { shouldDirty: true })}
            />

            <div className="grid gap-2">
              <Label htmlFor="defaultRentDeposit">Default Deposit</Label>
              <Input
                id="defaultRentDeposit"
                type="number"
                min={0}
                step="0.01"
                {...form.register("defaultRentDeposit", { valueAsNumber: true })}
              />
              {form.formState.errors.defaultRentDeposit ? (
                <p className="text-xs text-red-600">{form.formState.errors.defaultRentDeposit.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="defaultDailyRent">Daily Rent</Label>
              <Input
                id="defaultDailyRent"
                type="number"
                min={0}
                step="0.01"
                {...form.register("defaultDailyRent", { valueAsNumber: true })}
              />
              {form.formState.errors.defaultDailyRent ? (
                <p className="text-xs text-red-600">{form.formState.errors.defaultDailyRent.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="description" className="flex items-center gap-1.5">
                Notes <OptionalMark />
              </Label>
              <Textarea id="description" {...form.register("description")} placeholder="Accessories or condition notes" />
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
          {machine ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
