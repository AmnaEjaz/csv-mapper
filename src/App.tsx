import { useState, useCallback } from "react";
import { FileUploader } from "./components/FileUploader";
import { MappingEditor } from "./components/MappingEditor";
import { Summary } from "./components/Summary";
import { DataPreview } from "./components/DataPreview";
import { parseFile, applyMappings, generateCsv, downloadCsv } from "./utils/csv";
import { generateMappingsLocal } from "./utils/llm";
import { validateColumnType } from "./utils/normalize";
import type { ColumnMapping, MappingSummary, AppStep, ColumnType } from "./utils/types";

const INFERRED_COLUMN_TYPES: Record<string, ColumnType> = {
  email: "email",
  "e-mail": "email",
  dob: "date",
  "date of birth": "date",
  birthday: "date",
  "birth date": "date",
  "visa expiry": "date",
  "expiry date": "date",
  "start date": "date",
  "end date": "date",
  "hours per week": "number",
  "hourly rate": "number",
  salary: "number",
  rate: "number",
  hours: "number",
  wage: "number",
  sponsored: "boolean",
  "currently sponsored": "boolean",
  phone: "phone",
  "phone number": "phone",
  telephone: "phone",
  mobile: "phone",
  tel: "phone",
  "contact number": "phone",
};

function inferColumnType(columnName: string): ColumnType {
  const lower = columnName.toLowerCase().replace(/\(optional\)/gi, "").trim();
  for (const [key, type] of Object.entries(INFERRED_COLUMN_TYPES)) {
    if (lower === key || lower.includes(key)) return type;
  }
  return "string";
}

