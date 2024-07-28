#! /bin/bash

PS1=":"
source /root/.bashrc

XAUTH="/root/.Xauthority"
touch $XAUTH
XERR="/root/.Xerrors"
rm -f $XERR
XARGS="-e $XERR -l -f $XAUTH -n 99 --server-args='-screen 0 1280x1024x24'"
cd /code

rm -f /tmp/.X99-lock
xvfb-run -e $XERR -l -f $XAUTH -n 99 --server-args='-screen 0 1280x1024x24' \
    yarn production || \
    cat $XERR