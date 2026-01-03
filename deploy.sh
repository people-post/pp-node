#!/bin/bash
SERVER="2600:1f18:4544:9400:9af6:6c0e:541d:7311"
scp bundle.js admin@[$SERVER]:/nfs/data/server/index.js
scp package.json admin@[$SERVER]:/nfs/data/server/package.json
scp package-lock.json admin@[$SERVER]:/nfs/data/server/package-lock.json
rsync -avz --delete node_modules/ admin@[$SERVER]:/nfs/data/server/node_modules

echo "Please call following command on server: sudo systemctl restart node"
