const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, LevelFormat, PageNumber, Header, Footer, PageBreak,
  ImageRun
} = require('docx');
const fs = require('fs');

// ─── ASSET PATHS ─────────────────────────────────────────────────────────────
const IMG_STRUKTUR = fs.readFileSync('Struktur Organisasi LPPM.jpeg');

// ─── PERSONNEL ───────────────────────────────────────────────────────────────
const PEJABAT = {
  ketua:      'Anita Juniarti, M.Pd',
  sekretaris: 'Raditia, M.AP',
  kabagPkM:   'Riama Simanjuntak, S.Kom',
  kabagRiset: 'Ida Ariyani Hasanah, S.Kom',
};

// ─── COLOR PALETTE ───────────────────────────────────────────────────────────
const C = {
  navyBlue:   '1A3A6B',
  royalBlue:  '1565C0',
  teal:       '0097A7',
  lightBlue:  'E3F2FD',
  medBlue:    '1976D2',
  gold:       'F0A500',
  white:      'FFFFFF',
  lightGray:  'F5F7FA',
  midGray:    'D0D7DE',
  darkText:   '1A1A2E',
  bodyText:   '2C3E50',
  mutedText:  '546E7A',
};

// ─── PAGE SETUP ──────────────────────────────────────────────────────────────
// A4: 11906 x 16838 DXA | margins 2.5cm = 1417 DXA
// Content width: 11906 - 2*1417 = 9072 DXA
const CONTENT_W = 9072;
const PAGE_MARGIN = 1417;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const cellBorder = (color = C.midGray) => {
  const b = { style: BorderStyle.SINGLE, size: 1, color };
  return { top: b, bottom: b, left: b, right: b };
};

const hdrCell = (text, widthDxa, shade = C.navyBlue) =>
  new TableCell({
    borders: cellBorder(C.navyBlue),
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: C.white, size: 18, font: 'Arial' })]
    })]
  });

const dataCell = (text, widthDxa, shade = C.white, bold = false) =>
  new TableCell({
    borders: cellBorder(C.midGray),
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, size: 18, font: 'Arial', bold, color: C.bodyText })]
    })]
  });

const altDataCell = (text, widthDxa, rowIdx, bold = false) =>
  dataCell(text, widthDxa, rowIdx % 2 === 0 ? C.white : 'EEF4FB', bold);

const heading1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.teal } },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Arial', color: C.navyBlue })]
  });

const heading2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial', color: C.royalBlue })]
  });

const heading3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, font: 'Arial', color: C.teal })]
  });

const bodyPara = (text, options = {}) =>
  new Paragraph({
    spacing: { before: 60, after: 120 },
    children: [new TextRun({ text, size: 20, font: 'Arial', color: C.bodyText, ...options })]
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, size: 20, font: 'Arial', color: C.bodyText })]
  });

const numbered = (text, level = 0) =>
  new Paragraph({
    numbering: { reference: 'numbers', level },
    spacing: { before: 40, after: 60 },
    children: [new TextRun({ text, size: 20, font: 'Arial', color: C.bodyText })]
  });

const infoBox = (label, text) => [
  new Paragraph({
    spacing: { before: 120, after: 40 },
    shading: { fill: C.lightBlue, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: C.royalBlue } },
    indent: { left: 200, right: 200 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20, font: 'Arial', color: C.royalBlue }),
      new TextRun({ text, size: 20, font: 'Arial', color: C.bodyText }),
    ]
  }),
  new Paragraph({ spacing: { before: 0, after: 60 }, children: [] }),
];

const divider = () =>
  new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.midGray } },
    children: []
  });

const pageBreakPara = () =>
  new Paragraph({ children: [new PageBreak()] });

const emptyLine = () =>
  new Paragraph({ spacing: { before: 0, after: 60 }, children: [] });

// ─── SECTION 1: TUJUAN WEBSITE ───────────────────────────────────────────────
function buildSection1() {
  return [
    heading1('1. TUJUAN WEBSITE LPPM UnivSM'),
    bodyPara(
      'Website LPPM Universitas Sapta Mandiri dirancang sebagai platform digital resmi yang berfungsi lebih dari sekadar profil lembaga. Website ini menjadi pusat informasi, layanan, dokumentasi, dan repository bukti kinerja penyelenggaraan Tridharma Perguruan Tinggi di bidang penelitian dan pengabdian kepada masyarakat (PkM).'
    ),
    heading2('1.1 Tujuan Utama'),
    ...([
      ['Media Informasi Publik', 'Menyediakan informasi yang lengkap, akurat, dan terkini tentang program, kegiatan, prestasi, dan layanan LPPM kepada seluruh sivitas akademika dan masyarakat umum.'],
      ['Portal Layanan Digital Dosen', 'Memfasilitasi pengajuan proposal penelitian dan PkM, unggah laporan kemajuan dan akhir, akses template dokumen, dan konsultasi publikasi/HKI secara daring.'],
      ['Repository Dokumentasi Kinerja', 'Menyimpan dan menampilkan bukti kinerja LPPM yang terstruktur sebagai pendukung proses SPMI, AMI (Audit Mutu Internal), RTM (Rapat Tinjauan Manajemen), dan akreditasi institusi maupun program studi.'],
      ['Pusat Publikasi dan Luaran', 'Menampilkan rekap publikasi ilmiah, Hak Kekayaan Intelektual (HKI), buku, prosiding, produk inovasi, dan seluruh luaran penelitian/PkM dosen dan mahasiswa.'],
      ['Sarana Transparansi dan Akuntabilitas', 'Mendokumentasikan proses PPEPP (Penetapan, Pelaksanaan, Evaluasi, Pengendalian, dan Peningkatan) sebagai wujud akuntabilitas pengelolaan penelitian dan PkM yang profesional.'],
      ['Media Kolaborasi dan Kerja Sama', 'Menampilkan profil kerja sama (MoU/MoA/IA) dengan mitra strategis dari kalangan pemerintah, industri, dan perguruan tinggi lain, sekaligus menjadi pintu masuk calon mitra baru.'],
      ['Pendukung Sistem Pelaporan Kinerja', 'Mengintegrasikan data kinerja LPPM untuk keperluan pelaporan kepada pimpinan universitas, Dikti, dan pemangku kepentingan eksternal.'],
    ].map(([judul, desc]) => [
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: `✔ ${judul}: `, bold: true, size: 20, font: 'Arial', color: C.royalBlue }),
          new TextRun({ text: desc, size: 20, font: 'Arial', color: C.bodyText }),
        ]
      })
    ]).flat()),
    emptyLine(),
  ];
}

// ─── SECTION 2: TARGET PENGGUNA ──────────────────────────────────────────────
function buildSection2() {
  const rows = [
    ['No.', 'Kelompok Pengguna', 'Kebutuhan Utama', 'Akses Utama'],
    ['1', 'Dosen', 'Pedoman, template, jadwal hibah, status proposal, laporan monev', 'Penelitian, PkM, Dokumen, Monev'],
    ['2', 'Mahasiswa', 'Info penelitian dosen, hibah mahasiswa, program PkM', 'Penelitian, PkM, Berita, Hibah'],
    ['3', 'Pimpinan Universitas', 'Capaian kinerja, tren riset, rekap luaran LPPM', 'Beranda, Monev, Repository, Statistik'],
    ['4', 'Tim SPMI & Auditor AMI', 'Dokumen standar, instrumen, hasil monev, RTL', 'Monev, Dokumen, Repository'],
    ['5', 'Asesor Akreditasi', 'Bukti kinerja, data publikasi, HKI, kerja sama, monev', 'Repository, Publikasi, Kerja Sama'],
    ['6', 'Mitra Kerja Sama', 'Profil LPPM, bidang kolaborasi, mekanisme MoU/MoA', 'Profil, Kerja Sama, Kontak'],
    ['7', 'Masyarakat Umum', 'Program PkM, dampak kegiatan, berita LPPM', 'Beranda, PkM, Berita, Galeri'],
    ['8', 'Peneliti/Akademisi Eksternal', 'Publikasi, jurnal, luaran penelitian, repositori', 'Publikasi, Jurnal, Repository'],
  ];
  const widths = [500, 1500, 3500, 3072];

  return [
    heading1('2. TARGET PENGGUNA WEBSITE'),
    bodyPara(
      'Website LPPM UnivSM dirancang untuk melayani berbagai kelompok pengguna dengan kebutuhan yang berbeda-beda. Tabel berikut merangkum target pengguna dan kebutuhan utama masing-masing.'
    ),
    emptyLine(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      rows: rows.map((row, i) =>
        new TableRow({
          tableHeader: i === 0,
          children: row.map((cell, j) =>
            i === 0
              ? hdrCell(cell, widths[j])
              : altDataCell(cell, widths[j], i, j === 0)
          )
        })
      )
    }),
    emptyLine(),
  ];
}

