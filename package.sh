#!/bin/bash
WORK_DIR=obj
if [ -d $WORK_DIR ]
then
    rm -r $WORK_DIR
fi
mkdir $WORK_DIR

ENTRY_JS_PATH=src/index.js
BUNDLE_JS_PATH=$WORK_DIR/bundle.js
SEA_CONFIG_PATH=$WORK_DIR/sea_config.json
SEA_BLOB_PATH=$WORK_DIR/sea-prep.blob
APP_PATH=$WORK_DIR/node

# Bundle into single js file
esbuild $ENTRY_JS_PATH --bundle --platform=node --outfile=$BUNDLE_JS_PATH

# Prepare blob
SEA_CONFIG="
{
    \"main\": \"${BUNDLE_JS_PATH}\",
    \"output\": \"${SEA_BLOB_PATH}\"
}
"
echo $SEA_CONFIG > $SEA_CONFIG_PATH
node --experimental-sea-config $SEA_CONFIG_PATH

# Prepare binary
cp $(command -v node) $APP_PATH
npx postject $APP_PATH NODE_SEA_BLOB $SEA_BLOB_PATH  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
