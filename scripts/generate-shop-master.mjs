import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const inputPath = resolve('/Users/apple/Desktop/taskgame/docs/paid_shop_item_master_draft.csv');
const outputPath = resolve('/Users/apple/Desktop/taskgame/lib/game/shopMaster.generated.ts');

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  return rows;
}

const csv = readFileSync(inputPath, 'utf8');
const [headerRow, ...dataRows] = parseCsv(csv);
const headers = headerRow.map((header) => header.trim());

const rows = dataRows
  .map((columns) => Object.fromEntries(headers.map((header, index) => [header, (columns[index] ?? '').trim()])))
  .filter((row) => row.item_id);

const content = `export type ShopMasterRow = {\n${headers.map((header) => `  ${header}: string;`).join('\n')}\n};\n\nexport const SHOP_MASTER_ROWS: ShopMasterRow[] = ${JSON.stringify(rows, null, 2)} as const;\n\nexport const SHOP_MASTER_BY_ID = Object.fromEntries(\n  SHOP_MASTER_ROWS.map((row) => [row.item_id, row])\n) as Record<string, ShopMasterRow>;\n`;

writeFileSync(outputPath, content);
console.log(`Generated ${outputPath}`);
