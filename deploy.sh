#!/bin/bash
docker-compose exec -T tsconline bash -c "source /root/.nvm/nvm.sh && nvm use node && yarn clean cache"
GIT_SSH_COMMAND="ssh -i /home/deployuser/.ssh/gh-geolex -o IdentitiesOnly=yes" git pull --no-edit
docker-compose exec -T tsconline bash -c "source /root/.nvm/nvm.sh && nvm use node && yarn && yarn build"
docker-compose restart tsconline
docker-compose up -d