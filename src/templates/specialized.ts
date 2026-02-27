/**
 * Specialized Letter Templates (Letters 12-19)
 * Target: Various (bureaus, collectors, creditors, courts)
 */

import type { LetterContext } from './layout';
import { buildLetter, formatDisputedItems, esc } from './layout';

/** Letter 12: Unauthorized Inquiry Removal — FCRA Section 1681b */
export function unauthorizedInquiry(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Demand for Removal of Unauthorized Hard Inquiry &mdash; FCRA &sect; 1681b</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I am writing to dispute the following unauthorized hard inquiry/inquiries appearing
    on my credit report:</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under 15 U.S.C. &sect; 1681b, a consumer reporting agency may furnish a consumer report only
    for a permissible purpose. I did not authorize the above-listed entity/entities to access
    my credit report, and no permissible purpose exists for these inquiries.</p>
    <p>Permissible purposes under &sect; 1681b(a) include:</p>
    <ol>
      <li>In response to a court order or federal grand jury subpoena;</li>
      <li>Written instructions of the consumer;</li>
      <li>A legitimate business transaction initiated by the consumer; or</li>
      <li>A legitimate business need in connection with a transaction involving the consumer.</li>
    </ol>
    <p><strong>None of these apply.</strong> I demand that you:</p>
    <ol>
      <li>Verify that the inquiring party had a permissible purpose;</li>
      <li>Provide me with documentation of the permissible purpose, if any;</li>
      <li>If no permissible purpose can be established, <strong>immediately remove</strong>
      the unauthorized inquiry from my credit report; and</li>
      <li>Provide written confirmation of the removal.</li>
    </ol>
    <p>Under 15 U.S.C. &sect; 1681n, obtaining a consumer report without a permissible purpose
    subjects the party to liability including statutory damages of <strong>$100&ndash;$1,000</strong>,
    actual damages, punitive damages, and attorney fees.</p>
    <p>You have <strong>30 days</strong> to investigate and respond.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Copy of credit report highlighting unauthorized inquiry',
  ]);
}

/** Letter 13: HIPAA Medical Debt Dispute */
export function hipaaMedical(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Dispute of Medical Debt &mdash; HIPAA Privacy Violation and FDCPA Demand</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I am writing to dispute the following medical debt(s) and to put you on notice of
    potential violations of the Health Insurance Portability and Accountability Act (HIPAA)
    and the Fair Debt Collection Practices Act (FDCPA):</p>
    ${formatDisputedItems(ctx.items)}
    <p><strong>HIPAA concerns:</strong></p>
    <p>Under 45 CFR &sect; 164.502, a covered entity may only use or disclose Protected Health
    Information (PHI) for purposes of treatment, payment, or healthcare operations, and only
    with the minimum necessary information. The reporting of medical debt to consumer reporting
    agencies may constitute an unauthorized disclosure of PHI if proper authorization was not
    obtained.</p>
    <p><strong>I demand the following:</strong></p>
    <ol>
      <li>Provide a copy of the <strong>signed HIPAA authorization</strong> that permits the
      disclosure of my medical information to your agency and/or to credit reporting agencies;</li>
      <li>Provide an <strong>itemized statement</strong> of the medical charges, including procedure
      codes, dates of service, and the name of the healthcare provider;</li>
      <li>Verify that this debt was not <strong>paid or covered by insurance</strong>;</li>
      <li>Provide documentation of the <strong>original creditor</strong> and chain of assignment;</li>
      <li>Confirm compliance with your state&rsquo;s medical debt reporting laws; and</li>
      <li>If this debt is under <strong>$500</strong>, note that under CFPB rules effective 2023,
      medical debts under $500 cannot be reported to credit bureaus.</li>
    </ol>
    <p><strong>Important:</strong> Under the FDCPA (15 U.S.C. &sect; 1692g), you must cease collection
    until validation is provided. Under HIPAA, unauthorized disclosure of PHI carries penalties
    of <strong>$100&ndash;$50,000 per violation</strong> (up to $1.5 million per year for identical
    provisions), plus potential criminal penalties.</p>
    <p>If you cannot provide the requested documentation, I demand immediate cessation of
    collection and deletion from all credit reports.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Proof of current address',
    'Copy of insurance Explanation of Benefits (if applicable)',
  ]);
}

