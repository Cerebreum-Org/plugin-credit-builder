/**
 * @elizaos/plugin-credit-builder
 * 
 * Autonomous credit building plugin for ElizaOS agents.
 * 
 * Features:
 * - Credit profile intake and FICO score analysis
 * - Automated credit audit with prioritized action plans
 * - 19 dispute letter types (FCRA/FDCPA/ECOA)
 * - USPS Certified Mail dispatch via Lob API
 * - 30-day response deadline tracking with escalation
 * - Business credit building (DUNS, PAYDEX, vendor trade lines, SBA loans)
 * - Credit education (myths, rights, strategies)
 * - Contextual credit awareness via provider
 * 
 * Environment Variables:
 * - LOB_API_KEY: Lob.com API key for sending certified mail (required for SEND_DISPUTE)
 * 
 * Actions:
 * - ANALYZE_CREDIT: Intake + audit + recommendations
 * - SEND_DISPUTE: Generate and send certified dispute letters
 * - CHECK_DISPUTES: Monitor pending/overdue disputes
 * - BUILD_BUSINESS_CREDIT: Business credit guidance
 * - CREDIT_EDUCATION: Answer any credit question
 * 
 * Legal Framework:
 * - Fair Credit Reporting Act (FCRA) — 15 U.S.C. § 1681 et seq.
 * - Fair Debt Collection Practices Act (FDCPA) — 15 U.S.C. § 1692 et seq.
 * - Equal Credit Opportunity Act (ECOA) — 15 U.S.C. § 1691 et seq.
 * - Fair Credit Billing Act (FCBA) — 15 U.S.C. § 1666
 * - Regulation B — 12 CFR Part 1002
 */

import type { Plugin } from '@elizaos/core';

import { analyzeCreditAction } from './actions/analyzeCreditAction';
import { sendDisputeAction } from './actions/sendDisputeAction';
import { checkDisputesAction } from './actions/checkDisputesAction';
import { buildBusinessCreditAction } from './actions/buildBusinessCreditAction';
import { creditEducationAction } from './actions/creditEducationAction';
import { creditContextProvider } from './providers/creditContextProvider';

export const creditBuilderPlugin: Plugin = {
  name: 'credit-builder',
  description: 'Autonomous credit building — personal credit (FCRA), business credit (ECOA), dispute automation with certified mail, ML-powered score optimization',
  actions: [
    analyzeCreditAction,
    sendDisputeAction,
    checkDisputesAction,
    buildBusinessCreditAction,
    creditEducationAction,
  ],
  providers: [
    creditContextProvider,
  ],
  services: [],
};

export default creditBuilderPlugin;

// Named exports for individual components
export { analyzeCreditAction } from './actions/analyzeCreditAction';
export { sendDisputeAction } from './actions/sendDisputeAction';
export { checkDisputesAction } from './actions/checkDisputesAction';
export { buildBusinessCreditAction } from './actions/buildBusinessCreditAction';
export { creditEducationAction } from './actions/creditEducationAction';
export { creditContextProvider } from './providers/creditContextProvider';
export { CreditProfileService } from './services/creditProfileService';
export { LobMailService } from './services/lobMailService';
export * from './types';
