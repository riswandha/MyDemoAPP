import path from 'path';
import fs from 'fs';

// Membaca hasil mentah Allure (reports/allure-results/*-result.json) dan meringkasnya jadi tabel
// Markdown untuk GitHub Actions Job Summary ($GITHUB_STEP_SUMMARY) - supaya hasil run terlihat
// langsung di halaman run tanpa perlu download artifact & buka HTML report.
//
// Script ini TIDAK pernah menggagalkan job (selalu exit 0): status pass/fail sudah ditentukan oleh
// step `wdio run` sebelumnya. Ini murni pelaporan.

type AllureStatus = 'passed' | 'failed' | 'broken' | 'skipped';

interface AllureResult {
  name?: string;
  fullName?: string;
  historyId?: string;
  status?: AllureStatus;
  start?: number;
  stop?: number;
}

interface SuiteSummary {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  failedTests: string[];
}

const resultsDir = path.resolve(__dirname, '../reports/allure-results');

function readResults(dir: string): AllureResult[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('-result.json'))
    .flatMap((f) => {
      try {
        return [JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as AllureResult];
      } catch {
        // File hasil yang korup (mis. run terpotong) dilewati saja, jangan bikin summary gagal total.
        return [];
      }
    });
}

// `specFileRetries: 1` di config membuat spec yang gagal dijalankan ulang, sehingga satu test bisa
// punya BEBERAPA file hasil. Ambil percobaan TERAKHIR per historyId supaya test yang akhirnya lolos
// saat retry tidak terhitung gagal - ini yang mencerminkan hasil akhir run.
function keepLastAttempt(results: AllureResult[]): AllureResult[] {
  const latest = new Map<string, AllureResult>();
  for (const r of results) {
    const key = r.historyId || r.fullName || r.name || '';
    const prev = latest.get(key);
    if (!prev || (r.start ?? 0) >= (prev.start ?? 0)) latest.set(key, r);
  }
  return [...latest.values()];
}

// fullName berbentuk "tests/login/login.spec.ts#Login Feature.should ..." - bagian sebelum '#'
// adalah spec file-nya, dipakai sebagai nama suite agar selaras dengan pengelompokan per fitur.
function suiteOf(result: AllureResult): string {
  const full = result.fullName || '';
  const specFile = full.includes('#') ? full.split('#')[0] : '';
  if (!specFile) return 'unknown';
  return path.basename(path.dirname(specFile));
}

function summarize(results: AllureResult[]): SuiteSummary[] {
  const bySuite = new Map<string, SuiteSummary>();
  for (const r of results) {
    const suite = suiteOf(r);
    const entry = bySuite.get(suite) ?? {
      suite,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      failedTests: [],
    };
    entry.durationMs += Math.max(0, (r.stop ?? 0) - (r.start ?? 0));
    if (r.status === 'passed') entry.passed += 1;
    else if (r.status === 'skipped') entry.skipped += 1;
    else {
      // 'failed' (assertion gagal) dan 'broken' (error tak terduga) sama-sama dihitung gagal.
      entry.failed += 1;
      entry.failedTests.push(r.name || r.fullName || '(tanpa nama)');
    }
    bySuite.set(suite, entry);
  }
  return [...bySuite.values()].sort((a, b) => a.suite.localeCompare(b.suite));
}

function fmtDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function buildMarkdown(summaries: SuiteSummary[]): string {
  const lines: string[] = [];
  const platform = process.env.SUMMARY_PLATFORM || 'Android';
  const label = process.env.SUMMARY_LABEL;

  lines.push(`## Hasil Test ${platform}${label ? ` - ${label}` : ''}`, '');

  if (summaries.length === 0) {
    lines.push('Tidak ada hasil test yang ditemukan di `reports/allure-results`.');
    return lines.join('\n');
  }

  const total = summaries.reduce(
    (acc, s) => ({
      passed: acc.passed + s.passed,
      failed: acc.failed + s.failed,
      skipped: acc.skipped + s.skipped,
      durationMs: acc.durationMs + s.durationMs,
    }),
    { passed: 0, failed: 0, skipped: 0, durationMs: 0 }
  );
  const totalTests = total.passed + total.failed + total.skipped;

  lines.push(
    total.failed === 0
      ? `**${total.passed}/${totalTests} test lolos** dalam ${fmtDuration(total.durationMs)}.`
      : `**${total.failed} dari ${totalTests} test gagal** dalam ${fmtDuration(total.durationMs)}.`,
    '',
    '| Suite | Lolos | Gagal | Dilewati | Durasi |',
    '| --- | ---: | ---: | ---: | ---: |'
  );

  for (const s of summaries) {
    lines.push(
      `| ${s.suite} | ${s.passed} | ${s.failed} | ${s.skipped} | ${fmtDuration(s.durationMs)} |`
    );
  }

  const allFailed = summaries.flatMap((s) => s.failedTests.map((t) => `${s.suite}: ${t}`));
  if (allFailed.length > 0) {
    lines.push('', '### Test yang gagal', '');
    for (const t of allFailed) lines.push(`- ${t}`);
    lines.push('', 'Screenshot kegagalan tersedia di artifact `allure-results`.');
  }

  return lines.join('\n');
}

const markdown = buildMarkdown(summarize(keepLastAttempt(readResults(resultsDir))));
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

if (summaryFile) {
  fs.appendFileSync(summaryFile, `${markdown}\n`);
  console.log('Job summary ditulis ke $GITHUB_STEP_SUMMARY.');
} else {
  // Di luar GitHub Actions (mis. dijalankan lokal untuk cek format), cukup cetak ke stdout.
  console.log(markdown);
}
