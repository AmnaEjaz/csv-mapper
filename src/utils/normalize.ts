import type { ColumnType } from "./types";

/**
 * Normalization utilities for cleaning and coercing CSV values.
 * IMPORTANT: These are applied only to the OUTPUT data, never to the source.
 */

export function cleanValue(value: string): string {
  let cleaned = value.trim();
  cleaned = cleaned.replace(/,+$/, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  return cleaned;
}

export function normalizeDate(value: string): string {
  const cleaned = cleanValue(value);
  if (!cleaned) return "";

  const parsedDate = new Date(cleaned);
  if (!isNaN(parsedDate.getTime())) {
    const day = String(parsedDate.getDate()).padStart(2, "0");
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const year = parsedDate.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const parts = cleaned.split(/[/\-.]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (c.length === 4) {
      return `${a.padStart(2, "0")}/${b.padStart(2, "0")}/${c}`;
    }
    if (a.length === 4) {
      return `${c.padStart(2, "0")}/${b.padStart(2, "0")}/${a}`;
    }
  }

  return cleaned;
}

export function normalizeNumber(value: string): string {
  const cleaned = cleanValue(value);
  if (!cleaned) return "";
  const numStr = cleaned.replace(/[$€£¥,]/g, "").trim();
  const parsed = parseFloat(numStr);
  if (!isNaN(parsed)) return String(parsed);
  return cleaned;
}

export function normalizeBoolean(value: string): string {
  const cleaned = cleanValue(value).toLowerCase();
  if (!cleaned) return "";
  if (["yes", "true", "1", "y", "on"].includes(cleaned)) return "Yes";
  if (["no", "false", "0", "n", "off"].includes(cleaned)) return "No";
  return cleanValue(value);
}

export function normalizeEmail(value: string): string {
  return cleanValue(value).toLowerCase();
}

export function normalizeValue(value: string, type: ColumnType): string {
  switch (type) {
    case "date":
      return normalizeDate(value);
    case "number":
      return normalizeNumber(value);
    case "boolean":
      return normalizeBoolean(value);
    case "email":
      return normalizeEmail(value);
    case "string":
    default:
      return cleanValue(value);
  }
}

export interface TypeValidationResult {
  valid: number;
  invalid: number;
  invalidExamples: string[];
}

export function validateColumnType(values: string[], type: ColumnType): TypeValidationResult {
  let valid = 0;
  let invalid = 0;
  const invalidExamples: string[] = [];

  for (const raw of values) {
    const cleaned = cleanValue(raw);
    if (!cleaned) {
      valid++;
      continue;
    }

    let isValid = true;
    switch (type) {
      case "number": {
        const numStr = cleaned.replace(/[$€£¥,]/g, "").trim();
        isValid = !isNaN(parseFloat(numStr));
        break;
      }
      case "date": {
        const parsed = new Date(cleaned);
        const manualParts = cleaned.split(/[/\-.]/).map((p) => p.trim());
        isValid = !isNaN(parsed.getTime()) || manualParts.length === 3;
        break;
      }
      case "boolean": {
        const lower = cleaned.toLowerCase();
        isValid = ["yes", "true", "1", "y", "on", "no", "false", "0", "n", "off"].includes(lower);
        break;
      }
      case "email":
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
        break;
      case "string":
        isValid = true;
        break;
    }

    if (isValid) {
      valid++;
    } else {
      invalid++;
      if (invalidExamples.length < 3) invalidExamples.push(raw);
    }
  }

  return { valid, invalid, invalidExamples };
}
