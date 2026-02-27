import { describe, it, expect } from 'bun:test';
import { LETTER_TYPE_INFO, BUREAU_ADDRESSES } from '../types';
import type { LetterType } from '../types';

describe('type constants', () => {
  // ── LETTER_TYPE_INFO ────────────────────────────────────────────

  describe('LETTER_TYPE_INFO', () => {
    const types = Object.keys(LETTER_TYPE_INFO) as LetterType[];

    it('has exactly 19 letter types', () => {
      expect(types).toHaveLength(19);
    });

    it('has sequential IDs from 1-19', () => {
      const ids = types.map(t => LETTER_TYPE_INFO[t].id).sort((a, b) => a - b);
      expect(ids).toEqual(Array.from({ length: 19 }, (_, i) => i + 1));
    });

    it('every type has name, category, legal_basis, target_type', () => {
      for (const type of types) {
        const info = LETTER_TYPE_INFO[type];
        expect(info.name.length).toBeGreaterThan(0);
        expect(info.category.length).toBeGreaterThan(0);
        expect(info.legal_basis.length).toBeGreaterThan(0);
        expect(['bureau', 'creditor', 'collector', 'any']).toContain(info.target_type);
      }
    });

    it('has 6 bureau-target types', () => {
      const bureau = types.filter(t => LETTER_TYPE_INFO[t].target_type === 'bureau');
      expect(bureau).toHaveLength(6);
    });

    it('has 5 collector-target types', () => {
      const collector = types.filter(t => LETTER_TYPE_INFO[t].target_type === 'collector');
      expect(collector).toHaveLength(5);
    });

    it('has 5 creditor-target types', () => {
      const creditor = types.filter(t => LETTER_TYPE_INFO[t].target_type === 'creditor');
      expect(creditor).toHaveLength(5);
    });

    it('has 3 any-target types', () => {
      const any = types.filter(t => LETTER_TYPE_INFO[t].target_type === 'any');
      expect(any).toHaveLength(3);
    });

    // Spot-check specific types
    it('basic_bureau is FCRA category with bureau target', () => {
      expect(LETTER_TYPE_INFO.basic_bureau.category).toBe('FCRA');
      expect(LETTER_TYPE_INFO.basic_bureau.target_type).toBe('bureau');
    });

    it('debt_validation is FDCPA category with collector target', () => {
      expect(LETTER_TYPE_INFO.debt_validation.category).toBe('FDCPA');
      expect(LETTER_TYPE_INFO.debt_validation.target_type).toBe('collector');
    });

    it('goodwill is Courtesy category with creditor target', () => {
      expect(LETTER_TYPE_INFO.goodwill.category).toBe('Courtesy');
      expect(LETTER_TYPE_INFO.goodwill.target_type).toBe('creditor');
    });

    it('intent_to_sue targets any', () => {
      expect(LETTER_TYPE_INFO.intent_to_sue.target_type).toBe('any');
    });
  });

  // ── BUREAU_ADDRESSES ────────────────────────────────────────────

  describe('BUREAU_ADDRESSES', () => {
    it('has exactly 3 bureaus', () => {
      expect(Object.keys(BUREAU_ADDRESSES)).toHaveLength(3);
    });

    it('includes equifax, experian, transunion', () => {
      expect(BUREAU_ADDRESSES).toHaveProperty('equifax');
      expect(BUREAU_ADDRESSES).toHaveProperty('experian');
      expect(BUREAU_ADDRESSES).toHaveProperty('transunion');
    });

    it('each bureau has name, address_line1, city, state, zip', () => {
      for (const bureau of Object.values(BUREAU_ADDRESSES)) {
        expect(bureau.name.length).toBeGreaterThan(0);
        expect(bureau.address_line1.length).toBeGreaterThan(0);
        expect(bureau.city.length).toBeGreaterThan(0);
        expect(bureau.state).toMatch(/^[A-Z]{2}$/);
        expect(bureau.zip.length).toBeGreaterThan(0);
      }
    });

    it('equifax is in Atlanta GA', () => {
      expect(BUREAU_ADDRESSES.equifax.city).toBe('Atlanta');
      expect(BUREAU_ADDRESSES.equifax.state).toBe('GA');
    });

    it('experian is in Allen TX', () => {
      expect(BUREAU_ADDRESSES.experian.city).toBe('Allen');
      expect(BUREAU_ADDRESSES.experian.state).toBe('TX');
    });

    it('transunion is in Chester PA', () => {
      expect(BUREAU_ADDRESSES.transunion.city).toBe('Chester');
      expect(BUREAU_ADDRESSES.transunion.state).toBe('PA');
    });
  });
});
