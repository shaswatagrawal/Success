#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Universal runner for development and test processes.
 * Ensures that if Node 22 (LTS) is installed in user profile, it is prioritized
 * in PATH so that better-sqlite3 native binaries load seamlessly without version mismatch.
 */
if (process.platform === 'win32' && process.env['LOCALAPPDATA']) {
  const node22Dir = path.join(process.env['LOCALAPPDATA'], 'Programs', 'node22');
  const node22Exe = path.join(node22Dir, 'node.exe');
  if (fs.existsSync(node22Exe)) {
    process.env['PATH'] = `${node22Dir}${path.delimiter}${process.env['PATH'] || ''}`;
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  process.exit(0);
}

const cmd = args[0];
const cmdArgs = args.slice(1);

const child = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
