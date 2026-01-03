#!/bin/bash
WORK_DIR=obj
if [ -d $WORK_DIR ]
then
    rm -r $WORK_DIR
fi
mkdir $WORK_DIR

ENTRY_TS_PATH=src/index.ts
BUNDLE_JS_PATH=$WORK_DIR/bundle.js

# Compile TypeScript and bundle into single js file
esbuild $ENTRY_TS_PATH --bundle --platform=node --outfile=$BUNDLE_JS_PATH --format=esm
