function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  values.push(current);
  return values;
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    return row;
  });
}

export async function loadCsv(path: string): Promise<Record<string, string>[]> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${path}`);
  }
  const text = await response.text();
  return parseCsv(text);
}

export function toBool(value: string): boolean {
  return value.toUpperCase() === "TRUE";
}

export function toNum(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
