#!/usr/bin/env bun
import * as fs from 'fs';
import * as path from 'path';
import { addSnapshot, listVersions, getVersion, resetToSnapshot, removeSnapshot } from './config/versions';

const arg = process.argv[2];

switch (arg) {
  case '--list':
    console.log('=== Histórico de Snapshots ===');
    const versions = listVersions();
    if (versions.length === 0) {
      console.log('Nenhum snapshot encontrado.');
    } else {
      versions.forEach((v, i) => {
        console.log(`\n${v.id}: ${v.description}`);
        console.log(`   Data: ${v.timestamp}`);
        console.log(`   Inclui layers: ${v.layersIncluded.join(', ')}`);
      });
    }
    break;

  case '--remove':
    const removeId = process.argv[3];
    if (!removeId) {
      console.error('Usage: bun snapshot.ts --remove <versionId>');
      process.exit(1);
    }
    removeSnapshot(removeId);
    break;

  case '--rollback':
    const rollbackId = process.argv[3];
    if (!rollbackId) {
      console.error('Usage: bun snapshot.ts --rollback <versionId>');
      process.exit(1);
    }
    resetToSnapshot(rollbackId);
    break;

  default:
    // Criar novo snapshot (modo padrão)
    const description = process.argv.slice(3).join(' ') || 'Snapshot automático';
    
    // Verifica quais layers estão disponíveis (pode ser lido de env var no futuro)
    // Por padrão, snapshot todas as layers ativas
    const layersIncluded = ['personal', 'general', 'dominio'];
    
    const versionId = addSnapshot(description, layersIncluded);
    
    const { getVersionsDir } = await import('./config/versions');
    const versionsBase = getVersionsDir();
    const targetDir = path.join(versionsBase, versionId);
    const sourceDir = path.resolve('./data/layers');
    fs.mkdirSync(targetDir, { recursive: true });
    if (fs.existsSync(sourceDir)) {
      fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
      console.log(`✅ Snapshot ${versionId} criado com sucesso!`);
      console.log(`   Local: ${targetDir}`);
      console.log(`   Descrição: ${description}`);
    } else {
      console.log(`✅ Snapshot ${versionId} registrado (sem dados legados ./data/layers para copiar).`);
      console.log(`   Local: ${targetDir}`);
    }
    break;
}