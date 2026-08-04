import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

interface StepRecord {
  no: number;
  section: string;
  description: string;
  screenshotRelPath: string;
}

interface VerificationRecord {
  section: string;
  item: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

interface ReportData {
  generatedAt: string;
  steps: StepRecord[];
  verifications: VerificationRecord[];
}

const reportDir = path.resolve(__dirname, '../reports');
const dataFile = path.join(reportDir, 'report-data.json');
const htmlFile = path.join(reportDir, 'Test-Report.html');
const pdfFile = path.join(reportDir, 'Test-Report.pdf');

const data: ReportData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

const SECTIONS = ['Login', 'Checkout', 'Logout'] as const;
const SECTION_TITLE: Record<string, string> = {
  Login: '1. Login',
  Checkout: '2. Checkout',
  Logout: '3. Logout',
};

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stepsTable(section: string): string {
  const rows = data.steps
    .filter((s) => s.section === section)
    .map(
      (s) => `
      <tr>
        <td class="col-no">${s.no}</td>
        <td class="col-shot"><img src="${esc(s.screenshotRelPath)}" alt="Step ${s.no}"></td>
        <td class="col-desc">${esc(s.description)}</td>
      </tr>`
    )
    .join('');
  return `
    <table class="steps-table">
      <thead>
        <tr><th class="col-no">No</th><th class="col-shot">Screenshot</th><th class="col-desc">Langkah</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function verificationTable(section: string): string {
  const items = data.verifications.filter((v) => v.section === section);
  if (items.length === 0) return '';
  const rows = items
    .map(
      (v, i) => `
      <tr>
        <td class="col-no">${i + 1}</td>
        <td>${esc(v.item)}</td>
        <td>${esc(v.expected)}</td>
        <td>${esc(v.actual)}</td>
        <td class="status-${v.status.toLowerCase()}">${v.status}</td>
      </tr>`
    )
    .join('');
  return `
    <h3>Hasil Verifikasi Data</h3>
    <table class="verify-table">
      <thead>
        <tr><th class="col-no">No</th><th>Item Verifikasi</th><th>Expected</th><th>Actual</th><th>Status</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

const totalSteps = data.steps.length;
const totalVerifications = data.verifications.length;
const totalPass = data.verifications.filter((v) => v.status === 'PASS').length;
const totalFail = totalVerifications - totalPass;

const generatedDate = new Date(data.generatedAt).toLocaleString('id-ID', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const sectionsHtml = SECTIONS.map(
  (section) => `
  <section class="section" id="section-${section.toLowerCase()}">
    <h2>${SECTION_TITLE[section]}</h2>
    ${stepsTable(section)}
    ${verificationTable(section)}
  </section>`
).join('');

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Laporan Pengujian - Login, Checkout, Logout</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.5; margin: 0; }
  h1 { font-size: 24px; margin: 0 0 6px; }
  h2 { font-size: 18px; margin: 0 0 12px; padding-bottom: 6px; border-bottom: 2px solid #1a7f4e; color: #1a7f4e; }
  h3 { font-size: 14px; margin: 18px 0 8px; }
  .cover { display: flex; flex-direction: column; justify-content: center; min-height: 240mm; page-break-after: always; }
  .cover .subtitle { font-size: 14px; color: #555; margin-bottom: 4px; }
  .cover .meta { margin-top: 24px; font-size: 12px; color: #444; }
  .toc { page-break-after: always; }
  .toc ol { font-size: 14px; line-height: 2.2; padding-left: 20px; }
  .toc a { color: #1a1a1a; text-decoration: none; }
  .toc .toc-sub { font-size: 12px; color: #555; margin-left: 8px; }
  .summary-box { margin-top: 24px; border: 1px solid #ddd; border-radius: 6px; padding: 14px 18px; background: #f7faf8; }
  .summary-box table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .summary-box td { padding: 3px 0; }
  .section { page-break-before: always; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #1a7f4e; color: #fff; font-size: 11px; }
  .steps-table tr { page-break-inside: avoid; }
  .col-no { width: 28px; text-align: center; }
  .col-shot { width: 200px; text-align: center; }
  .col-shot img { max-width: 190px; max-height: 410px; width: auto; height: auto; border: 1px solid #ddd; border-radius: 4px; }
  .col-desc { width: auto; }
  .verify-table tr { page-break-inside: avoid; }
  .status-pass { color: #1a7f4e; font-weight: 600; }
  .status-fail { color: #c0392b; font-weight: 600; }
  footer.page-footer { margin-top: 24px; font-size: 10px; color: #888; }
</style>
</head>
<body>

  <div class="cover">
    <h1>Laporan Hasil Pengujian Otomatis</h1>
    <div class="subtitle">Aplikasi: My Demo App (Sauce Labs) - Android</div>
    <div class="subtitle">Skenario: Login &rarr; Checkout &rarr; Logout</div>
    <div class="meta">
      Dibuat pada: ${esc(generatedDate)}<br>
      Total langkah terekam: ${totalSteps}<br>
      Total item verifikasi: ${totalVerifications} (Pass: ${totalPass}, Fail: ${totalFail})
    </div>
  </div>

  <div class="toc">
    <h2>Daftar Isi</h2>
    <ol>
      <li><a href="#section-login">Login</a><div class="toc-sub">Login dengan akun valid &amp; verifikasi status login</div></li>
      <li><a href="#section-checkout">Checkout</a><div class="toc-sub">Belanja Sauce Labs Backpack x2, isi alamat &amp; pembayaran, verifikasi harga tiap halaman, hingga Checkout Complete</div></li>
      <li><a href="#section-logout">Logout</a><div class="toc-sub">Logout &amp; verifikasi status login</div></li>
    </ol>
    <div class="summary-box">
      <table>
        <tr><td><strong>Total Step</strong></td><td>${totalSteps}</td></tr>
        <tr><td><strong>Total Verifikasi</strong></td><td>${totalVerifications}</td></tr>
        <tr><td><strong>Pass</strong></td><td class="status-pass">${totalPass}</td></tr>
        <tr><td><strong>Fail</strong></td><td class="status-fail">${totalFail}</td></tr>
      </table>
    </div>
  </div>

  ${sectionsHtml}

</body>
</html>`;

fs.writeFileSync(htmlFile, html);
console.log(`HTML report tersimpan di: ${htmlFile}`);

const chromeCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const chromePath = chromeCandidates.find((p) => fs.existsSync(p));
if (!chromePath) {
  throw new Error('Google Chrome tidak ditemukan di lokasi standar macOS.');
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

console.log(`PDF report tersimpan di: ${pdfFile}`);
