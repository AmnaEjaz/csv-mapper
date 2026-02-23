import Papa from "papaparse";
import type { ColumnMapping } from "./types";
import { splitFullName } from "./llm";
import { normalizeValue } from "./normalize";
import type { ColumnType } from "./types";

export function parseCsv(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const data = results.data as Record<string, string>[];
        resolve({ headers, data });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

export function applyMappings(
  sourceData: Record<string, string>[],
  mappings: ColumnMapping[],
  columnTypes: Record<string, ColumnType>
): Record<string, string>[] {
  return sourceData.map((row) => {
    const newRow: Record<string, string> = {};

    for (const mapping of mappings) {
      const type = columnTypes[mapping.targetColumn] ?? "string";

      if (mapping.transform === "none" || !mapping.sourceColumn) {
        newRow[mapping.targetColumn] = "";
        continue;
      }

      if (mapping.transform === "direct") {
        const rawValue = row[mapping.sourceColumn] ?? "";
        newRow[mapping.targetColumn] = normalizeValue(rawValue, type);
        continue;
      }

      if (mapping.transform === "split_first" || mapping.transform === "split_last") {
        const sourceCol = mapping.splitSourceColumn ?? mapping.sourceColumn;
        const rawValue = row[sourceCol] ?? "";
        const part = mapping.transform === "split_first" ? "first" : "last";
        newRow[mapping.targetColumn] = normalizeValue(splitFullName(rawValue, part), type);
        continue;
      }

      newRow[mapping.targetColumn] = "";
    }

    return newRow;
  });
}

export function generateCsv(data: Record<string, string>[], columns: string[]): string {
  return Papa.unparse(data, { columns });
}

export function downloadCsv(csvString: string, filename: string): void {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
