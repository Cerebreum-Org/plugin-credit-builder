/**
 * CREDIT_EDUCATION — Answer credit questions using FCRA/ECOA knowledge base
 */

import type { Action, ActionResult, IAgentRuntime, Memory, HandlerCallback, State } from '@elizaos/core';

export const creditEducationAction: Action = {
  name: 'CREDIT_EDUCATION',
  similes: [
    'CREDIT_QUESTION', 'CREDIT_HELP', 'EXPLAIN_CREDIT', 'CREDIT_TIPS',
    'FICO_SCORE', 'CREDIT_SCORE', 'CREDIT_RIGHTS', 'FCRA_RIGHTS',
    'ECOA_RIGHTS', 'CREDIT_MYTH', 'UTILIZATION', 'AUTHORIZED_USER',
    'CREDIT_FREEZE', 'FRAUD_ALERT', 'AZEO', 'CREDIT_MIX',
  ],
  description: 'Answer any credit-related question using comprehensive FCRA, ECOA, and credit system knowledge. Covers FICO scoring, dispute rights, credit building strategies, myths vs facts, and consumer protections.',

  validate: async () => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const text = message.content.text.toLowerCase();
    let response = '';

    // FICO breakdown
    if (text.includes('fico') || text.includes('score') && (text.includes('factor') || text.includes('how') || text.includes('what'))) {
      response = `**FICO Score Breakdown (300-850)**

| Factor | Weight | What It Measures |
|--------|--------|-----------------|
| Payment History | **35%** | On-time payments, lates, collections, bankruptcies |
| Utilization | **30%** | Credit used vs available (keep under 10%) |
| Credit Age | **15%** | Age of oldest/average accounts |
| Credit Mix | **10%** | Variety of account types |
| New Credit | **10%** | Recent inquiries and new accounts |

**Score Ranges:**
- 800-850: Exceptional (best rates on everything)
- 740-799: Very Good
- 670-739: Good
- 580-669: Fair (subprime rates)
- 300-579: Poor (secured cards only)`;
    }
    else if (text.includes('utilization') || text.includes('azeo')) {
      response = `**Credit Utilization — The Quick Win (30% of score)**

Utilization = (Balance ÷ Credit Limit) × 100

**Key facts:**
- Utilization has NO memory — only the current snapshot matters
- You can fix it in ONE billing cycle
- Target: under 10% (ideal: 1-9%)
- 0% across all cards slightly worse than 1-9%

**AZEO Strategy (All Zero Except One):**
1. Pay ALL credit cards to $0 balance
2. Leave ONE card with a small $5-20 balance reporting
3. This produces the mathematically optimal score

**Pro tip:** Pay BEFORE the statement closing date (not the due date). The statement balance is what reports to bureaus.`;
    }
    else if (text.includes('authorized user') || text.includes('au')) {
      response = `**Authorized User Strategy — The Most Powerful Hack**

When added as an AU, the account's FULL history appears on your report:
- Open date (backdated)
- Payment history
- Credit limit
- Utilization

**Ideal AU account:**
- 10+ years old
- $10,000+ credit limit
- 0% utilization
- Perfect payment history

**Rules:**
- You don't need the physical card
- Primary cardholder's score is NOT affected
- You can be removed at any time
- Expected impact: +30-50 points in 30-60 days`;
    }
    else if (text.includes('myth') || text.includes('carry a balance') || text.includes('checking') && text.includes('hurt')) {
      response = `**Common Credit Myths — Debunked**

❌ "Checking your credit hurts your score"
✅ Soft pulls have ZERO impact. Only hard inquiries from applications matter.

❌ "You need to carry a balance to build credit"
✅ Pay in FULL every month. The statement balance reports before you pay.

❌ "Closing old cards helps"
✅ Closing hurts — reduces limits and eventually removes age.

❌ "Paying off a collection removes it"
✅ It stays for 7 years. Get a "pay for delete" agreement in writing first.

❌ "Income affects your score"
✅ Income is NOT a factor. A $30K earner can outscore a $300K earner.

❌ "You have one credit score"
✅ You have dozens. FICO alone has 28+ models.`;
    }
    else if (text.includes('right') || text.includes('fcra') || text.includes('law')) {
      response = `**Your Rights Under the FCRA**

1. **Free annual reports** from all 3 bureaus (currently weekly at AnnualCreditReport.com)
2. **Right to dispute** — bureaus must investigate within 30 days
3. **Errors must be corrected** — if unverifiable, must be deleted
4. **Adverse action notices** — if denied credit, they must tell you why
5. **Employment consent** — employers need written permission to pull
6. **Free credit freezes** — no impact on score, prevents new accounts
7. **Right to sue** — $100-$1,000 per willful violation + punitive damages + attorney fees

**Negative info removal:**
- Most negatives: 7 years
- Bankruptcies: 10 years (Ch7), 7 years (Ch13)
- Inquiries: 2 years (stop affecting score after ~12 months)`;
    }
    else {
      response = `I can help with any credit question. Here are topics I cover:

- **FICO score factors** — how your score is calculated
- **Utilization strategy** — AZEO method, optimal ratios
- **Authorized user hack** — backdating account history
- **Credit myths** — what's real and what's not
- **Your legal rights** — FCRA, ECOA protections
- **Dispute process** — 19 letter types, escalation path
- **Business credit** — DUNS, vendor credit, SBA loans
- **Credit building** — phase-by-phase from zero to 800+

What would you like to know?`;
    }

    if (callback) {
      await callback({ text: response, actions: ['CREDIT_EDUCATION'], source: message.content.source });
    }

    return { success: true, text: 'Credit education provided' };
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'How is my FICO score calculated?' } },
      { name: '{{agent}}', content: { text: 'FICO Score Breakdown...', actions: ['CREDIT_EDUCATION'] } },
    ],
    [
      { name: '{{user}}', content: { text: 'Is it true I need to carry a balance?' } },
      { name: '{{agent}}', content: { text: 'Common Credit Myths — Debunked...', actions: ['CREDIT_EDUCATION'] } },
    ],
  ],
};