// ─── SECTION 3: STRUKTUR MENU UTAMA ──────────────────────────────────────────
function buildSection3() {
  const menus = [
    { no: '1', menu: 'Beranda', submenu: '— (halaman utama)' },
    { no: '2', menu: 'Profil LPPM', submenu: 'Sejarah, Visi Misi Tujuan, Struktur Organisasi, Tugas & Fungsi, Program Kerja (RKT), Kontak & Lokasi' },
    { no: '3', menu: 'Roadmap', submenu: 'Roadmap Penelitian 2025-2029, Roadmap PkM 2025-2029, Bidang Fokus Riset, Indikator Kinerja' },
    { no: '4', menu: 'Penelitian', submenu: 'Pedoman, Skema & Hibah, Jadwal, Daftar Penelitian Dosen, Monev Penelitian, Template' },
    { no: '5', menu: 'Pengabdian kepada Masyarakat', submenu: 'Pedoman PkM, Skema PkM, Jadwal, Daftar Kegiatan, Dampak & Dokumentasi, Monev PkM, Template' },
    { no: '6', menu: 'Publikasi dan Luaran', submenu: 'Publikasi Dosen, HKI, Paten, Buku & Prosiding, Produk Inovasi, Rekap Luaran Tahunan' },
    { no: '7', menu: 'Jurnal UnivSM', submenu: 'Daftar Jurnal, Petunjuk Penulis, Indeksasi Jurnal, Arsip Jurnal' },
    { no: '8', menu: 'Hibah, Insentif & Pendanaan', submenu: 'Hibah Internal, Hibah Eksternal (Dikti/Kemenristek), Insentif Publikasi, Insentif HKI, Tata Cara Pengajuan' },
    { no: '9', menu: 'Dokumen dan Template', submenu: 'SOP LPPM, Pedoman Penelitian, Pedoman PkM, Template Proposal, Template Laporan, Format Logbook, Berita Acara Monev, Instrumen SPMI' },
    { no: '10', menu: 'Monitoring dan Evaluasi', submenu: 'Instrumen Monev, Jadwal Monev, Hasil Monev, RTL, Dashboard Kinerja' },
    { no: '11', menu: 'Kerja Sama', submenu: 'MoU/MoA/IA, Mitra Penelitian, Mitra PkM, Laporan Kegiatan, Mekanisme Kerja Sama, Survei Kepuasan Mitra' },
    { no: '12', menu: 'Berita dan Agenda', submenu: 'Berita Kegiatan, Pengumuman, Kalender Agenda' },
    { no: '13', menu: 'Galeri', submenu: 'Foto Kegiatan, Video Kegiatan' },
    { no: '14', menu: 'Repository Bukti Kinerja', submenu: 'Bukti Penelitian, Bukti PkM, Bukti Publikasi/HKI, Bukti Kerja Sama, Rekap Tahunan' },
    { no: '15', menu: 'Kontak dan Layanan', submenu: 'Kontak LPPM, Form Konsultasi, Form Pengajuan Layanan, Jam Operasional' },
  ];
  const widths = [500, 2300, 6272];

  return [
    heading1('3. STRUKTUR MENU UTAMA WEBSITE'),
    bodyPara(
      'Berikut adalah struktur menu utama yang direkomendasikan untuk website LPPM UnivSM. Struktur ini mencakup 15 menu utama dengan submenu yang disesuaikan dengan kebutuhan operasional LPPM, SPMI, dan akreditasi.'
    ),
    emptyLine(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [hdrCell('No.', widths[0]), hdrCell('Menu Utama', widths[1]), hdrCell('Submenu', widths[2])]
        }),
        ...menus.map((m, i) =>
          new TableRow({
            children: [
              altDataCell(m.no, widths[0], i, true),
              altDataCell(m.menu, widths[1], i, true),
              altDataCell(m.submenu, widths[2], i),
            ]
          })
        )
      ]
    }),
    emptyLine(),
  ];
}

// ─── ORG CHART IMAGE BLOCK ────────────────────────────────────────────────────
function orgChartBlock() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      children: [new TextRun({ text: 'Struktur Organisasi LPPM Universitas Sapta Mandiri', bold: true, size: 20, font: 'Arial', color: C.navyBlue })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [new ImageRun({
        type: 'jpg',
        data: IMG_STRUKTUR,
        transformation: { width: 520, height: 320 },
        altText: { title: 'Struktur Organisasi LPPM', description: 'Bagan struktur organisasi LPPM UnivSM', name: 'Struktur Organisasi LPPM' }
      })]
    }),
    // Personnel table below the chart
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [3000, 3000, 3072],
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            hdrCell('Jabatan', 3000),
            hdrCell('Nama', 3000),
            hdrCell('Keterangan', 3072),
          ]
        }),
        new TableRow({ children: [
          dataCell('Kepala LPPM', 3000, 'EEF4FB', true),
          dataCell(PEJABAT.ketua, 3000, 'EEF4FB'),
          dataCell('Pimpinan tertinggi LPPM, bertanggung jawab kepada Rektor', 3072, 'EEF4FB'),
        ]}),
        new TableRow({ children: [
          dataCell('Sekretaris LPPM', 3000, C.white, true),
          dataCell(PEJABAT.sekretaris, 3000, C.white),
          dataCell('Mendukung administrasi dan koordinasi internal LPPM', 3072, C.white),
        ]}),
        new TableRow({ children: [
          dataCell('Ka. Bag. Pusat Penelitian', 3000, 'EEF4FB', true),
          dataCell(PEJABAT.kabagRiset, 3000, 'EEF4FB'),
          dataCell('Mengelola program, administrasi, dan monev penelitian', 3072, 'EEF4FB'),
        ]}),
        new TableRow({ children: [
          dataCell('Ka. Bag. Pusat PkM', 3000, C.white, true),
          dataCell(PEJABAT.kabagPkM, 3000, C.white),
          dataCell('Mengelola program, administrasi, dan monev pengabdian kepada masyarakat', 3072, C.white),
        ]}),
      ]
    }),
    emptyLine(),
  ];
}

