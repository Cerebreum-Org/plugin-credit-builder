import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { creditContextProvider } from '../../providers/creditContextProvider';
import { CreditProfileService } from '../../services/creditProfileService';
import { createMockRuntime } from '../helpers/mockRuntime';
import { createProfile, createMessage, createDispute, createAddress, TEST_USER_ID } from '../helpers/fixtures';
import type { IAgentRuntime, State } from '@elizaos/core';

describe('creditContextProvider', () => {
  let runtime: IAgentRuntime;
  let profileService: CreditProfileService;

  beforeEach(async () => {
    runtime = createMockRuntime({});
    profileService = await CreditProfileService.start(runtime);
    (runtime.getService as any).mockImplementation((name: string) => {
      if (name === 'credit_profile') return profileService;
      return null;
    });
  });

  // ── No service ────────────────────────────────────────────────────

  it('returns unavailable message when service missing', async () => {
    (runtime.getService as any).mockImplementation(() => null);
    const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
    expect(result.text).toContain('not available');
  });

  // ── No profile ────────────────────────────────────────────────────

  it('suggests ANALYZE_CREDIT when no profile exists', async () => {
    const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
    expect(result.text).toContain('ANALYZE_CREDIT');
  });

  // ── Has profile ───────────────────────────────────────────────────

  describe('with profile', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    it('includes credit score', async () => {
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('620');
    });

    it('includes score phase', async () => {
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('Phase');
    });

    it('includes utilization', async () => {
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('30%');
    });

    it('includes negative item count', async () => {
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('Negative items: 3');
    });

    it('includes pending dispute count', async () => {
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('Pending disputes: 0');
    });
  });

  // ── Overdue disputes ──────────────────────────────────────────────

  describe('overdue disputes', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
      const pastDeadline = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      await profileService.addDispute(TEST_USER_ID, createDispute({
        status: 'sent',
        response_deadline: pastDeadline,
        escalation_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }));
    });

    it('warns about overdue disputes', async () => {
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('Overdue disputes: 1');
    });

    it('recommends CFPB escalation', async () => {
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('CFPB');
    });
  });

  // ── Creditor address awareness ────────────────────────────────────

  describe('creditor address awareness', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    it('shows creditors needing addresses', async () => {
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('Creditors needing address');
    });

    it('shows creditors with addresses on file', async () => {
      await profileService.saveCreditorAddress(TEST_USER_ID, createAddress({
        creditor_name: 'Midland Credit Management',
      }));
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('Creditor addresses on file');
      expect(result.text).toContain('Midland Credit Management');
    });
  });

  // ── Business credit ───────────────────────────────────────────────

  describe('business profile', () => {
    it('includes business credit section when present', async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile({
        business: {
          legal_name: 'Acme LLC',
          entity_type: 'llc',
          duns_number: '123456789',
          paydex_score: 80,
          existing_trade_lines: 5,
        },
      }));
      const result = await creditContextProvider.get(runtime, createMessage('test'), {} as State);
      expect(result.text).toContain('Acme LLC');
      expect(result.text).toContain('DUNS');
      expect(result.text).toContain('PAYDEX');
    });
  });
});
