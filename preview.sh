#!/bin/bash
docker-compose exec -T pr-preview bash -c "source /root/.nvm/nvm.sh && nvm use node && yarn && yarn build"
docker-compose up -d pr-preview