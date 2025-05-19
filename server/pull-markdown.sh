#!/bin/bash

# Path to the markdown directory
HELP_DIR="assets/help"
REPO_HTTP_URL="https://github.com/earthhistoryviz/tsconline-help.git"
REPO_SSH_URL="git@github.com:earthhistoryviz/tsconline-help.git"
BRANCH="main"
if [ ! -d "$HELP_DIR/.git" ]; then
  echo "Markdown repo not found. Attempting to clone..."

  echo "Trying SSH clone..."
  if git clone --quiet "$REPO_SSH_URL" "$HELP_DIR"; then
    echo "Cloned using SSH."
  else
    echo "SSH failed, trying HTTPS..."
    if git clone --quiet "$REPO_HTTPS_URL" "$HELP_DIR"; then
      echo "Cloned using HTTPS."
    else
      echo "Both SSH and HTTPS clone of markdown repo failed. Exiting. Please contact your team lead."
      exit 1
    fi
  fi

else
  echo "Markdown repo already exists. Pulling latest changes..."
  cd "$HELP_DIR" || exit 1
  git pull origin "$BRANCH"
fi

