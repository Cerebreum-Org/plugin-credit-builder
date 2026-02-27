import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { buildBusinessCreditAction } from '../../actions/buildBusinessCreditAction';
import { createMockRuntime } from '../helpers/mockRuntime';
import { createMessage } from '../helpers/fixtures';
import type { IAgentRuntime, HandlerCallback } from '@elizaos/core';

describe('buildBusinessCreditAction', () => {
  let runtime: IAgentRuntime;
  let callback: HandlerCallback;
  let callbackTexts: string[];

  beforeEach(() => {
    callbackTexts = [];
    callback = mock(async (response: any) => {
      callbackTexts.push(response.text || '');
      return [];
    }) as unknown as HandlerCallback;

    runtime = createMockRuntime({});
  });

  // ── validate ──────────────────────────────────────────────────────

  describe('validate', () => {
    it('always returns true', async () => {
      const result = await buildBusinessCreditAction.validate!(runtime, createMessage('test'));
      expect(result).toBe(true);
    });
  });

  // ── Phase routing ─────────────────────────────────────────────────

  describe('phase routing', () => {
    const phase0Keywords = ['start building business credit', 'new business credit from zero', 'foundation for business credit'];
    for (const input of phase0Keywords) {
      it(`"${input}" → Phase 0: Foundation`, async () => {
        await buildBusinessCreditAction.handler(runtime, createMessage(input), undefined, {}, callback);
        const text = callbackTexts.join(' ');
        expect(text).toContain('Foundation');
        expect(text).toContain('LLC');
        expect(text).toContain('EIN');
        expect(text).toContain('DUNS');
      });
    }

    const phase1Keywords = ['vendor credit accounts', 'net 30 trade lines', 'net-30 accounts'];
    for (const input of phase1Keywords) {
      it(`"${input}" → Phase 1: Vendor Credit`, async () => {
        await buildBusinessCreditAction.handler(runtime, createMessage(input), undefined, {}, callback);
        const text = callbackTexts.join(' ');
        expect(text).toContain('Vendor');
        expect(text).toContain('Uline');
      });
    }

    const phase23Keywords = ['business credit card options', 'no personal guarantee cards', 'no pg credit'];
    for (const input of phase23Keywords) {
      it(`"${input}" → Phase 2-3: Cards`, async () => {
        await buildBusinessCreditAction.handler(runtime, createMessage(input), undefined, {}, callback);
        const text = callbackTexts.join(' ');
        expect(text).toContain('Card');
      });
    }

    const phase4Keywords = ['sba loan options', 'business line of credit', 'business loan'];
    for (const input of phase4Keywords) {
      it(`"${input}" → Phase 4: Loans`, async () => {
        await buildBusinessCreditAction.handler(runtime, createMessage(input), undefined, {}, callback);
        const text = callbackTexts.join(' ');
        expect(text).toContain('SBA') ;
      });
    }
  });

  // ── Default overview ──────────────────────────────────────────────

  describe('default overview', () => {
    it('shows overview for generic business credit question', async () => {
      await buildBusinessCreditAction.handler(runtime, createMessage('tell me about business credit'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('Phase 0');
      expect(text).toContain('Phase 1');
      expect(text).toContain('Phase 2');
      expect(text).toContain('Phase 3');
      expect(text).toContain('Phase 4');
      expect(text).toContain('PAYDEX');
    });
  });

  // ── Always succeeds ───────────────────────────────────────────────

  it('always returns success', async () => {
    const result = await buildBusinessCreditAction.handler(runtime, createMessage('business credit'), undefined, {}, callback);
    expect(result!.success).toBe(true);
  });
});
