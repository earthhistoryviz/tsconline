#! /bin/bash

# exec /usr/bin/xterm

source /root/.bashrc
source $NVM_DIR/nvm.sh
nvm use default

cd /code
yarn workspace server start


