#!/usr/bin/env node

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Check for TypeScript binary
const tscPath = join(rootDir, 'node_modules', '.bin', 'tsc');
const typescriptPath = join(rootDir, 'node_modules', 'typescript');
const tscBinPath = join(typescriptPath, 'bin', 'tsc');

let tscCommand = 'npx -y typescript@5.6.3 tsc';

if (existsSync(tscPath)) {
  // Use local TypeScript binary symlink
  tscCommand = tscPath;
  console.log('Using local TypeScript compiler from node_modules/.bin...');
} else if (existsSync(tscBinPath)) {
  // TypeScript is installed but binary symlink might not exist, use node to run it directly
  tscCommand = `node ${tscBinPath}`;
  console.log('Using TypeScript from node_modules/typescript/bin/tsc...');
} else if (existsSync(typescriptPath)) {
  // TypeScript package exists but bin/tsc doesn't, try lib/tsc.js or use npx
  const tscLibPath = join(typescriptPath, 'lib', 'tsc.js');
  if (existsSync(tscLibPath)) {
    tscCommand = `node ${tscLibPath}`;
    console.log('Using TypeScript from node_modules/typescript/lib/tsc.js...');
  } else {
    console.log('TypeScript package found but binary not located, using npx...');
  }
} else {
  console.log('TypeScript not found locally, using npx to download temporarily...');
}

// Check for oclif binary
const oclifPath = join(rootDir, 'node_modules', '.bin', 'oclif');
let oclifCommand = existsSync(oclifPath) ? oclifPath : 'npx oclif';

// Run TypeScript compiler
console.log('Compiling TypeScript...');
try {
  execSync(`${tscCommand} -p .`, { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Run oclif manifest
console.log('Generating oclif manifest...');
try {
  execSync(`${oclifCommand} manifest`, { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('oclif manifest generation failed:', error.message);
  process.exit(1);
}

console.log('Build completed successfully!');
