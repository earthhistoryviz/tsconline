#!/bin/bash

HELP_DIR="assets/help"
REPO_HTTP_URL="https://github.com/earthhistoryviz/tsconline-help.git"
REPO_SSH_URL="git@github.com:earthhistoryviz/tsconline-help.git"
BRANCH="main"

if [ ! -d "$HELP_DIR/.git" ]; then
  echo "Markdown repo not found. Attempting sparse clone for .md files only..."

  mkdir -p "$HELP_DIR"
  cd "$HELP_DIR" || exit 1

  echo "Trying SSH sparse checkout..."
  if git init && git remote add origin "$REPO_SSH_URL"; then
    git config core.sparseCheckout true
    git config core.sparseCheckoutCone true
    echo "**/*.md" > .git/info/sparse-checkout

    if git pull --depth=1 origin "$BRANCH"; then
      echo "Successfully pulled only .md files using SSH."
    else
      echo "SSH failed, trying HTTPS..."
      git remote set-url origin "$REPO_HTTP_URL"
      if git pull --depth=1 origin "$BRANCH"; then
        echo "Successfully pulled only .md files using HTTPS."
      else
        echo "Both SSH and HTTPS sparse clone failed. Exiting."
        exit 1
      fi
    fi
  else
    echo "Git init failed. Exiting."
    exit 1
  fi

else
  echo "Markdown repo already exists. Pulling latest changes..."
  cd "$HELP_DIR" || exit 1
  git pull origin "$BRANCH"
fi