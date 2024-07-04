#!/bin/bash
cp ../server/assets/jars/* ./server/assets/jars/
cp ../server/assets/datapacks/* ./server/assets/datapacks/
docker-compose -f docker-compose-preview.yml up -d pr-preview