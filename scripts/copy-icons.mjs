import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const sourceRoot = existsSync(path.join(packageDir, 'src')) ? 'src' : '.';
const mappings = [
  ['credentials', 'credentials'],
  ['nodes/GroupiseSend', 'nodes/GroupiseSend'],
  ['nodes/GroupiseTrigger', 'nodes/GroupiseTrigger'],
];

for (const [sourceDirectory, outputDirectory] of mappings) {
  const source = path.join(packageDir, sourceRoot, sourceDirectory, 'groupise.svg');
  const destination = path.join(packageDir, 'dist', outputDirectory, 'groupise.svg');
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
