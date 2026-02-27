import { describe, it, expect, beforeEach } from 'bun:test';
import { CreditProfileService } from '../../services/creditProfileService';
import { createMockRuntime } from '../helpers/mockRuntime';
import { createProfile, createNegativeItem, createDispute, createAddress, TEST_USER_ID } from '../helpers/fixtures';
import type { IAgentRuntime } from '@elizaos/core';

describe('CreditProfileService', () => {
  let runtime: IAgentRuntime;
  let service: CreditProfileService;

  beforeEach(async () => {
    runtime = createMockRuntime();
    service = await CreditProfileService.start(runtime);
  });

  // ── normalizeCreditorName ─────────────────────────────────────────────

  describe('normalizeCreditorName', () => {
    it('lowercases and dash-separates words', () => {
      expect(service.normalizeCreditorName('Capital One')).toBe('capital-one');
    });

    it('strips special characters', () => {
      expect(service.normalizeCreditorName('Midland Credit Management, Inc.')).toBe('midland-credit-management-inc');
    });

    it('collapses consecutive non-alphanumeric into single dash', () => {
      expect(service.normalizeCreditorName('ABC@#$DEF')).toBe('abc-def');
    });

    it('strips leading and trailing dashes', () => {
      expect(service.normalizeCreditorName('---Chase---')).toBe('chase');
    });

    it('handles empty string', () => {
      expect(service.normalizeCreditorName('')).toBe('');
    });

    it('preserves distinction between "Chase Bank" and "ChaseBank"', () => {
      const a = service.normalizeCreditorName('Chase Bank');
      const b = service.normalizeCreditorName('ChaseBank');
      expect(a).not.toBe(b);
    });
  });

  // ── Profile CRUD ──────────────────────────────────────────────────────

  describe('saveProfile / getProfile', () => {
    it('round-trips a profile', async () => {
      const profile = createProfile();
      await service.saveProfile(TEST_USER_ID, profile);
      const retrieved = await service.getProfile(TEST_USER_ID);
      expect(retrieved).toEqual(profile);
    });

    it('returns undefined for non-existent user', async () => {
      const result = await service.getProfile('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('merges partial updates', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ current_score: 600 }));
      const updated = await service.updateProfile(TEST_USER_ID, { current_score: 700 });
      expect(updated?.current_score).toBe(700);
      expect(updated?.name).toBe('John Doe');
    });

    it('returns undefined for non-existent user', async () => {
      const result = await service.updateProfile('nobody', { current_score: 800 });
      expect(result).toBeUndefined();
    });
  });

  // ── Creditor Address CRUD ─────────────────────────────────────────────

  describe('saveCreditorAddress / getCreditorAddress', () => {
    it('round-trips a creditor address', async () => {
      const addr = createAddress();
      await service.saveCreditorAddress(TEST_USER_ID, addr);
      const retrieved = await service.getCreditorAddress(TEST_USER_ID, 'Midland Credit Management');
      expect(retrieved).toEqual(addr);
    });

    it('retrieves with different casing', async () => {
      await service.saveCreditorAddress(TEST_USER_ID, createAddress());
      const retrieved = await service.getCreditorAddress(TEST_USER_ID, 'MIDLAND CREDIT MANAGEMENT');
      expect(retrieved).toBeDefined();
      expect(retrieved?.creditor_name).toBe('Midland Credit Management');
    });

    it('returns undefined for unknown creditor', async () => {
      const result = await service.getCreditorAddress(TEST_USER_ID, 'Unknown Corp');
      expect(result).toBeUndefined();
    });
  });

  // ── runAudit — Score Phase ────────────────────────────────────────────

  describe('runAudit — score phase', () => {
    it('returns undefined for non-existent user', async () => {
      const audit = await service.runAudit('nobody');
      expect(audit).toBeUndefined();
    });

    it('classifies 750 as elite', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ current_score: 750 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.score_phase).toBe('elite');
    });

    it('classifies 700 as optimization', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ current_score: 700 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.score_phase).toBe('optimization');
    });

    it('classifies 600 as acceleration', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ current_score: 600 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.score_phase).toBe('acceleration');
    });

    it('classifies 500 as foundation', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ current_score: 500 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.score_phase).toBe('foundation');
    });

    it('classifies undefined score as foundation', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ current_score: undefined }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.score_phase).toBe('foundation');
    });
  });

  // ── runAudit — Payment History ────────────────────────────────────────

  describe('runAudit — payment history', () => {
    it('adds strength for 99%+ on-time', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ on_time_payment_percent: 99 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.strengths.some(s => s.factor === 'payment_history')).toBe(true);
    });

    it('adds weakness for <95% on-time', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ on_time_payment_percent: 90 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.weaknesses.some(w => w.factor === 'payment_history')).toBe(true);
    });

    it('no entry for 96% (between thresholds)', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ on_time_payment_percent: 96 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.strengths.some(s => s.factor === 'payment_history')).toBe(false);
      expect(audit?.weaknesses.some(w => w.factor === 'payment_history')).toBe(false);
    });
  });

  // ── runAudit — Utilization ────────────────────────────────────────────

  describe('runAudit — utilization', () => {
    it('excellent for <=9%', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ utilization_percent: 5 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.utilization_status).toBe('excellent');
      expect(audit?.strengths.some(s => s.factor === 'utilization')).toBe(true);
    });

    it('good for 10-30%', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ utilization_percent: 20 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.utilization_status).toBe('good');
    });

    it('fair for 31-50%', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ utilization_percent: 40 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.utilization_status).toBe('fair');
      expect(audit?.weaknesses.some(w => w.factor === 'utilization')).toBe(true);
    });

    it('critical for >50%', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ utilization_percent: 70 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.utilization_status).toBe('critical');
    });

    it('computes from balance/limit when utilization_percent is absent', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        utilization_percent: undefined,
        total_balance: 500,
        total_credit_limit: 10000,
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.utilization_status).toBe('excellent'); // 5%
    });
  });

  // ── runAudit — Age Analysis ───────────────────────────────────────────

  describe('runAudit — age', () => {
    it('adds strength for 84+ months', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ average_account_age_months: 84 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.strengths.some(s => s.factor === 'age')).toBe(true);
    });

    it('adds weakness for <24 months', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ average_account_age_months: 12 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.weaknesses.some(w => w.factor === 'age')).toBe(true);
    });

    it('no entry for 30 months (between thresholds)', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ average_account_age_months: 30 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.strengths.some(s => s.factor === 'age')).toBe(false);
      expect(audit?.weaknesses.some(w => w.factor === 'age')).toBe(false);
    });
  });

  // ── runAudit — Mix & Inquiries ────────────────────────────────────────

  describe('runAudit — credit mix', () => {
    it('flags missing revolving and installment', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ account_types: [] }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.missing_account_types).toContain('revolving');
      expect(audit?.missing_account_types).toContain('installment');
    });

    it('adds weakness for <3 account types', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ account_types: ['revolving'] }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.weaknesses.some(w => w.factor === 'mix')).toBe(true);
    });
  });

  describe('runAudit — inquiries', () => {
    it('adds weakness for >3 hard inquiries', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ hard_inquiries_last_12mo: 5 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.weaknesses.some(w => w.factor === 'inquiries')).toBe(true);
    });

    it('no weakness for exactly 3', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ hard_inquiries_last_12mo: 3 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.weaknesses.some(w => w.factor === 'inquiries')).toBe(false);
    });
  });

  // ── runAudit — Dispute Candidates ─────────────────────────────────────

  describe('runAudit — dispute candidates', () => {
    it('assesses collection as debt_validation', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        negative_items: [createNegativeItem({ type: 'collection' })],
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.disputable_items[0].recommended_letter_type).toBe('debt_validation');
    });

    it('assesses late_payment without reason as goodwill', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        negative_items: [createNegativeItem({ type: 'late_payment', dispute_reason: undefined })],
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.disputable_items[0].recommended_letter_type).toBe('goodwill');
    });

    it('assesses late_payment with reason as basic_bureau', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        negative_items: [createNegativeItem({ type: 'late_payment', dispute_reason: 'Not mine' })],
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.disputable_items[0].recommended_letter_type).toBe('basic_bureau');
    });

    it('assesses chargeoff as chargeoff_removal', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        negative_items: [createNegativeItem({ type: 'chargeoff' })],
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.disputable_items[0].recommended_letter_type).toBe('chargeoff_removal');
    });

    it('assesses inquiry as unauthorized_inquiry', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        negative_items: [createNegativeItem({ type: 'inquiry' })],
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.disputable_items[0].recommended_letter_type).toBe('unauthorized_inquiry');
    });

    it('sorts by priority_score descending', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        negative_items: [
          createNegativeItem({ type: 'inquiry' }),     // gain=8, prob=0.7  -> 5.6
          createNegativeItem({ type: 'collection' }),  // gain=45, prob=0.55 -> 24.8
        ],
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.disputable_items[0].recommended_letter_type).toBe('debt_validation');
      expect(audit?.disputable_items[1].recommended_letter_type).toBe('unauthorized_inquiry');
    });

    it('excludes items with disputable=false', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        negative_items: [createNegativeItem({ type: 'collection', disputable: false })],
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.disputable_items).toHaveLength(0);
    });
  });

  // ── runAudit — Recommendations ────────────────────────────────────────

  describe('runAudit — recommendations', () => {
    it('always includes Experian Boost', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile());
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.recommended_actions.some(a => a.action === 'Enable Experian Boost')).toBe(true);
    });

    it('recommends utilization reduction for critical', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ utilization_percent: 80 }));
      const audit = await service.runAudit(TEST_USER_ID);
      const action = audit?.recommended_actions.find(a => a.action === 'Reduce utilization');
      expect(action).toBeDefined();
      expect(action?.estimated_score_impact).toBe(50);
    });

    it('recommends dispute for profiles with negative items', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile());
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.recommended_actions.some(a => a.action === 'Dispute negative items')).toBe(true);
    });

    it('recommends secured card for foundation phase with <3 accounts', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({
        current_score: 500,
        total_accounts: 1,
      }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.recommended_actions.some(a => a.action === 'Open secured credit card')).toBe(true);
    });

    it('actions are sorted by priority ascending', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile());
      const audit = await service.runAudit(TEST_USER_ID);
      const priorities = audit?.recommended_actions.map(a => a.priority) || [];
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
      }
    });
  });

  // ── Dispute Tracking ──────────────────────────────────────────────────

  describe('dispute tracking', () => {
    it('addDispute and getDisputes round-trip', async () => {
      const dispute = createDispute();
      await service.addDispute(TEST_USER_ID, dispute);
      const all = await service.getDisputes(TEST_USER_ID);
      expect(all).toHaveLength(1);
      expect(all[0].letter_type).toBe('basic_bureau');
    });

    it('getPendingDisputes returns sent disputes with future deadline', async () => {
      const future = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      await service.addDispute(TEST_USER_ID, createDispute({
        status: 'sent',
        response_deadline: future,
      }));
      const pending = await service.getPendingDisputes(TEST_USER_ID);
      expect(pending).toHaveLength(1);
    });

    it('getOverdueDisputes returns sent disputes with past deadline', async () => {
      const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      await service.addDispute(TEST_USER_ID, createDispute({
        status: 'sent',
        response_deadline: past,
      }));
      const overdue = await service.getOverdueDisputes(TEST_USER_ID);
      expect(overdue).toHaveLength(1);
    });

    it('resolved disputes excluded from pending and overdue', async () => {
      await service.addDispute(TEST_USER_ID, createDispute({ status: 'resolved' }));
      const pending = await service.getPendingDisputes(TEST_USER_ID);
      const overdue = await service.getOverdueDisputes(TEST_USER_ID);
      expect(pending).toHaveLength(0);
      expect(overdue).toHaveLength(0);
    });
  });

  // ── Payment History Status ────────────────────────────────────────────

  describe('runAudit — payment_history_status', () => {
    it('perfect for 99%+', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ on_time_payment_percent: 99 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.payment_history_status).toBe('perfect');
    });

    it('good for 95-98%', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ on_time_payment_percent: 96 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.payment_history_status).toBe('good');
    });

    it('needs_work for 85-94%', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ on_time_payment_percent: 90 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.payment_history_status).toBe('needs_work');
    });

    it('poor for <85%', async () => {
      await service.saveProfile(TEST_USER_ID, createProfile({ on_time_payment_percent: 70 }));
      const audit = await service.runAudit(TEST_USER_ID);
      expect(audit?.payment_history_status).toBe('poor');
    });
  });
});
