import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const sourceRoot = existsSync(path.join(packageDir, 'src')) ? 'src' : '.';
const iconNames = ['groupise.svg', 'groupise.dark.svg'];
const directories = ['credentials', 'nodes/GroupiseSend', 'nodes/GroupiseTrigger'];

for (const directory of directories) {
  for (const iconName of iconNames) {
    const source = path.join(packageDir, sourceRoot, directory, iconName);
    const destination = path.join(packageDir, 'dist', directory, iconName);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}