// ─── SECTION 4: ISI SETIAP MENU ──────────────────────────────────────────────
function buildSection4() {
  const sections = [
    {
      menu: '4.1 Beranda',
      items: [
        'Hero section dengan foto kampus UnivSM, slogan LPPM, dan tombol akses cepat.',
        'Statistik kinerja LPPM: jumlah penelitian, PkM, publikasi, HKI, dan mitra aktif.',
        'Pengumuman terbaru (hibah, jadwal, berita penting).',
        'Berita kegiatan terbaru (minimal 3 artikel terkini).',
        'Link cepat ke halaman paling sering diakses (pedoman, template, monev).',
        'Sambutan singkat Ketua LPPM.',
        'Kontak cepat dan tautan media sosial.',
      ]
    },
    {
      menu: '4.2 Profil LPPM',
      items: [
        'Sejarah singkat pendirian dan perkembangan LPPM UnivSM.',
        'Visi: "Menjadi pusat unggulan dalam penelitian dan PkM yang inovatif, berlandaskan nilai moral dan spiritual, serta berdaya saing nasional dan internasional pada tahun 2036."',
        'Misi LPPM (5 poin sesuai dokumen resmi).',
        'Tujuan LPPM (5 poin sesuai dokumen resmi).',
        `Struktur organisasi LPPM (lihat gambar di bawah): Kepala LPPM — ${PEJABAT.ketua}; Sekretaris LPPM — ${PEJABAT.sekretaris}; Ka. Bag. Pusat Penelitian — ${PEJABAT.kabagRiset}; Ka. Bag. Pusat PkM — ${PEJABAT.kabagPkM}.`,
        'Tugas dan fungsi masing-masing jabatan.',
        'Program Kerja Tahunan (RKT) LPPM 2024-2029.',
        'Informasi kontak, alamat kantor, dan jam layanan.',
      ]
    },
    {
      menu: '4.3 Roadmap Penelitian dan PkM',
      items: [
        'Roadmap Riset UNIVSM 2025-2029 lengkap dengan arah kebijakan per tahun.',
        'Roadmap PkM UNIVSM 2025-2029.',
        'Bidang Fokus Riset: (1) Pendidikan dan Karakter Bangsa, (2) Teknologi Informasi dan Transformasi Digital, (3) Kesehatan dan Kesejahteraan Masyarakat, (4) Pemberdayaan Ekonomi dan UMKM, (5) Hukum dan Tata Kelola serta Kebijakan Publik, (6) Manajemen Pendidikan dan TI untuk Tata Kelola, (7) Manajemen dan Teknologi Konstruksi.',
        'Prioritas pengembangan per tahun: 2025 (Pemenuhan Layanan Pendidikan Berkualitas), 2026 (Peningkatan Produktivitas), 2027 (Transformasi Digital Tata Kelola), 2028 (Pengembangan Sertifikasi Kompetensi), 2029 (Internasionalisasi).',
        'Indikator kinerja: publikasi terakreditasi, sitasi per dosen, HKI, produk inovasi, kerja sama internasional.',
        'Faktor pendukung: pendanaan, jejaring kerja sama, dan produktivitas penyelenggaraan riset.',
        'Visualisasi roadmap dalam bentuk tabel/infografis per tahun.',
      ]
    },
    {
      menu: '4.4 Penelitian',
      items: [
        'Pedoman Penelitian Internal UnivSM (unduhan PDF).',
        'Skema Hibah Penelitian: skema mandiri, skema kelompok, dan skema kolaborasi.',
        'Jadwal penelitian tahunan: pengumuman, submission, seleksi, pelaksanaan, monev, laporan akhir.',
        'Daftar penelitian dosen aktif (tabel: nama dosen, judul, tahun, bidang, status, luaran).',
        'Laporan monev penelitian per periode.',
        'Template dokumen: proposal penelitian, laporan kemajuan, laporan akhir, logbook, berita acara seminar.',
        'FAQ penelitian.',
      ]
    },
    {
      menu: '4.5 Pengabdian kepada Masyarakat (PkM)',
      items: [
        'Pedoman PkM Internal UnivSM (unduhan PDF).',
        'Skema PkM: PkM mandiri, PkM berbasis riset, PkM KKN-Tematik, PkM kolaborasi mitra.',
        'Jadwal PkM tahunan: pengumuman, submission, seleksi, pelaksanaan, monev, laporan.',
        'Daftar kegiatan PkM aktif dan selesai (tabel: nama dosen, judul, lokasi, tahun, mitra, status).',
        'Dokumentasi dampak PkM: foto, video, testimoni masyarakat, laporan dampak.',
        'Laporan monev PkM per periode.',
        'Template dokumen: proposal PkM, laporan kemajuan, laporan akhir, logbook PkM.',
      ]
    },
    {
      menu: '4.6 Publikasi dan Luaran',
      items: [
        'Tabel publikasi dosen: nama, judul artikel, nama jurnal/prosiding, volume, tahun, ISSN/DOI, status indeksasi.',
        'Daftar HKI: jenis HKI (hak cipta, paten, merek), judul, nomor pendaftaran, tahun, status.',
        'Buku dan prosiding: judul, penulis, penerbit, ISBN, tahun.',
        'Produk inovasi: nama produk, deskripsi, tahun, potensi komersialisasi.',
        'Rekap luaran tahunan dalam grafik/tabel ringkasan.',
      ]
    },
    {
      menu: '4.7 Jurnal UnivSM',
      items: [
        'Daftar jurnal yang diterbitkan oleh UnivSM beserta informasi editor in chief, ISSN cetak/online.',
        'Petunjuk bagi penulis (author guidelines): format artikel, template, proses review.',
        'Status indeksasi jurnal: Sinta, Google Scholar, Garuda, DOAJ, Copernicus, dll.',
        'Arsip jurnal: akses ke edisi-edisi yang telah terbit.',
        'Tautan ke laman OJS (Open Journal System) masing-masing jurnal.',
      ]
    },
    {
      menu: '4.8 Hibah, Insentif, dan Pendanaan',
      items: [
        'Daftar hibah internal UnivSM beserta syarat dan ketentuan.',
        'Informasi hibah eksternal: Dikti/Kemdikbud, Kemenristek, BRIN, LPDP, dan lembaga lain.',
        'Program insentif publikasi: syarat, besaran insentif, cara pengajuan.',
        'Program insentif HKI: syarat, jenis HKI yang didukung, tata cara.',
        'Panduan dan tata cara pengajuan dana hibah.',
        'Arsip penerima hibah tahun-tahun sebelumnya.',
      ]
    },
    {
      menu: '4.9 Dokumen dan Template',
      items: [
        'SOP Operasional LPPM (SOP Pengajuan Proposal, SOP Monev, SOP Pelaporan, SOP HKI).',
        'Pedoman Penelitian Internal (revisi terbaru).',
        'Pedoman PkM Internal (revisi terbaru).',
        'Template Proposal Penelitian (format .docx).',
        'Template Laporan Kemajuan Penelitian (.docx).',
        'Template Laporan Akhir Penelitian (.docx).',
        'Template Proposal PkM (.docx).',
        'Template Laporan PkM (.docx).',
        'Format Logbook Penelitian dan PkM (.docx).',
        'Berita Acara Monev (.docx).',
        'Instrumen SPMI bidang penelitian dan PkM.',
        'Format Surat Tugas dan Surat Keterangan LPPM.',
      ]
    },
    {
      menu: '4.10 Monitoring dan Evaluasi (Monev)',
      items: [
        'Instrumen monev penelitian dan PkM (checklist kesesuaian, rubrik penilaian).',
        'Jadwal monev per semester/tahun.',
        'Hasil monev: ringkasan capaian, kendala, rekomendasi per kegiatan.',
        'Rencana Tindak Lanjut (RTL) hasil monev.',
        'Dashboard kinerja sederhana: grafik jumlah penelitian dan PkM, persentase ketepatan laporan, capaian luaran.',
        'Rekap hasil monev tahunan sebagai bahan RTM dan AMI.',
      ]
    },
    {
      menu: '4.11 Kerja Sama',
      items: [
        'Daftar MoU/MoA/IA yang aktif: nama mitra, jenis perjanjian, ruang lingkup, tanggal, masa berlaku.',
        'Profil mitra penelitian dan mitra PkM.',
        'Laporan kegiatan kerja sama: dokumentasi, output kolaborasi.',
        'Mekanisme dan prosedur pengajuan kerja sama baru.',
        'Formulir pengajuan kerja sama (online).',
        'Survei kepuasan mitra (online).',
        'Galeri dokumentasi kegiatan kerja sama.',
      ]
    },
    {
      menu: '4.12 Berita dan Agenda',
      items: [
        'Berita kegiatan LPPM: pelatihan, seminar, workshop, launching hibah, kunjungan mitra.',
        'Pengumuman resmi: jadwal monev, pengumuman hibah, perubahan deadline.',
        'Kalender agenda LPPM: tampilan bulanan dengan event terjadwal.',
        'Arsip berita berdasarkan tahun dan kategori.',
      ]
    },
    {
      menu: '4.13 Galeri',
      items: [
        'Foto kegiatan penelitian dan PkM (dikelompokkan per tahun/kegiatan).',
        'Video dokumentasi kegiatan (embed YouTube atau hosting internal).',
        'Foto seminar, workshop, monev, dan kerja sama.',
        'Galeri produk/inovasi yang dihasilkan.',
      ]
    },
    {
      menu: '4.14 Repository Bukti Kinerja',
      items: [
        'Bukti penelitian: SK penelitian, kontrak, laporan, berita acara monev.',
        'Bukti PkM: SK PkM, kontrak, laporan, foto kegiatan, berita acara monev.',
        'Bukti publikasi dan HKI: sertifikat HKI, cover jurnal, tautan artikel.',
        'Bukti kerja sama: dokumen MoU/MoA, laporan kegiatan bersama.',
        'Rekap kinerja LPPM tahunan (PDF/Excel) untuk keperluan akreditasi dan RTM.',
        'Diorganisasi berdasarkan tahun akademik dan jenis bukti.',
      ]
    },
    {
      menu: '4.15 Kontak dan Layanan',
      items: [
        'Informasi lengkap kontak LPPM: alamat, nomor telepon, email resmi, WhatsApp.',
        'Peta lokasi kantor LPPM (embed Google Maps).',
        'Formulir konsultasi online (penelitian, PkM, publikasi, HKI).',
        'Formulir pengajuan layanan administratif.',
        'Jam operasional dan informasi layanan tatap muka.',
        'Tautan media sosial LPPM (Instagram, YouTube, dll.).',
      ]
    },
  ];

  return [
    heading1('4. ISI SETIAP MENU DAN SUBMENU'),
    bodyPara(
      'Berikut adalah rincian konten yang perlu dimuat dalam setiap menu dan submenu website LPPM UnivSM.'
    ),
    ...sections.flatMap(({ menu, items }) => [
      heading2(menu),
      ...items.map(item => bullet(item)),
      // Embed org chart image immediately after Profil LPPM section
      ...(menu === '4.2 Profil LPPM' ? orgChartBlock() : []),
      emptyLine(),
    ]),
  ];
}

