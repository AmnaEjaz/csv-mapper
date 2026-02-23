interface DataPreviewProps {
  data: Record<string, string>[];
  columns: string[];
  title: string;
  maxRows?: number;
}

export function DataPreview({ data, columns, title, maxRows = 5 }: DataPreviewProps) {
  const previewData = data.slice(0, maxRows);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b">
        <h4 className="text-sm font-medium text-gray-700">
          {title} ({data.length} rows)
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap border-b">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                    {row[col] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > maxRows && <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t">Showing {maxRows} of {data.length} rows</div>}
    </div>
  );
}
