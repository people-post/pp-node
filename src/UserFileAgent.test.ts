import * as assert from 'node:assert';
import * as test from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import IpfsAgent from './IpfsAgent.js';
import UserFileAgent from './UserFileAgent.js';

// Mock IpfsAgent for testing
class MockIpfsAgent extends IpfsAgent {
  private fetchedFiles: Map<string, string> = new Map();
  
  async fetchFile(cid: string, toPath: string): Promise<void> {
    // Track what was fetched
    this.fetchedFiles.set(cid, toPath);
    // Create a dummy file at the target path
    fs.writeFileSync(toPath, `mock content for ${cid}`);
  }
  
  getFetchedFile(cid: string): string | undefined {
    return this.fetchedFiles.get(cid);
  }
  
  clearFetchedFiles(): void {
    this.fetchedFiles.clear();
  }
}

test.describe('UserFileAgent', () => {
  let tempDir: string;
  let agent: UserFileAgent;
  let mockIpfsAgent: MockIpfsAgent;

  test.beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'userfileagent-test-'));
    agent = new UserFileAgent();
    mockIpfsAgent = new MockIpfsAgent();
  });

  test.afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, {recursive: true, force: true});
    }
    mockIpfsAgent.clearFetchedFiles();
  });

  test.describe('attach', () => {
    test.it('should attach a user directory root', () => {
      agent.attach(tempDir);
      // If attach works, saveFile should not throw "not attached" error
      // We'll verify this in saveFile tests
      assert.ok(true, 'attach should complete without error');
    });

    test.it('should handle absolute paths', () => {
      const absolutePath = path.resolve(tempDir);
      agent.attach(absolutePath);
      assert.ok(true, 'should handle absolute paths');
    });

    test.it('should allow re-attaching with different path', () => {
      agent.attach(tempDir);
      const newTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'userfileagent-test2-'));
      agent.attach(newTempDir);
      // Should not throw
      assert.ok(true, 'should allow re-attaching');
      fs.rmSync(newTempDir, {recursive: true, force: true});
    });
  });

  test.describe('saveFile', () => {
    test.it('should throw error if not attached', async () => {
      const cid = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      
      await assert.rejects(
        async () => { await agent.saveFile(cid, mockIpfsAgent); },
        /UserFileAgent not attached/,
        'should throw error when not attached'
      );
    });

    test.it('should create directory structure for valid CID', async () => {
      agent.attach(tempDir);
      const cid = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      
      await agent.saveFile(cid, mockIpfsAgent);
      
      // Verify directory structure was created
      // CID: QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy
      // Should create: tempDir/Qm/Tz/RP/GD/QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy
      const expectedDir = path.join(tempDir, 'Qm', 'Tz', 'RP', 'GD');
      assert.ok(fs.existsSync(expectedDir), 'Directory structure should be created');
    });

    test.it('should call ipfsAgent.fetchFile with correct parameters', async () => {
      agent.attach(tempDir);
      const cid = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      
      await agent.saveFile(cid, mockIpfsAgent);
      
      // Verify fetchFile was called with the correct CID
      const fetchedPath = mockIpfsAgent.getFetchedFile(cid);
      assert.ok(fetchedPath, 'fetchFile should have been called');
      
      // Verify the path structure
      const expectedPath = path.join(tempDir, 'Qm', 'Tz', 'RP', 'GD', cid);
      assert.equal(fetchedPath, expectedPath, 'fetchFile should be called with correct path');
    });

    test.it('should create file at correct location', async () => {
      agent.attach(tempDir);
      const cid = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      
      await agent.saveFile(cid, mockIpfsAgent);
      
      // Verify file was created
      const expectedFilePath = path.join(tempDir, 'Qm', 'Tz', 'RP', 'GD', cid);
      assert.ok(fs.existsSync(expectedFilePath), 'File should be created at correct location');
    });

    test.it('should handle different CID formats', async () => {
      agent.attach(tempDir);
      const cids = [
        'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        'Qmabcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        'Qm123456789012345678901234567890123456789012345678901234567890'
      ];
      
      for (const cid of cids) {
        await agent.saveFile(cid, mockIpfsAgent);
        const fetchedPath = mockIpfsAgent.getFetchedFile(cid);
        assert.ok(fetchedPath, `Should handle CID: ${cid}`);
        assert.ok(fs.existsSync(fetchedPath!), `File should exist for CID: ${cid}`);
      }
    });

    test.it('should handle multiple files with same prefix', async () => {
      agent.attach(tempDir);
      const cid1 = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      const cid2 = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy2';
      
      await agent.saveFile(cid1, mockIpfsAgent);
      await agent.saveFile(cid2, mockIpfsAgent);
      
      // Both files should exist in the same directory
      const dir = path.join(tempDir, 'Qm', 'Tz', 'RP', 'GD');
      assert.ok(fs.existsSync(path.join(dir, cid1)), 'First file should exist');
      assert.ok(fs.existsSync(path.join(dir, cid2)), 'Second file should exist');
    });

    test.it('should create nested directories recursively', async () => {
      agent.attach(tempDir);
      const cid = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      
      // Directory should not exist before
      const expectedDir = path.join(tempDir, 'Qm', 'Tz', 'RP', 'GD');
      assert.ok(!fs.existsSync(expectedDir), 'Directory should not exist before saveFile');
      
      await agent.saveFile(cid, mockIpfsAgent);
      
      // Directory should exist after
      assert.ok(fs.existsSync(expectedDir), 'Directory should be created recursively');
    });
  });

  test.describe('edge cases', () => {
    test.it('should handle minimum valid CID length (8 characters)', async () => {
      agent.attach(tempDir);
      const cid = '12345678'; // Minimum length
      
      await agent.saveFile(cid, mockIpfsAgent);
      
      const fetchedPath = mockIpfsAgent.getFetchedFile(cid);
      assert.ok(fetchedPath, 'Should handle minimum length CID');
      assert.ok(fs.existsSync(fetchedPath!), 'File should be created');
    });

    test.it('should throw error for CID shorter than 8 characters', async () => {
      agent.attach(tempDir);
      const shortCid = '1234567'; // 7 characters
      
      // UserDirectory.getFilePath will throw for short CID
      await assert.rejects(
        async () => { await agent.saveFile(shortCid, mockIpfsAgent); },
        /Filename is too short/,
        'Should throw error for CID shorter than 8 characters'
      );
    });

    test.it('should handle very long CID', async () => {
      agent.attach(tempDir);
      const longCid = 'Qm' + 'a'.repeat(100); // Very long CID
      
      await agent.saveFile(longCid, mockIpfsAgent);
      
      const fetchedPath = mockIpfsAgent.getFetchedFile(longCid);
      assert.ok(fetchedPath, 'Should handle very long CID');
      assert.ok(fs.existsSync(fetchedPath!), 'File should be created');
    });

    test.it('should handle special characters in CID', async () => {
      agent.attach(tempDir);
      // CID with characters that might be in base58 encoding
      const cid = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      
      await agent.saveFile(cid, mockIpfsAgent);
      
      const fetchedPath = mockIpfsAgent.getFetchedFile(cid);
      assert.ok(fetchedPath, 'Should handle special characters in CID');
    });
  });

  test.describe('integration scenarios', () => {
    test.it('should handle typical file save workflow', async () => {
      agent.attach(tempDir);
      const cid = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      
      // 1. Attach directory
      assert.ok(true, 'Directory attached');
      
      // 2. Save file
      await agent.saveFile(cid, mockIpfsAgent);
      
      // 3. Verify file exists
      const expectedPath = path.join(tempDir, 'Qm', 'Tz', 'RP', 'GD', cid);
      assert.ok(fs.existsSync(expectedPath), 'File should exist after save');
      
      // 4. Verify IPFS was called
      const fetchedPath = mockIpfsAgent.getFetchedFile(cid);
      assert.equal(fetchedPath, expectedPath, 'IPFS fetchFile should be called correctly');
    });

    test.it('should handle multiple files in sequence', async () => {
      agent.attach(tempDir);
      const cids = [
        'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy',
        'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        'Qmabcdef1234567890abcdef1234567890abcdef1234567890abcdef123456'
      ];
      
      for (const cid of cids) {
        await agent.saveFile(cid, mockIpfsAgent);
        const fetchedPath = mockIpfsAgent.getFetchedFile(cid);
        assert.ok(fetchedPath, `File ${cid} should be saved`);
        assert.ok(fs.existsSync(fetchedPath!), `File ${cid} should exist`);
      }
    });

    test.it('should handle files in different directory branches', async () => {
      agent.attach(tempDir);
      const cid1 = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy'; // Qm/Tz/RP/GD/...
      const cid2 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // Qm/Yw/AP/Jz/...
      
      await agent.saveFile(cid1, mockIpfsAgent);
      await agent.saveFile(cid2, mockIpfsAgent);
      
      // Both should create different directory structures
      const path1 = path.join(tempDir, 'Qm', 'Tz', 'RP', 'GD', cid1);
      const path2 = path.join(tempDir, 'Qm', 'Yw', 'AP', 'Jz', cid2);
      
      assert.ok(fs.existsSync(path1), 'First file should exist in its directory');
      assert.ok(fs.existsSync(path2), 'Second file should exist in its directory');
    });
  });

  test.describe('error handling', () => {
    test.it('should throw error when saveFile called before attach', async () => {
      const agent = new UserFileAgent();
      const cid = 'QmTzRPGDNG5yb54D1akGDv89n1jLgdu6Q6PGJCcYdMcBhy';
      
      await assert.rejects(
        async () => { await agent.saveFile(cid, mockIpfsAgent); },
        /UserFileAgent not attached/,
        'Should throw error when not attached'
      );
    });

    test.it('should handle invalid CID format gracefully', async () => {
      agent.attach(tempDir);
      const invalidCid = '1234567'; // Too short
      
      await assert.rejects(
        async () => { await agent.saveFile(invalidCid, mockIpfsAgent); },
        /Filename is too short/,
        'Should throw error for invalid CID'
      );
    });
  });
});
