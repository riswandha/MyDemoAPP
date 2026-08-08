import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

interface StepRecord {
  no: number;
  caseId: string;
  description: string;
  screenshotRelPath: string;
}

interface VerificationRecord {
  caseId: string;
  item: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

interface CaseMeta {
  caseId: string;
  ref: string;
  title: string;
}

interface DeviceMeta {
  label: string;
  udid: string;
  model: string;
  platformVersion: string;
  appVersion: string;
}

interface DeviceDataset {
  collection: string;
  device: DeviceMeta;
  generatedAt: string;
  cases: CaseMeta[];
  steps: StepRecord[];
  verifications: VerificationRecord[];
}

interface CollectionMeta {
  displayName: string;
  subtitle: string;
  specFile: string;
}

// Metadata tampilan per Test Case Collection, selaras dengan suites di wdio.shared.conf.ts & tests/**/*.spec.ts
const COLLECTION_META: Record<string, CollectionMeta> = {
  login: {
    displayName: 'Login & Logout',
    subtitle: 'Fitur Login (TS001) - Sub Fitur Login (TC001-TC004) & Logout (TC005)',
    specFile: 'tests/login/login.spec.ts',
  },
  catalog: {
    displayName: 'Katalog Produk',
    subtitle: 'Fitur Katalog (TS002) - Daftar Produk, Detail Produk, Review Produk, Sort Produk',
    specFile: 'tests/catalog/catalog.spec.ts',
  },
  cart: {
    displayName: 'Keranjang Belanja (Cart)',
    subtitle: 'Fitur Cart (TS003) - Tambah Produk, Hapus Produk, Update Qty, Total Harga',
    specFile: 'tests/cart/cart.spec.ts',
  },
  checkout: {
    displayName: 'Checkout',
    subtitle: 'Fitur Checkout (TS004) - Place Order & Review Order',
    specFile: 'tests/checkout/checkout.spec.ts',
  },
  menu: {
    displayName: 'Menu',
    subtitle: 'Fitur Menu (TS005) - Webview, Drawing, Reset App State, About',
    specFile: 'tests/menu/menu.spec.ts',
  },
};

function esc(text: string): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function caseStatus(caseId: string, verifications: VerificationRecord[]): 'PASS' | 'FAIL' | 'INFO' {
  const items = verifications.filter((v) => v.caseId === caseId);
  if (items.length === 0) return 'INFO';
  return items.every((v) => v.status === 'PASS') ? 'PASS' : 'FAIL';
}

function deviceTotals(ds: DeviceDataset) {
  const totalVer = ds.verifications.length;
  const pass = ds.verifications.filter((v) => v.status === 'PASS').length;
  const fail = totalVer - pass;
  const casesFail = ds.cases.filter((c) => caseStatus(c.caseId, ds.verifications) === 'FAIL').length;
  const rate = totalVer > 0 ? ((pass / totalVer) * 100).toFixed(1) : '0.0';
  return { totalVer, pass, fail, casesFail, casesPass: ds.cases.length - casesFail, rate };
}

// Gabungan daftar case dari semua device (biasanya identik). Urutan mengikuti device pertama.
function unionCases(datasets: DeviceDataset[]): CaseMeta[] {
  const seen = new Set<string>();
  const out: CaseMeta[] = [];
  datasets.forEach((ds) =>
    ds.cases.forEach((c) => {
      if (!seen.has(c.caseId)) {
        seen.add(c.caseId);
        out.push(c);
      }
    })
  );
  return out;
}

// Tabel langkah: kolom No | Langkah | screenshot per device (berdampingan) - supaya terlihat "seperti
// apa" tampilan tiap device di langkah yang sama.
function stepsTable(caseId: string, datasets: DeviceDataset[]): string {
  // Kumpulkan semua nomor langkah untuk case ini dari semua device.
  const stepNos = new Set<number>();
  datasets.forEach((ds) => ds.steps.filter((s) => s.caseId === caseId).forEach((s) => stepNos.add(s.no)));
  const orderedNos = [...stepNos].sort((a, b) => a - b);
  if (orderedNos.length === 0) return '';

  const deviceHeaders = datasets.map((ds) => `<th class="col-shot">${esc(ds.device.label)}</th>`).join('');

  const rows = orderedNos
    .map((no) => {
      // Deskripsi langkah diambil dari device pertama yang punya langkah ini.
      let desc = '';
      const shots = datasets
        .map((ds) => {
          const s = ds.steps.find((x) => x.caseId === caseId && x.no === no);
          if (s && !desc) desc = s.description;
          return s
            ? `<td class="col-shot"><img src="${esc(s.screenshotRelPath)}" alt="${esc(ds.device.label)} step ${no}"></td>`
            : `<td class="col-shot col-empty">-</td>`;
        })
        .join('');
      return `<tr><td class="col-no">${no}</td><td class="col-desc">${esc(desc)}</td>${shots}</tr>`;
    })
    .join('');

  return `
    <h3>Langkah Pengujian per Device</h3>
    <table class="steps-table">
      <thead>
        <tr><th class="col-no">No</th><th class="col-desc">Langkah</th>${deviceHeaders}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// Tabel verifikasi: kolom No | Item | Expected | hasil per device (Actual + Status).
function verificationTable(caseId: string, datasets: DeviceDataset[]): string {
  // Daftar item verifikasi (urut dari device pertama yang punya case ini).
  const itemsOrder: string[] = [];
  const seen = new Set<string>();
  datasets.forEach((ds) =>
    ds.verifications
      .filter((v) => v.caseId === caseId)
      .forEach((v) => {
        if (!seen.has(v.item)) {
          seen.add(v.item);
          itemsOrder.push(v.item);
        }
      })
  );
  if (itemsOrder.length === 0) return '';

  const deviceHeaders = datasets.map((ds) => `<th>${esc(ds.device.label)}</th>`).join('');

  const rows = itemsOrder
    .map((item, i) => {
      let expected = '';
      const cells = datasets
        .map((ds) => {
          const v = ds.verifications.find((x) => x.caseId === caseId && x.item === item);
          if (v && !expected) expected = v.expected;
          if (!v) return `<td class="col-empty">-</td>`;
          return `<td><span class="status-${v.status.toLowerCase()}">${v.status}</span><br><span class="actual">${esc(v.actual)}</span></td>`;
        })
        .join('');
      return `<tr><td class="col-no">${i + 1}</td><td>${esc(item)}</td><td>${esc(expected)}</td>${cells}</tr>`;
    })
    .join('');

  return `
    <h3>Hasil Verifikasi Data per Device</h3>
    <table class="verify-table">
      <thead>
        <tr><th class="col-no">No</th><th>Item Verifikasi</th><th>Expected</th>${deviceHeaders}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildHtml(collection: string, datasets: DeviceDataset[], meta: CollectionMeta): string {
  const cases = unionCases(datasets);
  const totalCases = cases.length;
  const generatedDate = new Date(datasets[0].generatedAt).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // Ringkasan per device untuk cover.
  const deviceSummaryRows = datasets
    .map((ds) => {
      const t = deviceTotals(ds);
      return `<tr>
        <td><strong>${esc(ds.device.label)}</strong></td>
        <td>${esc(ds.device.model || ds.device.udid)}</td>
        <td>Android ${esc(ds.device.platformVersion || '-')}</td>
        <td>v${esc(ds.device.appVersion || '-')}</td>
        <td>${ds.cases.length}</td>
        <td>${t.totalVer}</td>
        <td class="status-pass">${t.pass}</td>
        <td class="status-fail">${t.fail}</td>
        <td>${t.rate}%</td>
      </tr>`;
    })
    .join('');

  // Badge status per device di daftar isi.
  const tocItems = cases
    .map((c) => {
      const badges = datasets
        .map((ds) => {
          const st = caseStatus(c.caseId, ds.verifications);
          return `<span class="toc-badge status-${st.toLowerCase()}">${esc(ds.device.label.replace('Device ', ''))}:${st}</span>`;
        })
        .join(' ');
      return `<li><a href="#case-${c.caseId.toLowerCase()}">${esc(c.ref)} - ${esc(c.title)}</a><span class="toc-badges">${badges}</span></li>`;
    })
    .join('');

  const sectionsHtml = cases
    .map((c) => {
      const badges = datasets
        .map((ds) => {
          const st = caseStatus(c.caseId, ds.verifications);
          return `<span class="badge status-${st.toLowerCase()}">${esc(ds.device.label)}: ${st}</span>`;
        })
        .join(' ');
      return `
    <section class="section" id="case-${c.caseId.toLowerCase()}">
      <h2>${esc(c.ref)} <span class="case-title">${esc(c.title)}</span></h2>
      <div class="case-badges">${badges}</div>
      ${verificationTable(c.caseId, datasets)}
      ${stepsTable(c.caseId, datasets)}
    </section>`;
    })
    .join('');

  // Kesimpulan: agregat lintas device + daftar item FAIL (dengan device-nya).
  const allFail: Array<{ device: string; v: VerificationRecord }> = [];
  datasets.forEach((ds) =>
    ds.verifications.filter((v) => v.status === 'FAIL').forEach((v) => allFail.push({ device: ds.device.label, v }))
  );
  const conclusionText =
    allFail.length === 0
      ? `Seluruh ${totalCases} test case pada Test Case Collection <strong>${esc(meta.displayName)}</strong> BERHASIL dijalankan di ${datasets.length} device (${datasets
          .map((d) => esc(d.device.label))
          .join(', ')}), dan seluruh item verifikasi menunjukkan hasil PASS di setiap device. Tidak ditemukan perbedaan perilaku antar device.`
      : `Terdapat ${allFail.length} item verifikasi berstatus FAIL yang tersebar di beberapa device (lihat tabel di bawah). Perbedaan hasil antar device dapat mengindikasikan ketergantungan pada versi OS/vendor dan perlu ditindaklanjuti.`;

  const failedListHtml =
    allFail.length > 0
      ? `<table class="verify-table">
        <thead><tr><th class="col-no">No</th><th>Device</th><th>Case</th><th>Item</th><th>Expected</th><th>Actual</th></tr></thead>
        <tbody>${allFail
          .map(
            (f, i) =>
              `<tr><td class="col-no">${i + 1}</td><td>${esc(f.device)}</td><td>${esc(f.v.caseId)}</td><td>${esc(f.v.item)}</td><td>${esc(f.v.expected)}</td><td>${esc(f.v.actual)}</td></tr>`
          )
          .join('')}</tbody></table>`
      : '';

  const deviceListLine = datasets
    .map((d) => `${esc(d.device.label)} (${esc(d.device.model || d.device.udid)}, Android ${esc(d.device.platformVersion)}, app v${esc(d.device.appVersion)})`)
    .join(' &nbsp;•&nbsp; ');

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Laporan Pengujian - ${esc(meta.displayName)}</title>
<style>
  @page { size: A4; margin: 16mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.5; margin: 0; }
  h1 { font-size: 24px; margin: 0 0 6px; }
  h2 { font-size: 17px; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 2px solid #1a7f4e; color: #1a7f4e; }
  h2 .case-title { color: #1a1a1a; font-weight: 400; font-size: 14px; }
  h3 { font-size: 13px; margin: 16px 0 8px; }
  .cover { display: flex; flex-direction: column; justify-content: center; min-height: 235mm; page-break-after: always; }
  .cover .subtitle { font-size: 14px; color: #555; margin-bottom: 4px; }
  .cover .meta { margin-top: 20px; font-size: 12px; color: #444; }
  .device-line { margin-top: 10px; font-size: 12px; color: #333; }
  .toc { page-break-after: always; }
  .toc ol { list-style: none; counter-reset: item; padding-left: 0; }
  .toc li { counter-increment: item; font-size: 12.5px; line-height: 1.8; border-bottom: 1px dashed #ddd; padding: 5px 0; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .toc li::before { content: counter(item) ". "; font-weight: 600; margin-right: 4px; }
  .toc a { color: #1a1a1a; text-decoration: none; flex: 1; }
  .toc-badges { display: flex; gap: 4px; flex-shrink: 0; }
  .toc-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px; }
  .summary-box { margin-top: 20px; border: 1px solid #ddd; border-radius: 6px; padding: 12px 14px; background: #f7faf8; }
  .summary-box table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .summary-box th { background: #1a7f4e; color: #fff; font-size: 10px; }
  .case-badges { margin-bottom: 10px; display: flex; gap: 6px; }
  .section { page-break-before: always; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #1a7f4e; color: #fff; font-size: 11px; }
  .steps-table tr, .verify-table tr { page-break-inside: avoid; }
  .col-no { width: 26px; text-align: center; }
  .col-shot { width: 165px; text-align: center; }
  .col-shot img { max-width: 155px; max-height: 340px; width: auto; height: auto; border: 1px solid #ddd; border-radius: 4px; }
  .col-empty { color: #aaa; text-align: center; }
  .col-desc { width: auto; }
  .actual { font-size: 11px; color: #333; }
  .status-pass { color: #1a7f4e; font-weight: 700; }
  .status-fail { color: #c0392b; font-weight: 700; }
  .status-info { color: #555; font-weight: 700; }
  .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
  .badge.status-pass, .toc-badge.status-pass { background: #e6f4ec; color: #1a7f4e; }
  .badge.status-fail, .toc-badge.status-fail { background: #fbe9e7; color: #c0392b; }
  .badge.status-info, .toc-badge.status-info { background: #eee; color: #555; }
  .conclusion { page-break-before: always; }
  .conclusion p { font-size: 13px; line-height: 1.7; }
  .conclusion .sync-note { margin-top: 16px; padding: 12px 16px; background: #f0f4ff; border-left: 3px solid #3355cc; font-size: 11.5px; color: #333; }
</style>
</head>
<body>

  <div class="cover">
    <h1>Laporan Hasil Pengujian Otomatis</h1>
    <div class="subtitle">Aplikasi: My Demo App (Sauce Labs) - Android</div>
    <div class="subtitle">Test Case Collection: ${esc(meta.displayName)}</div>
    <div class="subtitle">${esc(meta.subtitle)}</div>
    <div class="device-line"><strong>Dijalankan di ${datasets.length} device:</strong><br>${deviceListLine}</div>
    <div class="meta">
      Dibuat pada: ${esc(generatedDate)}<br>
      Sumber test script: <code>${esc(meta.specFile)}</code><br>
      Total test case per device: ${totalCases}
    </div>
    <div class="summary-box">
      <table>
        <thead>
          <tr><th>Device</th><th>Model</th><th>OS</th><th>App</th><th>Case</th><th>Verif</th><th>Pass</th><th>Fail</th><th>Rate</th></tr>
        </thead>
        <tbody>${deviceSummaryRows}</tbody>
      </table>
    </div>
  </div>

  <div class="toc">
    <h2>Daftar Isi</h2>
    <ol>${tocItems}</ol>
  </div>

  ${sectionsHtml}

  <section class="conclusion">
    <h2>Kesimpulan</h2>
    <p>${conclusionText}</p>
    ${failedListHtml}
    <div class="sync-note">
      Catatan: seluruh langkah, data, dan verifikasi dijalankan langsung terhadap masing-masing device
      fisik memakai page object &amp; test data yang sama persis dengan test script asli di
      <code>${esc(meta.specFile)}</code> (suite: <code>${esc(collection)}</code>). Kolom per device pada
      tabel di atas memperlihatkan hasil yang benar-benar terjadi di tiap device, sehingga perbedaan
      perilaku antar device (versi OS/vendor) langsung terlihat.
    </div>
  </section>

</body>
</html>`;
}

function renderPdf(htmlFile: string, pdfFile: string): void {
  // Kandidat lokasi Chrome/Chromium: macOS (run lokal) lalu Linux (runner CI). CHROME_PATH dicoba
  // paling awal supaya bisa dioverride tanpa mengubah kode bila binary ada di lokasi tidak standar.
  const chromeCandidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter((p): p is string => Boolean(p));
  const chromePath = chromeCandidates.find((p) => fs.existsSync(p));
  if (!chromePath) {
    throw new Error(
      `Chrome/Chromium tidak ditemukan. Lokasi yang dicoba:\n${chromeCandidates.join('\n')}\n` +
        'Set env CHROME_PATH ke binary Chrome bila terpasang di lokasi lain.'
    );
  }
  execFileSync(chromePath, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfFile}`,
    '--print-to-pdf-no-header',
    '--no-sandbox',
    `file://${htmlFile}`,
  ]);
}

function loadDeviceDatasets(dataDir: string, collection: string): DeviceDataset[] {
  if (!fs.existsSync(dataDir)) return [];
  // Hanya file per-device: <collection>.<device-slug>.json (dua titik). Sengaja mengecualikan file
  // lama format single-device <collection>.json (tanpa slug/metadata device).
  const pattern = new RegExp(`^${collection}\\.[a-z0-9-]+\\.json$`);
  const files = fs.readdirSync(dataDir).filter((f) => pattern.test(f));
  const datasets = files
    .map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf-8')) as DeviceDataset)
    .filter((ds) => ds && ds.device && ds.device.label);
  // Urutkan berdasarkan label device (Device A, B, C ...).
  datasets.sort((a, b) => (a.device?.label || '').localeCompare(b.device?.label || ''));
  return datasets;
}

function main() {
  const reportDir = path.resolve(__dirname, '../reports');
  const dataDir = path.join(reportDir, 'data');
  const requested = process.argv.slice(2);
  const collections = requested.length > 0 ? requested : Object.keys(COLLECTION_META);

  for (const collection of collections) {
    const datasets = loadDeviceDatasets(dataDir, collection);
    if (datasets.length === 0) {
      console.warn(`Skip "${collection}": tidak ada data device (jalankan scripts/run-multidevice-reports.ts dulu).`);
      continue;
    }
    const meta = COLLECTION_META[collection];
    if (!meta) {
      console.warn(`Skip "${collection}": tidak ada metadata tampilan terdaftar.`);
      continue;
    }
    const html = buildHtml(collection, datasets, meta);

    const titleCase = collection.charAt(0).toUpperCase() + collection.slice(1);
    const htmlFile = path.join(reportDir, `${titleCase}-Report.html`);
    const pdfFile = path.join(reportDir, `${titleCase}-Report.pdf`);
    fs.writeFileSync(htmlFile, html);
    console.log(`HTML report tersimpan di: ${htmlFile} (${datasets.length} device)`);

    renderPdf(htmlFile, pdfFile);
    console.log(`PDF report tersimpan di: ${pdfFile}`);
  }
}

main();
