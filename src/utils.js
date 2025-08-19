import {ml_dsa44} from '@noble/post-quantum/ml-dsa.js';
import {utf8ToBytes} from '@noble/post-quantum/utils.js';
import fs from "node:fs";
import path from "node:path";

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

function makeDirs(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, {recursive : true});
      console.log("Data dir created:", dirPath);
    } catch (err) {
      console.error("Error creating directory:", err);
      process.exit(1);
    }
  }
}

function makeApiResponse(res, jd) {
  return res.status(200)
      .header('Content-Type', 'application/json')
      .send(JSON.stringify(jd));
}

function makeResponse(res, jd) { return makeApiResponse(res, {data : jd}); }

function makeErrorResponse(res, msg) {
  return makeApiResponse(res,
                         {error : {type : "DEV", code : null, data : msg}});
}

function verifyUint8ArraySignature(d, pubKey, sig) {
  const p = Uint8Array.from(Buffer.from(pubKey, 'hex'));
  const s = Uint8Array.from(Buffer.from(sig, 'hex'));
  return ml_dsa44.verify(p, d, s);
}

function verifySignature(data, pubKey, sig) {
  return verifyUint8ArraySignature(utf8ToBytes(data), pubKey, sig);
}

async function authCheck(req, res, db) {
  let token = req.headers.authorization?.split('Bearer ')?.pop();
  let u = db.getUser(token);
  if (!u) {
    throw new Error("Not authorized");
  }
  req.g.user = u;
}

export {
  readJsonFile,
  makeDirs,
  makeResponse,
  makeErrorResponse,
  verifySignature,
  verifyUint8ArraySignature,
  authCheck
}
