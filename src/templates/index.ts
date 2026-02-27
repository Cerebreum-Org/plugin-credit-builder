/**
 * Template dispatch — maps each LetterType to its template function
 */

import type { LetterContext } from './layout';
import type { LetterType } from '../types';

import { basicBureau, verification609, reinvestigation611, methodOfVerification, identityTheft } from './fcra-bureau';
import { debtValidation, ceaseDesist, payForDelete } from './fdcpa-collector';
import { goodwill, directCreditor, chargeoffRemoval } from './creditor';
import {
  unauthorizedInquiry, hipaaMedical, statuteOfLimitations, intentToSue,
  arbitrationElection, billingError, breachOfContract, demandLetter,
} from './specialized';

export type LetterTemplateFunction = (ctx: LetterContext) => string;

export const LETTER_TEMPLATES: Record<LetterType, LetterTemplateFunction> = {
  // FCRA Bureau (1-5)
  basic_bureau: basicBureau,
  '609_verification': verification609,
  '611_reinvestigation': reinvestigation611,
  method_of_verification: methodOfVerification,
  identity_theft: identityTheft,

  // FDCPA Collector (6-8)
  debt_validation: debtValidation,
  cease_desist: ceaseDesist,
  pay_for_delete: payForDelete,

  // Creditor (9-11)
  goodwill,
  direct_creditor: directCreditor,
  chargeoff_removal: chargeoffRemoval,

  // Specialized (12-19)
  unauthorized_inquiry: unauthorizedInquiry,
  hipaa_medical: hipaaMedical,
  statute_of_limitations: statuteOfLimitations,
  intent_to_sue: intentToSue,
  arbitration_election: arbitrationElection,
  billing_error: billingError,
  breach_of_contract: breachOfContract,
  demand_letter: demandLetter,
};

export type { LetterContext } from './layout';
export { buildLetter, letterHeader, letterFooter, formatDisputedItems } from './layout';
