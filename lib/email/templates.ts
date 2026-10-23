import { config } from '../config';
import { emailLink, emailListLines, emailName, emailParagraph, renderBrandEmail } from './layout';

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

interface ListSummary {
  title: string;
  slug: string;
  itemCount: number;
}

const HOURS = Math.round(config.MAGIC_LINK_TTL_S / 3600);

function listUrl(slug: string): string {
  // Emails go to the owner, so link to the main site where they are signed in.
  return `${config.BASE_URL}/w/${slug}`;
}

function textLists(lists: ListSummary[]): string {
  return lists.map((l) => `  ${l.title} (${l.itemCount}) — ${listUrl(l.slug)}`).join('\n');
}

/**
 * The magic link a guest uses to save and edit their wishlists. Three tones:
 * a first save, a returning guest, and an address that already has a Serika
 * account (the link still works, then moves everything into that account).
 */
export function magicLinkEmail(input: {
  link: string;
  lists: ListSummary[];
  firstSave: boolean;
  accountUsername: string | null;
}): EmailMessage {
  const { link, lists, firstSave, accountUsername } = input;
  const brandLists = emailListLines(
    lists.map((l) => ({ title: l.title, url: listUrl(l.slug), itemCount: l.itemCount }))
  );
  const expiry = `The button works once and expires in ${HOURS} hours. After that, the device you open it on stays signed in for 30 days. Didn't ask for this? Ignore it and nothing changes.`;

  if (accountUsername) {
    return {
      subject: 'Your wishlists are moving to your Serika account',
      html: renderBrandEmail({
        eyebrow: 'Serika Wishlist',
        title: 'Moving in',
        preheader: `This address belongs to ${accountUsername} on Serika.`,
        introHtml: emailParagraph(
          `This email address belongs to the Serika account ${emailName(accountUsername)}. Press the button and every wishlist saved under it moves into that account, so you can manage them alongside everything else on Serika.`
        ),
        bodyHtml: brandLists,
        cta: { url: link, label: 'Move my wishlists' },
        closingHtml: `Afterwards, sign in with your Serika account as usual. Forgot your password? ${emailLink('https://accounts.serika.dev/forgot-password', 'Reset it here')}.`,
        reason: 'You got this because someone asked for a wishlist link for this address.',
      }),
      text: [
        `Hey, I'm Serika,`,
        ``,
        `This email address belongs to the Serika account ${accountUsername}. Open this link to move every wishlist saved under it into that account:`,
        link,
        ``,
        lists.length ? textLists(lists) + '\n' : '',
        `The link works once and expires in ${HOURS} hours.`,
        ``,
        `Kind regards,`,
        `Serika`,
      ].join('\n'),
    };
  }

  const title = firstSave ? 'Wishlist saved' : 'Your edit link';
  const intro = firstSave
    ? `Your wishlist is saved to this address. Press the button to confirm it's yours, and it'll be here whenever you come back. Lost the link later? Ask for a new one on ${emailLink(`${config.BASE_URL}/access`, 'Serika Wishlist')} with this address.`
    : `Here's your link to edit your wishlists. Press the button and you're straight back in, no password needed.`;

  return {
    subject: firstSave ? 'Confirm your wishlist' : 'Your Serika Wishlist link',
    html: renderBrandEmail({
      eyebrow: 'Serika Wishlist',
      title,
      preheader: firstSave ? 'One click and your wishlist is saved for good.' : 'One click and you can edit your wishlists.',
      introHtml: emailParagraph(intro),
      bodyHtml: brandLists,
      cta: { url: link, label: firstSave ? 'Confirm and edit' : 'Edit my wishlists' },
      closingHtml: `${expiry}<br><br>Want everything in one place? ${emailLink('https://accounts.serika.dev/register', 'Make a Serika account')} with this address and your wishlists move in automatically.`,
      reason: 'You got this because a wishlist was saved with this address on Serika Wishlist.',
    }),
    text: [
      `Hey, I'm Serika,`,
      ``,
      firstSave
        ? `Your wishlist is saved to this address. Open this link to confirm it's yours:`
        : `Here's your link to edit your wishlists:`,
      link,
      ``,
      lists.length ? textLists(lists) + '\n' : '',
      `The link works once and expires in ${HOURS} hours. After that, this device stays signed in for 30 days.`,
      `Make a Serika account with this address and your wishlists move in automatically: https://accounts.serika.dev/register`,
      ``,
      `Kind regards,`,
      `Serika`,
    ].join('\n'),
  };
}