// ─── SECTION 5: KONTEN PRIORITAS ─────────────────────────────────────────────
function buildSection5() {
  const prioritas = [
    { fase: 'Fase 1 (Minggu 1-2)\nFundasi Website', items: [
      'Profil LPPM (Visi, Misi, Tujuan, Sejarah)',
      'Struktur Organisasi LPPM',
      'Kontak dan Lokasi LPPM',
      'Roadmap Penelitian 2025-2029',
      'Roadmap PkM 2025-2029',
      'Sambutan Ketua LPPM',
    ]},
    { fase: 'Fase 2 (Minggu 3-4)\nLayanan Dosen', items: [
      'Pedoman Penelitian Internal',
      'Pedoman PkM Internal',
      'Template Proposal Penelitian dan PkM',
      'Template Laporan Penelitian dan PkM',
      'Format Logbook',
      'SOP LPPM',
      'Jadwal penelitian dan PkM tahun berjalan',
    ]},
    { fase: 'Fase 3 (Minggu 5-6)\nData Kinerja', items: [
      'Daftar penelitian dosen (rekap 3 tahun terakhir)',
      'Daftar kegiatan PkM (rekap 3 tahun terakhir)',
      'Daftar publikasi dosen',
      'Daftar HKI yang dimiliki',
      'Rekap luaran per tahun',
    ]},
    { fase: 'Fase 4 (Minggu 7-8)\nInformasi & Bukti', items: [
      'Berita kegiatan LPPM (minimal 5 berita awal)',
      'Pengumuman aktif',
      'Galeri foto kegiatan',
      'Dokumen MoU/MoA mitra aktif',
      'Repository bukti kinerja (minimal 1 tahun terakhir)',
      'Instrumen dan hasil monev terakhir',
    ]},
  ];

  const widths = [2500, 6572];

  return [
    heading1('5. KONTEN PRIORITAS TAHAP AWAL'),
    bodyPara(
      'Untuk memastikan website dapat segera beroperasi dan bermanfaat, berikut adalah konten yang harus diprioritaskan berdasarkan urgensinya, dibagi dalam 4 fase pengisian konten.'
    ),
    emptyLine(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [hdrCell('Fase Pengisian', widths[0]), hdrCell('Konten yang Harus Diunggah', widths[1])]
        }),
        ...prioritas.map((p, i) =>
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorder(C.midGray),
                width: { size: widths[0], type: WidthType.DXA },
                shading: { fill: i % 2 === 0 ? 'E8F4FD' : 'D1EAF9', type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 150, right: 150 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  children: [new TextRun({ text: p.fase, bold: true, size: 18, font: 'Arial', color: C.navyBlue })]
                })]
              }),
              new TableCell({
                borders: cellBorder(C.midGray),
                width: { size: widths[1], type: WidthType.DXA },
                shading: { fill: i % 2 === 0 ? C.white : 'F0F7FF', type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 150, right: 150 },
                children: p.items.map(item =>
                  new Paragraph({
                    numbering: { reference: `bullets_${i}`, level: 0 },
                    spacing: { before: 30, after: 40 },
                    children: [new TextRun({ text: item, size: 18, font: 'Arial', color: C.bodyText })]
                  })
                )
              }),
            ]
          })
        )
      ]
    }),
    emptyLine(),
  ];
}

// ─── SECTION 6: FORMAT TAMPILAN BERANDA ──────────────────────────────────────
function buildSection6() {
  const components = [
    {
      komponen: 'Hero Section / Banner Utama',
      isi: 'Foto/banner kampus UnivSM berkualitas tinggi, nama lembaga "LPPM Universitas Sapta Mandiri", tagline singkat (contoh: "Inovatif. Kolaboratif. Berdampak."), dan dua tombol CTA: "Lihat Penelitian" dan "Unduh Template".',
      prioritas: 'Wajib'
    },
    {
      komponen: 'Sambutan Ketua LPPM',
      isi: 'Foto Ketua LPPM, kutipan singkat sambutan (3-4 kalimat), nama dan jabatan. Diletakkan di atas lipatan halaman.',
      prioritas: 'Wajib'
    },
    {
      komponen: 'Statistik Kinerja LPPM',
      isi: 'Counter animasi: Jumlah Penelitian Aktif, Jumlah PkM Aktif, Jumlah Publikasi, Jumlah HKI, Jumlah Mitra Kerja Sama. Desain kartu/ikon yang bersih.',
      prioritas: 'Wajib'
    },
    {
      komponen: 'Akses Cepat (Quick Access)',
      isi: '6-8 tombol ikonik ke halaman paling sering diakses: Pedoman Penelitian, Pedoman PkM, Template Dokumen, Jadwal Kegiatan, Monev, Hubungi Kami.',
      prioritas: 'Wajib'
    },
    {
      komponen: 'Pengumuman Terbaru',
      isi: 'Widget "Pengumuman" yang menampilkan 3-5 pengumuman terbaru dengan tanggal dan ringkasan singkat. Ada tombol "Lihat Semua Pengumuman".',
      prioritas: 'Wajib'
    },
    {
      komponen: 'Berita Terbaru',
      isi: 'Grid 3 kolom berisi berita/artikel kegiatan terbaru: thumbnail foto, judul, tanggal, dan ringkasan 1-2 kalimat. Tombol "Lihat Semua Berita".',
      prioritas: 'Wajib'
    },
    {
      komponen: 'Bidang Fokus Riset',
      isi: 'Tampilan kartu atau ikon 7 bidang fokus riset sesuai Roadmap 2025-2029. Setiap kartu bisa diklik untuk detail.',
      prioritas: 'Disarankan'
    },
    {
      komponen: 'Link Penting',
      isi: 'Tautan eksternal ke: SINTA Kemenristek, PDDikti, Garuda Portal, BRIN, Dikti, dan jurnal UnivSM.',
      prioritas: 'Disarankan'
    },
    {
      komponen: 'Kontak Cepat (Footer)',
      isi: 'Alamat kantor, nomor telepon/WhatsApp, email resmi, jam layanan, dan ikon media sosial.',
      prioritas: 'Wajib'
    },
    {
      komponen: 'Galeri Mini',
      isi: 'Slideshow/carousel foto 4-6 kegiatan terbaru untuk menampilkan aktivitas LPPM secara visual.',
      prioritas: 'Opsional'
    },
  ];

  const widths = [2500, 5472, 1100];

  return [
    heading1('6. FORMAT TAMPILAN HALAMAN BERANDA'),
    bodyPara(
      'Halaman beranda adalah wajah pertama website yang dilihat pengunjung. Berikut adalah rancangan komponen yang harus ada di halaman beranda, disusun dari atas ke bawah.'
    ),
    emptyLine(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [hdrCell('Komponen', widths[0]), hdrCell('Isi / Keterangan', widths[1]), hdrCell('Prioritas', widths[2])]
        }),
        ...components.map((c, i) =>
          new TableRow({
            children: [
              altDataCell(c.komponen, widths[0], i, true),
              altDataCell(c.isi, widths[1], i),
              new TableCell({
                borders: cellBorder(C.midGray),
                width: { size: widths[2], type: WidthType.DXA },
                shading: {
                  fill: c.prioritas === 'Wajib' ? 'E8F5E9' : c.prioritas === 'Disarankan' ? 'FFF3E0' : 'F3E5F5',
                  type: ShadingType.CLEAR
                },
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({
                    text: c.prioritas, size: 17, font: 'Arial', bold: true,
                    color: c.prioritas === 'Wajib' ? '1B5E20' : c.prioritas === 'Disarankan' ? 'E65100' : '6A1B9A'
                  })]
                })]
              }),
            ]
          })
        )
      ]
    }),
    emptyLine(),
  ];
}

