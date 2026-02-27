import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import { LobMailService } from '../../services/lobMailService';
import { createProfile, createNegativeItem, LOB_SEND_RESPONSE, LOB_VERIFY_RESPONSE } from '../helpers/fixtures';
import type { LetterAddress } from '../../types';

const TEST_API_KEY = 'test_abc123';
const LIVE_API_KEY = 'live_xyz789';

function mockFetchOk(body: unknown) {
  return mock(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));
}

function mockFetchError(status: number, body: string) {
  return mock(() => Promise.resolve(new Response(body, { status })));
}

describe('LobMailService', () => {
  let service: LobMailService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    service = new LobMailService(TEST_API_KEY);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── isTest ────────────────────────────────────────────────────────────

  describe('isTest', () => {
    it('returns true for test_ prefixed key', () => {
      expect(new LobMailService('test_key').isTest).toBe(true);
    });

    it('returns false for live_ prefixed key', () => {
      expect(new LobMailService('live_key').isTest).toBe(false);
    });
  });

  // ── verifyAddress ─────────────────────────────────────────────────────

  describe('verifyAddress', () => {
    it('sends POST to /v1/us_verifications', async () => {
      const fetchMock = mockFetchOk(LOB_VERIFY_RESPONSE);
      globalThis.fetch = fetchMock;

      await service.verifyAddress({
        address_line1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '90210',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/v1/us_verifications');
      expect(opts.method).toBe('POST');
    });

    it('includes Basic auth header', async () => {
      const fetchMock = mockFetchOk(LOB_VERIFY_RESPONSE);
      globalThis.fetch = fetchMock;

      await service.verifyAddress({ address_line1: '123 Main', city: 'City', state: 'CA', zip: '90210' });

      const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      const authHeader = (opts.headers as Record<string, string>)['Authorization'];
      expect(authHeader).toStartWith('Basic ');
      expect(atob(authHeader.replace('Basic ', ''))).toBe(TEST_API_KEY + ':');
    });

    it('throws on non-OK response', async () => {
      globalThis.fetch = mockFetchError(422, 'Invalid address');

      await expect(
        service.verifyAddress({ address_line1: 'bad', city: 'x', state: 'XX', zip: '00000' })
      ).rejects.toThrow('Lob address verification failed (422)');
    });
  });

  // ── sendCertifiedLetter ───────────────────────────────────────────────

  describe('sendCertifiedLetter', () => {
    const from = { name: 'John', address_line1: '123 Main', city: 'LA', state: 'CA', zip: '90001' };
    const to = { name: 'Bureau', address_line1: 'PO Box 1', city: 'ATL', state: 'GA', zip: '30301' };

    it('sends POST to /v1/letters with form data', async () => {
      const fetchMock = mockFetchOk(LOB_SEND_RESPONSE);
      globalThis.fetch = fetchMock;

      await service.sendCertifiedLetter(from, to, '<html>letter</html>', 'Test letter');

      const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/v1/letters');
      expect(opts.method).toBe('POST');
      const body = opts.body as string;
      expect(body).toContain('to%5Bname%5D=Bureau');
      expect(body).toContain('from%5Bname%5D=John');
      expect(body).toContain('extra_service=certified_return_receipt');
    });

    it('throws on API error', async () => {
      globalThis.fetch = mockFetchError(500, 'Server error');
      await expect(
        service.sendCertifiedLetter(from, to, '<html></html>', 'fail')
      ).rejects.toThrow('Lob API error 500');
    });
  });

  // ── checkStatus ───────────────────────────────────────────────────────

  describe('checkStatus', () => {
    it('sends GET to /v1/letters/:id', async () => {
      const fetchMock = mockFetchOk({ id: 'ltr_123', status: 'processed' });
      globalThis.fetch = fetchMock;

      await service.checkStatus('ltr_123');

      const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/v1/letters/ltr_123');
      expect(opts.method).toBeUndefined(); // GET is default
    });

    it('throws on failure', async () => {
      globalThis.fetch = mockFetchError(404, 'Not found');
      await expect(service.checkStatus('ltr_bad')).rejects.toThrow('Lob status check failed (404)');
    });
  });

  // ── sendDispute — Bureau Target ───────────────────────────────────────

  describe('sendDispute — bureau target', () => {
    const client = createProfile();
    const items = [createNegativeItem()];

    beforeEach(() => {
      globalThis.fetch = mockFetchOk(LOB_SEND_RESPONSE);
    });

    it('resolves bureau address from BUREAU_ADDRESSES', async () => {
      const record = await service.sendDispute(client, 'basic_bureau', 'equifax', items);
      expect(record.target).toBe('equifax');
      expect(record.recipient_name).toBe('Equifax Information Services LLC');
    });

    it('creates DisputeRecord with correct fields', async () => {
      const record = await service.sendDispute(client, '609_verification', 'experian', items);
      expect(record.letter_type).toBe('609_verification');
      expect(record.letter_name).toBe('609 Verification Request');
      expect(record.status).toBe('sent');
      expect(record.lob_letter_id).toBe(LOB_SEND_RESPONSE.id);
      expect(record.tracking_number).toBe(LOB_SEND_RESPONSE.tracking_number);
    });

    it('sets 30-day response deadline', async () => {
      const before = Date.now();
      const record = await service.sendDispute(client, 'basic_bureau', 'transunion', items);
      const deadline = new Date(record.response_deadline).getTime();
      const sent = new Date(record.sent_date).getTime();
      const diffDays = (deadline - sent) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(30);
    });

    it('sets 35-day escalation date', async () => {
      const record = await service.sendDispute(client, 'basic_bureau', 'equifax', items);
      const escalation = new Date(record.escalation_date).getTime();
      const sent = new Date(record.sent_date).getTime();
      const diffDays = (escalation - sent) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(35);
    });
  });

  // ── sendDispute — LetterAddress Target ────────────────────────────────

  describe('sendDispute — LetterAddress target', () => {
    const client = createProfile();
    const items = [createNegativeItem()];
    const creditorAddr: LetterAddress = {
      name: 'Midland Credit',
      address_line1: '350 Camino de la Reina',
      city: 'San Diego',
      state: 'CA',
      zip: '92108',
    };

    beforeEach(() => {
      globalThis.fetch = mockFetchOk(LOB_SEND_RESPONSE);
    });

    it('uses LetterAddress directly instead of bureau lookup', async () => {
      const record = await service.sendDispute(client, 'debt_validation', creditorAddr, items);
      expect(record.target).toBe('Midland Credit');
      expect(record.recipient_name).toBe('Midland Credit');
    });

    it('passes creditor address to sendCertifiedLetter', async () => {
      const fetchMock = mockFetchOk(LOB_SEND_RESPONSE);
      globalThis.fetch = fetchMock;

      await service.sendDispute(client, 'goodwill', creditorAddr, items);

      const body = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string;
      expect(body).toContain('to%5Bname%5D=Midland+Credit');
      expect(body).toContain('San+Diego');
    });
  });

  // ── sendToAllBureaus ──────────────────────────────────────────────────

  describe('sendToAllBureaus', () => {
    it('returns exactly 3 records', async () => {
      globalThis.fetch = mockFetchOk(LOB_SEND_RESPONSE);
      const records = await service.sendToAllBureaus(createProfile(), 'basic_bureau', [createNegativeItem()]);
      expect(records).toHaveLength(3);
    });

    it('targets equifax, experian, transunion', async () => {
      globalThis.fetch = mockFetchOk(LOB_SEND_RESPONSE);
      const records = await service.sendToAllBureaus(createProfile(), 'basic_bureau', [createNegativeItem()]);
      const targets = records.map(r => r.target);
      expect(targets).toEqual(['equifax', 'experian', 'transunion']);
    });

    it('calls fetch 3 times (sequential)', async () => {
      const fetchMock = mockFetchOk(LOB_SEND_RESPONSE);
      globalThis.fetch = fetchMock;
      await service.sendToAllBureaus(createProfile(), 'basic_bureau', [createNegativeItem()]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });
});
