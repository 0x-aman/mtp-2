"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const customValue = "__custom__";

export function OptionSelectInput({
  id,
  label,
  value,
  options,
  placeholder,
  optionalMark,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  optionalMark?: React.ReactNode;
  onChange: (value: string) => void;
}) {
  const sortedOptions = Array.from(new Set(options.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const usesCustomValue = Boolean(value) && !sortedOptions.includes(value);
  const [customInputOpen, setCustomInputOpen] = useState(usesCustomValue);
  const showCustomInput = usesCustomValue || customInputOpen;
  const selectValue = showCustomInput ? customValue : value || undefined;

  useEffect(() => {
    if (usesCustomValue) {
      setCustomInputOpen(true);
    }
  }, [usesCustomValue]);

  useEffect(() => {
    if (value && !usesCustomValue) {
      setCustomInputOpen(false);
    }
  }, [usesCustomValue, value]);

  const handleSelect = (nextValue: string) => {
    if (nextValue === customValue) {
      setCustomInputOpen(true);
      onChange("");
      return;
    }

    setCustomInputOpen(false);
    onChange(nextValue);
  };

  if (!sortedOptions.length) {
    return (
      <div className="grid gap-2">
        <Label htmlFor={id} className="flex items-center gap-1.5">
          {label} {optionalMark}
        </Label>
        <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-select`} className="flex items-center gap-1.5">
        {label} {optionalMark}
      </Label>
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger id={`${id}-select`}>
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent>
          {sortedOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value={customValue}>Custom</SelectItem>
        </SelectContent>
      </Select>
      {showCustomInput ? (
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        />
      ) : null}
    </div>
  );
}
