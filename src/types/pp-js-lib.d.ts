declare module 'pp-js-lib' {
  export namespace utils {
    export function readJsonFile(path: string): any;
    export function hashFile(filePath: string, algorithm?: string): Promise<string>;
    export function makeDirs(dirPath: string): void;
    export function makeResponse(res: any, data: any): any;
    export function makeUserErrorResponse(res: any, code: string): any;
    export function makeQuotaErrorResponse(res: any, code: string): any;
    export function makeLimitationResponse(res: any, code: string): any;
    export function makeDevErrorResponse(res: any, message: string): any;
    export function verifySignature(data: string, publicKey: string, signature: string): boolean;
    export function verifyUint8ArraySignature(data: Uint8Array, pubKey: string, sig: string): boolean;
    export function authCheck(req: any, res: any, db: any): Promise<void>;
  }
  
  export {default as TokenRecordAgent} from './TokenRecordAgent.js';
}
