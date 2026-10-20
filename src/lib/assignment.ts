import type { NtbInput } from '@/types/ntb';

/**
 * Published Google Sheets CSV holding one row per assignment (sheet "7208", gid 2057370289).
 * Override with VITE_ASSIGNMENT_CSV_URL in a .env file if the sheet changes.
 */
export const ASSIGNMENT_CSV_URL: string =
  import.meta.env.VITE_ASSIGNMENT_CSV_URL ??
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR3z4XgT6kW2hKMDmszy0KIoqGWkisr_SJelAUsRfm_7MMsue3I1Zt4Y_jUTxL22ipmE6nbrONihKSf/pub?gid=2057370289&single=true&output=csv';

/** Accepted spellings of the id column. */
const ID_COLUMNS = ['assignment_id', 'assigment_id', 'assignmentid', 'id_assignment'];

/** CSV column -> form field. */
const FIELD_MAP: Record<string, keyof NtbInput> = {
  metrik_tenaga_kerja: 'workers',
  '26a': 'wages',
  '26b': 'production',
  '26c': 'purchases',
  '26d': 'operating',
  '26e': 'nonOperating',
  '27a': 'revenue',
  '27b': 'otherRevenue',
};

/** Columns without a form field; shown for reference only. */
export const REFERENCE_COLUMNS = {
  metrik_total_pengeluaran: 'Total pengeluaran',
  metrik_nilai_tambah: 'Nilai tambah',
  metrik_total_aset: 'Total aset',
} as const;

export type ReferenceKey = keyof typeof REFERENCE_COLUMNS;

export interface AssignmentRecord {
  id: string;
  /** nama_usaha */
  name: string | null;
  /** kategori, e.g. "A" */
  category: string | null;
  /** kode_kbli padded to five digits, e.g. "1450" -> "01450" */
  kbli: string | null;
  patch: Partial<NtbInput>;
  reference: Partial<Record<ReferenceKey, number>>;
}

/** RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Reads "9000000", "9.000.000", "9,000,000", "Rp 9.000.000,50" or "1.5E7" as a whole number. */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.replace(/rp/i, '').replace(/\s/g, '');
  if (!s || s === '-') return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const normalize = (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_');

/** Builds a lookup table keyed by assignment id from the CSV text. */
export function buildIndex(csv: string): Map<string, AssignmentRecord> {
  const rows = parseCsv(csv);
  // The header is the first row that has an id column (allows title rows above it).
  const headerAt = rows.findIndex((r) => r.some((c) => ID_COLUMNS.includes(normalize(c))));
  if (headerAt < 0) throw new Error('Kolom assignment_id tidak ditemukan di CSV. Pastikan sheet yang dipublish berisi tabel data.');
  const header = rows[headerAt].map(normalize);
  const idCol = header.findIndex((h) => ID_COLUMNS.includes(h));
  const col = (name: string) => header.indexOf(name);
  const nameCol = col('nama_usaha');
  const categoryCol = col('kategori');
  const kbliCol = col('kode_kbli');
  const text = (r: string[], i: number) => (i >= 0 && r[i]?.trim() ? r[i].trim() : null);

  const index = new Map<string, AssignmentRecord>();
  for (const r of rows.slice(headerAt + 1)) {
    const id = (r[idCol] ?? '').trim();
    if (!id) continue;
    const patch: Partial<NtbInput> = {};
    const reference: AssignmentRecord['reference'] = {};
    header.forEach((h, i) => {
      if (h in FIELD_MAP) (patch as Record<string, number | null>)[FIELD_MAP[h]] = parseNumber(r[i]);
      else if (h in REFERENCE_COLUMNS) {
        const n = parseNumber(r[i]);
        if (n !== null) reference[h as ReferenceKey] = n;
      }
    });
    const kbliDigits = text(r, kbliCol)?.replace(/\D/g, '') ?? '';
    index.set(id.toLowerCase(), {
      id,
      name: text(r, nameCol),
      category: text(r, categoryCol)?.toUpperCase() ?? null,
      kbli: kbliDigits ? kbliDigits.padStart(5, '0') : null,
      patch,
      reference,
    });
  }
  return index;
}

let cache: Promise<Map<string, AssignmentRecord>> | null = null;

/** Downloads the CSV (once per session unless refresh) and finds one assignment. */
export async function findAssignment(id: string, refresh = false): Promise<AssignmentRecord | null> {
  if (!cache || refresh) {
    cache = fetch(ASSIGNMENT_CSV_URL, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal mengambil CSV (HTTP ${res.status}).`);
        return res.text();
      })
      .then(buildIndex);
    cache.catch(() => { cache = null; });
  }
  const index = await cache;
  return index.get(id.trim().toLowerCase()) ?? null;
}
