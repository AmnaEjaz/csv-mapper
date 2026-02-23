import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ColumnMapping } from "./types";
import { splitFullName } from "./llm";
import { normalizeValue } from "./normalize";
import type { ColumnType } from "./types";

function isSpreadsheet(file: File): boolean {
  return /\.(xlsx|xls|ods)$/i.test(file.name);
}

function parseXlsx(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Use raw: false to get formatted/display values (e.g., dates as "17/09/1986" not serial numbers)
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });

        if (jsonData.length === 0) {
          // Try to at least get headers from empty sheet
          const headerRow = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? [];
          resolve({ headers: headerRow.map(String), data: [] });
          return;
        }

        const headers = Object.keys(jsonData[0]);
        const data = jsonData.map((row) => {
          const stringRow: Record<string, string> = {};
          for (const key of headers) {
            stringRow[key] = row[key] != null ? String(row[key]) : "";
          }
          return stringRow;
        });

        resolve({ headers, data });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function parseCsvFile(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
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

export function parseFile(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  if (isSpreadsheet(file)) {
    return parseXlsx(file);
  }
  // CSV, TSV, TXT — PapaParse auto-detects delimiters
  return parseCsvFile(file);
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
