import path from 'path';
import http from 'http';
import { spawn, execFileSync } from 'child_process';
import { env } from '../utils/env';

// Orchestrator laporan iOS - padanan scripts/run-multidevice-reports.ts (Android) untuk platform iOS.
//
// BEDA STRUKTURAL dari orchestrator Android: TIDAK ADA konsep "banyak device paralel" di sini.
// Android punya ANDROID_DEVICES (daftar serial fisik/emulator dari `adb devices`) karena tim QA bisa
// menyambungkan beberapa device sekaligus dan membandingkan hasilnya. iOS run lokal/CI cuma memakai
// SATU simulator (env.ios.deviceName/platformVersion), jadi tidak ada orkestrasi multi-proses per
// device - setiap Test Case Collection dijalankan berurutan begitu saja di simulator yang sama.
//
// Menjalankan SETIAP Test Case Collection (login, catalog, cart, checkout, menu) di simulator iOS,
// memakai satu Appium server. Tiap run merekam screenshot + verifikasi ke
// reports/data/<collection>.ios.ios-simulator.json (lihat report-client.ts - REPORT_PLATFORM=ios
// membuat file & folder screenshot terpisah dari Android). Setelah itu jalankan
// `npm run report:build` untuk menggabungkannya jadi laporan HTML/PDF per collection (laporan iOS
// terpisah dari laporan Android, sesuai permintaan "2 laporan").

const ALL_COLLECTIONS = ['login', 'catalog', 'cart', 'checkout', 'menu'];
const requestedCollections = process.argv.slice(2);
const COLLECTIONS = requestedCollections.length > 0 ? requestedCollections : ALL_COLLECTIONS;
const APPIUM_BIN = path.resolve(process.cwd(), 'node_modules/.bin/appium');
const APPIUM_HOME = process.env.APPIUM_HOME || path.resolve(process.cwd(), '.appium');
const APPIUM_HOST = env.appiumHost;
const APPIUM_PORT = env.appiumPort;

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

// Versi app dari Info.plist DI DALAM .app bundle (kalau APP_PATH diisi) - hanya untuk DITAMPILKAN di
// laporan, sama sekali tidak mempengaruhi capability Appium. PlistBuddy adalah tool bawaan macOS,
// aman dipakai karena orchestrator ini toh cuma bisa jalan di macOS (simulator iOS).
function appVersionFromBundle(appPath: string): string {
  try {
    const infoPlist = path.join(appPath, 'Info.plist');
    const shortVersion = execFileSync(
      '/usr/libexec/PlistBuddy',
      ['-c', 'Print :CFBundleShortVersionString', infoPlist],
      { encoding: 'utf-8' }
    ).trim();
    const build = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleVersion', infoPlist], {
      encoding: 'utf-8',
    }).trim();
    return build && build !== shortVersion ? `${shortVersion} (build ${build})` : shortVersion;
  } catch {
    // Info.plist tidak terbaca (mis. APP_PATH tidak diisi, app sudah terpasang manual) - versi app
    // cukup dikosongkan di laporan, bukan menggagalkan seluruh capture.
    return '';
  }
}

async function main() {
  console.log(`Menjalankan laporan iOS untuk ${COLLECTIONS.length} collection di 1 simulator.\n`);

  const appVersion = env.appPath ? appVersionFromBundle(path.resolve(process.cwd(), env.appPath)) : '';
  console.log(`Simulator: ${env.ios.deviceName} | iOS ${env.ios.platformVersion} | app ${appVersion || '(tidak diketahui)'}\n`);

  console.log('Menyalakan Appium server lokal...');
  const appium = spawn(APPIUM_BIN, ['--address', APPIUM_HOST, '--port', String(APPIUM_PORT), '--base-path', '/'], {
    env: { ...process.env, APPIUM_HOME },
    stdio: 'ignore',
  });

  const failures: string[] = [];
  try {
    await waitForAppium(60000);
    console.log('Appium siap.\n');

    for (const collection of COLLECTIONS) {
      console.log(`>> START iOS Simulator - ${collection}`);
      const code = await new Promise<number>((resolve) => {
        const child = spawn('npx', ['ts-node', `scripts/collections/${collection}.report.ts`], {
          stdio: 'inherit',
          env: {
            ...process.env,
            APPIUM_HOME,
            TS_NODE_TRANSPILE_ONLY: '1',
            TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs","moduleResolution":"node"}',
            REPORT_PLATFORM: 'ios',
            REPORT_LABEL: 'iOS Simulator',
            REPORT_MODEL: env.ios.deviceName,
            REPORT_PLATFORM_VERSION: env.ios.platformVersion,
            REPORT_APP_VERSION: appVersion,
          },
        });
        child.on('exit', (c) => resolve(c ?? 1));
        child.on('error', () => resolve(1));
      });
      if (code !== 0) {
        console.error(`>>> GAGAL: iOS Simulator/${collection} (exit ${code})`);
        failures.push(`iOS Simulator/${collection}`);
      }
    }
  } finally {
    appium.kill('SIGTERM');
  }

  console.log('\n==================== SELESAI CAPTURE (iOS) ====================');
  if (failures.length > 0) {
    console.log(`Ada ${failures.length} run gagal: ${failures.join(', ')}`);
  } else {
    console.log('Semua run capture sukses.');
  }
  console.log('Bangun laporan: npm run report:build');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
