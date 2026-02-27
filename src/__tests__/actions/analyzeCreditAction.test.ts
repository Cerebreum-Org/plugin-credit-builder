import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { analyzeCreditAction } from '../../actions/analyzeCreditAction';
import { CreditProfileService } from '../../services/creditProfileService';
import { createMockRuntime } from '../helpers/mockRuntime';
import { createProfile, createMessage, TEST_USER_ID } from '../helpers/fixtures';
import type { IAgentRuntime, HandlerCallback } from '@elizaos/core';

describe('analyzeCreditAction', () => {
  let runtime: IAgentRuntime;
  let profileService: CreditProfileService;
  let callback: HandlerCallback;
  let callbackTexts: string[];

  beforeEach(async () => {
    callbackTexts = [];
    callback = mock(async (response: any) => {
      callbackTexts.push(response.text || '');
      return [];
    }) as unknown as HandlerCallback;

    runtime = createMockRuntime({});
    profileService = await CreditProfileService.start(runtime);
    (runtime.getService as any).mockImplementation((name: string) => {
      if (name === 'credit_profile') return profileService;
      return null;
    });
  });

  // ── validate ──────────────────────────────────────────────────────

  describe('validate', () => {
    it('always returns true', async () => {
      const result = await analyzeCreditAction.validate!(runtime, createMessage('test'));
      expect(result).toBe(true);
    });
  });

  // ── handler — no profile (intake) ─────────────────────────────────

  describe('handler — no profile', () => {
    it('starts intake and asks for credit info', async () => {
      const result = await analyzeCreditAction.handler(runtime, createMessage('analyze my credit'), undefined, {}, callback);
      expect(result.success).toBe(true);
      expect(callbackTexts[0]).toContain('credit score');
      expect(callbackTexts[0]).toContain('credit accounts');
    });

    it('mentions required info fields', async () => {
      await analyzeCreditAction.handler(runtime, createMessage('check credit'), undefined, {}, callback);
      expect(callbackTexts[0]).toContain('late payments');
      expect(callbackTexts[0]).toContain('credit limit');
    });
  });

  // ── handler — has profile (audit) ─────────────────────────────────

  describe('handler — has profile', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    it('returns success with audit data', async () => {
      const result = await analyzeCreditAction.handler(runtime, createMessage('analyze credit'), undefined, {}, callback);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('includes score phase', async () => {
      await analyzeCreditAction.handler(runtime, createMessage('credit audit'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('Phase');
    });

    it('includes current score', async () => {
      await analyzeCreditAction.handler(runtime, createMessage('credit audit'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('620');
    });

    it('includes utilization status', async () => {
      await analyzeCreditAction.handler(runtime, createMessage('credit audit'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('Utilization');
    });

    it('includes payment history status', async () => {
      await analyzeCreditAction.handler(runtime, createMessage('credit audit'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('Payment History');
    });

    it('lists disputable items', async () => {
      await analyzeCreditAction.handler(runtime, createMessage('credit audit'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('Disputable Items');
    });

    it('lists recommended actions', async () => {
      await analyzeCreditAction.handler(runtime, createMessage('credit audit'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('Recommended Actions');
    });
  });

  // ── handler — service unavailable ─────────────────────────────────

  describe('handler — service unavailable', () => {
    it('returns failure when service is missing', async () => {
      (runtime.getService as any).mockImplementation(() => null);
      const result = await analyzeCreditAction.handler(runtime, createMessage('analyze'), undefined, {}, callback);
      expect(result.success).toBe(false);
    });
  });
});
