import type { MappingSummary } from "../utils/types";

interface SummaryProps {
  summary: MappingSummary;
  onApprove: () => void;
  onBack: () => void;
}

export function Summary({ summary, onApprove, onBack }: SummaryProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-3xl font-bold text-gray-800">{summary.totalTargetColumns}</div>
          <div className="text-sm text-gray-500 mt-1">Total Columns</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{summary.matched}</div>
          <div className="text-sm text-gray-500 mt-1">Matched</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-3xl font-bold text-red-500">{summary.unmatched}</div>
          <div className="text-sm text-gray-500 mt-1">Unmatched</div>
        </div>
      </div>

      {summary.typeIssues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-3">Type Validation Warnings</h3>
          <div className="space-y-3">
            {summary.typeIssues.map((issue) => (
              <div key={issue.column} className="text-sm">
                <div className="font-medium text-yellow-700">
                  {issue.column}{" "}
                  <span className="font-normal text-yellow-600">
                    (expected: {issue.expectedType}, {issue.invalidCount} invalid)
                  </span>
                </div>
                {issue.invalidExamples.length > 0 && (
                  <div className="text-yellow-600 mt-1 ml-4">
                    Examples: {issue.invalidExamples.map((e) => `"${e}"`).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.unmatched > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-700">
            {summary.unmatched} column{summary.unmatched > 1 ? "s" : ""} could not be mapped. These will be empty in the output CSV.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          Back to Mapping
        </button>
        <button onClick={onApprove} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Approve &amp; Download CSV
        </button>
      </div>
    </div>
  );
}
