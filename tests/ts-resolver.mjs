import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  const { parentURL } = context;

  // Handle next/server
  if (specifier === 'next/server') {
    return nextResolve('next/server.js', context);
  }

  // Handle @/ alias
  if (specifier.startsWith('@/')) {
    const subpath = specifier.replace(/^@\//, '');
    const basePath = `${projectRoot}/src/${subpath}`;
    const candidates = [
      basePath + '.ts',
      basePath + '.tsx',
      basePath + '/index.ts',
      basePath + '/index.tsx',
    ];

    for (const c of candidates) {
      if (existsSync(c)) {
        return nextResolve(pathToFileURL(c).href, context);
      }
    }
  }

  if (!parentURL || (!specifier.startsWith('.') && !specifier.startsWith('/'))) {
    return nextResolve(specifier, context);
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err && (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT')) {
      const parentDir = new URL('.', parentURL);
      const targetUrl = new URL(specifier, parentDir);
      const targetPath = fileURLToPath(targetUrl);

      const candidates = [
        targetPath + '.ts',
        targetPath + '.tsx',
        targetPath + '/index.ts',
        targetPath + '/index.tsx',
      ];

      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    throw err;
  }
}

