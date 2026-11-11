#!/usr/bin/env bash
# Generates the pages of the documentation site that are committed in docs/ (run it with `npm run generate:docs`,
# which builds the plugin first): the command pages and docs/index.md with sfdx-hardis, then the settings reference.
set -euo pipefail
cd "$(dirname "$0")/.."

SFDX_HARDIS_VERSION=8.24.0 # renovate: datasource=npm depName=sfdx-hardis

# sfdx-hardis is installed in a folder of the repository, not in the sf CLI of the developer
export SF_DATA_DIR="$PWD/.sf-docs-tooling"
installed=$(sf plugins --core --json 2>/dev/null |
  node -e 'const plugins = JSON.parse(require("fs").readFileSync(0, "utf8")); console.log(plugins.find((plugin) => plugin.name === "sfdx-hardis")?.version ?? "")' ||
  true)
if [ "$installed" != "$SFDX_HARDIS_VERSION" ]; then
  echo y | sf plugins install "sfdx-hardis@${SFDX_HARDIS_VERSION}"
fi

sf hardis:doc:plugin:generate
node --loader ts-node/esm --no-warnings=ExperimentalWarning scripts/generate-docs.ts