// ─── SECTION 7: CONTOH REDAKSI TEKS ──────────────────────────────────────────
function buildSection7() {
  return [
    heading1('7. CONTOH REDAKSI TEKS WEBSITE'),
    bodyPara('Teks berikut adalah contoh redaksi siap pakai yang dapat langsung digunakan atau disesuaikan pada saat pengisian konten website.'),
    emptyLine(),

    heading2('7.1 Sambutan Singkat Ketua LPPM'),
    new Paragraph({
      spacing: { before: 100, after: 60 },
      border: { left: { style: BorderStyle.SINGLE, size: 10, color: C.teal } },
      indent: { left: 280 },
      children: [new TextRun({
        text: 'Assalamu\'alaikum Wr. Wb. Selamat datang di website resmi Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) Universitas Sapta Mandiri. LPPM hadir sebagai garda terdepan dalam mendorong terciptanya budaya riset dan inovasi yang berkelanjutan di lingkungan UnivSM.',
        size: 20, font: 'Arial', italics: true, color: C.bodyText
      })]
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      border: { left: { style: BorderStyle.SINGLE, size: 10, color: C.teal } },
      indent: { left: 280 },
      children: [new TextRun({
        text: 'Melalui platform digital ini, kami menghadirkan layanan informasi, pengelolaan penelitian dan PkM, serta dokumentasi capaian Tridharma yang terintegrasi dan mudah diakses. Kami berharap website ini menjadi sarana kolaborasi yang efektif antara dosen, mahasiswa, mitra, dan masyarakat dalam mewujudkan visi UnivSM sebagai universitas unggul berlandaskan nilai moral dan spiritual.',
        size: 20, font: 'Arial', italics: true, color: C.bodyText
      })]
    }),
    new Paragraph({
      spacing: { before: 60, after: 120 },
      border: { left: { style: BorderStyle.SINGLE, size: 10, color: C.teal } },
      indent: { left: 280 },
      children: [new TextRun({
        text: 'Wassalamu\'alaikum Wr. Wb.',
        size: 20, font: 'Arial', italics: true, color: C.bodyText
      })]
    }),
    new Paragraph({
      spacing: { before: 60, after: 40 },
      indent: { left: 280 },
      children: [new TextRun({ text: PEJABAT.ketua, size: 20, font: 'Arial', bold: true, color: C.navyBlue })]
    }),
    new Paragraph({
      spacing: { before: 0, after: 160 },
      indent: { left: 280 },
      children: [new TextRun({ text: 'Kepala LPPM Universitas Sapta Mandiri', size: 20, font: 'Arial', color: C.mutedText })]
    }),
    emptyLine(),

    heading2('7.2 Profil Singkat LPPM'),
    bodyPara(
      'Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) Universitas Sapta Mandiri merupakan unsur pelaksana akademik yang bertugas mengoordinasikan, memfasilitasi, memantau, mengevaluasi, dan mendokumentasikan seluruh kegiatan penelitian dan pengabdian kepada masyarakat di lingkungan UnivSM.'
    ),
    bodyPara(
      'LPPM UnivSM berkomitmen untuk menghasilkan riset yang inovatif dan aplikatif, serta program PkM yang memberikan dampak nyata bagi masyarakat, dengan tetap berpijak pada nilai-nilai moral dan spiritual yang menjadi landasan institusi. Seluruh kegiatan LPPM diselenggarakan dalam kerangka Tridharma Perguruan Tinggi dan mendukung pencapaian Rencana Strategis Universitas Sapta Mandiri 2024-2029.'
    ),
    emptyLine(),

    heading2('7.3 Deskripsi Roadmap Penelitian dan PkM'),
    bodyPara(
      'Roadmap Penelitian dan Pengabdian kepada Masyarakat LPPM UnivSM 2025-2029 merupakan panduan arah dan kebijakan strategis yang menjadi acuan pelaksanaan seluruh kegiatan riset dan PkM selama lima tahun ke depan.'
    ),
    bodyPara(
      'Roadmap ini menetapkan tujuh bidang fokus riset prioritas, yaitu: Pendidikan dan Karakter Bangsa; Teknologi Informasi dan Transformasi Digital; Kesehatan dan Kesejahteraan Masyarakat; Pemberdayaan Ekonomi dan UMKM; Hukum, Tata Kelola, dan Kebijakan Publik; Manajemen Pendidikan dan Teknologi Informasi; serta Manajemen dan Teknologi Konstruksi. Setiap bidang fokus dikembangkan secara bertahap dengan indikator kinerja yang terukur dan terintegrasi dengan visi universitas.'
    ),
    emptyLine(),

    heading2('7.4 Deskripsi Layanan Penelitian'),
    bodyPara(
      'LPPM UnivSM menyediakan layanan terpadu untuk mendukung seluruh kegiatan penelitian dosen dan mahasiswa, mulai dari tahap perencanaan hingga pelaporan dan publikasi. Layanan meliputi: konsultasi pengajuan proposal, fasilitasi akses hibah internal dan eksternal, pendampingan penulisan artikel ilmiah, pengajuan Hak Kekayaan Intelektual (HKI), serta monitoring dan evaluasi kemajuan penelitian.'
    ),
    bodyPara(
      'Seluruh proses penelitian dikelola secara transparan dan terstandar sesuai dengan pedoman penelitian UnivSM dan ketentuan yang berlaku dari Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi.'
    ),
    emptyLine(),

    heading2('7.5 Deskripsi Layanan PkM'),
    bodyPara(
      'Layanan Pengabdian kepada Masyarakat (PkM) LPPM UnivSM dirancang untuk memfasilitasi dosen dan mahasiswa dalam melaksanakan program pemberdayaan dan pendampingan masyarakat yang berbasis hasil penelitian. LPPM menyediakan konsultasi proposal PkM, pendampingan pelaksanaan kegiatan di lapangan, fasilitasi kerja sama dengan mitra pemerintah dan industri, serta dokumentasi dan pelaporan dampak kegiatan.'
    ),
    bodyPara(
      'Program PkM UnivSM mengintegrasikan nilai-nilai lokal dan pendekatan moral-spiritual dalam setiap tahap pelaksanaannya, selaras dengan misi universitas untuk berkontribusi pada pembangunan berkelanjutan.'
    ),
    emptyLine(),

    heading2('7.6 Deskripsi Publikasi dan Luaran'),
    bodyPara(
      'LPPM UnivSM mendorong dan memfasilitasi seluruh dosen dan mahasiswa untuk menghasilkan luaran penelitian yang berkualitas dan terukur. Luaran yang difasilitasi meliputi: publikasi artikel ilmiah pada jurnal nasional terakreditasi (Sinta) dan jurnal internasional bereputasi, prosiding seminar nasional dan internasional, buku ajar/referensi ber-ISBN, Hak Kekayaan Intelektual (HKI), dan produk inovasi berpotensi hilirisasi.'
    ),
    bodyPara(
      'LPPM memberikan insentif bagi dosen yang berhasil menghasilkan publikasi dan HKI, sebagai bentuk apresiasi dan motivasi untuk terus meningkatkan produktivitas ilmiah.'
    ),
    emptyLine(),

    heading2('7.7 Deskripsi Monitoring dan Evaluasi (Monev)'),
    bodyPara(
      'Monitoring dan Evaluasi (Monev) LPPM UnivSM dilaksanakan secara terstruktur dan berkala sebagai bagian dari siklus PPEPP dalam Sistem Penjaminan Mutu Internal (SPMI). Monev mencakup penilaian kemajuan pelaksanaan penelitian dan PkM, kesesuaian luaran dengan target proposal, serta evaluasi penggunaan anggaran.'
    ),
    bodyPara(
      'Hasil monev didokumentasikan secara transparan dan menjadi dasar penyusunan Rencana Tindak Lanjut (RTL), yang selanjutnya dilaporkan dalam Rapat Tinjauan Manajemen (RTM) dan digunakan sebagai bahan Audit Mutu Internal (AMI). Seluruh instrumen, jadwal, dan hasil monev tersedia dan dapat diakses melalui menu Monitoring dan Evaluasi di website ini.'
    ),
    emptyLine(),
  ];
}