export function App() {
  const [step, setStep] = useState<AppStep>("upload");

  // Template state
  const [templateColumns, setTemplateColumns] = useState<string[]>([]);
  const [templateFileName, setTemplateFileName] = useState("");

  // Source state
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [sourceData, setSourceData] = useState<Record<string, string>[]>([]);
  const [sourceFileName, setSourceFileName] = useState("");

  // Mapping state
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isMapping, setIsMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateUpload = useCallback(async (file: File) => {
    try {
      const { headers } = await parseFile(file);
      setTemplateColumns(headers);
      setTemplateFileName(file.name);
      setError(null);
    } catch {
      setError("Failed to parse template CSV. Please check the file format.");
    }
  }, []);

  const handleUseDefaultTemplate = useCallback(async () => {
    try {
      const response = await fetch("./templates/bulk_import_template.csv");
      if (!response.ok) throw new Error("Failed to fetch default template");
      const blob = await response.blob();
      const file = new File([blob], "bulk_import_template.csv", { type: "text/csv" });
      const { headers } = await parseFile(file);
      setTemplateColumns(headers);
      setTemplateFileName("bulk_import_template.csv (default)");
      setError(null);
    } catch {
      setError("Failed to load default template.");
    }
  }, []);

  const handleSourceUpload = useCallback(async (file: File) => {
    try {
      const { headers, data } = await parseFile(file);
      setSourceColumns(headers);
      setSourceData(data);
      setSourceFileName(file.name);
      setError(null);
    } catch {
      setError("Failed to parse source CSV. Please check the file format.");
    }
  }, []);

  const handleStartMapping = useCallback(() => {
    setIsMapping(true);
    setError(null);

    try {
      const result = generateMappingsLocal(sourceColumns, templateColumns);
      setMappings(result);
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate mappings.");
    } finally {
      setIsMapping(false);
    }
  }, [sourceColumns, templateColumns]);

  const handleUpdateMapping = useCallback((index: number, update: Partial<ColumnMapping>) => {
    setMappings((prev) => prev.map((m, i) => (i === index ? { ...m, ...update } : m)));
  }, []);

  const computeSummary = useCallback((): MappingSummary => {
    const matched = mappings.filter((m) => m.sourceColumn && m.transform !== "none").length;
    const unmatched = mappings.length - matched;

    const columnTypes: Record<string, ColumnType> = {};
    for (const col of templateColumns) {
      columnTypes[col] = inferColumnType(col);
    }

    const typeIssues: MappingSummary["typeIssues"] = [];

    for (const mapping of mappings) {
      if (!mapping.sourceColumn || mapping.transform === "none") continue;

      const type = columnTypes[mapping.targetColumn];
      if (type === "string") continue;

      const sourceCol = mapping.splitSourceColumn ?? mapping.sourceColumn;
      const values = sourceData.map((row) => row[sourceCol] ?? "");
      const result = validateColumnType(values, type);

      if (result.invalid > 0) {
        typeIssues.push({
          column: mapping.targetColumn,
          expectedType: type,
          invalidCount: result.invalid,
          invalidExamples: result.invalidExamples,
        });
      }
    }

    return {
      totalTargetColumns: mappings.length,
      matched,
      unmatched,
      typeIssues,
    };
  }, [mappings, sourceData, templateColumns]);

  const handleDownload = useCallback(() => {
    const columnTypes: Record<string, ColumnType> = {};
    for (const col of templateColumns) {
      columnTypes[col] = inferColumnType(col);
    }

    const mappedData = applyMappings(sourceData, mappings, columnTypes);
    const csvString = generateCsv(mappedData, templateColumns);
    const baseName = sourceFileName.replace(/\.[^.]+$/, "");
    downloadCsv(csvString, `mapped_${baseName}.csv`);
  }, [sourceData, mappings, templateColumns, sourceFileName]);

  const canStartMapping = templateColumns.length > 0 && sourceColumns.length > 0 && sourceData.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">CSV Mapper</h1>
        <p className="text-gray-500 mt-1">Upload a template and source CSV, then smart-match columns automatically.</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-500 hover:text-red-700 font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(["upload", "mapping", "summary"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-gray-300" />}
            <div
              className={`px-3 py-1 rounded-full font-medium ${
                step === s ? "bg-blue-600 text-white" : step > s ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FileUploader
                label="Upload Target Template"
                description="CSV, XLSX, ODS, or TSV file with your target column headers"
                onFileSelected={handleTemplateUpload}
                isLoaded={templateColumns.length > 0}
                loadedFileName={templateFileName}
                accept=".csv,.xlsx,.xls,.ods,.tsv,.txt"
              />
              <button
                onClick={handleUseDefaultTemplate}
                className="w-full py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Or use default Borderless bulk import template
              </button>
            </div>
            <FileUploader
              label="Upload Source File"
              description="CSV, XLSX, ODS, or TSV file with data to map"
              onFileSelected={handleSourceUpload}
              isLoaded={sourceData.length > 0}
              loadedFileName={sourceFileName}
              accept=".csv,.xlsx,.xls,.ods,.tsv,.txt"
            />
          </div>

          {templateColumns.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Template columns ({templateColumns.length})</h3>
              <div className="flex flex-wrap gap-1.5">
                {templateColumns.map((col) => (
                  <span key={col} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sourceData.length > 0 && <DataPreview data={sourceData} columns={sourceColumns} title="Source Data Preview" />}

          <button
            onClick={handleStartMapping}
            disabled={!canStartMapping || isMapping}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isMapping ? "Mapping columns..." : "Map Columns"}
          </button>
        </div>
      )}

      {/* STEP 2: Mapping */}
      {step === "mapping" && (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Column Mapping</h2>
            <p className="text-sm text-gray-500 mb-4">Review the auto-matched mappings. Use the dropdowns to change any mapping manually.</p>
            <MappingEditor mappings={mappings} sourceColumns={sourceColumns} onUpdateMapping={handleUpdateMapping} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("upload")}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep("summary")}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Review Summary
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Summary */}
      {step === "summary" && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Mapping Summary</h2>
          <Summary summary={computeSummary()} onApprove={handleDownload} onBack={() => setStep("mapping")} />

          {/* Preview of mapped data */}
          {(() => {
            const columnTypes: Record<string, ColumnType> = {};
            for (const col of templateColumns) {
              columnTypes[col] = inferColumnType(col);
            }
            const preview = applyMappings(sourceData.slice(0, 5), mappings, columnTypes);
            return <DataPreview data={preview} columns={templateColumns} title="Output Preview" />;
          })()}
        </div>
      )}
    </div>
  );
}
