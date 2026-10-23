/**
 * Import a wishlist from Throne, MyWishlist or Wishlist.com straight into an
 * existing Serika account, by email.
 *
 *   npm run import -- someone@example.com https://mywishlist.online/w/zpy1zk/wishlist [--public]
 *
 * Lists are created unlisted (link-only) unless --public is passed.
 */
import { accountsGetUser } from '../lib/accounts';
import { getPool } from '../lib/db';
import { commitImport, fetchImport, NeedsBrowserImportError, SOURCE_LABELS } from '../lib/importers';
import { updateList } from '../lib/lists';
import { upsertUser } from '../lib/owners';

async function main() {
  const args = process.argv.slice(2);
  const makePublic = args.includes('--public');
  const [email, url] = args.filter((a) => !a.startsWith('--'));
  if (!email || !url) {
    console.error('Usage: npm run import -- <account email> <wishlist url> [--public]');
    process.exit(1);
  }

  const result = await accountsGetUser(email);
  const account = result.data.user;
  if (!result.ok || !account?.id) {
    console.error(`No Serika account for ${email}: ${result.data.error || result.status}`);
    process.exit(1);
  }
  const user = {
    id: String(account.id),
    username: account.username,
    displayName: account.displayName || null,
    email: account.email || email,
    avatar: account.avatar || null,
  };
  await upsertUser(user);
  console.log(`Account: ${user.username} (${user.id})`);

  console.log(`Reading ${url} …`);
  const imported = await fetchImport(url);
  console.log(`${SOURCE_LABELS[imported.source]}: “${imported.title}” by ${imported.ownerName ?? 'unknown'}, ${imported.items.length} items`);

  const { list, added } = await commitImport({
    owner: { userId: user.id },
    title: imported.title,
    description: imported.description,
    source: imported.source,
    sourceUrl: imported.sourceUrl,
    items: imported.items,
  });
  if (makePublic) await updateList(list.id, { visibility: 'public' });

  console.log(`Imported ${added} items into “${list.title}” → ${process.env.BASE_URL || 'https://wishlist.serika.dev'}/w/${list.slug}`);
  if (imported.related.length) {
    console.log(`Same person has more lists on ${SOURCE_LABELS[imported.source]}:`);
    for (const r of imported.related) console.log(`  ${r.title}: ${r.url}`);
  }
}

main()
  .catch((error) => {
    if (error instanceof NeedsBrowserImportError) {
      console.error(`${error.message} Open the list in a browser and use the Serika Wishlist bookmarklet instead.`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
