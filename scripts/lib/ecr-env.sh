#!/usr/bin/env bash
# Shared ECR settings for my-slides (same registry in all environments).
# Usage: source scripts/lib/ecr-env.sh && resolve_ecr_env

resolve_ecr_env() {
  export AWS_REGION="${AWS_REGION:-us-west-2}"
  export AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-614965295240}"
  export REPO_NAME="${REPO_NAME:-my-slides}"
  export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
}
