#!/bin/bash

set -e
set -x

# Get directory path of *this* script file and exit if is not set, NULL, or an empty string
SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd -P )"
SCRIPTS_DIR="${SCRIPTS_DIR:?}"

. ${SCRIPTS_DIR}/shared.lib.sh

main() {
  V=${PACKAGE_VERSION}
  I=${DOCKER_IMAGE_NAME}

  describe=$(git describe --dirty)

  if check_version $describe; then
    npm run build

    docker push ${I}:latest && \
      docker tag ${I} ${I}:${V} && \
      docker push ${I}:${V}
  else
    echo "Refusing to publish 'dirty' version $describe"
  fi
}

check_version() {
  VERSION_REGEX='^[v]?[0-9]+\.[0-9]+\.[0-9]+$'
  VERSION_REGEX_PRERELEASE='^[v]?[0-9]+\.[0-9]+\.[0-9]+[-](alpha)|(beta)|(rc)\.[0-9]+$'

  if echo $1 | grep -E ${VERSION_REGEX} || echo $1 | grep -E ${VERSION_REGEX_PRERELEASE}; then
    echo clean
    return 0
  else
    echo dirty
    return 1
  fi
}

main $@
