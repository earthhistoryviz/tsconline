#!/bin/bash

if [ $# -lt 1 ]; then
  echo "Usage: $0 <migration-name> [major|minor|patch]"
  exit 1
fi

script_directory=$(dirname "$(realpath "$0")")
migration_directory="$script_directory/migrations"

# Ensure the migrations directory exists
mkdir -p "$migration_directory"

# Function to increment a specific SemVer segment
increment_version() {
  local version=$1
  local segment=$2
  local major minor patch
  IFS='.' read -r major minor patch <<< "$version"

  case $segment in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch|*)
      patch=$((patch + 1))
      ;;
  esac

  echo "$major.$minor.$patch"
}

# Find the latest version
latest_version="0.0.0"
for file in "$migration_directory"/*.ts; do
  # Extract the SemVer prefix from the filename
  [[ $(basename "$file") =~ ^([0-9]+\.[0-9]+\.[0-9]+)- ]] && current_version="${BASH_REMATCH[1]}"
  if [[ -n "$current_version" ]] && [[ "$(printf '%s\n' "$latest_version" "$current_version" | sort -V | tail -n 1)" == "$current_version" ]]; then
    latest_version="$current_version"
  fi
done

# Determine which segment to increment
segment_to_increment=${2:-patch}

# Calculate the next version
next_version=$(increment_version "$latest_version" "$segment_to_increment")

# Create the new migration file
filename="$migration_directory/$next_version-$1.ts"
cat > "$filename" <<EOL
import { type Kysely } from "kysely"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
}
EOL

echo "Created migration file: $filename"
