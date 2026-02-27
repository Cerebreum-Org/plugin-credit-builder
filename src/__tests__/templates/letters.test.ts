import { describe, it, expect } from 'bun:test';
import { LETTER_TEMPLATES } from '../../templates';
import type { LetterContext } from '../../templates';
import { LETTER_TYPE_INFO } from '../../types';
import type { LetterType } from '../../types';
import { createProfile, createNegativeItem } from '../helpers/fixtures';

function makeCtx(letterType: string, extra?: Record<string, string>): LetterContext {
  return {
    letterType,
    client: createProfile(),
    recipient: { name: 'Recipient', address_line1: 'PO Box 1', city: 'Atlanta', state: 'GA', zip: '30301' },
    items: [createNegativeItem({ amount: 1500 })],
    extra,
  };
}

describe('letter templates', () => {
  // ── All 19 templates render without error ───────────────────────────

  describe('all templates render', () => {
    const letterTypes = Object.keys(LETTER_TYPE_INFO) as LetterType[];

    for (const type of letterTypes) {
      it(`${type} renders valid HTML`, () => {
        const template = LETTER_TEMPLATES[type];
        expect(template).toBeDefined();
        const html = template(makeCtx(type));
        expect(html).toContain('<html><body>');
        expect(html).toContain('</body></html>');
        expect(html).toContain('John Doe');
      });
    }
  });

  // ── FCRA Bureau letters (1-5) ───────────────────────────────────────

  describe('FCRA bureau letters', () => {
    it('basic_bureau cites FCRA § 1681i', () => {
      const html = LETTER_TEMPLATES.basic_bureau(makeCtx('basic_bureau'));
      expect(html).toContain('1681i');
    });

    it('609_verification cites FCRA § 609', () => {
      const html = LETTER_TEMPLATES['609_verification'](makeCtx('609_verification'));
      expect(html).toContain('609');
      expect(html).toContain('1681g');
    });

    it('611_reinvestigation cites FCRA § 611', () => {
      const html = LETTER_TEMPLATES['611_reinvestigation'](makeCtx('611_reinvestigation'));
      expect(html).toContain('611');
      expect(html).toContain('reinvestigation');
    });

    it('method_of_verification cites § 611(a)(6)', () => {
      const html = LETTER_TEMPLATES.method_of_verification(makeCtx('method_of_verification'));
      expect(html).toContain('611');
      expect(html).toContain('method of verification');
    });

    it('identity_theft cites FCRA § 605B', () => {
      const html = LETTER_TEMPLATES.identity_theft(makeCtx('identity_theft'));
      expect(html).toContain('605B');
      expect(html).toContain('identity theft');
    });
  });

  // ── FDCPA Collector letters (6-8) ───────────────────────────────────

  describe('FDCPA collector letters', () => {
    it('debt_validation cites FDCPA § 1692g', () => {
      const html = LETTER_TEMPLATES.debt_validation(makeCtx('debt_validation'));
      expect(html).toContain('1692g');
    });

    it('cease_desist cites FDCPA § 1692c(c)', () => {
      const html = LETTER_TEMPLATES.cease_desist(makeCtx('cease_desist'));
      expect(html).toContain('1692c');
    });

    it('pay_for_delete computes offer at 40% default', () => {
      const html = LETTER_TEMPLATES.pay_for_delete(makeCtx('pay_for_delete'));
      // 1500 * 0.40 = 600
      expect(html).toContain('$600');
    });

    it('pay_for_delete uses custom offer percent', () => {
      const html = LETTER_TEMPLATES.pay_for_delete(makeCtx('pay_for_delete', { offer_percent: '25' }));
      // 1500 * 0.25 = 375
      expect(html).toContain('$375');
    });
  });

  // ── Creditor letters (9-11) ─────────────────────────────────────────

  describe('creditor letters', () => {
    it('goodwill includes goodwill language', () => {
      const html = LETTER_TEMPLATES.goodwill(makeCtx('goodwill'));
      expect(html).toContain('goodwill');
      expect(html).toContain('loyal customer');
    });

    it('direct_creditor cites FCRA § 1681s-2(b)', () => {
      const html = LETTER_TEMPLATES.direct_creditor(makeCtx('direct_creditor'));
      expect(html).toContain('1681s-2');
    });

    it('chargeoff_removal computes offer at 50% default', () => {
      const html = LETTER_TEMPLATES.chargeoff_removal(makeCtx('chargeoff_removal'));
      // 1500 * 0.50 = 750
      expect(html).toContain('$750');
    });

    it('chargeoff_removal uses custom offer percent', () => {
      const html = LETTER_TEMPLATES.chargeoff_removal(makeCtx('chargeoff_removal', { offer_percent: '30' }));
      // 1500 * 0.30 = 450
      expect(html).toContain('$450');
    });
  });

  // ── Specialized letters (12-19) ─────────────────────────────────────

  describe('specialized letters', () => {
    it('unauthorized_inquiry cites FCRA § 1681b', () => {
      const html = LETTER_TEMPLATES.unauthorized_inquiry(makeCtx('unauthorized_inquiry'));
      expect(html).toContain('1681b');
      expect(html).toContain('permissible purpose');
    });

    it('hipaa_medical references HIPAA and FDCPA', () => {
      const html = LETTER_TEMPLATES.hipaa_medical(makeCtx('hipaa_medical'));
      expect(html).toContain('HIPAA');
      expect(html).toContain('Protected Health');
    });

    it('statute_of_limitations includes SOL defense', () => {
      const html = LETTER_TEMPLATES.statute_of_limitations(makeCtx('statute_of_limitations'));
      expect(html).toContain('time-barred');
      expect(html).toContain('statute of limitations');
    });

    it('intent_to_sue cites FCRA § 1681n', () => {
      const html = LETTER_TEMPLATES.intent_to_sue(makeCtx('intent_to_sue'));
      expect(html).toContain('1681n');
      expect(html).toContain('intent to file');
    });

    it('arbitration_election references Federal Arbitration Act', () => {
      const html = LETTER_TEMPLATES.arbitration_election(makeCtx('arbitration_election'));
      expect(html).toContain('Federal Arbitration Act');
      expect(html).toContain('arbitration');
    });

    it('billing_error cites FCBA § 1666', () => {
      const html = LETTER_TEMPLATES.billing_error(makeCtx('billing_error'));
      expect(html).toContain('1666');
      expect(html).toContain('billing error');
    });

    it('breach_of_contract includes breach language', () => {
      const html = LETTER_TEMPLATES.breach_of_contract(makeCtx('breach_of_contract'));
      expect(html).toContain('breach');
      expect(html).toContain('good faith');
    });

    it('demand_letter includes demand amount placeholder', () => {
      const html = LETTER_TEMPLATES.demand_letter(makeCtx('demand_letter'));
      expect(html).toContain('[AMOUNT]');
    });

    it('demand_letter uses custom demand amount', () => {
      const html = LETTER_TEMPLATES.demand_letter(makeCtx('demand_letter', { demand_amount: '5000' }));
      expect(html).toContain('$5000');
    });
  });

  // ── Enclosures ──────────────────────────────────────────────────────

  describe('enclosures', () => {
    it('all bureau letters include ID and credit report enclosures', () => {
      const bureauTypes: LetterType[] = ['basic_bureau', '609_verification', '611_reinvestigation', 'method_of_verification', 'identity_theft'];
      for (const type of bureauTypes) {
        const html = LETTER_TEMPLATES[type](makeCtx(type));
        expect(html).toContain('photo identification');
      }
    });

    it('identity_theft includes FTC report enclosure', () => {
      const html = LETTER_TEMPLATES.identity_theft(makeCtx('identity_theft'));
      expect(html).toContain('FTC Identity Theft Report');
    });
  });
});
