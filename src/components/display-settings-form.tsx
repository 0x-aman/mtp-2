"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateDisplaySettingsAction } from "@/app/actions/settings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DisplaySettings } from "@/lib/types";

function PreferenceRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {checked ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </span>
        <div className="min-w-0">
          <Label className="text-sm font-medium">{title}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  );
}

export function DisplaySettingsForm({ settings }: { settings: DisplaySettings }) {
  const [values, setValues] = useState(settings);
  const [isPending, startTransition] = useTransition();

  const save = (nextValues: DisplaySettings) => {
    setValues(nextValues);
    startTransition(async () => {
      const result = await updateDisplaySettingsAction(nextValues);

      if (!result.ok) {
        setValues(values);
        toast.error(result.message);
        return;
      }

      if (result.data) {
        setValues(result.data);
      }

      toast.success(result.message);
    });
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Internal values</p>
          <p className="text-xs text-muted-foreground">Controls inventory and sales insight visibility.</p>
        </div>
        {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <PreferenceRow
        title="Show cost price"
        description="Show purchase cost and stock value in internal screens."
        checked={values.showCostPrice}
        disabled={isPending}
        onCheckedChange={(showCostPrice) => save({ ...values, showCostPrice })}
      />
      <PreferenceRow
        title="Show margin and profit"
        description="Show margin percentage, gross profit, and profit reports."
        checked={values.showMargin}
        disabled={isPending}
        onCheckedChange={(showMargin) => save({ ...values, showMargin })}
      />
    </div>
  );
}
