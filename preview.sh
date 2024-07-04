#!/bin/bash
cp ../server/assets/jars/* ./server/assets/jars/
docker-compose -f docker-compose-preview.yml up -d pr-preview