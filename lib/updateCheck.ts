import fetch from 'node-fetch';
import chalk from 'chalk';
import { version } from '../package.json';

export async function checkForUpdates(): Promise<void> {
  try {
    const res = await fetch('https://registry.npmjs.org/git-manager-pro/latest');
    if (!res.ok) return;
    const data: any = await res.json();
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


