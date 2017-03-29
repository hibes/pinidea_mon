#!/bin/bash

set -e
set -x

# Get directory path of *this* script file and exit if is not set, NULL, or an empty string
SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd -P )"
SCRIPTS_DIR="${SCRIPTS_DIR:?}"

DOCKER_IMAGE_NAME=$(node -e 'console.log(require("'${SCRIPTS_DIR}/../package.json'").repository.url.split("github.com/")[1].replace(".git", ""));')
MAIN=$(node -e "console.log(require('${SCRIPTS_DIR}/../package.json').main);")
PACKAGE_VERSION=$(node -e 'console.log(require("./package.json").version);')
SUDO=$(which sudo || echo -ne "")
