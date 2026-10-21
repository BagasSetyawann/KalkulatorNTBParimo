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
  /** 1-based row number in the sheet (header row = 1), useful to tell duplicates apart. */
  row: number;
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

/** Same business data (ignores id/row), used to collapse rows that are exact copies. */
const fingerprint = (r: AssignmentRecord) =>
  JSON.stringify([r.name?.toLowerCase() ?? null, r.category, r.kbli, r.patch, r.reference]);

/**
 * Builds a lookup table keyed by lower-cased assignment id from the CSV text.
 * An id may appear on several rows in the sheet, so each key holds every distinct record
 * (rows that are exact copies of an earlier row are collapsed), in sheet order.
 */
export function buildIndex(csv: string): Map<string, AssignmentRecord[]> {
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

  const index = new Map<string, AssignmentRecord[]>();
  const seen = new Map<string, Set<string>>();
  rows.slice(headerAt + 1).forEach((r, offset) => {
    const id = (r[idCol] ?? '').trim();
    if (!id) return;
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
    const record: AssignmentRecord = {
      id,
      row: headerAt + offset + 2,
      name: text(r, nameCol),
      category: text(r, categoryCol)?.toUpperCase() ?? null,
      kbli: kbliDigits ? kbliDigits.padStart(5, '0') : null,
      patch,
      reference,
    };
    const key = id.toLowerCase();
    const fp = fingerprint(record);
    const prints = seen.get(key) ?? new Set<string>();
    if (prints.has(fp)) return;
    prints.add(fp);
    seen.set(key, prints);
    const list = index.get(key);
    if (list) list.push(record);
    else index.set(key, [record]);
  });
  return index;
}

let cache: Promise<Map<string, AssignmentRecord[]>> | null = null;

/**
 * Downloads the CSV (once per session unless refresh) and returns every record with this id
 * (empty when not found, more than one when the id is duplicated in the sheet).
 */
export async function findAssignment(id: string, refresh = false): Promise<AssignmentRecord[]> {
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
  return index.get(id.trim().toLowerCase()) ?? [];
}
