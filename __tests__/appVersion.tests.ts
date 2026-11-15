import {APP_VERSION} from '../src/core/config/appInfo';
import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
);

describe('APP_VERSION', () => {
  it('vaut la version de package.json', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('versionName Android vaut la version de package.json (strict)', () => {
    const gradlePath = path.join(__dirname, '../android/app/build.gradle');
    // Le fichier doit exister : son absence est une erreur, pas un cas ignoré.
    expect(fs.existsSync(gradlePath)).toBe(true);
    const gradle = fs.readFileSync(gradlePath, 'utf8');
    const match = gradle.match(/versionName\s+"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(pkg.version);
  });
});
