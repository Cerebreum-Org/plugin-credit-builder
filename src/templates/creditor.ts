/**
 * Creditor Letter Templates (Letters 9-11)
 * Target: Original creditors (banks, lenders, credit card issuers)
 */

import type { LetterContext } from './layout';
import { buildLetter, formatDisputedItems, esc } from './layout';

/** Letter 9: Goodwill Removal Letter */
export function goodwill(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Goodwill Request for Removal of Negative Reporting</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I am writing to respectfully request a goodwill adjustment to remove the following
    negative information from my credit report with your company:</p>
    ${formatDisputedItems(ctx.items)}
    <p>I want to acknowledge that the reported information is technically accurate. However,
    I am requesting your consideration due to the following circumstances:</p>
    <ul>
      <li>I have been a loyal customer and value my relationship with your company;</li>
      <li>${esc(ctx.extra?.['reason'] || 'The late payment(s) occurred during a period of unexpected financial hardship (medical emergency, job loss, or other unforeseen circumstance)')};</li>
      <li>I have since brought the account current and have maintained on-time payments;</li>
      <li>This negative mark is preventing me from ${esc(ctx.extra?.['goal'] || 'achieving important financial goals such as purchasing a home or qualifying for favorable interest rates')}.</li>
    </ul>
    <p>I understand that you have no legal obligation to make this adjustment, and I am
    appealing solely to your goodwill. Many creditors recognize that a single lapse does not
    define a customer&rsquo;s creditworthiness, and that goodwill adjustments can strengthen
    customer loyalty.</p>
    <p><strong>My request:</strong></p>
    <ol>
      <li>Remove the negative reporting (late payment notation) from my credit file with
      all three bureaus (Equifax, Experian, and TransUnion); or</li>
      <li>Alternatively, update the reporting to reflect "Paid as Agreed" or "Current" status.</li>
    </ol>
    <p>I am committed to maintaining a positive relationship with your company and will
    continue to manage my account responsibly. Thank you for your time and consideration.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Proof of current address',
    'Documentation of hardship (if applicable)',
  ]);
}

/** Letter 10: Direct Creditor Dispute — FCRA Section 1681s-2(b) */
export function directCreditor(ctx: LetterContext): string {
  const body = `
    <p><strong>RE: Direct Dispute of Inaccurate Information &mdash; FCRA &sect; 1681s-2(b)</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>Pursuant to 15 U.S.C. &sect; 1681s-2(b), I am directly disputing the accuracy of
    information you are furnishing to the consumer reporting agencies regarding the following
    account(s):</p>
    ${formatDisputedItems(ctx.items)}
    <p>As a furnisher of information, you have legal obligations under 15 U.S.C. &sect; 1681s-2.
    Specifically:</p>
    <ol>
      <li>Under <strong>&sect; 1681s-2(a)(1)(A)</strong>, you may not furnish information that you
      know or have reasonable cause to believe is inaccurate;</li>
      <li>Under <strong>&sect; 1681s-2(b)(1)</strong>, upon receiving notice of a dispute, you must
      conduct a reasonable investigation with respect to the disputed information;</li>
      <li>Under <strong>&sect; 1681s-2(b)(1)(B)</strong>, you must review all relevant information
      provided by the consumer;</li>
      <li>Under <strong>&sect; 1681s-2(b)(1)(C)</strong>, you must report the results of your
      investigation to the credit reporting agency; and</li>
      <li>Under <strong>&sect; 1681s-2(b)(1)(E)</strong>, if the information is found to be
      incomplete or inaccurate, you must modify, delete, or permanently block the reporting
      of that information.</li>
    </ol>
    <p>I demand that you:</p>
    <ol>
      <li>Immediately investigate the disputed information;</li>
      <li>Provide me with copies of any documentation you relied upon to verify the accuracy
      of this information;</li>
      <li>Correct or delete any inaccurate information; and</li>
      <li>Notify all consumer reporting agencies to which you reported the inaccurate information.</li>
    </ol>
    <p>Failure to conduct a reasonable investigation and correct inaccurate information may
    subject you to liability under 15 U.S.C. &sect; 1681s-2(c), including actual damages,
    statutory damages, punitive damages, and attorney fees. Consumers have a private right
    of action under &sect; 1681s-2(b) as established in <em>Nelson v. Chase Manhattan Mortgage
    Corp.</em>, 282 F.3d 1057 (9th Cir. 2002).</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Proof of current address',
    'Copy of credit report showing disputed item(s)',
    'Supporting documentation of inaccuracy',
  ]);
}

/** Letter 11: Charge-Off Removal Request */
export function chargeoffRemoval(ctx: LetterContext): string {
  const totalAmount = ctx.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const parsed = parseInt(ctx.extra?.['offer_percent'] || '50');
  const rate = isNaN(parsed) ? 50 : parsed;
  const offerAmount = totalAmount > 0
    ? Math.round(totalAmount * (rate / 100))
    : '[AMOUNT]';

  const body = `
    <p><strong>RE: Settlement and Deletion Request for Charged-Off Account</strong></p>
    <p>Dear Sir/Madam:</p>
    <p>I am writing regarding the following account(s) that have been charged off and are
    currently being reported on my credit file:</p>
    ${formatDisputedItems(ctx.items)}
    <p>I understand that a charge-off represents a significant negative event. However, I am
    writing to propose a resolution that benefits both parties:</p>
    <p><strong>Settlement proposal:</strong></p>
    <ol>
      <li>I will pay <strong>$${offerAmount}</strong> as full and final settlement of the
      above account(s);</li>
      <li>Payment will be made via certified funds within <strong>10 business days</strong>
      of receiving your written acceptance;</li>
      <li>Upon receipt of payment, you will update the trade line status to <strong>"Paid in
      Full"</strong> or, preferably, request <strong>complete deletion</strong> of the trade line
      from all three credit bureaus;</li>
      <li>You will provide a written settlement agreement prior to payment; and</li>
      <li>You will cease all collection activity related to this account.</li>
    </ol>
    <p><strong>Please note:</strong></p>
    <ul>
      <li>Under FCRA &sect; 1681s-2(a)(1)(A), furnishing information you know to be inaccurate
      is a violation. If this account is reported inaccurately in any way (balance, dates,
      status), it must be corrected regardless of settlement;</li>
      <li>A charge-off is an accounting term &mdash; it does not extinguish the debt or my
      right to dispute inaccurate reporting;</li>
      <li>This offer does not constitute an admission of the debt&rsquo;s validity or restart
      any applicable statute of limitations.</li>
    </ul>
    <p>Please respond in writing within <strong>15 days</strong> to accept or propose a counter-offer.
    I am motivated to resolve this matter promptly and am prepared to act quickly upon agreement.</p>
  `;

  return buildLetter(ctx, body, [
    'Copy of government-issued photo identification',
    'Proof of current address',
  ]);
}
