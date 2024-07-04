#!/bin/bash
PR_ID=$1
cd /home/aaron/live
rm -f proxy/user_conf.d/pr-${PR_ID}.conf
docker-compose restart proxy
cd /home/aaron/tsconline/pr-preview-${PR_ID}
docker-compose -f docker-compose-preview.yml down
cd ..
sudo rm -rf pr-preview-${PR_ID}