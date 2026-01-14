# Test Directory

This directory contains test files and configurations for the plugin.

## Test Structure

### Unit Tests
- `*.test.ts` - Unit tests for individual components
- Located in `test/` and `src/**/*.test.ts`

### End-to-End Tests
- `*.e2e-spec.ts` - End-to-end tests that require a Salesforce org
- Located in `src/**/*.e2e-spec.ts`
- These tests deploy metadata and test browser automation

## Test Fixtures

### sfdx-source Directories
Several plugins contain `sfdx-source/` directories with test metadata:
- `src/plugins/record-types/sfdx-source/` - Custom objects and record types for testing
- `src/plugins/picklists/sfdx-source/` - Picklist values for testing
- `src/plugins/permission-sets/sfdx-source/` - Permission sets for testing
- `src/plugins/security/**/sfdx-source/` - Security-related test metadata
- And others...

**Purpose**: These directories contain Salesforce metadata (XML files) that are deployed to scratch orgs during E2E tests to set up test data and configurations.

**Usage**: E2E tests deploy these metadata files before running browser automation tests to ensure the org is in the correct state.

**Note**: These are test fixtures and are excluded from the published npm package (see `.npmignore`).

## Running Tests

```bash
# Run unit tests
npm run test

# Run E2E tests (requires authenticated org)
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- -g "RecordTypes"
```

## Test Setup

E2E tests require:
1. An authenticated Salesforce org (scratch org recommended)
2. The org to be set as default: `sf config set target-org=your-org-alias`
3. Sufficient permissions to deploy metadata and access Setup menu

See `test/e2e-setup.ts` for test initialization.
