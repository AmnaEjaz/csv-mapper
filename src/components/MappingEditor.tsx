import type { ColumnMapping } from "../utils/types";

interface MappingEditorProps {
  mappings: ColumnMapping[];
  sourceColumns: string[];
  onUpdateMapping: (index: number, update: Partial<ColumnMapping>) => void;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
  manual: "bg-blue-100 text-blue-800",
};

export function MappingEditor({ mappings, sourceColumns, onUpdateMapping }: MappingEditorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center text-sm font-semibold text-gray-600 px-2 pb-2 border-b">
        <span>Target Column</span>
        <span></span>
        <span>Source Column</span>
        <span>Confidence</span>
      </div>

      {mappings.map((mapping, index) => (
        <div key={mapping.targetColumn} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center px-2 py-2 rounded hover:bg-gray-50">
          <span className="text-sm font-medium text-gray-800">{mapping.targetColumn}</span>

          <span className="text-gray-400">&larr;</span>

          <select
            className="text-sm border rounded px-2 py-1.5 bg-white"
            value={mapping.transform === "split_first" || mapping.transform === "split_last" ? `__split__${mapping.transform}__${mapping.splitSourceColumn ?? mapping.sourceColumn}` : mapping.sourceColumn ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onUpdateMapping(index, { sourceColumn: null, transform: "none", confidence: "manual" });
              } else if (val.startsWith("__split__")) {
                const parts = val.split("__");
                const transformType = parts[2] as "split_first" | "split_last";
                const col = parts[3];
                onUpdateMapping(index, {
                  sourceColumn: col,
                  splitSourceColumn: col,
                  transform: transformType,
                  confidence: "manual",
                });
              } else {
                onUpdateMapping(index, { sourceColumn: val, transform: "direct", confidence: "manual" });
              }
            }}
          >
            <option value="">-- Not mapped --</option>
            <optgroup label="Direct mapping">
              {sourceColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </optgroup>
            <optgroup label="Split (first part)">
              {sourceColumns.map((col) => (
                <option key={`sf_${col}`} value={`__split__split_first__${col}`}>
                  {col} (first name)
                </option>
              ))}
            </optgroup>
            <optgroup label="Split (last part)">
              {sourceColumns.map((col) => (
                <option key={`sl_${col}`} value={`__split__split_last__${col}`}>
                  {col} (last name)
                </option>
              ))}
            </optgroup>
          </select>

          <span className={`text-xs px-2 py-0.5 rounded-full ${CONFIDENCE_COLORS[mapping.confidence]}`}>{mapping.confidence}</span>
        </div>
      ))}
    </div>
  );
}
