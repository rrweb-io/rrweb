#!/bin/bash

APP_NAME=starter-ui
PM2PORT=4223
DEVOPS_DIR=../nferx_Devops
REPO_DIR=$PWD
TEMPLATE=uiwithpm2_v1

SCRIPTS_DIR=$DEVOPS_DIR/ansible/uiwithpm2
source $DEVOPS_DIR/ansible/validate.sh

validate_and_deploy -d $DEVOPS_DIR -r $REPO_DIR -y $SCRIPTS_DIR/ansible_playbook.yml -n$APP_NAME -e"pm2_port=$PM2PORT" -l$TEMPLATE "$@"
