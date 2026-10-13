#!/usr/bin/env bash
# Build my-slides and push to ECR.
#
# Prerequisites: aws CLI v2, docker, credentials with ECR push access.
# Create the repository once if needed:
#   aws ecr create-repository --region us-west-2 --repository-name my-slides
#
# Usage (from repo root):
#   ./scripts/push-ecr.sh
#   IMAGE_TAG=0.1.0-manual ./scripts/push-ecr.sh
#   DEPLOY_ENV=prod ./scripts/push-ecr.sh
#   SKIP_VALUES_UPDATE=1 ./scripts/push-ecr.sh   # push only, do not edit values-*.yaml
#   AWS_PROFILE=your-profile ./scripts/push-ecr.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/ecr-env.sh
source "${ROOT}/scripts/lib/ecr-env.sh"
resolve_ecr_env

BUILD_NUMBER="${BITBUCKET_BUILD_NUMBER:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
PACKAGE_VERSION="$(node -p "require('./package.json').version")"
IMAGE_TAG="${IMAGE_TAG:-${PACKAGE_VERSION}_${BUILD_NUMBER}}"
REPO_URI="${ECR_REGISTRY}/${REPO_NAME}"

echo "Building ${REPO_URI}:${IMAGE_TAG} (linux/amd64)"
docker build \
  --platform linux/amd64 \
  -f Dockerfile \
  -t "${REPO_URI}:${IMAGE_TAG}" \
  -t "${REPO_URI}:latest" \
  .

# Isolated Docker config with inline auth (avoids macOS keychain issues on ecr login).
DOCKER_CONFIG="$(mktemp -d)"
export DOCKER_CONFIG
trap 'rm -rf "${DOCKER_CONFIG}"' EXIT

ecr_login() {
  local token auth_b64
  token="$(aws ecr get-login-password --region "${AWS_REGION}")"
  auth_b64="$(printf 'AWS:%s' "${token}" | base64 | tr -d '\n')"
  cat > "${DOCKER_CONFIG}/config.json" <<EOF
{
  "auths": {
    "${ECR_REGISTRY}": {
      "auth": "${auth_b64}"
    }
  }
}
EOF
}

echo "Authenticating to ECR ${ECR_REGISTRY}"
ecr_login

echo "Pushing ${REPO_URI}:${IMAGE_TAG} and :latest"
docker push "${REPO_URI}:${IMAGE_TAG}"
docker push "${REPO_URI}:latest"

echo "${IMAGE_TAG}" > "${ROOT}/image-tag.txt"

update_values_image_tag() {
  local values_file="$1"
  local tag="$2"
  if [[ ! -f "${values_file}" ]]; then
    echo "Values file not found: ${values_file}" >&2
    return 1
  fi
  node "${ROOT}/scripts/lib/update-values-image-tag.js" "${values_file}" "${tag}"
  echo "Updated image.tag in ${values_file} → ${tag}"
}

DEPLOY_ENV="${DEPLOY_ENV:-test}"
VALUES_FILE="${VALUES_FILE:-${ROOT}/infra/my-slides-eks/values-${DEPLOY_ENV}.yaml}"

if [[ "${SKIP_VALUES_UPDATE:-}" != "1" ]]; then
  update_values_image_tag "${VALUES_FILE}" "${IMAGE_TAG}"
fi

echo "Done: ${REPO_URI}:${IMAGE_TAG}"
echo "Wrote image tag to image-tag.txt"
echo "Commit ${VALUES_FILE#${ROOT}/} and sync Argo (my-slides-${DEPLOY_ENV})."
