import { appId, isAppInForeground, waitForAppInForeground } from '../../utils/device-helper';

// Smoke test: memastikan Appium berhasil connect ke device dan app terbuka, tanpa interaksi lain.
describe('App Launch', () => {
  it('should open the app on the device @smoke', async () => {
    const id = appId();
    await waitForAppInForeground(id);

    expect(await isAppInForeground(id)).toBe(true);
  });
});
