import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { checkDisputesAction } from '../../actions/checkDisputesAction';
import { CreditProfileService } from '../../services/creditProfileService';
import { createMockRuntime } from '../helpers/mockRuntime';
import { createProfile, createMessage, createDispute, TEST_USER_ID } from '../helpers/fixtures';
import type { IAgentRuntime, HandlerCallback } from '@elizaos/core';

describe('checkDisputesAction', () => {
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
      const result = await checkDisputesAction.validate!(runtime, createMessage('test'));
      expect(result).toBe(true);
    });
  });

  // ── handler — no disputes ─────────────────────────────────────────

  describe('handler — no disputes', () => {
    it('suggests using ANALYZE_CREDIT when no disputes exist', async () => {
      const result = await checkDisputesAction.handler(runtime, createMessage('check disputes'), undefined, {}, callback);
      expect(result!.success).toBe(true);
      expect(callbackTexts[0]).toContain('ANALYZE_CREDIT');
    });
  });

  // ── handler — with disputes ───────────────────────────────────────

  describe('handler — with pending disputes', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
      // Save a pending dispute (deadline in the future)
      const futureDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      await profileService.addDispute(TEST_USER_ID, createDispute({
        status: 'sent',
        response_deadline: futureDeadline,
        escalation_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      }));
    });

    it('shows total dispute count', async () => {
      await checkDisputesAction.handler(runtime, createMessage('check disputes'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('Total disputes: 1');
    });

    it('shows pending count', async () => {
      await checkDisputesAction.handler(runtime, createMessage('check disputes'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('Pending: 1');
    });

    it('shows days remaining for pending', async () => {
      await checkDisputesAction.handler(runtime, createMessage('check disputes'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('days remaining');
    });
  });

  describe('handler — with overdue disputes', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
      // Save an overdue dispute (deadline in the past)
      const pastDeadline = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      await profileService.addDispute(TEST_USER_ID, createDispute({
        status: 'sent',
        response_deadline: pastDeadline,
        escalation_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }));
    });

    it('shows overdue section', async () => {
      await checkDisputesAction.handler(runtime, createMessage('check disputes'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('OVERDUE');
    });

    it('recommends CFPB escalation', async () => {
      await checkDisputesAction.handler(runtime, createMessage('check disputes'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('CFPB');
    });

    it('mentions FCRA violation', async () => {
      await checkDisputesAction.handler(runtime, createMessage('check disputes'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('FCRA');
    });
  });

  describe('handler — with resolved disputes', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
      await profileService.addDispute(TEST_USER_ID, createDispute({
        status: 'resolved',
        outcome: 'deleted',
      }));
    });

    it('shows resolved section', async () => {
      await checkDisputesAction.handler(runtime, createMessage('check disputes'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('Resolved');
    });
  });

  // ── handler — service unavailable ─────────────────────────────────

  describe('handler — service unavailable', () => {
    it('returns failure when service is missing', async () => {
      (runtime.getService as any).mockImplementation(() => null);
      const result = await checkDisputesAction.handler(runtime, createMessage('disputes'), undefined, {}, callback);
      expect(result!.success).toBe(false);
    });
  });
});