/** Letter 14: Statute of Limitations Defense */
export function statuteOfLimitations(ctx: LetterContext): string {
  const stateSol = esc(ctx.extra?.['state_sol_years'] || '[STATE SOL YEARS]');
  const debtState = esc(ctx.extra?.['debt_state'] || '[STATE]');

  const body = `
    <p><strong>RE: Statute of Limitations Defense &mdash; Time-Barred Debt</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I am writing regarding the following account(s) that you are attempting to collect
    and/or reporting on my credit file:</p>
    ${formatDisputedItems(ctx.items)}
    <p>I am putting you on notice that this debt is <strong>time-barred</strong> under the
    applicable statute of limitations. The statute of limitations for this type of debt in
    ${debtState} is <strong>${stateSol} years</strong> from the date of last activity or
    default.</p>
    <p><strong>Legal implications of time-barred debt:</strong></p>
    <ol>
      <li>You cannot file a lawsuit to collect a time-barred debt. Any attempt to do so is
      subject to dismissal and may constitute a violation of the FDCPA;</li>
      <li>Under the FDCPA, threatening to sue on a time-barred debt or misrepresenting the
      legal status of a debt is a violation of 15 U.S.C. &sect; 1692e (deceptive practices);</li>
      <li>Under CFPB Regulation F (12 CFR &sect; 1006.26), if you continue to communicate about
      this time-barred debt, you must include a disclosure that the law limits how long you
      can sue to collect this debt;</li>
      <li>Under the FCRA, debts cannot appear on a credit report more than <strong>7 years</strong>
      from the date of first delinquency (15 U.S.C. &sect; 1681c(a)).</li>
    </ol>
    <p><strong>I demand that you:</strong></p>
    <ol>
      <li>Confirm the date of last activity or default on this account;</li>
      <li>Acknowledge that this debt is time-barred;</li>
      <li>Immediately cease all collection efforts;</li>
      <li>Remove this account from all credit bureau reports; and</li>
      <li>Confirm in writing that no further collection will be attempted.</li>
    </ol>
    <p>Any attempt to revive this time-barred debt through litigation, misrepresentation,
    or partial payment solicitation will be documented for potential FDCPA action. Statutory
    damages of up to <strong>$1,000</strong> per violation apply (15 U.S.C. &sect; 1692k).</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Proof of current address',
    'Documentation showing date of last activity (if available)',
  ]);
}

/** Letter 15: Intent to Sue Letter — FCRA Section 1681n */
export function intentToSue(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Notice of Intent to File Lawsuit Under FCRA/FDCPA</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>This letter serves as formal notice of my intent to file a lawsuit against your
    organization for violations of the Fair Credit Reporting Act (FCRA) and/or the Fair
    Debt Collection Practices Act (FDCPA) relating to the following account(s):</p>
    ${formatDisputedItems(ctx.items)}
    <p><strong>Documented violations:</strong></p>
    <ol>
      <li>Failure to conduct a reasonable reinvestigation within 30 days as required by
      15 U.S.C. &sect; 1681i(a)(1);</li>
      <li>Continued reporting of inaccurate, incomplete, or unverifiable information in
      violation of 15 U.S.C. &sect; 1681s-2;</li>
      <li>Failure to provide the method of verification as required by
      15 U.S.C. &sect; 1681i(a)(6)&ndash;(7); and</li>
      <li>${esc(ctx.extra?.['additional_violation'] || 'Other violations as documented in prior correspondence')}.</li>
    </ol>
    <p><strong>Damages I intend to pursue:</strong></p>
    <ul>
      <li><strong>Statutory damages:</strong> $100&ndash;$1,000 per violation under 15 U.S.C. &sect; 1681n
      (FCRA willful noncompliance) or up to $1,000 under 15 U.S.C. &sect; 1692k (FDCPA);</li>
      <li><strong>Actual damages:</strong> Including but not limited to credit denials, higher
      interest rates, emotional distress, and lost opportunities;</li>
      <li><strong>Punitive damages:</strong> As warranted by the willful nature of the violations;</li>
      <li><strong>Attorney fees and costs:</strong> As provided by 15 U.S.C. &sect;&sect; 1681n(a)(3)
      and 1692k(a)(3).</li>
    </ul>
    <p><strong>Final opportunity to resolve:</strong></p>
    <p>Before filing suit, I am providing you with <strong>15 days</strong> from receipt of this
    letter to:</p>
    <ol>
      <li>Delete or correct the disputed information from all credit bureau reports;</li>
      <li>Provide written confirmation of the correction/deletion; and</li>
      <li>Cease any further violations.</li>
    </ol>
    <p>If this matter is not resolved within 15 days, I will proceed with filing a lawsuit in
    the appropriate court without further notice. All prior correspondence has been preserved
    as evidence, including certified mail receipts and response (or lack thereof) documentation.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Copies of all prior dispute correspondence',
    'Certified mail receipts and return receipts',
    'Credit report excerpts showing continued inaccurate reporting',
  ]);
}

/** Letter 16: Arbitration Election — Federal Arbitration Act */
export function arbitrationElection(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Election of Arbitration Under Account Agreement</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>Pursuant to the arbitration provision contained in the account agreement governing the
    following account(s), I hereby elect to resolve this dispute through binding arbitration:</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under the Federal Arbitration Act (9 U.S.C. &sect;&sect; 1&ndash;16) and the arbitration clause
    in the governing agreement, either party has the right to elect arbitration to resolve
    any claim or dispute.</p>
    <p><strong>I am electing arbitration for the following claims:</strong></p>
    <ol>
      <li>Inaccurate reporting to consumer reporting agencies in violation of FCRA
      &sect; 1681s-2;</li>
      <li>Unfair, deceptive, or abusive collection practices in violation of the FDCPA; and</li>
      <li>Breach of the account agreement terms.</li>
    </ol>
    <p><strong>Arbitration logistics:</strong></p>
    <ol>
      <li>I request that arbitration be administered by the American Arbitration Association
      (AAA) under its Consumer Arbitration Rules, or JAMS under its Minimum Standards for
      Consumer Arbitrations;</li>
      <li>Per most consumer arbitration clauses, the company is required to pay the arbitration
      filing fees and arbitrator costs beyond the initial consumer filing fee;</li>
      <li>Arbitration should be conducted in my local jurisdiction; and</li>
      <li>I reserve all rights to seek statutory damages, actual damages, punitive damages,
      and attorney fees as available under the FCRA and FDCPA.</li>
    </ol>
    <p>Please confirm receipt of this arbitration election and provide the name and contact
    information of your designated representative for arbitration proceedings within
    <strong>15 days</strong>.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Copy of account agreement (if available)',
    'Copies of prior dispute correspondence',
  ]);
}

/** Letter 17: Billing Error — FCBA Section 1666 */
export function billingError(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Notice of Billing Error &mdash; Fair Credit Billing Act &sect; 1666</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>Pursuant to 15 U.S.C. &sect; 1666 of the Fair Credit Billing Act (FCBA), I am writing
    to notify you of a billing error on my account. The following charge(s) are in dispute:</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under 15 U.S.C. &sect; 1666(b), a "billing error" includes:</p>
    <ol>
      <li>A charge not made by me or a person authorized to use my account;</li>
      <li>A charge for property or services not accepted or delivered as agreed;</li>
      <li>A computational or accounting error;</li>
      <li>Failure to credit a payment or return properly; and</li>
      <li>A charge for which I request clarification or documentation.</li>
    </ol>
    <p><strong>Your legal obligations under the FCBA:</strong></p>
    <ol>
      <li>Within <strong>30 days</strong> of receiving this notice, you must acknowledge receipt
      in writing;</li>
      <li>Within <strong>two billing cycles (but no more than 90 days)</strong>, you must either
      correct the billing error or provide a written explanation of why you believe the charge
      is correct;</li>
      <li>During the investigation period, you <strong>may not</strong>:
        <ul>
          <li>Attempt to collect the disputed amount;</li>
          <li>Report the disputed amount as delinquent to any credit reporting agency; or</li>
          <li>Restrict or close the account solely due to the dispute.</li>
        </ul>
      </li>
    </ol>
    <p><strong>Penalties for noncompliance:</strong> Under 15 U.S.C. &sect; 1666(e), if you fail to
    comply with these requirements, you forfeit the right to collect the disputed amount
    <strong>up to $50</strong>, even if the charge was correct. Additionally, violations may subject
    you to civil liability under 15 U.S.C. &sect; 1640, including actual damages and statutory
    damages of <strong>twice the finance charge</strong> (minimum $500, maximum $5,000).</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Copy of billing statement showing disputed charge(s)',
    'Supporting documentation (receipts, correspondence, etc.)',
  ]);
}

/** Letter 18: Breach of Contract Notice */
export function breachOfContract(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Notice of Breach of Contract</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>This letter constitutes formal notice that you are in breach of the contractual
    agreement governing the following account(s):</p>
    ${formatDisputedItems(ctx.items)}
    <p><strong>Nature of the breach:</strong></p>
    <p>${esc(ctx.extra?.['breach_description'] || 'You have failed to perform your obligations under the account agreement, including but not limited to: accurate reporting of account information, proper application of payments, adherence to agreed-upon terms and conditions, and compliance with applicable consumer protection laws incorporated by reference into the agreement.')}</p>
    <p><strong>Applicable legal framework:</strong></p>
    <ol>
      <li>Under state contract law, a material breach of contract excuses further performance
      by the non-breaching party and entitles them to damages;</li>
      <li>The implied covenant of good faith and fair dealing requires that neither party
      act in a way that destroys or injures the right of the other party to receive the
      benefits of the agreement;</li>
      <li>Under the FCRA, furnishing inaccurate information to credit bureaus may constitute
      both a statutory violation and a breach of any contractual obligation to report accurately; and</li>
      <li>Under the UCC &sect; 1-304, every contract imposes an obligation of good faith in its
      performance and enforcement.</li>
    </ol>
    <p><strong>Demand:</strong></p>
    <ol>
      <li>Cure the breach within <strong>30 days</strong> by correcting all inaccurate information;</li>
      <li>Provide written acknowledgment of the breach and corrective action taken;</li>
      <li>Compensate me for any actual damages suffered as a result of the breach; and</li>
      <li>Ensure future compliance with all contractual obligations.</li>
    </ol>
    <p>Failure to cure the breach within 30 days will result in pursuit of all available legal
    remedies, including compensatory damages, consequential damages, and attorney fees as
    permitted by the agreement and applicable law.</p>
    <p>This notice is provided without waiver of any rights I may have under the contract
    or applicable law.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Copy of account agreement or contract',
    'Documentation of breach (statements, correspondence, etc.)',
  ]);
}

/** Letter 19: Formal Demand Letter */
export function demandLetter(ctx: LetterContext): string {
  const demandAmount = esc(ctx.extra?.['demand_amount'] || '[AMOUNT]');

  const body = `
    <p><strong>RE: Formal Demand for Payment / Resolution</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>This letter constitutes a formal demand regarding the following matter:</p>
    ${formatDisputedItems(ctx.items)}
    <p><strong>Background:</strong></p>
    <p>${esc(ctx.extra?.['background'] || 'Despite prior correspondence and attempts to resolve this matter, you have failed to comply with applicable federal and state consumer protection laws. Your continued inaction has caused and continues to cause me significant harm, including damage to my credit standing and resulting financial losses.')}</p>
    <p><strong>Legal basis for this demand:</strong></p>
    <ol>
      <li>Fair Credit Reporting Act (15 U.S.C. &sect; 1681 et seq.) &mdash; violations of
      reinvestigation duties, furnisher obligations, and consumer disclosure rights;</li>
      <li>Fair Debt Collection Practices Act (15 U.S.C. &sect; 1692 et seq.) &mdash; deceptive
      and unfair collection practices, if applicable;</li>
      <li>State consumer protection and unfair trade practices statutes; and</li>
      <li>Common law claims including negligence, defamation, and breach of contract.</li>
    </ol>
    <p><strong>Demand:</strong></p>
    <p>I hereby demand that you take the following actions within <strong>15 days</strong> of
    receipt of this letter:</p>
    <ol>
      <li>Correct or delete all inaccurate information from my credit reports with all three
      major bureaus;</li>
      <li>Provide written confirmation of all corrections;</li>
      <li>Pay damages in the amount of <strong>$${demandAmount}</strong> to compensate for actual
      harm suffered, including credit denials, higher interest rates, emotional distress,
      and time spent attempting to resolve this matter; and</li>
      <li>Cease all further violations.</li>
    </ol>
    <p><strong>Consequences of non-compliance:</strong></p>
    <p>If this demand is not satisfied within 15 days, I will pursue all available legal
    remedies without further notice, including but not limited to:</p>
    <ul>
      <li>Filing suit in federal or state court;</li>
      <li>Filing complaints with the Consumer Financial Protection Bureau (CFPB),
      Federal Trade Commission (FTC), and state Attorney General;</li>
      <li>Seeking statutory damages, actual damages, punitive damages, and attorney fees; and</li>
      <li>Reporting your violations to relevant regulatory agencies.</li>
    </ul>
    <p>This letter is sent without prejudice to any additional rights and remedies I may have
    under applicable law. All prior correspondence has been preserved and will be submitted
    as evidence.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Copies of all prior correspondence',
    'Certified mail receipts and return receipts',
    'Credit report excerpts showing continued violations',
    'Documentation of actual damages (denial letters, rate quotes, etc.)',
  ]);
}
