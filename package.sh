#!/bin/bash
WORK_DIR=obj
if [ -d $WORK_DIR ]
then
    rm -r $WORK_DIR
fi
mkdir $WORK_DIR

ENTRY_JS_PATH=src/index.js
BUNDLE_JS_PATH=$WORK_DIR/bundle.js

# Bundle into single js file
esbuild $ENTRY_JS_PATH --bundle --platform=node --outfile=$BUNDLE_JS_PATH
