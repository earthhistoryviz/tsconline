#!/bin/bash
if [ $# -eq 0 ]; then
  echo "Usage: $0 <argument>"
  exit 1
fi
script_directory=$(dirname "$(realpath "$0")")
current_time=$(date "+%Y.%m.%d-%H.%M.%S")
mkdir -p "$script_directory/migrations"
filename="$script_directory/migrations/$current_time-$1.ts"
cat > $filename <<EOL
import { type Kysely } from "kysely"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
}
EOL

echo "Created migration file: $filename"