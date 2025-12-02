import https from 'https';
import chalk from 'chalk';
import { version } from '../package.json';

export async function checkForUpdates(): Promise<void> {
  try {
    const data: any = await fetchJson('https://registry.npmjs.org/git-manager-pro/latest');
    if (!data) return;
    const latest = data.version as string | undefined;
    if (!latest) return;
    if (isNewer(latest, version)) {
      console.log(
        chalk.yellow(
          `\n⚠️  A new version of git-manager-pro is available: ${latest} (current ${version}).\n` +
          `   Run ${chalk.cyan('gmp update')} to upgrade.\n`
        )
      );
    }
  } catch {
    // Ignore network errors
  }
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    // Prefer global fetch if available (Node 18+)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any;
    if (typeof g.fetch === 'function') {
      const res = await g.fetch(url);
      if (!res.ok) return null;
      return await res.json();
    }
  } catch {
    // fall through to https
  }
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          resolve(null);
          res.resume();
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', () => resolve(null));
  });
}

function isNewer(a: string, b: string): boolean {
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function parse(v: string): number[] {
  return v.split('.').map(n => parseInt(n, 10));
}


