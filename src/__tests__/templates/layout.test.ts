import { describe, it, expect } from 'bun:test';
import { esc, formatDate, letterHeader, formatDisputedItems, letterFooter, wrapHtml, buildLetter } from '../../templates/layout';
import type { LetterContext } from '../../templates/layout';
import { createProfile, createNegativeItem } from '../helpers/fixtures';

function makeCtx(overrides?: Partial<LetterContext>): LetterContext {
  return {
    letterType: 'basic_bureau',
    client: createProfile(),
    recipient: { name: 'Bureau', address_line1: 'PO Box 1', city: 'ATL', state: 'GA', zip: '30301' },
    items: [createNegativeItem()],
    ...overrides,
  };
}

describe('layout utilities', () => {
  // ── esc ──────────────────────────────────────────────────────────────

  describe('esc — XSS prevention', () => {
    it('escapes ampersand', () => {
      expect(esc('A & B')).toBe('A &amp; B');
    });

    it('escapes less-than', () => {
      expect(esc('<script>')).toBe('&lt;script&gt;');
    });

    it('escapes greater-than', () => {
      expect(esc('a > b')).toContain('&gt;');
    });

    it('escapes double quotes', () => {
      expect(esc('"hello"')).toBe('&quot;hello&quot;');
    });

    it('escapes single quotes', () => {
      expect(esc("it's")).toBe('it&#39;s');
    });

    it('handles all special chars in one string', () => {
      const result = esc('<a href="x">&\'test\'</a>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
      expect(result).toContain('&amp;');
      expect(result).toContain('&#39;');
    });

    it('passes through plain text unchanged', () => {
      expect(esc('Hello World 123')).toBe('Hello World 123');
    });
  });

  // ── formatDate ──────────────────────────────────────────────────────

  describe('formatDate', () => {
    it('returns a non-empty string', () => {
      expect(formatDate().length).toBeGreaterThan(0);
    });

    it('includes current year', () => {
      expect(formatDate()).toContain(String(new Date().getFullYear()));
    });
  });

  // ── letterHeader ────────────────────────────────────────────────────

  describe('letterHeader', () => {
    it('includes client name', () => {
      const html = letterHeader(makeCtx());
      expect(html).toContain('John Doe');
    });

    it('includes client address', () => {
      const html = letterHeader(makeCtx());
      expect(html).toContain('123 Main St');
      expect(html).toContain('Anytown');
      expect(html).toContain('CA');
    });

    it('includes recipient name and address', () => {
      const html = letterHeader(makeCtx());
      expect(html).toContain('Bureau');
      expect(html).toContain('PO Box 1');
    });

    it('includes SSN last 4', () => {
      const html = letterHeader(makeCtx());
      expect(html).toContain('1234');
    });

    it('defaults SSN to XXXX when missing', () => {
      const ctx = makeCtx({ client: createProfile({ ssn_last4: undefined }) });
      const html = letterHeader(ctx);
      expect(html).toContain('XXXX');
    });
  });

  // ── formatDisputedItems ─────────────────────────────────────────────

  describe('formatDisputedItems', () => {
    it('returns empty string for empty array', () => {
      expect(formatDisputedItems([])).toBe('');
    });

    it('includes creditor name', () => {
      const html = formatDisputedItems([createNegativeItem({ creditor_name: 'Acme Corp' })]);
      expect(html).toContain('Acme Corp');
    });

    it('includes item type with underscores replaced', () => {
      const html = formatDisputedItems([createNegativeItem({ type: 'late_payment' })]);
      expect(html).toContain('late payment');
      expect(html).not.toContain('late_payment');
    });

    it('includes amount when present', () => {
      const html = formatDisputedItems([createNegativeItem({ amount: 2500 })]);
      expect(html).toContain('2,500');
    });

    it('omits amount when undefined', () => {
      const html = formatDisputedItems([createNegativeItem({ amount: undefined })]);
      expect(html).not.toContain('Amount');
    });

    it('numbers multiple items', () => {
      const items = [createNegativeItem(), createNegativeItem()];
      const html = formatDisputedItems(items);
      expect(html).toContain('Item 1');
      expect(html).toContain('Item 2');
    });

    it('uses default dispute reason when none provided', () => {
      const html = formatDisputedItems([createNegativeItem({ dispute_reason: undefined })]);
      expect(html).toContain('inaccurate');
    });
  });

  // ── letterFooter ────────────────────────────────────────────────────

  describe('letterFooter', () => {
    it('includes client signature line', () => {
      const html = letterFooter(createProfile());
      expect(html).toContain('John Doe');
      expect(html).toContain('Sincerely');
    });

    it('includes certified mail notice', () => {
      const html = letterFooter(createProfile());
      expect(html).toContain('CERTIFIED MAIL');
    });

    it('renders enclosures when provided', () => {
      const html = letterFooter(createProfile(), ['ID copy', 'Proof of address']);
      expect(html).toContain('Enclosures');
      expect(html).toContain('ID copy');
      expect(html).toContain('Proof of address');
    });

    it('omits enclosure block when empty', () => {
      const html = letterFooter(createProfile(), []);
      expect(html).not.toContain('Enclosures');
    });
  });

  // ── wrapHtml ────────────────────────────────────────────────────────

  describe('wrapHtml', () => {
    it('wraps content in html/body tags', () => {
      const html = wrapHtml('<h>head</h>', '<p>body</p>', '<f>foot</f>');
      expect(html).toContain('<html><body>');
      expect(html).toContain('</body></html>');
    });

    it('includes all three parts in order', () => {
      const html = wrapHtml('AAA', 'BBB', 'CCC');
      const aPos = html.indexOf('AAA');
      const bPos = html.indexOf('BBB');
      const cPos = html.indexOf('CCC');
      expect(aPos).toBeLessThan(bPos);
      expect(bPos).toBeLessThan(cPos);
    });
  });

  // ── buildLetter ─────────────────────────────────────────────────────

  describe('buildLetter', () => {
    it('produces complete HTML document', () => {
      const html = buildLetter(makeCtx(), '<p>Test body</p>');
      expect(html).toContain('<html><body>');
      expect(html).toContain('</body></html>');
      expect(html).toContain('Test body');
      expect(html).toContain('John Doe');
    });

    it('includes enclosures when provided', () => {
      const html = buildLetter(makeCtx(), '<p>body</p>', ['Doc 1', 'Doc 2']);
      expect(html).toContain('Doc 1');
      expect(html).toContain('Doc 2');
    });
  });
});
