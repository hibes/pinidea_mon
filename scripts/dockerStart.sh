#!/bin/bash

set -e
set -x

# Get directory path of *this* script file and exit if is not set, NULL, or an empty string
SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd -P )"
SCRIPTS_DIR="${SCRIPTS_DIR:?}"

. ${SCRIPTS_DIR}/const.lib.sh

if ! docker images | grep "${DOCKER_IMAGE_NAME}"; then
  ${SCRIPTS_DIR}/build.sh
fi

${SUDO} docker run -d apollo.rip.reddit.monitor
