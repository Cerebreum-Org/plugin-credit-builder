import { describe, it, expect } from 'bun:test';
import { creditBuilderPlugin } from '../index';
import { analyzeCreditAction } from '../actions/analyzeCreditAction';
import { sendDisputeAction } from '../actions/sendDisputeAction';
import { checkDisputesAction } from '../actions/checkDisputesAction';
import { buildBusinessCreditAction } from '../actions/buildBusinessCreditAction';
import { creditEducationAction } from '../actions/creditEducationAction';
import { creditContextProvider } from '../providers/creditContextProvider';
import { CreditProfileService } from '../services/creditProfileService';
import { LETTER_TEMPLATES } from '../templates';

describe('creditBuilderPlugin', () => {
  it('has name "credit-builder"', () => {
    expect(creditBuilderPlugin.name).toBe('credit-builder');
  });

  it('has a description', () => {
    expect(creditBuilderPlugin.description).toBeDefined();
    expect(creditBuilderPlugin.description!.length).toBeGreaterThan(0);
  });

  // ── Actions ─────────────────────────────────────────────────────

  describe('actions', () => {
    it('registers exactly 5 actions', () => {
      expect(creditBuilderPlugin.actions).toHaveLength(5);
    });

    it('includes ANALYZE_CREDIT', () => {
      expect(creditBuilderPlugin.actions).toContainEqual(analyzeCreditAction);
    });

    it('includes SEND_DISPUTE', () => {
      expect(creditBuilderPlugin.actions).toContainEqual(sendDisputeAction);
    });

    it('includes CHECK_DISPUTES', () => {
      expect(creditBuilderPlugin.actions).toContainEqual(checkDisputesAction);
    });

    it('includes BUILD_BUSINESS_CREDIT', () => {
      expect(creditBuilderPlugin.actions).toContainEqual(buildBusinessCreditAction);
    });

    it('includes CREDIT_EDUCATION', () => {
      expect(creditBuilderPlugin.actions).toContainEqual(creditEducationAction);
    });

    it('each action has name, description, handler, validate', () => {
      for (const action of creditBuilderPlugin.actions!) {
        expect(action.name).toBeDefined();
        expect(action.description).toBeDefined();
        expect(action.handler).toBeTypeOf('function');
      }
    });
  });

  // ── Providers ───────────────────────────────────────────────────

  describe('providers', () => {
    it('registers exactly 1 provider', () => {
      expect(creditBuilderPlugin.providers).toHaveLength(1);
    });

    it('includes credit_context provider', () => {
      expect(creditBuilderPlugin.providers).toContainEqual(creditContextProvider);
    });

    it('provider has get function', () => {
      expect(creditBuilderPlugin.providers![0].get).toBeTypeOf('function');
    });
  });

  // ── Services ────────────────────────────────────────────────────

  describe('services', () => {
    it('registers exactly 1 service', () => {
      expect(creditBuilderPlugin.services).toHaveLength(1);
    });

    it('includes CreditProfileService', () => {
      expect(creditBuilderPlugin.services).toContainEqual(CreditProfileService);
    });
  });

  // ── Named exports ───────────────────────────────────────────────

  describe('named exports', () => {
    it('exports LETTER_TEMPLATES', () => {
      expect(LETTER_TEMPLATES).toBeDefined();
      expect(Object.keys(LETTER_TEMPLATES).length).toBe(19);
    });
  });
});
