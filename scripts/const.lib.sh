#!/bin/bash

set -e
set -x

# Get directory path of *this* script file and exit if is not set, NULL, or an empty string
SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd -P )"
SCRIPTS_DIR="${SCRIPTS_DIR:?}"

DOCKER_IMAGE_NAME=apollo.rip.reddit.monitor
SUDO=$(which sudo || echo -ne "")

getDockerImageName() {
  node -e "console.log(require('${SCRIPTS_DIR}/../config/main.cfg.json').dockerImageName);"
}
