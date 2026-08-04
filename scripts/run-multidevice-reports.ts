import path from 'path';
import http from 'http';
import { spawn, spawnSync } from 'child_process';
import { env, APP_PACKAGE_DEFAULT } from '../utils/env';

// Orchestrator laporan multi-device.
//
// Menjalankan SETIAP Test Case Collection (login, catalog, cart, checkout, menu) di SETIAP device pada
// ANDROID_DEVICES, secara berurutan, memakai satu Appium server bersama. Tiap run merekam screenshot +
// verifikasi ke reports/data/<collection>.<device-slug>.json (lihat report-client.ts). Setelah itu
// jalankan `npx ts-node scripts/build-collection-report.ts` untuk menggabungkannya jadi laporan
// HTML/PDF per collection dengan perbandingan antar device.
//
// PARALEL antar device (default): tiap device menjalankan collection-nya sebagai proses anak terpisah,
// dan semua device berjalan bersamaan (Promise.all) - satu Appium server bersama melayani beberapa
// sesi sekaligus (tiap device pakai systemPort unik). Global driver/$ tidak bentrok karena tiap run
// adalah PROSES terpisah. Di dalam satu device, collection tetap berurutan (satu device fisik, satu
// sesi pada satu waktu). Set REPORT_SEQUENTIAL=1 untuk memaksa berurutan penuh (log lebih rapi, tanpa
// device rebutan bandwidth USB saat ambil screenshot).

// Default semua collection; bisa dibatasi lewat argumen CLI (mis. `... run-multidevice-reports.ts login`).
const ALL_COLLECTIONS = ['login', 'catalog', 'cart', 'checkout', 'menu'];
const requestedCollections = process.argv.slice(2);
const COLLECTIONS = requestedCollections.length > 0 ? requestedCollections : ALL_COLLECTIONS;
const APPIUM_BIN = path.resolve(process.cwd(), 'node_modules/.bin/appium');
const APPIUM_HOME = process.env.APPIUM_HOME || path.resolve(process.cwd(), '.appium');
const APPIUM_HOST = env.appiumHost;
const APPIUM_PORT = env.appiumPort;
const APP_PACKAGE = env.appPackage || APP_PACKAGE_DEFAULT;
const BASE_SYSTEM_PORT = 8200;

function adbProp(udid: string, prop: string): string {
  const r = spawnSync('adb', ['-s', udid, 'shell', 'getprop', prop], { encoding: 'utf-8' });
  return (r.stdout || '').trim();
}

function appVersion(udid: string): string {
  const r = spawnSync('adb', ['-s', udid, 'shell', 'dumpsys', 'package', APP_PACKAGE], { encoding: 'utf-8' });
  const m = (r.stdout || '').match(/versionName=([^\s]+)/);
  return m ? m[1] : '';
}

function waitForAppium(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const url = `http://${APPIUM_HOST}:${APPIUM_PORT}/status`;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error('Appium server tidak siap dalam batas waktu'));
      setTimeout(tick, 1000);
    };
    tick();
  });
}

async function main() {
  const devices = env.androidDevices;
  if (devices.length === 0) {
    console.error('Tidak ada device di ANDROID_DEVICES/DEVICE_NAME.');
    process.exit(1);
  }

  console.log(`Menjalankan laporan untuk ${devices.length} device x ${COLLECTIONS.length} collection.\n`);

  // Metadata tiap device untuk ditampilkan di laporan (Device A/B, model, versi Android, versi app).
  const deviceInfos = devices.map((udid, i) => ({
    udid,
    label: `Device ${String.fromCharCode(65 + i)}`, // A, B, C, ...
    systemPort: BASE_SYSTEM_PORT + i,
    model: adbProp(udid, 'ro.product.model') || udid,
    platformVersion: adbProp(udid, 'ro.build.version.release'),
    appVersion: appVersion(udid),
  }));
  deviceInfos.forEach((d) =>
    console.log(`  ${d.label}: ${d.udid} | ${d.model} | Android ${d.platformVersion} | app v${d.appVersion}`)
  );

  console.log('\nMenyalakan Appium server lokal...');
  const appium = spawn(APPIUM_BIN, ['--address', APPIUM_HOST, '--port', String(APPIUM_PORT), '--base-path', '/'], {
    env: { ...process.env, APPIUM_HOME },
    stdio: 'ignore',
  });

  const failures: string[] = [];
  try {
    await waitForAppium(60000);
    console.log('Appium siap.\n');

    // Jalankan 1 collection di 1 device sebagai proses anak; resolve dengan exit code (tidak reject
    // supaya kegagalan satu run tidak menggagalkan Promise.all device lain).
    const runOnce = (collection: string, d: (typeof deviceInfos)[number]): Promise<number> =>
      new Promise((resolve) => {
        console.log(`>> START ${d.label} (${d.model}) - ${collection}`);
        const child = spawn('npx', ['ts-node', `scripts/collections/${collection}.report.ts`], {
          stdio: 'inherit',
          env: {
            ...process.env,
            APPIUM_HOME,
            TS_NODE_TRANSPILE_ONLY: '1',
            TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs","moduleResolution":"node"}',
            REPORT_LABEL: d.label,
            REPORT_UDID: d.udid,
            REPORT_SYSTEM_PORT: String(d.systemPort),
            REPORT_MODEL: d.model,
            REPORT_PLATFORM_VERSION: d.platformVersion,
            REPORT_APP_VERSION: d.appVersion,
          },
        });
        child.on('exit', (code) => resolve(code ?? 1));
        child.on('error', () => resolve(1));
      });

    // Pipeline satu device: semua collection berurutan (satu device fisik = satu sesi pada satu waktu).
    const runDevicePipeline = async (d: (typeof deviceInfos)[number]): Promise<void> => {
      for (const collection of COLLECTIONS) {
        const code = await runOnce(collection, d);
        if (code !== 0) {
          console.error(`>>> GAGAL: ${d.label}/${collection} (exit ${code})`);
          failures.push(`${d.label}/${collection}`);
        }
      }
    };

    if (process.env.REPORT_SEQUENTIAL === '1') {
      console.log('Mode BERURUTAN (REPORT_SEQUENTIAL=1): device satu per satu.\n');
      for (const d of deviceInfos) await runDevicePipeline(d);
    } else {
      console.log(`Mode PARALEL: ${deviceInfos.length} device berjalan bersamaan.\n`);
      await Promise.all(deviceInfos.map((d) => runDevicePipeline(d)));
    }
  } finally {
    appium.kill('SIGTERM');
  }

  console.log('\n==================== SELESAI CAPTURE ====================');
  if (failures.length > 0) {
    console.log(`Ada ${failures.length} run gagal: ${failures.join(', ')}`);
  } else {
    console.log('Semua run capture sukses.');
  }
  console.log('Bangun laporan: npx ts-node scripts/build-collection-report.ts');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
