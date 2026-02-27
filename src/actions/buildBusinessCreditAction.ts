/**
 * BUILD_BUSINESS_CREDIT — Guides entrepreneurs through building business credit
 */

import type { Action, ActionResult, IAgentRuntime, Memory, HandlerCallback, State } from '@elizaos/core';
import { logger } from '@elizaos/core';

export const buildBusinessCreditAction: Action = {
  name: 'BUILD_BUSINESS_CREDIT',
  similes: [
    'BUSINESS_CREDIT', 'BIZ_CREDIT', 'CORPORATE_CREDIT', 'LLC_CREDIT',
    'DUNS_NUMBER', 'PAYDEX', 'VENDOR_CREDIT', 'NET30', 'BUSINESS_LOAN',
    'SBA_LOAN', 'NO_PG_CREDIT', 'BUSINESS_CARD',
  ],
  description: 'Guide entrepreneurs through building business credit from zero — entity formation, DUNS number, vendor trade lines (Net-30), business credit cards, no-PG lines, SBA loans. Covers D&B PAYDEX, Experian Business, Equifax Business scores. Protected by Equal Credit Opportunity Act (ECOA).',

  validate: async () => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const text = message.content.text.toLowerCase();

    // Determine what phase they're asking about
    let response = '';

    if (text.includes('start') || text.includes('beginning') || text.includes('new') || text.includes('zero') || text.includes('foundation')) {
      response = `**Business Credit — Phase 0: Foundation**

Before applying for any business credit, you need:

**Entity Checklist:**
1. **Register LLC or Corporation** — separates business from personal liability ($50-$500)
2. **Get an EIN** — free at IRS.gov (your business SSN)
3. **Open a business bank account** — proves the business is real
4. **Get a DUNS Number** — free at dnb.com (takes 30 days, or ~$229 expedited)
5. **Business phone number** — listed under business name (Google Voice works)
6. **Business address** — must match across all registrations
7. **Business website** — professional domain with business email
8. **State/local licenses** — whatever your state requires

**CRITICAL:** Every registration must use the EXACT same Name, Address, and Phone (NAP). One inconsistency = denied.

Once all of this is set up, move to Phase 1: Vendor Credit.`;
    }
    else if (text.includes('vendor') || text.includes('net 30') || text.includes('net-30') || text.includes('trade line') || text.includes('phase 1')) {
      response = `**Business Credit — Phase 1: Starter Vendor Credit (Months 1-3)**

These vendors extend Net-30 to NEW businesses with NO credit history and REPORT to bureaus:

| Vendor | What They Sell | Reports To |
|--------|---------------|-----------|
| **Uline** | Shipping/office supplies | D&B |
| **Quill** | Office supplies | D&B, Experian |
| **Grainger** | Industrial/safety | D&B |
| **Crown Office** | Office supplies | D&B, Experian, Equifax |
| **Strategic Network** | Tech accessories | D&B, Experian |
| **Summa Office** | Office supplies | All 3 |
| **The CEO Creative** | Marketing materials | All 3 ($49 fee) |
| **Shirtsy** | Custom apparel | D&B, Equifax |

**Strategy:**
1. Open 5+ vendor accounts in the first 30 days
2. Make a small purchase on each ($50-$200)
3. **PAY EARLY** — don't wait for Net-30. Pay within 1-5 days
4. Early payment = higher PAYDEX score (opposite of personal credit)
5. After 3 months: 5+ trade lines, PAYDEX 80+`;
    }
    else if (text.includes('card') || text.includes('phase 2') || text.includes('phase 3') || text.includes('no pg') || text.includes('no personal guarantee')) {
      response = `**Business Credit — Phase 2-3: Business Credit Cards**

**Tier 2: Store/Fleet Cards (Months 3-4):**
- Shell Small Business Card (D&B, Experian)
- Home Depot Pro (D&B)
- Lowe's Business Advantage (D&B, Experian)
- Amazon Business Line (D&B)

**Tier 3: Major Business Cards (Months 4-6):**
- Capital One Spark — $5K-$50K (PG required)
- Chase Ink Business — $5K-$50K (PG, doesn't report to personal)
- Amex Business Gold — No preset limit (PG, doesn't report to personal unless default)

**No Personal Guarantee Cards (The Goal):**
- **Brex** — $5K-$300K (needs $50K+ in business bank)
- **Ramp** — $5K-$500K (needs $75K+ in business bank)
- **Divvy** — $5K-$50K (more flexible, uses cash flow)

These approve based on BUSINESS financials only. No personal credit check, no PG.`;
    }
    else if (text.includes('sba') || text.includes('loan') || text.includes('line of credit') || text.includes('phase 4')) {
      response = `**Business Credit — Phase 4: Loans & Lines of Credit (Months 6-12+)**

**Business Lines of Credit:**
- **Bluevine** — $5K-$250K (2+ years, $40K+/mo revenue)
- **Fundbox** — $1K-$150K (6+ months, $50K+/yr revenue)
- **OnDeck** — $6K-$100K (1+ year, $100K+/yr revenue)
- **Kabbage (AmEx)** — $2K-$250K (1+ year, $3K+/mo revenue)

**SBA Loans:**
- **7(a)** — up to $5M, 7-25 years, ~6-8% APR
- **504** — up to $5.5M, for real estate/equipment
- **Microloan** — up to $50K, newer businesses OK
- **SBA Express** — up to $500K, 36-hour approval

**Your ECOA Rights:**
Under the Equal Credit Opportunity Act, lenders CANNOT deny you based on race, color, religion, national origin, sex, marital status, or age. If denied, they MUST provide specific written reasons within 30 days. Violations = $10K individual / $500K class action damages.`;
    }
    else {
      response = `**Business Credit Building — Overview**

Building business credit is a 4-phase process that takes 6-12 months to reach $100K+:

**Phase 0: Foundation** — LLC, EIN, DUNS number, business bank account, consistent NAP
**Phase 1: Vendor Credit (Months 1-3)** — 5+ Net-30 vendor accounts, pay early, build PAYDEX
**Phase 2: Store Cards (Months 3-6)** — Shell, Home Depot, Amazon Business
**Phase 3: Major Cards (Months 4-6)** — Chase Ink, Amex Business, Capital One Spark
**Phase 4: Lines & Loans (Months 6-12)** — Bluevine, SBA loans, no-PG cards (Brex, Ramp)

**3 Business Credit Bureaus:**
- **D&B PAYDEX** (0-100) — most important, rewards early payment
- **Experian Intelliscore** (0-100) — credit risk assessment
- **Equifax Business** (101-992) — payment index + utilization

**Key Rule:** Keep business and personal credit COMPLETELY separate. Never use personal cards for business expenses. Never commingle funds.

Ask me about any specific phase for detailed guidance.`;
    }

    if (callback) {
      await callback({ text: response, actions: ['BUILD_BUSINESS_CREDIT'], source: message.content.source });
    }

    return { success: true, text: 'Business credit guidance provided' };
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'How do I start building business credit?' } },
      { name: '{{agent}}', content: { text: 'Business Credit — Phase 0: Foundation...', actions: ['BUILD_BUSINESS_CREDIT'] } },
    ],
    [
      { name: '{{user}}', content: { text: 'What vendors give Net-30 to new businesses?' } },
      { name: '{{agent}}', content: { text: 'These vendors extend Net-30 to NEW businesses...', actions: ['BUILD_BUSINESS_CREDIT'] } },
    ],
  ],
};
