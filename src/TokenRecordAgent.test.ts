import * as assert from 'node:assert';
import * as test from 'node:test';

import TokenRecordAgent from './TokenRecordAgent.js';

test.describe('TokenRecordAgent', () => {
  test.describe('initFor', () => {
    test.it('should generate a token for a user', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      const token = agent.initFor(userId);
      
      assert.ok(token.length > 0, 'Token should not be empty');
      assert.equal(typeof token, 'string', 'Token should be a string');
    });

    test.it('should generate unique tokens for the same user', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      const token1 = agent.initFor(userId);
      const token2 = agent.initFor(userId);
      
      assert.notEqual(token1, token2, 'Tokens should be unique');
    });

    test.it('should generate tokens of correct length (256 characters)', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      const token = agent.initFor(userId);
      
      assert.equal(token.length, 256, 'Token should be exactly 256 characters');
    });

    test.it('should handle different user IDs', () => {
      const agent = new TokenRecordAgent();
      const token1 = agent.initFor('user1');
      const token2 = agent.initFor('user2');
      
      assert.notEqual(token1, token2, 'Different users should get different tokens');
    });

    test.it('should handle empty user ID', () => {
      const agent = new TokenRecordAgent();
      const token = agent.initFor('');
      
      assert.ok(token.length > 0, 'Should generate token even for empty user ID');
    });
  });

  test.describe('pop', () => {
    test.it('should return userId for valid token', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      const token = agent.initFor(userId);
      
      const result = agent.pop(token);
      assert.equal(result, userId, 'Should return correct userId');
    });

    test.it('should return null for invalid token', () => {
      const agent = new TokenRecordAgent();
      const invalidToken = 'invalid-token-123';
      
      const result = agent.pop(invalidToken);
      assert.equal(result, null, 'Should return null for invalid token');
    });

    test.it('should return null for already popped token', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      const token = agent.initFor(userId);
      
      // First pop should succeed
      const firstResult = agent.pop(token);
      assert.equal(firstResult, userId, 'First pop should return userId');
      
      // Second pop should return null (token already consumed)
      const secondResult = agent.pop(token);
      assert.equal(secondResult, null, 'Second pop should return null');
    });

    test.it('should handle multiple tokens correctly', () => {
      const agent = new TokenRecordAgent();
      const userId1 = 'user1';
      const userId2 = 'user2';
      
      const token1 = agent.initFor(userId1);
      const token2 = agent.initFor(userId2);
      
      assert.equal(agent.pop(token1), userId1, 'First token should return first userId');
      assert.equal(agent.pop(token2), userId2, 'Second token should return second userId');
    });

    test.it('should handle tokens for same user independently', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      
      const token1 = agent.initFor(userId);
      const token2 = agent.initFor(userId);
      
      // Both tokens should work independently
      assert.equal(agent.pop(token1), userId, 'First token should work');
      assert.equal(agent.pop(token2), userId, 'Second token should work');
    });

    test.it('should return null for empty string token', () => {
      const agent = new TokenRecordAgent();
      const result = agent.pop('');
      assert.equal(result, null, 'Should return null for empty token');
    });
  });

  test.describe('token expiration and cleanup', () => {
    test.it('should handle token cleanup logic', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      
      // Create multiple tokens to test cleanup mechanism
      const token1 = agent.initFor(userId);
      const token2 = agent.initFor(userId);
      const token3 = agent.initFor(userId);
      
      // All tokens should be valid initially
      assert.equal(agent.pop(token1), userId, 'First token should be valid');
      assert.equal(agent.pop(token2), userId, 'Second token should be valid');
      assert.equal(agent.pop(token3), userId, 'Third token should be valid');
      
      // Note: Actual expiration cleanup (removing tokens older than 1 minute)
      // would require time mocking to test properly. The cleanup happens
      // in initFor when idx > 0, meaning there are tokens older than 1 minute.
    });
  });

  test.describe('integration scenarios', () => {
    test.it('should handle typical token lifecycle', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      
      // 1. Generate token
      const token = agent.initFor(userId);
      assert.ok(token.length === 256, 'Token should be generated');
      
      // 2. Use token
      const retrievedUserId = agent.pop(token);
      assert.equal(retrievedUserId, userId, 'Should retrieve correct userId');
      
      // 3. Token should be consumed
      const secondPop = agent.pop(token);
      assert.equal(secondPop, null, 'Token should be consumed after first use');
    });

    test.it('should handle multiple users with multiple tokens', () => {
      const agent = new TokenRecordAgent();
      
      const user1 = 'user1';
      const user2 = 'user2';
      const user3 = 'user3';
      
      // Generate multiple tokens for each user
      const tokens = {
        user1: [agent.initFor(user1), agent.initFor(user1)],
        user2: [agent.initFor(user2), agent.initFor(user2)],
        user3: [agent.initFor(user3)]
      };
      
      // Verify all tokens are unique
      const allTokens = [
        ...tokens.user1,
        ...tokens.user2,
        ...tokens.user3
      ];
      const uniqueTokens = new Set(allTokens);
      assert.equal(uniqueTokens.size, allTokens.length, 'All tokens should be unique');
      
      // Verify each token returns correct userId
      assert.equal(agent.pop(tokens.user1[0]), user1, 'First user1 token should work');
      assert.equal(agent.pop(tokens.user2[0]), user2, 'First user2 token should work');
      assert.equal(agent.pop(tokens.user3[0]), user3, 'User3 token should work');
      assert.equal(agent.pop(tokens.user1[1]), user1, 'Second user1 token should work');
      assert.equal(agent.pop(tokens.user2[1]), user2, 'Second user2 token should work');
    });

    test.it('should handle rapid token generation and consumption', () => {
      const agent = new TokenRecordAgent();
      const userId = 'user123';
      const tokens: string[] = [];
      
      // Generate 10 tokens rapidly
      for (let i = 0; i < 10; i++) {
        tokens.push(agent.initFor(userId));
      }
      
      // Verify all are unique
      const uniqueTokens = new Set(tokens);
      assert.equal(uniqueTokens.size, 10, 'All 10 tokens should be unique');
      
      // Consume all tokens
      for (const token of tokens) {
        const result = agent.pop(token);
        assert.equal(result, userId, 'Each token should return correct userId');
      }
      
      // All tokens should now be consumed
      for (const token of tokens) {
        const result = agent.pop(token);
        assert.equal(result, null, 'All tokens should be consumed');
      }
    });
  });

  test.describe('edge cases', () => {
    test.it('should handle special characters in userId', () => {
      const agent = new TokenRecordAgent();
      const specialUserId = 'user@123#test$%^&*()';
      const token = agent.initFor(specialUserId);
      
      assert.ok(token.length > 0, 'Should generate token for special characters');
      assert.equal(agent.pop(token), specialUserId, 'Should return userId with special characters');
    });

    test.it('should handle very long userId', () => {
      const agent = new TokenRecordAgent();
      const longUserId = 'a'.repeat(1000);
      const token = agent.initFor(longUserId);
      
      assert.ok(token.length > 0, 'Should generate token for long userId');
      assert.equal(agent.pop(token), longUserId, 'Should return long userId');
    });

    test.it('should handle unicode characters in userId', () => {
      const agent = new TokenRecordAgent();
      const unicodeUserId = '用户123🚀测试';
      const token = agent.initFor(unicodeUserId);
      
      assert.ok(token.length > 0, 'Should generate token for unicode userId');
      assert.equal(agent.pop(token), unicodeUserId, 'Should return unicode userId');
    });
  });
});
