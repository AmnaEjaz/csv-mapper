export type ColumnType = "string" | "number" | "date" | "boolean" | "email" | "phone";

export interface ColumnMapping {
  targetColumn: string;
  sourceColumn: string | null;
  /** For split mappings like "Full Name" → first/last, this describes the transform */
  transform: "direct" | "split_first" | "split_last" | "none";
  /** The source column used for split transforms */
  splitSourceColumn?: string;
  confidence: "high" | "medium" | "low" | "manual";
}

export interface MappingSummary {
  totalTargetColumns: number;
  matched: number;
  unmatched: number;
  typeIssues: Array<{
    column: string;
    expectedType: ColumnType;
    invalidCount: number;
    invalidExamples: string[];
  }>;
}

export type AppStep = "upload" | "mapping" | "summary" | "download";
