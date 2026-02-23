import type { ColumnMapping } from "./types";

interface LLMResponse {
  mappings: Array<{
    targetColumn: string;
    sourceColumn: string | null;
    transform: "direct" | "split_first" | "split_last" | "none";
    splitSourceColumn?: string;
    confidence: "high" | "medium" | "low";
  }>;
}

export async function generateMappings(
  sourceColumns: string[],
  targetColumns: string[],
  sampleData: Record<string, string>[],
  apiKey: string
): Promise<ColumnMapping[]> {
  const samplePreview = sampleData.slice(0, 3);

  const prompt = `You are a CSV column mapping assistant. Given source CSV columns and target template columns, produce the best mapping.

SOURCE COLUMNS: ${JSON.stringify(sourceColumns)}

TARGET COLUMNS: ${JSON.stringify(targetColumns)}

SAMPLE DATA (first 3 rows):
${JSON.stringify(samplePreview, null, 2)}

RULES:
1. Map each target column to the best matching source column.
2. If a source column contains full names (e.g., "Full Name", "Name", "Employee Name") and the target has separate first/last name columns, use transform "split_first" for the first name target and "split_last" for the last name target, with splitSourceColumn set to that source column.
3. If no source column matches a target, set sourceColumn to null and transform to "none".
4. Consider semantic meaning, not just exact name matches. For example "Date of Birth" matches "DOB(Optional)", "Wage" matches "Hourly Rate", etc.
5. Set confidence: "high" for obvious matches, "medium" for semantic/fuzzy matches, "low" for uncertain guesses.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "mappings": [
    {
      "targetColumn": "target col name",
      "sourceColumn": "source col name or null",
      "transform": "direct|split_first|split_last|none",
      "splitSourceColumn": "only if split transform",
      "confidence": "high|medium|low"
    }
  ]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text;

  if (!content) {
    throw new Error("No response from LLM");
  }

  // Parse JSON from response, handling potential markdown wrapping
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed: LLMResponse = JSON.parse(jsonStr);

  return parsed.mappings.map((m) => ({
    targetColumn: m.targetColumn,
    sourceColumn: m.sourceColumn,
    transform: m.transform,
    splitSourceColumn: m.splitSourceColumn,
    confidence: m.confidence,
  }));
}

export function splitFullName(fullName: string, part: "first" | "last"): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return part === "first" ? parts[0] : "";
  if (part === "first") return parts.slice(0, -1).join(" ");
  return parts[parts.length - 1];
}
