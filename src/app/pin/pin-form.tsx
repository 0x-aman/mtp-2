"use client";

import { useActionState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
      Unlock Inventory
    </Button>
  );
}

export function PinForm({ next }: { next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-2">
        <Label htmlFor="pin">4-digit PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          pattern="[0-9]{4}"
          maxLength={4}
          className="text-center text-xl font-semibold"
          autoFocus
        />
      </div>
      {state.error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
