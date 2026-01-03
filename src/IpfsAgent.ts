import child_process from 'child_process';

export default class IpfsAgent {
  addFile(filePath: string): string {
    const cmd = 'ipfs add --pin=false ' + filePath;
    const stdout = child_process.execSync(cmd);
    // stdout: Added <cid> name
    return stdout.toString().split(" ")[1];
  }

  fetchFile(cid: string, toPath: string): void {
    let cmd = `ipfs get --output=${toPath} ${cid}`;
    child_process.execSync(cmd);
  }

  pinCids(cids: string[]): void {
    const cmd = 'ipfs pin add ' + cids.join(' ');
    child_process.execSync(cmd);
  }

  publishName(key: string, cid: string): void {
    const cmd = `ipfs name publish --key="${key}" ${cid} --allow-offline`;
    child_process.execSync(cmd);
  }

  createIpnsName(name: string): string {
    const cmd = 'ipfs key gen "' + name + '"';
    // Trim off whitespace and newline
    return child_process.execSync(cmd).toString().trim();
  }
}

