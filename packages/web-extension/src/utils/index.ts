import { PackageJson } from 'type-fest';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export async function fetchPackageVersions(packageName: string) {
  type Meta = {
    name: string;
    author: string;
    versions: Record<string, PackageJson>;
  };
  const meta = (await (
    await fetch(`https://registry.npmjs.org/${packageName}`)
  ).json()) as Meta;
  const versions = [];
  for (const version in meta.versions) versions.push(version);
  return versions.reverse();
}

export function getRecorderURL(version: string) {
  return `https://cdn.jsdelivr.net/npm/rrweb@${version}/dist/record/rrweb-record.min.js`;
}

export function getPlayerURL(version: string) {
  return `https://cdn.jsdelivr.net/npm/rrweb-player@${version}/dist/index.js`;
}

export async function verifyRecorderURL(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes('rrwebRecord') || text.includes('record');
  } catch (e) {
    return false;
  }
}

export async function verifyPlayerURL(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes('rrwebPlayer');
  } catch (e) {
    return false;
  }
}

export function formatTime(ms: number): string {
  if (ms <= 0) {
    return '00:00';
  }
  const hour = Math.floor(ms / HOUR);
  ms = ms % HOUR;
  const minute = Math.floor(ms / MINUTE);
  ms = ms % MINUTE;
  const second = Math.floor(ms / SECOND);
  if (hour) {
    return `${padZero(hour)}:${padZero(minute)}:${padZero(second)}`;
  }
  return `${padZero(minute)}:${padZero(second)}`;
}

function padZero(num: number, len = 2): string {
  let str = String(num);
  const threshold = Math.pow(10, len - 1);
  if (num < threshold) {
    while (String(threshold).length > str.length) {
      str = `0${num}`;
    }
  }
  return str;
}