// ─── SECTION 8: REKOMENDASI FITUR ────────────────────────────────────────────
function buildSection8() {
  const fitur = [
    { nama: 'Pencarian Dokumen', desc: 'Fitur pencarian full-text untuk menemukan dokumen, pedoman, dan template dengan cepat. Filter berdasarkan kategori (penelitian, PkM, SPMI, dll.) dan tahun.', prioritas: 'Tinggi' },
    { nama: 'Tombol Unduh Template', desc: 'Tombol unduh satu klik pada setiap halaman yang relevan (penelitian, PkM, monev). Template dikelola melalui CMS sehingga mudah diperbarui admin.', prioritas: 'Tinggi' },
    { nama: 'Form Pengajuan Proposal Online', desc: 'Formulir digital untuk pengajuan proposal penelitian dan PkM: input data dosen, judul, bidang fokus, unggah file PDF proposal. Notifikasi otomatis ke admin.', prioritas: 'Tinggi' },
    { nama: 'Form Unggah Laporan', desc: 'Portal unggah laporan kemajuan dan laporan akhir dengan validasi format file (PDF, DOCX) dan batas ukuran. Riwayat unggahan tersimpan per pengguna.', prioritas: 'Tinggi' },
    { nama: 'Kalender Kegiatan Interaktif', desc: 'Kalender bulanan yang menampilkan jadwal penting: deadline proposal, jadwal monev, seminar, pelatihan, dan agenda LPPM lainnya. Dapat difilter per jenis kegiatan.', prioritas: 'Tinggi' },
    { nama: 'Statistik Kinerja (Counter)', desc: 'Counter animasi di beranda: jumlah penelitian aktif, PkM aktif, publikasi, HKI, dan mitra. Data diperbarui secara berkala oleh admin.', prioritas: 'Tinggi' },
    { nama: 'Form Konsultasi Publikasi/HKI', desc: 'Formulir konsultasi online untuk layanan publikasi (pilih jurnal, review abstrak, dll.) dan layanan HKI (jenis HKI, pendaftaran). Notifikasi email otomatis ke pengguna.', prioritas: 'Sedang' },
    { nama: 'Repository Bukti Kinerja', desc: 'Halaman khusus dengan arsip terstruktur: dokumen diorganisir per tahun, jenis bukti, dan kategori. Dilindungi password untuk data sensitif atau hanya diakses saat akreditasi.', prioritas: 'Sedang' },
    { nama: 'Dashboard Monev Sederhana', desc: 'Tampilan visual: grafik batang/lingkaran jumlah penelitian per bidang fokus, persentase ketepatan laporan, dan tren kinerja per tahun. Dapat diunduh sebagai PDF/Excel.', prioritas: 'Sedang' },
    { nama: 'Notifikasi dan Pengumuman Otomatis', desc: 'Sistem notifikasi via email atau pop-up website untuk jadwal penting: deadline pengajuan, jadwal monev, dan hasil seleksi.', prioritas: 'Sedang' },
    { nama: 'Panel Admin (CMS)', desc: 'Content Management System untuk pengelolaan konten oleh admin LPPM tanpa perlu keahlian coding: tambah/edit berita, dokumen, agenda, dan data kinerja.', prioritas: 'Tinggi' },
    { nama: 'Mode Tampilan Responsif', desc: 'Website harus responsif dan tampil dengan baik di perangkat mobile, tablet, dan desktop. Gunakan framework CSS yang mendukung responsivitas (Bootstrap 5 atau Tailwind CSS).', prioritas: 'Tinggi' },
  ];

  const widths = [2200, 5472, 1400];

  return [
    heading1('8. REKOMENDASI FITUR WEBSITE'),
    bodyPara(
      'Berikut adalah fitur-fitur yang direkomendasikan untuk website LPPM UnivSM, diurutkan berdasarkan prioritas implementasi.'
    ),
    emptyLine(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [hdrCell('Fitur', widths[0]), hdrCell('Deskripsi', widths[1]), hdrCell('Prioritas', widths[2])]
        }),
        ...fitur.map((f, i) =>
          new TableRow({
            children: [
              altDataCell(f.nama, widths[0], i, true),
              altDataCell(f.desc, widths[1], i),
              new TableCell({
                borders: cellBorder(C.midGray),
                width: { size: widths[2], type: WidthType.DXA },
                shading: {
                  fill: f.prioritas === 'Tinggi' ? 'E3F2FD' : 'FFF8E1',
                  type: ShadingType.CLEAR
                },
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({
                    text: f.prioritas, size: 17, font: 'Arial', bold: true,
                    color: f.prioritas === 'Tinggi' ? '0D47A1' : 'E65100'
                  })]
                })]
              })
            ]
          })
        )
      ]
    }),
    emptyLine(),
  ];
}

// ─── SECTION 9: STRUKTUR DATABASE ────────────────────────────────────────────
function buildSection9() {
  const tables = [
    {
      judul: '9.1 Tabel Daftar Penelitian',
      kolom: ['ID', 'Nama Dosen', 'NIDN', 'Judul Penelitian', 'Bidang Fokus', 'Skema', 'Sumber Dana', 'Tahun', 'Status', 'Luaran Target', 'Laporan'],
      widths: [400, 1100, 800, 1800, 900, 700, 700, 500, 600, 800, 772],
    },
    {
      judul: '9.2 Tabel Daftar PkM',
      kolom: ['ID', 'Nama Dosen', 'NIDN', 'Judul PkM', 'Lokasi', 'Mitra', 'Sumber Dana', 'Tahun', 'Status', 'Luaran', 'Laporan'],
      widths: [400, 1100, 800, 1800, 900, 700, 700, 500, 600, 800, 772],
    },
    {
      judul: '9.3 Tabel Publikasi Dosen',
      kolom: ['ID', 'Nama Dosen', 'NIDN', 'Judul Artikel', 'Nama Jurnal/Prosiding', 'Volume/No.', 'Tahun Terbit', 'ISSN/ISBN', 'DOI/URL', 'Indeksasi', 'Jenis'],
      widths: [400, 1100, 800, 1700, 1200, 600, 600, 700, 900, 700, 372],
    },
    {
      judul: '9.4 Tabel HKI',
      kolom: ['ID', 'Nama Pemohon', 'NIDN', 'Judul HKI', 'Jenis HKI', 'No. Pendaftaran', 'No. Sertifikat', 'Tanggal Daftar', 'Tanggal Terbit', 'Status', 'File Sertifikat'],
      widths: [400, 1100, 800, 1500, 700, 900, 900, 800, 800, 600, 572],
    },
    {
      judul: '9.5 Tabel Mitra Kerja Sama',
      kolom: ['ID', 'Nama Mitra', 'Jenis Mitra', 'Jenis Dok.', 'Nomor Dok.', 'Ruang Lingkup', 'Tanggal MoU', 'Tanggal Berakhir', 'Status', 'PIC Mitra', 'Dok. File'],
      widths: [400, 1400, 800, 700, 800, 1200, 800, 900, 600, 900, 572],
    },
    {
      judul: '9.6 Tabel Dokumen Template',
      kolom: ['ID', 'Nama Dokumen', 'Kategori', 'Jenis File', 'Versi', 'Tanggal Upload', 'Diupload Oleh', 'Deskripsi', 'URL Unduhan', 'Aktif'],
      widths: [400, 1500, 900, 600, 500, 900, 900, 1500, 1100, 772],
    },
    {
      judul: '9.7 Tabel Agenda LPPM',
      kolom: ['ID', 'Judul Kegiatan', 'Jenis Kegiatan', 'Tanggal Mulai', 'Tanggal Selesai', 'Lokasi', 'Peserta', 'PIC', 'Status', 'Keterangan'],
      widths: [400, 1500, 1000, 900, 900, 800, 700, 700, 600, 572],
    },
  ];

  const buildTable = ({ judul, kolom, widths }) => [
    heading2(judul),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({
          tableHeader: true,
          children: kolom.map((k, i) => hdrCell(k, widths[i]))
        }),
        new TableRow({
          children: kolom.map((_, i) =>
            dataCell('(data)', widths[i], 'F9F9F9')
          )
        }),
      ]
    }),
    emptyLine(),
  ];

  return [
    heading1('9. STRUKTUR DATABASE DAN TABEL DATA'),
    bodyPara(
      'Berikut adalah struktur tabel data yang direkomendasikan untuk basis data website LPPM UnivSM. Setiap tabel dirancang untuk memenuhi kebutuhan informasi SPMI, akreditasi, dan pelaporan kinerja.'
    ),
    emptyLine(),
    ...tables.flatMap(buildTable),
  ];
}

