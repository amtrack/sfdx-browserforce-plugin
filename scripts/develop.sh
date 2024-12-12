#!/usr/bin/env bash

set -e

CLI_NAME="$(basename "${BASH_SOURCE[0]}")"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
REPO_NAME="$(basename "$(dirname "${DIR}")")"
DEFAULT_ALIAS="${REPO_NAME}-dev"

_help() {
  echo "${CLI_NAME}."
  echo ""
  echo "> Setup an environment for development."
  echo ""
  echo "Usage:"
  echo "    ${CLI_NAME} [-a SETALIAS]"
  echo ""
  echo "Options:"
  echo "    -h --help                            show help"
  echo "    -a --setalias SETALIAS               set an alias for for the created scratch org (default: ${DEFAULT_ALIAS})"
  echo ""
  echo "Examples:"
  echo "    View this help text"
  echo "    $ ${CLI_NAME} -h"
  echo ""
  echo "    Spin up and configure a scratch org"
  echo "    $ ${CLI_NAME}"
  echo ""
  echo "    Spin up and configure a scratch org with the given alias (one alphanumerical word, may contain '-_')"
  echo "    $ ${CLI_NAME} -a myfeature"
}

_main() {
  alias="${alias:-${DEFAULT_ALIAS}}"
  # shellcheck disable=SC2068
  sf org create scratch -f config/project-scratch-def.json \
    -a "$alias" \
    -d \
    ${POSITIONAL_ARGS[@]}
  if [[ "${CPQ}" == "true" ]]; then
    # Salesforce CPQ (SBQQ) 252.3.0.1
    sf package install --package "04t6T000000t6QXQAY" --no-prompt --wait 30
  fi
}

if [[ "$0" == "${BASH_SOURCE[0]}" ]]; then
  set -eo pipefail
  POSITIONAL_ARGS=()
  while [[ "$#" -gt 0 ]]; do case $1 in
    -h|--help) _help; exit 0;;
    -a|--setalias) alias="$2"; shift 2;;
    *) POSITIONAL_ARGS+=("$1"); shift;;
  esac; done
  _main "${POSITIONAL_ARGS[@]}"
fi
