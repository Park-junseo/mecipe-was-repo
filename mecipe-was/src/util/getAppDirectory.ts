import * as path from 'path';

export function getAppDirectory() {
  const appDir = path.dirname(path.join(require.main.filename, '..'));
  // const appDir = path.resolve('./');
  return appDir;
}
