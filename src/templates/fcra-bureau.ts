/**
 * FCRA Bureau Dispute Letter Templates (Letters 1-5)
 * Target: Equifax, Experian, TransUnion
 */

import type { LetterContext } from './layout';
import { buildLetter, formatDisputedItems } from './layout';

const STANDARD_BUREAU_ENCLOSURES = [
  'Copy of government-issued photo identification',
  'Proof of current address (utility bill or bank statement)',
  'Copy of credit report highlighting disputed items',
];

/** Letter 1: Basic Credit Bureau Dispute — FCRA Section 1681i */
export function basicBureau(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Formal Dispute of Inaccurate Credit Information</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>Pursuant to my rights under the Fair Credit Reporting Act, 15 U.S.C. &sect; 1681i(a),
    I am writing to formally dispute the following inaccurate information appearing on my
    credit report. I have identified the following account(s) that contain errors:</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under 15 U.S.C. &sect; 1681i(a), you are required to:</p>
    <ol>
      <li>Conduct a reasonable reinvestigation of the disputed information within <strong>30 days</strong> of receipt of this letter;</li>
      <li>Contact the furnisher of the information and notify them of the dispute;</li>
      <li>Review and consider all relevant information I have submitted;</li>
      <li>Delete or modify the information if it cannot be verified; and</li>
      <li>Provide me with written notice of the results of your reinvestigation within 5 business days of completion.</li>
    </ol>
    <p>Please note that under 15 U.S.C. &sect; 1681i(a)(5)(A), if the information is found to be
    inaccurate or incomplete, or cannot be verified, you must <strong>promptly delete or modify</strong>
    the item and notify all other consumer reporting agencies.</p>
    <p><strong>Failure to comply</strong> with the reinvestigation requirements may subject your agency to
    liability under 15 U.S.C. &sect; 1681n (willful noncompliance: statutory damages of $100&ndash;$1,000
    per violation plus punitive damages) and 15 U.S.C. &sect; 1681o (negligent noncompliance: actual damages).</p>
    <p>Please provide written confirmation of the results of your investigation, including
    an updated copy of my credit report reflecting any corrections.</p>
  `;

  return buildLetter(ctx, body, STANDARD_BUREAU_ENCLOSURES);
}

/** Letter 2: 609 Verification Request — FCRA Section 609 */
export function verification609(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Request for Disclosure of Information &mdash; FCRA &sect; 609</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>Pursuant to 15 U.S.C. &sect; 1681g (FCRA Section 609), I am exercising my right to
    request disclosure of all information in my consumer file, specifically regarding the
    following account(s):</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under Section 609(a)(1), I am entitled to receive:</p>
    <ol>
      <li>All information in my consumer file at the time of the request;</li>
      <li>The sources of all information in the file;</li>
      <li>Identification of each person (including each end-user) that procured a consumer
      report on me during the preceding two-year period (or one year for employment purposes);</li>
      <li>The dates, original payees, and amounts of any checks upon which adverse information
      is based; and</li>
      <li>A record of all inquiries received during the preceding twelve-month period.</li>
    </ol>
    <p>I am specifically requesting that you provide <strong>verifiable proof</strong> that the above
    account(s) belong to me. This includes the original signed contract, application, or other
    documentation bearing my signature that authorized the reporting of this information.</p>
    <p>If you are unable to provide such verification, I demand that the unverified item(s)
    be <strong>immediately deleted</strong> from my credit report pursuant to 15 U.S.C. &sect; 1681i.</p>
    <p>You have <strong>30 days</strong> from receipt of this letter to respond. Failure to comply may
    result in legal action under 15 U.S.C. &sect;&sect; 1681n and 1681o.</p>
  `;

  return buildLetter(ctx, body, STANDARD_BUREAU_ENCLOSURES);
}

