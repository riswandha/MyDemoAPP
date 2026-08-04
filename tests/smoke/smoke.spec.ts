import { getCurrentPackage } from '../../utils/device-helper';
import { APP_PACKAGE_DEFAULT } from '../../utils/env';

// Smoke test: memastikan Appium berhasil connect ke device dan app terbuka, tanpa interaksi lain.
describe('App Launch', () => {
  it('should open the app on the device @smoke', async () => {
    await browser.pause(3000);
    const currentPackage = await getCurrentPackage();
    expect(currentPackage).toBe(APP_PACKAGE_DEFAULT);
  });
});
