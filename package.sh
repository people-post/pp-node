#!/bin/bash
WORK_DIR=obj
if [ -d $WORK_DIR ]
then
    rm -r $WORK_DIR
fi
mkdir $WORK_DIR

node --experimental-sea-config sea-config.json