/** Letter 3: 611 Reinvestigation Demand — FCRA Section 611 */
export function reinvestigation611(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Demand for Reinvestigation Pursuant to FCRA &sect; 611</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I previously disputed the accuracy of information on my credit report. Pursuant to
    15 U.S.C. &sect; 1681i (FCRA Section 611), I am demanding a <strong>thorough reinvestigation</strong>
    of the following account(s) that remain inaccurate:</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under Section 611, you are required to:</p>
    <ol>
      <li>Conduct a reasonable reinvestigation to determine whether the disputed information
      is inaccurate and record the current status of the disputed information, or delete the
      item in accordance with 15 U.S.C. &sect; 1681i(a)(5);</li>
      <li>Within 5 business days of receipt, notify the furnisher of information of this dispute,
      including all relevant information provided by the consumer;</li>
      <li>Consider all relevant information submitted by the consumer;</li>
      <li>Complete the reinvestigation within <strong>30 days</strong>; and</li>
      <li>Provide written notice of the results no later than 5 business days after completion.</li>
    </ol>
    <p><strong>Important:</strong> Under 15 U.S.C. &sect; 1681i(a)(5)(A), if the disputed information
    cannot be verified by the furnisher, you must promptly delete the item from my file and
    notify me of the deletion.</p>
    <p>This is a formal demand. I expect full compliance within the statutory timeframe.
    Noncompliance will be documented for potential action under 15 U.S.C. &sect;&sect; 1681n&ndash;1681o,
    including a complaint to the Consumer Financial Protection Bureau (CFPB).</p>
  `;

  return buildLetter(ctx, body, [
    ...STANDARD_BUREAU_ENCLOSURES,
    'Copy of previous dispute correspondence (if applicable)',
  ]);
}

/** Letter 4: Method of Verification Demand — FCRA Section 611(a)(6) & (7) */
export function methodOfVerification(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Demand for Method of Verification &mdash; FCRA &sect; 611(a)(6)&ndash;(7)</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I previously submitted a dispute regarding the following account(s), and your agency
    reported the results as "verified." I am now exercising my right under 15 U.S.C.
    &sect; 1681i(a)(6) and (7) to demand that you provide the <strong>method of verification</strong>
    used to confirm the accuracy of the disputed information:</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under 15 U.S.C. &sect; 1681i(a)(6)(B)(iii), upon request, you must provide:</p>
    <ol>
      <li>A description of the <strong>procedure used</strong> to determine the accuracy and
      completeness of the information;</li>
      <li>The <strong>business name and address</strong> of any furnisher contacted in connection
      with the reinvestigation; and</li>
      <li>The <strong>telephone number</strong> of the furnisher, if reasonably available.</li>
    </ol>
    <p>Additionally, under 15 U.S.C. &sect; 1681i(a)(7), you must provide a description of the
    reinvestigation procedure and include the identity of any document relied upon.</p>
    <p>A generic response stating the information was "verified" without providing the specific
    method of verification does <strong>not</strong> satisfy the requirements of the FCRA. If you
    are unable to provide the requested details, I demand immediate deletion of the disputed
    item(s) pursuant to 15 U.S.C. &sect; 1681i(a)(5)(A).</p>
    <p>You have <strong>15 days</strong> from receipt of this request to comply. Failure to do so will
    constitute willful noncompliance under 15 U.S.C. &sect; 1681n, exposing your agency to
    statutory damages of $100&ndash;$1,000 per violation plus punitive damages and attorney fees.</p>
  `;

  return buildLetter(ctx, body, [
    ...STANDARD_BUREAU_ENCLOSURES,
    'Copy of previous dispute results showing "verified" status',
  ]);
}

/** Letter 5: Identity Theft Dispute — FCRA Section 605B */
export function identityTheft(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Identity Theft Report &mdash; Block of Fraudulent Information Under FCRA &sect; 605B</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I am a victim of identity theft. Pursuant to 15 U.S.C. &sect; 1681c-2 (FCRA Section 605B),
    I am requesting that you <strong>block</strong> the reporting of the following fraudulent
    account(s) that were opened or used without my knowledge, authorization, or consent:</p>
    ${formatDisputedItems(ctx.items)}
    <p>Under 15 U.S.C. &sect; 1681c-2(a), you must block the reporting of any information
    identified in an identity theft report within <strong>4 business days</strong> of receipt of:</p>
    <ol>
      <li>This identity theft report (included as an enclosure);</li>
      <li>Proof of my identity (included as an enclosure); and</li>
      <li>Identification of the specific information to be blocked (listed above).</li>
    </ol>
    <p>Under 15 U.S.C. &sect; 1681c-2(b), you must also promptly notify the furnisher(s) of
    the information that the block has been imposed and that the information may be the result
    of identity theft.</p>
    <p><strong>You may not refuse</strong> to block information solely because the identity theft
    report was not filed with a law enforcement agency. An FTC Identity Theft Report satisfies
    the statutory requirements per 15 U.S.C. &sect; 1681a(q)(4).</p>
    <p>Failure to block the reported information within 4 business days constitutes willful
    noncompliance under 15 U.S.C. &sect; 1681n, subjecting your agency to statutory damages
    of $100&ndash;$1,000 per violation, punitive damages, and reasonable attorney fees.</p>
  `;

  return buildLetter(ctx, body, [
    ...STANDARD_BUREAU_ENCLOSURES,
    'FTC Identity Theft Report / police report',
    'FTC Identity Theft Affidavit (if applicable)',
  ]);
}
