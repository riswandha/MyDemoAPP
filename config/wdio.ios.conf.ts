import path from 'path';
import { sharedConfig } from './wdio.shared.conf';
import { env } from '../utils/env';

// Config khusus iOS: meng-extend config bersama (wdio.shared.conf.ts) dan menambahkan capabilities
// XCUITest. DISIAPKAN untuk cross-platform, tapi BELUM bisa dijalankan sampai:
//   1. Slot `ios` di seluruh file locators/ diisi hasil inspeksi elemen di device iOS nyata (saat ini
//      masih penanda TODO_IOS - platformLocator() akan melempar error jika dipaksa run di iOS).
//   2. Build .app/.ipa tersedia dan variabel env iOS (IOS_DEVICE_NAME, IOS_PLATFORM_VERSION, IOS_UDID,
//      APP_PATH) diisi.
// Sengaja tidak menebak locator/capabilities iOS, sesuai aturan "selector dari inspeksi device nyata".
export const config: WebdriverIO.Config = {
  ...sharedConfig,

  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': env.ios.deviceName,
      'appium:platformVersion': env.ios.platformVersion,
      ...(env.ios.udid ? { 'appium:udid': env.ios.udid } : {}),
      ...(env.appPath ? { 'appium:app': path.resolve(process.cwd(), env.appPath) } : {}),
      'appium:bundleId': process.env.IOS_BUNDLE_ID, // isi bundle id app iOS di .env saat tersedia
      'appium:noReset': true,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 240,
      'appium:autoAcceptAlerts': true,
    },
  ],
};