// ─── SECTION 10: REKOMENDASI TAMPILAN VISUAL ──────────────────────────────────
function buildSection10() {
  const palette = [
    ['Warna Primer', '#1A3A6B (Navy Blue)', 'Header, tombol utama, judul halaman, footer. Merepresentasikan kepercayaan, profesionalisme, dan otoritas akademik.'],
    ['Warna Sekunder', '#1565C0 (Royal Blue)', 'Subheading, link aktif, border aksen. Memberikan variasi visual sambil tetap dalam keluarga biru.'],
    ['Warna Aksen 1', '#0097A7 (Teal)', 'Highlight, badge status, garis dekoratif, ikon. Merepresentasikan inovasi dan transformasi.'],
    ['Warna Aksen 2', '#F0A500 (Gold)', 'Notifikasi penting, badge "Baru", elemen penekanan. Merepresentasikan keunggulan dan prestasi.'],
    ['Warna Latar', '#F5F7FA (Light Gray)', 'Latar halaman utama. Memberikan kesan bersih dan mudah dibaca.'],
    ['Warna Kartu', '#FFFFFF (White)', 'Latar kartu konten. Kontras dengan latar halaman.'],
    ['Warna Teks Utama', '#2C3E50 (Dark Slate)', 'Paragraf dan konten teks utama.'],
    ['Warna Teks Muted', '#546E7A (Cool Gray)', 'Keterangan, metadata, tanggal, kategori.'],
  ];

  const typo = [
    ['Judul Halaman / H1', 'Arial Bold / Inter Bold', '28-36px', 'Navy Blue (#1A3A6B)'],
    ['Subjudul / H2', 'Arial Bold / Inter SemiBold', '22-26px', 'Royal Blue (#1565C0)'],
    ['H3 / Label Kartu', 'Arial SemiBold / Inter Medium', '18-20px', 'Teal (#0097A7)'],
    ['Body Text', 'Arial / Inter Regular', '14-16px', 'Dark Slate (#2C3E50)'],
    ['Keterangan / Meta', 'Arial / Inter Regular', '12-13px', 'Cool Gray (#546E7A)'],
    ['Tombol CTA', 'Arial Bold / Inter SemiBold', '14-15px', 'White (#FFFFFF)'],
    ['Link', 'Arial / Inter Regular', '14-16px', 'Royal Blue (#1565C0)'],
  ];

  const palWidths = [1500, 2000, 5572];
  const typoWidths = [1800, 2200, 1300, 3772];

  return [
    heading1('10. REKOMENDASI TAMPILAN VISUAL'),
    heading2('10.1 Palet Warna'),
    bodyPara(
      'Palet warna dipilih berdasarkan identitas visual Universitas Sapta Mandiri (dominan biru) dan kebutuhan website akademik yang profesional dan mudah dibaca.'
    ),
    emptyLine(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: palWidths,
      rows: [
        new TableRow({ tableHeader: true, children: [hdrCell('Nama Warna', palWidths[0]), hdrCell('Kode Hex', palWidths[1]), hdrCell('Penggunaan', palWidths[2])] }),
        ...palette.map((p, i) => new TableRow({
          children: [
            altDataCell(p[0], palWidths[0], i, true),
            altDataCell(p[1], palWidths[1], i),
            altDataCell(p[2], palWidths[2], i),
          ]
        }))
      ]
    }),
    emptyLine(),
    heading2('10.2 Tipografi'),
    bodyPara('Font yang direkomendasikan adalah Inter (Google Fonts - modern, clean, sangat cocok untuk web akademik) atau Arial sebagai fallback universal.'),
    emptyLine(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: typoWidths,
      rows: [
        new TableRow({ tableHeader: true, children: [hdrCell('Elemen', typoWidths[0]), hdrCell('Font', typoWidths[1]), hdrCell('Ukuran', typoWidths[2]), hdrCell('Warna', typoWidths[3])] }),
        ...typo.map((t, i) => new TableRow({
          children: t.map((val, j) => altDataCell(val, typoWidths[j], i, j === 0))
        }))
      ]
    }),
    emptyLine(),
    heading2('10.3 Gaya Desain'),
    ...[
      'Gaya: Modern Minimalist Academic — bersih, terstruktur, formal namun tidak kaku.',
      'Layout: Grid 12-kolom dengan whitespace yang cukup. Konten menggunakan lebar maksimal 1200px dengan padding samping.',
      'Kartu (Cards): Setiap item konten (berita, dokumen, penelitian) ditampilkan dalam kartu dengan shadow ringan, border-radius 8-12px.',
      'Ikon: Gunakan ikon dari library Phosphor Icons, Heroicons, atau Material Design Icons — konsisten dan bersih.',
      'Tombol: Rounded corners (8px), warna navy blue untuk primary, outline teal untuk secondary.',
      'Header/Navbar: Sticky header dengan logo UnivSM di kiri, menu navigasi di kanan, dan tombol "Login" di ujung kanan.',
      'Footer: 3-4 kolom berisi logo, navigasi singkat, kontak, dan ikon media sosial. Background navy blue.',
      'Responsivitas: Mobile-first design, hamburger menu untuk layar kecil, grid kolom yang menyesuaikan breakpoint.',
      'Aksesibilitas: Kontras warna memenuhi standar WCAG 2.1 AA, ukuran font minimal 14px untuk body text, alt text untuk semua gambar.',
    ].map(t => bullet(t)),
    emptyLine(),
    heading2('10.4 Rekomendasi Stack Teknologi'),
    ...[
      'Frontend: HTML5, CSS3, JavaScript — atau framework seperti Vue.js / React jika membutuhkan komponen dinamis.',
      'CSS Framework: Bootstrap 5 atau Tailwind CSS untuk konsistensi desain dan responsivitas.',
      'CMS (Backend): WordPress dengan tema akademik, atau Laravel (PHP) untuk pengembangan kustom, atau Next.js (full-stack).',
      'Database: MySQL / PostgreSQL.',
      'Hosting: Server VPS dengan SSL certificate (HTTPS wajib). Domain: lppm.univsm.ac.id.',
      'Keamanan: Rate limiting pada form, proteksi CSRF, sanitasi input, backup berkala.',
    ].map(t => bullet(t)),
    emptyLine(),
  ];
}

