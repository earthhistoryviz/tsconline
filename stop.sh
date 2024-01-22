#!/bin/bash

SESSION_NAME="tsconline"

screen -S $SESSION_NAME -p 0 -X stuff $'\003'
screen -S $SESSION_NAME -p 1 -X stuff $'\003'
screen -S $SESSION_NAME -p 2 -X stuff $'\003'

sleep 2

screen -S $SESSION_NAME -X quit
