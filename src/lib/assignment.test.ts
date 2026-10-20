import { describe, expect, it } from 'vitest';
import { buildIndex, parseCsv, parseNumber } from './assignment';

describe('parseNumber', () => {
  it('reads common number formats', () => {
    expect(parseNumber('9000000')).toBe(9_000_000);
    expect(parseNumber('9.000.000')).toBe(9_000_000);
    expect(parseNumber('9,000,000')).toBe(9_000_000);
    expect(parseNumber('Rp 1.250.000,50')).toBe(1_250_001);
    expect(parseNumber('1.5E7')).toBe(15_000_000);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('-')).toBeNull();
  });
});

describe('parseCsv', () => {
  it('handles quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x,1","say ""hi"""\r\n')).toEqual([['a', 'b'], ['x,1', 'say "hi"']]);
  });
});

describe('buildIndex', () => {
  // Header and first row of sheet "7208" (trimmed).
  const csv = [
    'No,assignment_id,kategori,kode_kbli,nama_usaha,metrik_tenaga_kerja,26a,26b,26c,26d,26e,metrik_total_pengeluaran,26f,26g,metrik_nilai_tambah,metrik_total_aset,link_fasih_sm,link_fasih_sm',
    '1,287c3bf8-a839-47c0-b060-3277298d2842,A,1450,UTP PETERNAKAN (I GEDE OKTAVIONA),1,0,"240,000,000",0,"1,200,000",0,"241,200,000","120,000",0,"-241,080,000",0,x,x',
  ].join('\n');

  it('maps columns to form fields, case-insensitive id', () => {
    const rec = buildIndex(csv).get('287C3BF8-A839-47C0-B060-3277298D2842'.toLowerCase())!;
    expect(rec.name).toBe('UTP PETERNAKAN (I GEDE OKTAVIONA)');
    expect(rec.category).toBe('A');
    expect(rec.kbli).toBe('01450');
    expect(rec.patch).toEqual({ workers: 1, wages: 0, production: 240_000_000, purchases: 0, operating: 1_200_000, nonOperating: 0, revenue: 120_000, otherRevenue: 0 });
    expect(rec.reference).toEqual({ metrik_total_pengeluaran: 241_200_000, metrik_nilai_tambah: -241_080_000, metrik_total_aset: 0 });
  });

  it('accepts the assigment_id spelling', () => {
    expect(buildIndex('assigment_id,26a\nX,5').get('x')?.patch.wages).toBe(5);
  });

  it('throws when there is no id column', () => {
    expect(() => buildIndex(' ,https://example.com')).toThrow(/assignment_id/);
  });
});
