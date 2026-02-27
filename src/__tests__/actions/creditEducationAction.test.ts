import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { creditEducationAction } from '../../actions/creditEducationAction';
import { createMockRuntime } from '../helpers/mockRuntime';
import { createMessage } from '../helpers/fixtures';
import type { IAgentRuntime, HandlerCallback } from '@elizaos/core';

describe('creditEducationAction', () => {
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
      const result = await creditEducationAction.validate!(runtime, createMessage('test'));
      expect(result).toBe(true);
    });
  });

  // ── Topic routing ─────────────────────────────────────────────────

  describe('topic routing', () => {
    it('FICO score question → score breakdown', async () => {
      await creditEducationAction.handler(runtime, createMessage('how is my fico score calculated'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('35%');
      expect(text).toContain('30%');
      expect(text).toContain('15%');
      expect(text).toContain('Payment History');
    });

    it('utilization question → utilization strategy', async () => {
      await creditEducationAction.handler(runtime, createMessage('tell me about utilization'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('Utilization');
      expect(text).toContain('statement closing date');
    });

    it('AZEO keyword → AZEO strategy', async () => {
      await creditEducationAction.handler(runtime, createMessage('what is azeo'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('AZEO');
      expect(text).toContain('All Zero Except One');
    });

    it('authorized user question → AU strategy', async () => {
      await creditEducationAction.handler(runtime, createMessage('tell me about authorized user hack'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('Authorized User');
      expect(text).toContain('+30-50 points');
    });

    it('myth question → myths debunked', async () => {
      await creditEducationAction.handler(runtime, createMessage('common credit myths'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('carry a balance');
      expect(text).toContain('Closing');
    });

    it('rights question → FCRA rights', async () => {
      await creditEducationAction.handler(runtime, createMessage('what are my fcra rights'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('FCRA');
      expect(text).toContain('dispute');
      expect(text).toContain('Right to sue');
    });
  });

  // ── Default fallback ──────────────────────────────────────────────

  describe('default fallback', () => {
    it('shows topics list for unrecognized question', async () => {
      await creditEducationAction.handler(runtime, createMessage('help me with credit'), undefined, {}, callback);
      const text = callbackTexts.join(' ');
      expect(text).toContain('FICO score factors');
      expect(text).toContain('Dispute process');
    });
  });

  // ── Always succeeds ───────────────────────────────────────────────

  it('always returns success', async () => {
    const result = await creditEducationAction.handler(runtime, createMessage('credit question'), undefined, {}, callback);
    expect(result!.success).toBe(true);
  });
});
