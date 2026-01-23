#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Run update-repo-urls
console.log('Running update:repo-urls...');
try {
  execSync('npm run update:repo-urls', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  // Continue even if update-repo-urls fails (e.g., in Docker/git clone without .git)
  console.warn('Warning: update:repo-urls failed, continuing...');
}

// Check if TypeScript is available
const typescriptPath = join(rootDir, 'node_modules', 'typescript');
const hasTypeScript = existsSync(typescriptPath);

// If TypeScript is not available, try to install devDependencies
// Note: We're in a temp directory during git installs, so this should be safe
if (!hasTypeScript) {
  console.log('TypeScript not found, checking if devDependencies need to be installed...');
  
  // Check if we're in a temp directory (typical for git installs)
  const isTempDir = rootDir.includes('.npm') || rootDir.includes('tmp') || rootDir.includes('cache');
  
  if (isTempDir) {
    // We're in a temp directory, safe to install devDependencies here
    try {
      // Read package.json to get devDependencies
      const packageJsonPath = join(rootDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const devDeps = packageJson.devDependencies || {};
      
      if (Object.keys(devDeps).length > 0) {
        console.log('Installing devDependencies in temp directory...');
        // Install devDependencies using npm install with specific packages
        const devDepList = Object.entries(devDeps)
          .map(([name, version]) => `${name}@${version}`)
          .join(' ');
        
        // Also explicitly install TypeScript since it might be a peer dependency
        execSync(`npm install --no-save --no-package-lock --legacy-peer-deps typescript@5.6.3 ${devDepList}`, {
          cwd: rootDir,
          stdio: 'inherit'
        });
      } else {
        // If no devDependencies, still install TypeScript
        console.log('Installing TypeScript...');
        execSync('npm install --no-save --no-package-lock --legacy-peer-deps typescript@5.6.3', {
          cwd: rootDir,
          stdio: 'inherit'
        });
      }
    } catch (error) {
      // If installation fails, npx will handle it in the build script
      console.warn('Warning: Could not install devDependencies, build will use npx...');
    }
  } else {
    // Not in temp directory, rely on npx
    console.log('Not in temp directory, build will use npx to find TypeScript...');
  }
}

// Run build (build script uses npx which will handle TypeScript automatically)
console.log('Running build...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
