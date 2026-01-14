#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');

/**
 * Extracts repository information from git remote URL
 * Supports multiple git hosting providers:
 * - GitHub: https://github.com/owner/repo.git or git@github.com:owner/repo.git
 * - GitLab: https://gitlab.com/owner/repo.git or git@gitlab.com:owner/repo.git
 * - Azure DevOps: https://dev.azure.com/org/project/_git/repo or git@ssh.dev.azure.com:v3/org/project/repo
 * - Bitbucket: https://bitbucket.org/owner/repo.git or git@bitbucket.org:owner/repo.git
 */
function getRepoInfo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    // GitHub - SSH format: git@github.com:owner/repo.git
    let match = remoteUrl.match(/git@github\.com:(.+?)(?:\.git)?$/);
    if (match) {
      const [owner, repo] = match[1].split('/');
      return { provider: 'github', owner, repo };
    }

    // GitHub - HTTPS format: https://github.com/owner/repo.git
    match = remoteUrl.match(/https?:\/\/(?:www\.)?github\.com\/(.+?)(?:\.git)?$/);
    if (match) {
      const [owner, repo] = match[1].split('/');
      return { provider: 'github', owner, repo };
    }

    // GitLab - SSH format: git@gitlab.com:owner/repo.git
    match = remoteUrl.match(/git@gitlab\.com:(.+?)(?:\.git)?$/);
    if (match) {
      const [owner, repo] = match[1].split('/');
      return { provider: 'gitlab', owner, repo };
    }

    // GitLab - HTTPS format: https://gitlab.com/owner/repo.git
    match = remoteUrl.match(/https?:\/\/(?:www\.)?gitlab\.com\/(.+?)(?:\.git)?$/);
    if (match) {
      const [owner, repo] = match[1].split('/');
      return { provider: 'gitlab', owner, repo };
    }

    // Azure DevOps - SSH format: git@ssh.dev.azure.com:v3/org/project/repo
    match = remoteUrl.match(/git@ssh\.dev\.azure\.com:v3\/(.+?)$/);
    if (match) {
      const parts = match[1].split('/');
      if (parts.length >= 3) {
        const [org, project, repo] = parts;
        return { provider: 'azure', org, project, repo };
      }
    }

    // Azure DevOps - HTTPS format: https://dev.azure.com/org/project/_git/repo
    match = remoteUrl.match(/https?:\/\/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_git\/(.+?)$/);
    if (match) {
      const [, org, project, repo] = match;
      return { provider: 'azure', org, project, repo };
    }

    // Bitbucket - SSH format: git@bitbucket.org:owner/repo.git
    match = remoteUrl.match(/git@bitbucket\.org:(.+?)(?:\.git)?$/);
    if (match) {
      const [owner, repo] = match[1].split('/');
      return { provider: 'bitbucket', owner, repo };
    }

    // Bitbucket - HTTPS format: https://bitbucket.org/owner/repo.git
    match = remoteUrl.match(/https?:\/\/(?:www\.)?bitbucket\.org\/(.+?)(?:\.git)?$/);
    if (match) {
      const [owner, repo] = match[1].split('/');
      return { provider: 'bitbucket', owner, repo };
    }

    // Generic SSH format: git@host:path/to/repo.git
    match = remoteUrl.match(/git@([^:]+):(.+?)(?:\.git)?$/);
    if (match) {
      const [, host, path] = match;
      const parts = path.split('/');
      if (parts.length >= 2) {
        const repo = parts.pop();
        const owner = parts.join('/');
        return { provider: 'generic', host, owner, repo };
      }
    }

    // Generic HTTPS format: https://host/path/to/repo.git
    match = remoteUrl.match(/https?:\/\/([^\/]+)\/(.+?)(?:\.git)?$/);
    if (match) {
      const [, host, path] = match;
      const parts = path.split('/');
      if (parts.length >= 2) {
        const repo = parts.pop();
        const owner = parts.join('/');
        return { provider: 'generic', host, owner, repo };
      }
    }

    throw new Error(`Unable to parse git remote URL: ${remoteUrl}`);
  } catch (error) {
    // If git remote is not available, return null to skip update
    console.warn('Warning: Could not determine git remote URL. Skipping repository URL update.');
    console.warn(`Error: ${error.message}`);
    return null;
  }
}

function updatePackageJson() {
  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    return;
  }

  let baseUrl;
  let homepageUrl;
  let bugsUrl;

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  switch (repoInfo.provider) {
    case 'github':
      baseUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`;
      homepageUrl = `${baseUrl}/wiki`;
      bugsUrl = `${baseUrl}/issues`;
      break;

    case 'gitlab':
      baseUrl = `https://gitlab.com/${repoInfo.owner}/${repoInfo.repo}`;
      homepageUrl = baseUrl;
      bugsUrl = `${baseUrl}/-/issues`;
      break;

    case 'azure':
      baseUrl = `https://dev.azure.com/${repoInfo.org}/${repoInfo.project}/_git/${repoInfo.repo}`;
      homepageUrl = baseUrl;
      bugsUrl = `https://dev.azure.com/${repoInfo.org}/${repoInfo.project}/_workitems`;
      break;

    case 'bitbucket':
      baseUrl = `https://bitbucket.org/${repoInfo.owner}/${repoInfo.repo}`;
      homepageUrl = baseUrl;
      bugsUrl = `${baseUrl}/issues`;
      break;

    case 'generic':
      // For generic providers, use the git URL directly
      baseUrl = `https://${repoInfo.host}/${repoInfo.owner}/${repoInfo.repo}`;
      homepageUrl = baseUrl;
      bugsUrl = baseUrl;
      break;

    default:
      console.warn(`Unknown git provider: ${repoInfo.provider}. Skipping update.`);
      return;
  }

  // Update repository URL
  if (packageJson.repository) {
    packageJson.repository.url = baseUrl;
  } else {
    packageJson.repository = {
      type: 'git',
      url: baseUrl
    };
  }

  // Update homepage
  packageJson.homepage = homepageUrl;

  // Update bugs URL
  if (packageJson.bugs) {
    packageJson.bugs.url = bugsUrl;
  } else {
    packageJson.bugs = {
      url: bugsUrl
    };
  }

  // Write back to package.json with proper formatting
  writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf-8'
  );

  console.log(`✓ Updated package.json with repository URLs:`);
  console.log(`  Repository: ${baseUrl}`);
  console.log(`  Homepage: ${homepageUrl}`);
  console.log(`  Bugs: ${bugsUrl}`);
}

updatePackageJson();
