#!/bin/bash
if [ $# -eq 0 ]; then
  echo "Usage: $0 <argument>"
  exit 1
fi
current_time=$(date "+%Y.%m.%d-%H.%M.%S")
mkdir -p ./migrations
filename="./migrations/$current_time-$1.ts"
cat > $filename <<EOL
import { type Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
}

export async function down(db: Kysely<any>): Promise<void> {
}
EOL

echo "Created migration file: $filename"