import type { ColumnMapping } from "./types";

/**
 * Local fuzzy column matching — no API key required.
 * Uses string similarity + synonym tables + smart split detection.
 */

const SYNONYMS: Record<string, string[]> = {
  "given names": ["first name", "first names", "given name", "forename", "forenames", "christian name"],
  "family name": ["last name", "surname", "family names", "last names"],
  email: ["e-mail", "email address", "e-mail address", "mail"],
  "dob(optional)": ["dob", "date of birth", "birth date", "birthday", "birthdate", "d.o.b", "d.o.b."],
  "phone(optional)": ["phone", "phone number", "telephone", "tel", "mobile", "mobile number", "cell", "contact number"],
  role: ["position", "job role", "employment role"],
  band: ["level", "grade", "tier", "classification"],
  "job title": ["title", "position title", "designation", "occupation"],
  "site id": ["site", "location id", "site code", "workplace id", "location", "work site"],
  "other sites(optional)": ["other sites", "additional sites", "secondary sites", "other locations"],
  "hours per week": ["weekly hours", "hours/week", "work hours", "hrs per week", "hours"],
  "hourly rate": ["rate", "pay rate", "wage", "hourly pay", "hourly wage", "rate per hour", "salary rate"],
  "current visa type": ["visa type", "visa", "visa category", "visa subclass", "visa class"],
  "currently sponsored": ["sponsored", "is sponsored", "sponsorship", "sponsor status", "sponsorship status"],
  "current visa expiry date": [
    "visa expiry",
    "visa expiry date",
    "visa expiration",
    "visa expiration date",
    "visa end date",
    "expiry date",
    "visa expires",
  ],
  "employment start date": ["start date", "employment date", "hire date", "date started", "commencement date", "joining date", "date of hire"],
};

/** Columns that suggest full name data which can be split */
const NAME_INDICATORS = [
  "full name",
  "name",
  "employee name",
  "worker name",
  "candidate name",
  "applicant name",
  "person name",
  "staff name",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Jaccard similarity on words
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

function findSynonymMatch(targetCol: string, sourceCol: string): number {
  const targetNorm = normalize(targetCol);
  const sourceNorm = normalize(sourceCol);

  const synonymList = SYNONYMS[targetNorm];
  if (!synonymList) return 0;

  for (const syn of synonymList) {
    const synNorm = normalize(syn);
    if (sourceNorm === synNorm) return 0.95;
    if (sourceNorm.includes(synNorm) || synNorm.includes(sourceNorm)) return 0.8;
  }

  return 0;
}

function isNameColumn(col: string): boolean {
  const norm = normalize(col);
  return NAME_INDICATORS.some((indicator) => norm === normalize(indicator) || norm.includes(normalize(indicator)));
}

function confidenceFromScore(score: number): "high" | "medium" | "low" {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

export function generateMappingsLocal(sourceColumns: string[], targetColumns: string[]): ColumnMapping[] {
  const usedSourceColumns = new Set<string>();
  const mappings: ColumnMapping[] = [];

  // First pass: find a name column that could be split
  const nameSourceCol = sourceColumns.find((col) => isNameColumn(col));
  const hasGivenTarget = targetColumns.some((t) => normalize(t).includes("given"));
  const hasFamilyTarget = targetColumns.some((t) => normalize(t).includes("family"));

  for (const targetCol of targetColumns) {
    let bestSource: string | null = null;
    let bestScore = 0;
    let bestTransform: ColumnMapping["transform"] = "direct";
    let splitSource: string | undefined;

    // Check for name splitting
    if (nameSourceCol && !usedSourceColumns.has(`__split_${nameSourceCol}`)) {
      const targetNorm = normalize(targetCol);
      if (hasGivenTarget && (targetNorm.includes("given") || targetNorm.includes("first name"))) {
        bestSource = nameSourceCol;
        bestScore = 0.9;
        bestTransform = "split_first";
        splitSource = nameSourceCol;
      } else if (hasFamilyTarget && (targetNorm.includes("family") || targetNorm.includes("last name") || targetNorm.includes("surname"))) {
        bestSource = nameSourceCol;
        bestScore = 0.9;
        bestTransform = "split_last";
        splitSource = nameSourceCol;
      }
    }

    // Check direct and synonym matches
    for (const sourceCol of sourceColumns) {
      if (usedSourceColumns.has(sourceCol)) continue;

      const directScore = similarity(targetCol, sourceCol);
      const synonymScore = findSynonymMatch(targetCol, sourceCol);
      const score = Math.max(directScore, synonymScore);

      if (score > bestScore) {
        bestScore = score;
        bestSource = sourceCol;
        bestTransform = "direct";
        splitSource = undefined;
      }
    }

    if (bestScore >= 0.3 && bestSource) {
      mappings.push({
        targetColumn: targetCol,
        sourceColumn: bestSource,
        transform: bestTransform,
        splitSourceColumn: splitSource,
        confidence: confidenceFromScore(bestScore),
      });

      // Don't mark split source as fully used — it maps to two targets
      if (bestTransform === "direct") {
        usedSourceColumns.add(bestSource);
      }
    } else {
      mappings.push({
        targetColumn: targetCol,
        sourceColumn: null,
        transform: "none",
        confidence: "low",
      });
    }
  }

  return mappings;
}

export function splitFullName(fullName: string, part: "first" | "last"): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return part === "first" ? parts[0] : "";
  if (part === "first") return parts.slice(0, -1).join(" ");
  return parts[parts.length - 1];
}
