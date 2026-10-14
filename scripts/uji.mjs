// Alat uji Layanan Dosen. Jalankan dari root repo.
//   node scripts/uji.mjs daftar A|B              → daftarkan akun uji via API
//   node scripts/uji.mjs cookie A|B              → cetak header Cookie sesi akun uji
//   node scripts/uji.mjs cookie-admin EMAIL PASS → cetak header Cookie sesi admin
//   node scripts/uji.mjs bersihkan               → hapus akun uji + pengajuan, file, baris publiknya
//   node scripts/uji.mjs set-status ID STATUS    → ubah status pengajuan langsung (khusus uji)
//   node scripts/uji.mjs berkas ID               → file Storage proposal & berkas per-pengajuan (ST, SK, laporan)
//   node scripts/uji.mjs unggah "COOKIE" FILE ENDPOINT [JSON]
//                                                → minta token di ENDPOINT, unggah FILE ke Storage, cetak path
// BASE=http://localhost:3000 (default) bisa diganti lewat env.
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE || 'http://localhost:3000';

const AKUN = {
  A: { nama: 'Dosen Uji A', email: 'uji.dosen.a@example.com', password: 'UjiDosenA#2026', nidn: '0101010101', prodi: 'Teknik Informatika', no_hp: '081234567890' },
  B: { nama: 'Dosen Uji B', email: 'uji.dosen.b@example.com', password: 'UjiDosenB#2026', nidn: '0202020202', prodi: 'Sistem Informasi', no_hp: '081298765432' },
};

async function cookie(email, password) {
  const jar = new Map();
  const sb = createServerClient(SB_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cs) => cs.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return [...jar].map(([n, v]) => `${n}=${v}`).join('; ');
}

async function bersihkan() {
  const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  const emails = Object.values(AKUN).map((a) => a.email);
  const { data: prof } = await db.from('profil').select('user_id,email').in('email', emails);
  for (const p of prof ?? []) {
    const { data: aj } = await db.from('pengajuan').select('jenis,publik_id').eq('dosen_id', p.user_id);
    for (const x of aj ?? []) if (x.publik_id) await db.from(x.jenis).delete().eq('id', x.publik_id);
    const { data: folders } = await db.storage.from('pengajuan').list(p.user_id);
    for (const f of folders ?? []) {
      const { data: isi } = await db.storage.from('pengajuan').list(`${p.user_id}/${f.name}`);
      if (isi?.length) {
        await db.storage.from('pengajuan').remove(isi.map((x) => `${p.user_id}/${f.name}/${x.name}`));
      }
    }
    await db.auth.admin.deleteUser(p.user_id); // cascade: profil → pengajuan
    console.log('dihapus', p.email);
  }
  console.log('selesai');
}

const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'daftar') {
  const r = await fetch(`${BASE}/api/dosen/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...AKUN[a1], website: '' }),
  });
  console.log(r.status, await r.text());
} else if (cmd === 'cookie') {
  console.log(await cookie(AKUN[a1].email, AKUN[a1].password));
} else if (cmd === 'cookie-admin') {
  console.log(await cookie(a1, a2));
} else if (cmd === 'bersihkan') {
  await bersihkan();
} else if (cmd === 'set-status') {
  const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  const r = await db.from('pengajuan').update({ status: a2, catatan: 'Catatan uji otomatis' })
    .eq('id', a1).select('status,proposal_path').single();
  console.log(r.error ? r.error.message : JSON.stringify(r.data));
} else if (cmd === 'berkas') {
  const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  const { data: aj } = await db.from('pengajuan').select('dosen_id').eq('id', a1).single();
  const { data: prop } = await db.storage.from('pengajuan').list(`${aj.dosen_id}/proposal`);
  const { data: surat } = await db.storage.from('pengajuan').list(`${aj.dosen_id}/${a1}`);
  console.log(JSON.stringify({
    proposal: (prop ?? []).map((f) => f.name),
    per_pengajuan: (surat ?? []).map((f) => f.name), // surat-tugas-*, sk-*, laporan-*
  }));
} else if (cmd === 'unggah') {
  const [ck, file, endpoint, json] = [a1, a2, process.argv[5], process.argv[6]];
  const r = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: ck },
    body: json || '{}',
  });
  const t = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.log('GAGAL-TOKEN', r.status, JSON.stringify(t));
    process.exit(1);
  }
  const sb = createClient(SB_URL, ANON, { auth: { persistSession: false } });
  const { error } = await sb.storage
    .from('pengajuan')
    .uploadToSignedUrl(t.path, t.token, readFileSync(file), { contentType: 'application/pdf' });
  if (error) {
    console.log('GAGAL-UNGGAH', error.message);
    process.exit(1);
  }
  console.log(t.path);
} else {
  console.log('Perintah: daftar A|B · cookie A|B · cookie-admin EMAIL PASS · bersihkan · set-status ID STATUS · berkas ID · unggah "COOKIE" FILE ENDPOINT [JSON]');
}