// ─── SECTION 11: OUTPUT AKHIR / RINGKASAN DEVELOPER ──────────────────────────
function buildSection11() {
  const sitemap = [
    'Beranda',
    '  └── Hero Section, Statistik, Pengumuman, Berita, Bidang Fokus, Link Penting, Footer',
    'Profil LPPM',
    '  ├── Sejarah Singkat',
    '  ├── Visi, Misi, dan Tujuan',
    '  ├── Struktur Organisasi',
    '  ├── Tugas dan Fungsi',
    '  ├── Program Kerja (RKT)',
    '  └── Kontak dan Lokasi',
    'Roadmap',
    '  ├── Roadmap Penelitian 2025-2029',
    '  ├── Roadmap PkM 2025-2029',
    '  ├── Bidang Fokus Riset',
    '  └── Indikator Kinerja',
    'Penelitian',
    '  ├── Pedoman Penelitian',
    '  ├── Skema dan Hibah',
    '  ├── Jadwal Penelitian',
    '  ├── Daftar Penelitian Dosen',
    '  ├── Monev Penelitian',
    '  └── Template Penelitian',
    'Pengabdian kepada Masyarakat',
    '  ├── Pedoman PkM',
    '  ├── Skema PkM',
    '  ├── Jadwal PkM',
    '  ├── Daftar Kegiatan PkM',
    '  ├── Dampak dan Dokumentasi',
    '  ├── Monev PkM',
    '  └── Template PkM',
    'Publikasi dan Luaran',
    '  ├── Publikasi Dosen',
    '  ├── HKI (Hak Kekayaan Intelektual)',
    '  ├── Buku dan Prosiding',
    '  ├── Produk Inovasi',
    '  └── Rekap Luaran Tahunan',
    'Jurnal UnivSM',
    '  ├── Daftar Jurnal',
    '  ├── Petunjuk Penulis',
    '  ├── Indeksasi',
    '  └── Arsip Edisi',
    'Hibah, Insentif, dan Pendanaan',
    '  ├── Hibah Internal',
    '  ├── Hibah Eksternal',
    '  ├── Insentif Publikasi',
    '  └── Insentif HKI',
    'Dokumen dan Template',
    '  ├── SOP LPPM',
    '  ├── Template Penelitian',
    '  ├── Template PkM',
    '  └── Instrumen SPMI',
    'Monitoring dan Evaluasi',
    '  ├── Instrumen Monev',
    '  ├── Jadwal Monev',
    '  ├── Hasil Monev',
    '  ├── RTL',
    '  └── Dashboard Kinerja',
    'Kerja Sama',
    '  ├── MoU/MoA/IA',
    '  ├── Mitra Penelitian',
    '  ├── Mitra PkM',
    '  └── Survei Kepuasan Mitra',
    'Berita dan Agenda',
    '  ├── Berita Kegiatan',
    '  ├── Pengumuman',
    '  └── Kalender Agenda',
    'Galeri',
    '  ├── Foto Kegiatan',
    '  └── Video Kegiatan',
    'Repository Bukti Kinerja',
    '  ├── Bukti Penelitian',
    '  ├── Bukti PkM',
    '  ├── Bukti Publikasi/HKI',
    '  └── Rekap Tahunan',
    'Kontak dan Layanan',
    '  ├── Informasi Kontak',
    '  ├── Form Konsultasi',
    '  └── Jam Operasional',
  ];

  return [
    heading1('11. OUTPUT AKHIR: RINGKASAN UNTUK WEB DEVELOPER'),
    heading2('11.1 Ringkasan Konsep Website'),
    bodyPara('Website LPPM UnivSM adalah platform digital resmi yang berfungsi sebagai:'),
    bullet('Pusat informasi kegiatan penelitian dan pengabdian kepada masyarakat UnivSM.'),
    bullet('Portal layanan digital untuk dosen (proposal, laporan, template, konsultasi).'),
    bullet('Repository terstruktur untuk kebutuhan SPMI, AMI, RTM, dan akreditasi.'),
    bullet('Etalase kinerja LPPM: publikasi, HKI, kerja sama, dan luaran penelitian.'),
    bullet('Media komunikasi antara LPPM dengan dosen, mahasiswa, mitra, dan masyarakat.'),
    emptyLine(),

    heading2('11.2 Sitemap Lengkap'),
    bodyPara('Struktur navigasi website LPPM UnivSM secara keseluruhan:'),
    emptyLine(),
    new Paragraph({
      spacing: { before: 60, after: 120 },
      shading: { fill: 'F0F4F8', type: ShadingType.CLEAR },
      border: { left: { style: BorderStyle.SINGLE, size: 6, color: C.teal } },
      indent: { left: 180 },
      children: sitemap.map((line, i) => [
        new TextRun({
          text: line,
          size: 17,
          font: 'Courier New',
          color: line.startsWith('  ') ? C.mutedText : C.navyBlue,
          bold: !line.startsWith('  '),
          break: i > 0 ? 1 : 0,
        })
      ]).flat()
    }),
    emptyLine(),

    heading2('11.3 Prioritas Pengerjaan'),
    bodyPara('Urutan pengembangan yang direkomendasikan:'),
    numbered('Sprint 1 (2 minggu): Desain UI/UX, wireframe, setup server & domain (lppm.univsm.ac.id), instalasi CMS.'),
    numbered('Sprint 2 (2 minggu): Halaman Beranda, Profil LPPM, Roadmap, dan menu Kontak.'),
    numbered('Sprint 3 (2 minggu): Halaman Penelitian, PkM, Dokumen & Template, beserta sistem unduh.'),
    numbered('Sprint 4 (2 minggu): Halaman Publikasi & Luaran, Jurnal, Hibah & Insentif, Repository.'),
    numbered('Sprint 5 (2 minggu): Halaman Monev, Kerja Sama, Berita & Agenda, Galeri.'),
    numbered('Sprint 6 (1-2 minggu): Fitur form online (konsultasi, pengajuan), kalender, statistik, testing & QA.'),
    numbered('Launch: Soft launch internal, pengisian konten lengkap, lalu public launch.'),
    emptyLine(),

    heading2('11.4 Rekomendasi Fitur Teknis Minimum'),
    ...[
      'CMS berbasis panel admin untuk pengelolaan konten oleh staf LPPM (tanpa coding).',
      'Manajemen pengguna dengan setidaknya 2 peran: Admin LPPM dan Pengunjung/Dosen.',
      'Sistem unduhan dokumen terstruktur (PDF, DOCX) dengan logging jumlah unduhan.',
      'Form online dengan notifikasi email otomatis (konsultasi, pengajuan layanan).',
      'Kalender kegiatan terintegrasi dengan halaman berita/agenda.',
      'Galeri foto dengan fungsi lightbox dan pengelompokan per album.',
      'Widget statistik kinerja yang dapat diperbarui admin.',
      'SEO-friendly URL structure: lppm.univsm.ac.id/penelitian, /pkm, /publikasi, dll.',
      'SSL certificate (HTTPS), backup otomatis harian, dan proteksi keamanan dasar.',
      'Google Analytics atau Matomo untuk monitoring traffic website.',
    ].map(t => bullet(t)),
    emptyLine(),

    heading2('11.5 Catatan Penting untuk Developer'),
    ...[
      'Seluruh teks, gambar, dan dokumen yang ditampilkan harus mendapatkan persetujuan resmi dari LPPM sebelum dipublikasikan.',
      'Domain yang direkomendasikan: lppm.univsm.ac.id (subdomain dari domain utama univsm.ac.id).',
      'Gunakan format URL yang ramah SEO dan mudah dibaca (permalink: /penelitian/judul-penelitian).',
      'Semua file yang dapat diunduh harus diunggah dalam format yang terstandar (PDF untuk dokumen resmi, DOCX untuk template yang dapat diedit).',
      'Repository Bukti Kinerja sebaiknya dilindungi akses khusus (password-protected atau login) untuk menjaga privasi data tertentu.',
      'Perhatikan aksesibilitas: teks alternatif untuk gambar, kontras warna memadai, navigasi keyboard-friendly.',
      'Lakukan pengujian di berbagai browser (Chrome, Firefox, Edge, Safari) dan perangkat (desktop, tablet, mobile) sebelum launching.',
      'Buat dokumentasi teknis (admin manual) untuk staf LPPM yang akan mengelola konten website.',
    ].map(t => bullet(t)),
    emptyLine(),

    divider(),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: 'LPPM Universitas Sapta Mandiri', bold: true, size: 22, font: 'Arial', color: C.navyBlue })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: 'Dokumen Rancangan Website LPPM UnivSM — Versi 1.0 | Juni 2026', size: 18, font: 'Arial', color: C.mutedText })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 200 },
      children: [new TextRun({ text: 'Dokumen ini bersifat rahasia dan hanya untuk keperluan pengembangan internal.', size: 18, font: 'Arial', italics: true, color: C.mutedText })]
    }),
  ];
}

// ─── COVER PAGE ───────────────────────────────────────────────────────────────
function buildCover() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 200 },
      children: [new TextRun({ text: 'UNIVERSITAS SAPTA MANDIRI', bold: true, size: 28, font: 'Arial', color: C.navyBlue })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.teal } },
      children: [new TextRun({ text: 'Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM)', size: 22, font: 'Arial', color: C.teal })]
    }),
    new Paragraph({ spacing: { before: 600, after: 200 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [new TextRun({ text: 'RANCANGAN LENGKAP WEBSITE', bold: true, size: 48, font: 'Arial', color: C.navyBlue })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: 'LPPM UNIVERSITAS SAPTA MANDIRI', bold: true, size: 36, font: 'Arial', color: C.royalBlue })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 600 },
      children: [new TextRun({ text: '"Inovatif, Kolaboratif, Berdampak"', size: 26, font: 'Arial', italics: true, color: C.teal })]
    }),
    new Paragraph({ spacing: { before: 400, after: 120 }, border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.midGray } }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: 'Versi 1.0 | Juni 2026', size: 20, font: 'Arial', color: C.mutedText })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: 'Dokumen ini disusun sebagai panduan pengembangan website resmi LPPM UnivSM', size: 20, font: 'Arial', italics: true, color: C.mutedText })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: 'dan ditujukan untuk tim pengembang web, pengelola konten, serta pimpinan LPPM.', size: 20, font: 'Arial', italics: true, color: C.mutedText })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 40 },
      children: [new TextRun({ text: `Kepala LPPM: ${PEJABAT.ketua}`, size: 20, font: 'Arial', bold: true, color: C.navyBlue })]
    }),
    pageBreakPara(),
  ];
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const numberingConfig = [
  { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }, { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1120, hanging: 280 } } } }] },
  { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
  ...Array.from({ length: 4 }, (_, i) => ({
    reference: `bullets_${i}`,
    levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 280, hanging: 280 } } } }]
  }))
];

const doc = new Document({
  numbering: { config: numberingConfig },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 20, color: C.bodyText } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: C.navyBlue },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: C.royalBlue },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: C.teal },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.midGray } },
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: 'Rancangan Website LPPM Universitas Sapta Mandiri | 2026', size: 16, font: 'Arial', color: C.mutedText })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.midGray } },
          spacing: { before: 80, after: 0 },
          children: [
            new TextRun({ text: 'LPPM UnivSM  |  lppm.univsm.ac.id  |  Halaman ', size: 16, font: 'Arial', color: C.mutedText }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: C.mutedText }),
          ]
        })]
      })
    },
    children: [
      ...buildCover(),
      ...buildSection1(),
      pageBreakPara(),
      ...buildSection2(),
      pageBreakPara(),
      ...buildSection3(),
      pageBreakPara(),
      ...buildSection4(),
      pageBreakPara(),
      ...buildSection5(),
      pageBreakPara(),
      ...buildSection6(),
      pageBreakPara(),
      ...buildSection7(),
      pageBreakPara(),
      ...buildSection8(),
      pageBreakPara(),
      ...buildSection9(),
      pageBreakPara(),
      ...buildSection10(),
      pageBreakPara(),
      ...buildSection11(),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('Rancangan Website LPPM UnivSM.docx', buffer);
  console.log('SUCCESS: Rancangan Website LPPM UnivSM.docx created!');
}).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
