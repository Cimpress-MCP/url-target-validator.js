#!/usr/bin/env bash

set -e
set -u

# Print out all the current environment variables
env

echo node version: $(node --version)

if [ "$CI_COMMIT_REF_NAME" != "master" ]; then
  git config --global user.email "gitlab@cimpress.githost.io"
  git config --global user.name "Gitlab Runner"
  git fetch origin
  git merge origin/master --no-edit
fi

yarn install --frozen-lockfile
yarn cover
yarn lint
yarn deploy
