import { XMLParser } from 'fast-xml-parser';

const OJS_BASE = 'https://ojs.univsm.ac.id';
const OAI = `${OJS_BASE}/index/oai`;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export type OjsJurnal = { kode: string; nama: string; url: string };
export type OjsArtikel = {
  id: string;
  jurnal_kode: string;
  judul: string;
  penulis: string;
  tanggal: string | null;
  tahun: number | null;
  issue: string;
  url: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  textNodeName: '#text',
  isArray: (name) => name === 'record' || name === 'set',
});

function toArray<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

// Ekstrak teks dari node yang bisa berupa string, {'#text',...}, atau array
function textOf(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    for (const n of node) { const t = textOf(n); if (t) return t; }
    return '';
  }
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)['#text'] ?? '').trim();
  }
  return '';
}

function normalizeDate(s: string): string | null {
  if (!s) return null;
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const y = s.match(/(\d{4})/);
  if (y) return `${y[1]}-01-01`;
  return null;
}

async function fetchOai(params: string): Promise<string> {
  const res = await fetch(`${OAI}?${params}`, {
    headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,*/*' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`OJS OAI HTTP ${res.status}`);
  return res.text();
}

export function parseSets(xml: string): OjsJurnal[] {
  const doc = parser.parse(xml) as Record<string, any>;
  const sets = toArray(doc?.['OAI-PMH']?.ListSets?.set);
  const out: OjsJurnal[] = [];
  const seen = new Set<string>();
  for (const s of sets) {
    const spec = textOf(s?.setSpec) || String(s?.setSpec ?? '');
    if (!spec || spec.includes(':')) continue; // hanya set tingkat-jurnal (tanpa ':')
    const kode = spec.trim();
    if (seen.has(kode)) continue;
    seen.add(kode);
    out.push({ kode, nama: textOf(s?.setName) || kode, url: `${OJS_BASE}/${kode}` });
  }
  return out;
}

export function parseRecordsPage(xml: string): { artikel: OjsArtikel[]; resumptionToken: string | null } {
  const doc = parser.parse(xml) as Record<string, any>;
  const lr = doc?.['OAI-PMH']?.ListRecords;
  const records = toArray(lr?.record);
  const artikel: OjsArtikel[] = [];
  for (const rec of records) {
    if (rec?.header?.['@_status'] === 'deleted') continue;
    const md = rec?.metadata?.dc;
    if (!md) continue;
    const id = String(rec?.header?.identifier ?? '').trim();
    if (!id) continue;
    const specRaw = textOf(rec?.header?.setSpec) || String(rec?.header?.setSpec ?? '');
    const jurnal_kode = specRaw.split(':')[0].trim();
    if (!jurnal_kode) continue;
    const judul = toArray(md.title).map(textOf).find(Boolean) ?? '';
    if (!judul) continue;
    const penulis = toArray(md.creator).map(textOf).filter(Boolean).join('; ');
    const tanggal = normalizeDate(toArray(md.date).map(textOf).find(Boolean) ?? '');
    const tahun = tanggal ? Number(tanggal.slice(0, 4)) : null;
    const source = toArray(md.source).map(textOf).find(Boolean) ?? '';
    const issue = source.includes(';') ? source.slice(source.indexOf(';') + 1).trim() : source.trim();
    const url = toArray(md.identifier).map(textOf).find((s) => s.startsWith('http')) ?? '';
    artikel.push({ id, jurnal_kode, judul, penulis, tanggal, tahun, issue, url });
  }
  const rtNode = lr?.resumptionToken;
  const rt = textOf(rtNode) || (typeof rtNode === 'string' ? rtNode.trim() : '');
  return { artikel, resumptionToken: rt || null };
}

export async function harvestOjs(): Promise<{ jurnal: OjsJurnal[]; artikel: OjsArtikel[] }> {
  const jurnal = parseSets(await fetchOai('verb=ListSets'));
  const artikel: OjsArtikel[] = [];
  const seenIds = new Set<string>();
  let params = 'verb=ListRecords&metadataPrefix=oai_dc';
  for (let page = 0; page < 30; page++) {
    const { artikel: pageArt, resumptionToken } = parseRecordsPage(await fetchOai(params));
    for (const a of pageArt) {
      if (seenIds.has(a.id)) continue;
      seenIds.add(a.id);
      artikel.push(a);
    }
    if (!resumptionToken) break;
    params = `verb=ListRecords&resumptionToken=${encodeURIComponent(resumptionToken)}`;
  }
  return { jurnal, artikel };
}
