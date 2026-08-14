"use client";

import {
  useMemo,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
} from "react";

interface FormattedNumberInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max"
  > {
  value: number;
  onValueChange: (value: number) => void;
  maxFractionDigits?: number;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  emptyWhenZero?: boolean;
}

function parseNumber(value: string, maxFractionDigits: number) {
  let normalized = value.trim().replace(/\s/g, "");
  if (maxFractionDigits === 0) {
    normalized = normalized.replace(/[^0-9-]/g, "");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = normalized.replace(/,/g, "");
  }
  normalized = normalized.replace(/(?!^)-/g, "").replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function FormattedNumberInput({
  value,
  onValueChange,
  maxFractionDigits = 0,
  min,
  max,
  allowNegative = false,
  emptyWhenZero = true,
  onBlur,
  onFocus,
  ...props
}: FormattedNumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [editingValue, setEditingValue] = useState("");
  const formattedValue = useMemo(() => {
    if (emptyWhenZero && value === 0) {
      return "";
    }
    return new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: maxFractionDigits,
    }).format(value);
  }, [emptyWhenZero, maxFractionDigits, value]);

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    setIsFocused(true);
    setEditingValue(value === 0 && emptyWhenZero ? "" : String(value));
    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    setIsFocused(false);
    onBlur?.(event);
  }

  return (
    <input
      {...props}
      type="text"
      inputMode={maxFractionDigits > 0 ? "decimal" : "numeric"}
      value={isFocused && maxFractionDigits > 0 ? editingValue : formattedValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(event) => {
        const rawValue = event.target.value;
        setEditingValue(rawValue);
        let nextValue = parseNumber(rawValue, maxFractionDigits);
        if (!allowNegative) {
          nextValue = Math.max(0, nextValue);
        }
        if (min !== undefined && nextValue !== 0) {
          nextValue = Math.max(min, nextValue);
        }
        if (max !== undefined) {
          nextValue = Math.min(max, nextValue);
        }
        onValueChange(nextValue);
      }}
    />
  );
}
