# @elizaos/plugin-credit-builder

ElizaOS plugin that gives AI agents the ability to autonomously build credit for users — personal credit repair, business credit building, automated dispute letters sent as real USPS Certified Mail.

## Features

| Action | What It Does |
|--------|-------------|
| `ANALYZE_CREDIT` | Intake user's credit data, run full FICO audit, identify weaknesses, generate prioritized action plan with estimated score impacts |
| `SEND_DISPUTE` | Generate any of 19 dispute letter types and send as USPS Certified Mail with Return Receipt via Lob API |
| `CHECK_DISPUTES` | Track all pending disputes, 30-day response deadlines, and flag overdue items for escalation |
| `BUILD_BUSINESS_CREDIT` | Guide entrepreneurs from zero to $100K+ business credit — entity formation, DUNS, vendor trade lines, SBA loans |
| `CREDIT_EDUCATION` | Answer any credit question using FCRA/ECOA knowledge base |

## Quick Start

```bash
# In your ElizaOS project
elizaos create --type plugin plugin-credit-builder
# Copy src/ files into the plugin
```

Add to your character:
```typescript
export const character: Character = {
  name: 'CreditAgent',
  plugins: [
    '@elizaos/plugin-sql',
    '@elizaos/plugin-openai',
    '@elizaos/plugin-bootstrap',
    './plugin-credit-builder'
  ],
};
```

## Environment Variables

```env
# Required for sending real dispute letters
LOB_API_KEY=live_xxxxxxxxxxxx  # Get from dashboard.lob.com

# Test mode (no real mail sent)
LOB_API_KEY=test_xxxxxxxxxxxx
```

## 19 Dispute Letter Types

| # | Type | Legal Basis |
|---|------|-------------|
| 1 | Basic Bureau Dispute | FCRA § 1681i |
| 2 | 609 Verification | FCRA § 609 |
| 3 | 611 Reinvestigation | FCRA § 611 |
| 4 | Method of Verification | FCRA § 611(a)(6) |
| 5 | Identity Theft | FCRA § 605B |
| 6 | Debt Validation | FDCPA § 1692g |
| 7 | Cease and Desist | FDCPA § 1692c(c) |
| 8 | Pay-for-Delete | Negotiation |
| 9 | Goodwill Removal | Courtesy |
| 10 | Direct Creditor Dispute | FCRA § 1681s-2(b) |
| 11 | Charge-Off Removal | Negotiation |
| 12 | Unauthorized Inquiry | FCRA § 1681b |
| 13 | HIPAA Medical Debt | HIPAA + FDCPA |
| 14 | Statute of Limitations | State SOL laws |
| 15 | Intent to Sue | FCRA § 1681n |
| 16 | Arbitration Election | Federal Arbitration Act |
| 17 | Billing Error (FCBA) | FCBA § 1666 |
| 18 | Breach of Contract | State contract law |
| 19 | Formal Demand | Contract law |

## Legal Framework

- **FCRA** (Fair Credit Reporting Act) — consumer credit rights
- **FDCPA** (Fair Debt Collection Practices Act) — collector regulations
- **ECOA** (Equal Credit Opportunity Act) — anti-discrimination, business credit
- **FCBA** (Fair Credit Billing Act) — billing disputes
- **Regulation B** (12 CFR 1002) — ECOA implementation

## Cost

Certified mail with return receipt via Lob: ~$8-9 per letter. No subscription required.

## License

MIT
