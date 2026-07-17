"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = `${id}-suggestions`;
  const sortedOptions = useMemo(
    () => Array.from(new Set(options.filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [options]
  );
  const query = value.trim().toLowerCase();
  const filteredOptions = useMemo(
    () =>
      sortedOptions
        .filter((option) => !query || option.toLowerCase().includes(query))
        .sort((a, b) => {
          if (!query) {
            return a.localeCompare(b);
          }

          const aStarts = a.toLowerCase().startsWith(query);
          const bStarts = b.toLowerCase().startsWith(query);

          if (aStarts !== bStarts) {
            return aStarts ? -1 : 1;
          }

          return a.localeCompare(b);
        })
        .slice(0, 8),
    [query, sortedOptions]
  );
  const showSuggestions = open && sortedOptions.length > 0;

  useEffect(() => {
    setActiveIndex(filteredOptions.length ? 0 : -1);
  }, [filteredOptions]);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(Boolean(sortedOptions.length));
      setActiveIndex((current) => (filteredOptions.length ? (current + 1) % filteredOptions.length : -1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(Boolean(sortedOptions.length));
      setActiveIndex((current) =>
        filteredOptions.length ? (current <= 0 ? filteredOptions.length - 1 : current - 1) : -1
      );
      return;
    }

    if (event.key === "Enter") {
      if (open) {
        event.preventDefault();
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          selectOption(filteredOptions[activeIndex]);
        } else {
          setOpen(false);
        }
        return;
      }

      setOpen(false);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative grid gap-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {label} {optionalMark}
      </Label>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showSuggestions}
        aria-activedescendant={activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined}
        autoComplete="off"
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(Boolean(sortedOptions.length));
        }}
        onFocus={() => setOpen(Boolean(sortedOptions.length))}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {showSuggestions ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md"
        >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => (
              <button
                key={option}
                id={`${id}-suggestion-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full items-center rounded-sm px-2 py-1.5 text-left outline-none",
                  index === activeIndex ? "bg-muted text-foreground" : "hover:bg-muted"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-2 py-1.5 text-muted-foreground">Press Enter to keep "{value.trim()}"</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
