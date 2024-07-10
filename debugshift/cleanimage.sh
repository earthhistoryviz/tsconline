#!/bin/bash

# Define the source and destination directories
SOURCE_DIR="./original"
DEST_DIR="./cleanedup"

# Create the destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Loop through each .tsc file in the Original directory
for file in "$SOURCE_DIR"/*.tsc; do
    # Extract the filename without the path
    filename=$(basename "$file")
    
    # Use grep to filter lines containing <column id=", and save the output to the cleanedup directory
    grep '<column id="' "$file" > "$DEST_DIR/$filename"
done