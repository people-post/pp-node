import child_process from 'child_process';

export default class IpfsAgent {
  addFile(filePath) {
    const cmd = 'ipfs add --pin=false ' + filePath;
    const stdout = child_process.execSync(cmd);
    // stdout: Added <cid> name
    return cid = stdout.toString().split(" ")[1];
  }

  fetchFile(cid, toPath) {
    let cmd = `ipfs get --output=${toPath} ${cid}`;
    child_process.execSync(cmd);
  }

  pinCids(cids) {
    const cmd = 'ipfs pin add ' + cids.join(' ');
    child_process.execSync(cmd);
  }

  publishName(key, cid) {
    const cmd = `ipfs name publish --key=${key} ${cid}`;
    child_process.execSync(cmd);
  }
}
