#!/usr/bin/env node

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Check if TypeScript is installed
const typescriptPath = join(rootDir, 'node_modules', 'typescript');
const hasTypeScript = existsSync(typescriptPath);

// Run update-repo-urls
console.log('Running update:repo-urls...');
try {
  execSync('npm run update:repo-urls', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  // Continue even if update-repo-urls fails (e.g., in Docker/git clone without .git)
  console.warn('Warning: update:repo-urls failed, continuing...');
}

// Install devDependencies if TypeScript is not available
if (!hasTypeScript) {
  console.log('TypeScript not found, installing devDependencies...');
  try {
    execSync('npm install --include=dev', { cwd: rootDir, stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to install devDependencies:', error.message);
    process.exit(1);
  }
}

// Run build
console.log('Running build...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
