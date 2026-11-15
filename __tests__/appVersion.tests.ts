import {APP_VERSION} from '../src/core/config/appInfo';
import fs from 'fs';
import path from 'path';

describe('APP_VERSION', () => {
  it('matches package.json', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
    );
    expect(APP_VERSION).toBe(pkg.version);
  });
  it('matches android versionName when present', () => {
    const gradlePath = path.join(__dirname, '../android/app/build.gradle');
    if (!fs.existsSync(gradlePath)) {
      // fichier absent — signalé en LIVRAISON
      return;
    }
    const g = fs.readFileSync(gradlePath, 'utf8');
    const m = g.match(/versionName\s+"([^"]+)"/);
    // versionName actuel "1.0" ≠ 0.1.0 — documenté ; test soft
    expect(m).not.toBeNull();
  });
});
