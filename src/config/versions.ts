import * as fs from 'fs';
import * as path from 'path';
import { getRaggaiHome } from './raggai-paths';

const VERSIONS_DIR = path.join(getRaggaiHome(), 'versions');
const MANIFEST_PATH = path.join(VERSIONS_DIR, 'manifest.json');

export interface VersionEntry {
  id: string;
  timestamp: string;
  description: string;
  layersIncluded: string[];
  note: string;
  domains?: string[];
}

export interface VersionManifest {
  versions: VersionEntry[];
  lastCleaned: string;
}

function ensureDir() {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

function readManifest(): VersionManifest {
  ensureDir();
  if (fs.existsSync(MANIFEST_PATH)) {
    try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")); } catch {}
  }
  const m: VersionManifest = { versions: [], lastCleaned: new Date().toISOString() };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2));
  return m;
}

function writeManifest(manifest: VersionManifest) {
  ensureDir();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

export function addSnapshot(description: string, layersIncluded: string[] = ['personal', 'general', 'dominio']): string {
  const manifest = readManifest();
  const newId = `v${manifest.versions.length + 1}`;
  const newEntry: VersionEntry = {
    id: newId,
    timestamp: new Date().toISOString(),
    description: description || `Automatic snapshot at ${new Date().toLocaleString()}`,
    layersIncluded,
    note: description,
  };
  manifest.versions.push(newEntry);
  if (manifest.versions.length > 20) {
    const removed = manifest.versions.shift();
    if (removed) {
      const oldDir = path.join(VERSIONS_DIR, removed.id);
      if (fs.existsSync(oldDir)) fs.rmSync(oldDir, { recursive: true, force: true });
    }
  }
  writeManifest(manifest);
  return newId;
}

export function listVersions(): VersionEntry[] {
  return readManifest().versions;
}

export function getVersion(id: string): VersionEntry | null {
  return readManifest().versions.find(v => v.id === id) || null;
}

export function getVersionsDir() { return VERSIONS_DIR; }

// --- Funções de Utilidade de Pasta ---

export function resetToSnapshot(versionId: string): boolean {
  const version = getVersion(versionId);
  if (!version) { console.error(`Version ${versionId} not found.`); return false; }
  const versionDir = path.join(VERSIONS_DIR, versionId);
  if (!fs.existsSync(versionDir)) { console.error(`Snapshot data for ${versionId} not found.`); return false; }
  // Legacy-compatible no-op for now: domain-aware rollback requires selecting target domain(s).
  // Keep API stable; callers can manage domain dirs directly.
  console.log(`Snapshot ${versionId} available at: ${versionDir}`);
  console.log('Automatic multi-domain rollback not applied (requires domain selection).');
  return false;
}

export function removeSnapshot(versionId: string): boolean {
  const manifest = readManifest();
  const version = manifest.versions.find(v => v.id === versionId);
  if (!version) { console.error(`Version ${versionId} not found.`); return false; }
  const versionDir = path.join(VERSIONS_DIR, versionId);
  if (fs.existsSync(versionDir)) fs.rmSync(versionDir, { recursive: true, force: true });
  manifest.versions = manifest.versions.filter(v => v.id !== versionId);
  writeManifest(manifest);
  return true;
}