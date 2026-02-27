import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { sendDisputeAction } from '../../actions/sendDisputeAction';
import { CreditProfileService } from '../../services/creditProfileService';
import { createMockRuntime } from '../helpers/mockRuntime';
import { createProfile, createNegativeItem, createAddress, createMessage, TEST_USER_ID, LOB_SEND_RESPONSE } from '../helpers/fixtures';
import type { IAgentRuntime, HandlerCallback } from '@elizaos/core';

describe('sendDisputeAction', () => {
  let runtime: IAgentRuntime;
  let profileService: CreditProfileService;
  let callback: HandlerCallback;
  let callbackTexts: string[];
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    callbackTexts = [];
    callback = mock(async (response: any) => {
      callbackTexts.push(response.text || '');
      return [];
    }) as unknown as HandlerCallback;

    runtime = createMockRuntime({
      settings: { LOB_API_KEY: 'test_key123' },
    });

    profileService = await CreditProfileService.start(runtime);
    (runtime.getService as any).mockImplementation((name: string) => {
      if (name === 'credit_profile') return profileService;
      return null;
    });

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(LOB_SEND_RESPONSE), { status: 200 }))
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── validate ──────────────────────────────────────────────────────────

  describe('validate', () => {
    it('returns true when LOB_API_KEY is set', async () => {
      const result = await sendDisputeAction.validate!(runtime, createMessage('test'));
      expect(result).toBe(true);
    });

    it('returns false when LOB_API_KEY is missing', async () => {
      const noKeyRuntime = createMockRuntime({ settings: {} });
      const result = await sendDisputeAction.validate!(noKeyRuntime, createMessage('test'));
      expect(result).toBe(false);
    });
  });

  // ── handler — no profile ──────────────────────────────────────────────

  describe('handler — no profile', () => {
    it('asks user to run ANALYZE_CREDIT', async () => {
      const result = await sendDisputeAction.handler(runtime, createMessage('send dispute'), undefined, {}, callback);
      expect(result!.success).toBe(false);
      expect(callbackTexts[0]).toContain('ANALYZE_CREDIT');
    });
  });

  // ── handler — no negative items ───────────────────────────────────────

  describe('handler — no negative items', () => {
    it('refuses to send when profile has no negative items', async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile({ negative_items: [] }));
      const result = await sendDisputeAction.handler(runtime, createMessage('send basic dispute to equifax'), undefined, {}, callback);
      expect(result!.success).toBe(false);
      expect(callbackTexts[0]).toContain('No negative items');
    });
  });

  // ── Letter type detection ─────────────────────────────────────────────

  describe('letter type detection', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    // Bureau-target letters: callback contains the letter name (sends immediately)
    const bureauCases: [string, string][] = [
      ['send 609 letter to equifax', '609 Verification Request'],
      ['611 reinvestigation to experian', '611 Reinvestigation Demand'],
      ['send verification request to transunion', 'Method of Verification Demand'],
      ['identity theft dispute to equifax', 'Identity Theft Dispute'],
      ['remove hard pull from equifax', 'Unauthorized Inquiry Removal'],
    ];

    for (const [input, expectedName] of bureauCases) {
      it(`"${input}" -> ${expectedName}`, async () => {
        await sendDisputeAction.handler(runtime, createMessage(input), undefined, {}, callback);
        expect(callbackTexts.join(' ')).toContain(expectedName);
      });
    }

    // Creditor-target letters: handler enters creditor flow (prompts for address)
    const creditorCases: [string, string][] = [
      ['goodwill letter to Capital One', 'Capital One'],
      ['direct dispute to Chase Bank', 'Chase Bank'],
      ['charge off removal to Chase Bank', 'Chase Bank'],
      ['arbitration election', 'creditor'],
      ['billing error dispute', 'creditor'],
    ];

    for (const [input, expectedText] of creditorCases) {
      it(`"${input}" -> creditor flow`, async () => {
        await sendDisputeAction.handler(runtime, createMessage(input), undefined, {}, callback);
        expect(callbackTexts.join(' ')).toContain(expectedText);
      });
    }

    // Collector-target letters: handler enters collector flow
    const collectorCases: [string, string][] = [
      ['validate this debt', 'collector'],
      ['cease and desist', 'collector'],
      ['send pay for delete', 'collector'],
      ['hipaa medical debt dispute', 'collector'],
      ['statute of limitations defense', 'collector'],
    ];

    for (const [input, expectedText] of collectorCases) {
      it(`"${input}" -> collector flow`, async () => {
        await sendDisputeAction.handler(runtime, createMessage(input), undefined, {}, callback);
        expect(callbackTexts.join(' ')).toContain(expectedText);
      });
    }

    // "any"-target letters: handler asks who to send to
    const anyCases: [string, string][] = [
      ['intent to sue equifax', 'equifax'],
      ['breach of contract notice', 'Who should I send this to'],
      ['formal demand letter', 'Who should I send this to'],
    ]

    for (const [input, expectedText] of anyCases) {
      it(`"${input}" -> any flow`, async () => {
        await sendDisputeAction.handler(runtime, createMessage(input), undefined, {}, callback);
        expect(callbackTexts.join(' ')).toContain(expectedText);
      });
    }

    it('defaults to Basic Credit Bureau Dispute for unrecognized text', async () => {
      await sendDisputeAction.handler(runtime, createMessage('send dispute to equifax'), undefined, {}, callback);
      expect(callbackTexts.join(' ')).toContain('Basic Credit Bureau Dispute');
    });
  });

  // ── Bureau target routing ─────────────────────────────────────────────

  describe('bureau target routing', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    it('sends to single bureau when name detected', async () => {
      const result = await sendDisputeAction.handler(runtime, createMessage('send 609 to experian'), undefined, {}, callback);
      expect(result!.success).toBe(true);
      expect(callbackTexts.join(' ')).toContain('experian');
    });

    it('sends to all 3 when "all 3 bureaus" mentioned', async () => {
      const result = await sendDisputeAction.handler(runtime, createMessage('send basic dispute to all 3 bureaus'), undefined, {}, callback);
      expect(result!.success).toBe(true);
      expect(callbackTexts.join(' ')).toContain('all 3 bureaus');
    });

    it('defaults to equifax when no bureau specified for bureau-type letter', async () => {
      const result = await sendDisputeAction.handler(runtime, createMessage('send 609 letter'), undefined, {}, callback);
      expect(result!.success).toBe(true);
      expect(callbackTexts.join(' ')).toContain('equifax');
    });
  });

  // ── Creditor/Collector target routing ─────────────────────────────────

  describe('creditor/collector routing', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    it('prompts for creditor name when none detected', async () => {
      const result = await sendDisputeAction.handler(runtime, createMessage('send goodwill letter'), undefined, {}, callback);
      expect(result!.success).toBe(true);
      expect(callbackTexts.join(' ')).toContain('Which one');
    });

    it('lists known creditors when prompting', async () => {
      await sendDisputeAction.handler(runtime, createMessage('send debt validation'), undefined, {}, callback);
      const allText = callbackTexts.join(' ');
      expect(allText).toContain('Midland Credit Management');
    });

    it('prompts for address when creditor name found but no stored address', async () => {
      await sendDisputeAction.handler(runtime, createMessage('send goodwill letter to Capital One'), undefined, {}, callback);
      const allText = callbackTexts.join(' ');
      expect(allText).toContain("don't have a mailing address");
      expect(allText).toContain('Capital One');
    });

    it('sends when creditor name and address both found', async () => {
      await profileService.saveCreditorAddress(TEST_USER_ID, createAddress({
        creditor_name: 'Capital One',
        entity_type: 'creditor',
        name: 'Capital One',
        address_line1: '123 Bank St',
        city: 'Richmond',
        state: 'VA',
        zip: '23219',
      }));

      const result = await sendDisputeAction.handler(runtime, createMessage('send goodwill letter to Capital One'), undefined, {}, callback);
      expect(result!.success).toBe(true);
      expect(callbackTexts.join(' ')).toContain('Dispute sent');
    });
  });

  // ── Address parsing ───────────────────────────────────────────────────
  // Note: parseCreditorAddress only runs inside the creditor/collector handler path.
  // A standalone address message defaults to basic_bureau (target_type=bureau),
  // so it never reaches the parser. These tests verify the flow works end-to-end
  // when the address is provided alongside a collector/creditor keyword.

  describe('address parsing via creditor flow', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    it('creditor letter without stored address prompts for address in correct format', async () => {
      await sendDisputeAction.handler(
        runtime,
        createMessage('send goodwill letter to Capital One'),
        undefined, {}, callback
      );
      const allText = callbackTexts.join(' ');
      expect(allText).toContain("don't have a mailing address");
      expect(allText).toContain('Capital One');
      // The prompt shows the expected format
      expect(allText).toContain('City, ST 12345');
    });

    it('sends successfully when creditor has a stored address', async () => {
      await profileService.saveCreditorAddress(TEST_USER_ID, createAddress({
        creditor_name: 'Midland Credit Management',
        entity_type: 'collector',
        name: 'Midland Credit Management',
      }));

      const result = await sendDisputeAction.handler(
        runtime,
        createMessage('validate debt from Midland Credit Management'),
        undefined, {}, callback
      );
      expect(result!.success).toBe(true);
      expect(callbackTexts.join(' ')).toContain('Dispute sent');
    });

    it('does not trigger address parsing for bureau letters', async () => {
      // Even if the text looks like an address, bureau letters skip creditor path
      await sendDisputeAction.handler(
        runtime,
        createMessage('send 609 letter to equifax'),
        undefined, {}, callback
      );
      expect(callbackTexts.join(' ')).not.toContain('Address saved');
      expect(callbackTexts.join(' ')).toContain('609 Verification Request');
    });
  });

  // ── "any" target type routing ─────────────────────────────────────────

  describe('"any" target routing', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    it('routes to bureau when bureau name detected', async () => {
      const result = await sendDisputeAction.handler(
        runtime,
        createMessage('intent to sue equifax'),
        undefined, {}, callback
      );
      expect(result!.success).toBe(true);
      expect(callbackTexts.join(' ')).toContain('equifax');
      expect(callbackTexts.join(' ')).toContain('Intent to Sue');
    });

    it('asks user to specify target when no bureau/creditor detected', async () => {
      const result = await sendDisputeAction.handler(
        runtime,
        createMessage('send intent to sue letter'),
        undefined, {}, callback
      );
      expect(callbackTexts.join(' ')).toContain('Who should I send this to');
    });
  });

  // ── Error handling ────────────────────────────────────────────────────

  describe('error handling', () => {
    beforeEach(async () => {
      await profileService.saveProfile(TEST_USER_ID, createProfile());
    });

    it('catches Lob API errors and reports to user', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response('Payment required', { status: 402 }))
      ) as unknown as typeof fetch;

      const result = await sendDisputeAction.handler(
        runtime,
        createMessage('send 609 to equifax'),
        undefined, {}, callback
      );
      expect(result!.success).toBe(false);
      expect(callbackTexts.join(' ')).toContain('Failed to send dispute');
    });
  });
});
