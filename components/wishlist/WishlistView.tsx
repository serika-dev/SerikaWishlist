'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Gift, Globe, Link2, Lock, Plus, Settings2, Users } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { ShareButton } from '@/components/ShareButton';
import { useToast } from '@/components/Toaster';
import { CurrencyPicker, useMoney } from '@/components/Money';
import { convert } from '@/lib/money';
import { plural } from '@/lib/format';
import type { Item, ProductVariant, Wishlist } from '@/lib/types';
import { ItemCard } from './ItemCard';
import { ItemDetail } from './ItemDetail';
import { ItemEditor, emptyValues, unfurl, type ItemFormValues } from './ItemEditor';
import { ListSettings, type ListSettingsValues } from './ListSettings';

type Sort = 'custom' | 'priceAsc' | 'priceDesc' | 'newest';

interface OwnerInfo {
  username: string;
  displayName: string | null;
  avatar: string | null;
}

function sortItems(items: Item[], sort: Sort, value: (item: Item) => number | null): Item[] {
  const list = [...items];
  const doneLast = (a: Item, b: Item) => Number(Boolean(a.receivedAt)) - Number(Boolean(b.receivedAt));
  switch (sort) {
    case 'priceAsc':
      return list.sort((a, b) => doneLast(a, b) || (value(a) ?? Infinity) - (value(b) ?? Infinity));
    case 'priceDesc':
      return list.sort((a, b) => doneLast(a, b) || (value(b) ?? -1) - (value(a) ?? -1));
    case 'newest':
      return list.sort((a, b) => doneLast(a, b) || b.createdAt.localeCompare(a.createdAt));
    default:
      return list.sort((a, b) => doneLast(a, b) || b.priority - a.priority || a.position - b.position);
  }
}

function toPayload(values: ItemFormValues) {
  return {
    title: values.title,
    variant: values.variant.trim(),
    url: values.url.trim() || null,
    imageUrl: values.imageUrl.trim() || null,
    price: values.price.trim() || null,
    currency: values.currency,
    quantity: values.quantity,
    priority: values.priority,
    note: values.note,
  };
}

export function WishlistView({
  list: initialList,
  items: initialItems,
  isOwner,
  owner,
  shareUrl,
  mainUrl,
  canBePublic,
  guestNotice,
}: {
  list: Wishlist;
  items: Item[];
  isOwner: boolean;
  owner: OwnerInfo | null;
  shareUrl: string;
  mainUrl: string;
  canBePublic: boolean;
  guestNotice?: React.ReactNode;
}) {
  const [list, setList] = useState(initialList);
  const [items, setItems] = useState(initialItems);
  const [sort, setSort] = useState<Sort>('custom');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ mode: 'add' | 'edit'; id?: string; values: ItemFormValues; variants?: ProductVariant[] } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quick, setQuick] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const search = useSearchParams();
  const { toast } = useToast();
  const money = useMoney();

  useEffect(() => setItems(initialItems), [initialItems]);
  useEffect(() => setList(initialList), [initialList]);
  useEffect(() => {
    if (isOwner && search.get('new') === '1') quickRef.current?.focus();
  }, [isOwner, search]);

  const revealReservations = !isOwner || list.showReservations;
  // Price sorts compare what things cost in the viewer's currency, not the raw numbers.
  const sorted = useMemo(
    () => sortItems(items, sort, (i) => (i.price === null ? null : convert(i.price, i.currency, money.prefs.currency, money.rates) ?? i.price)),
    [items, sort, money]
  );
  const openItem = items.find((i) => i.id === openId) ?? null;
  const defaultCurrency = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) if (i.currency) counts.set(i.currency, (counts.get(i.currency) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || money.prefs.currency;
  }, [items, money.prefs.currency]);

  const stats = useMemo(() => {
    const open = items.filter((i) => !i.receivedAt);
    // Everything still wished for, converted into the viewer's currency.
    const total = money.total(open.filter((i) => i.price !== null).map((i) => ({ amount: i.price! * i.quantity, currency: i.currency })));
    return { count: items.length, received: items.length - open.length, total };
  }, [items, money]);

  const api = useCallback(
    async (url: string, method: string, body?: unknown) => {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Something went wrong.');
      return data;
    },
    []
  );

  // ---- adding -------------------------------------------------------------

  const quickAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = quick.trim();
    if (!text || quickBusy) return;
    const looksLikeUrl = /^(https?:\/\/|www\.)\S+$/i.test(text) || /^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/i.test(text);
    if (!looksLikeUrl) {
      setEditor({ mode: 'add', values: emptyValues({ title: text }, defaultCurrency) });
      setQuick('');
      return;
    }
    setQuickBusy(true);
    const result = await unfurl(text);
    setQuickBusy(false);
    if ('error' in result) {
      toast(result.error, 'error');
      return;
    }
    setQuick('');
    setEditor({
      mode: 'add',
      values: emptyValues({ ...result.values, currency: result.values.currency || defaultCurrency }, defaultCurrency),
      variants: result.variants,
    });
    if (result.partial) toast('That store kept its details to itself. Fill in the rest, or use the bookmarklet.', 'info');
  };

  const saveItem = async (entries: ItemFormValues[]): Promise<boolean> => {
    try {
      if (editor?.mode === 'edit' && editor.id) {
        const { item } = await api(`/api/items/${editor.id}`, 'PATCH', toPayload(entries[0]));
        setItems((current) => current.map((i) => (i.id === item.id ? { ...i, ...item } : i)));
        toast('Saved.', 'success');
      } else {
        // Several picked versions are added together, each as its own wish.
        const { items: created } = await api(`/api/lists/${list.id}/items`, 'POST', { items: entries.map(toPayload), placement: 'top' });
        setItems((current) => [...created, ...current]);
        toast(created.length > 1 ? `Added ${created.length} wishes.` : 'Added to your wishlist.', 'success');
      }
      setEditor(null);
      return true;
    } catch (error) {
      toast((error as Error).message, 'error');
      return false;
    }
  };

  // ---- item actions -------------------------------------------------------

  const patchItem = async (id: string, patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      const { item } = await api(`/api/items/${id}`, 'PATCH', patch);
      setItems((current) => current.map((i) => (i.id === id ? { ...i, ...item } : i)));
      if (patch.received === true) toast('Marked as received.', 'success');
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id: string) => {
    setBusy(true);
    try {
      await api(`/api/items/${id}`, 'DELETE');
      setItems((current) => current.filter((i) => i.id !== id));
      setOpenId(null);
      toast('Deleted.', 'success');
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const reserve = async (id: string, name: string) => {
    setBusy(true);
    try {
      await api(`/api/items/${id}/reserve`, 'POST', { name });
      setItems((current) => current.map((i) => (i.id === id ? { ...i, reservedByMe: true, reservedCount: (i.reservedCount ?? 0) + 1 } : i)));
      toast('Reserved. Nobody else will get it, and it stays a surprise.', 'success');
    } catch (error) {
      toast((error as Error).message, 'error');
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const unreserve = async (id: string) => {
    setBusy(true);
    try {
      await api(`/api/items/${id}/reserve`, 'DELETE');
      setItems((current) => current.map((i) => (i.id === id ? { ...i, reservedByMe: false, reservedCount: Math.max(0, (i.reservedCount ?? 1) - 1) } : i)));
    } catch (error) {
      toast((error as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // ---- reorder (owner, custom order) ---------------------------------------

  const dropOn = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const order = sorted.map((i) => i.id);
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    order.splice(to, 0, order.splice(from, 1)[0]);
    const position = new Map(order.map((id, index) => [id, index]));
    setItems((current) => current.map((i) => ({ ...i, position: position.get(i.id) ?? i.position })));
    try {
      await api(`/api/lists/${list.id}/reorder`, 'POST', { ids: order });
    } catch (error) {
      toast((error as Error).message, 'error');
      router.refresh();
    }
  };

  // ---- list settings ------------------------------------------------------

  const saveSettings = async (values: ListSettingsValues): Promise<boolean> => {
    try {
      const { list: updated } = await api(`/api/lists/${list.id}`, 'PATCH', values);
      setList((current) => ({ ...current, ...updated }));
      setSettingsOpen(false);
      toast('Wishlist updated.', 'success');
      router.refresh();
      return true;
    } catch (error) {
      toast((error as Error).message, 'error');
      return false;
    }
  };

  const deleteList = async () => {
    try {
      await api(`/api/lists/${list.id}`, 'DELETE');
      toast('Wishlist deleted.', 'success');
      router.push('/lists');
      router.refresh();
    } catch (error) {
      toast((error as Error).message, 'error');
    }
  };

  const VisIcon = list.visibility === 'public' ? Globe : list.visibility === 'private' ? Lock : list.visibility === 'friends' ? Users : Link2;
  const visLabel = { public: 'Public', unlisted: 'Link only', friends: 'Friends', private: 'Private' }[list.visibility];

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 sm:pt-14">
      {guestNotice && <div className="mb-8">{guestNotice}</div>}

      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0 enter">
          {owner && (
            <Link href={`/u/${encodeURIComponent(owner.username)}`} className="mb-4 inline-flex items-center gap-2 text-[13px] muted hover:text-white">
              <Avatar user={owner} size={24} /> {owner.displayName || owner.username}
            </Link>
          )}
          <div className="flex items-center gap-4 sm:gap-5">
            {list.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={list.iconUrl} alt="" className="h-14 w-14 sm:h-[72px] sm:w-[72px] shrink-0 rounded-[12px] object-cover border border-[var(--color-line-strong)]" />
            )}
            <h1 className="display text-[38px] sm:text-[58px] break-words min-w-0">{list.title}</h1>
          </div>
          <span className="bar mt-5" />
          {list.description && <p className="mt-5 max-w-2xl muted whitespace-pre-line">{list.description}</p>}
          <p className="mt-4 text-[13px] dim flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{plural(stats.count, 'wish', 'wishes')}</span>
            {stats.total && <span className="tnum">· {stats.total} to go</span>}
            {stats.received > 0 && <span>· {stats.received} received</span>}
            {isOwner && (
              <span className="inline-flex items-center gap-1">
                · <VisIcon size={12} /> {visLabel}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isOwner && (
            <a href={mainUrl} className="text-[12.5px] dim hover:text-white mr-2">Your list? Edit it</a>
          )}
          <ShareButton url={shareUrl} title={list.title} isPrivate={list.visibility === 'private'} />
          {isOwner && (
            <button type="button" className="btn btn-ghost" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={16} /> Settings
            </button>
          )}
        </div>
      </header>

      {isOwner && (
        <form onSubmit={quickAdd} className="mt-9 card corner p-2 flex items-center gap-2 glow-card">
          <Plus size={18} className="ml-3 dim shrink-0 hidden sm:block" />
          <input
            ref={quickRef}
            className="field !border-0 !bg-transparent !shadow-none !h-12 text-[15px]"
            placeholder="Paste a product link, or type a wish…"
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            aria-label="Add a wish"
          />
          <button type="submit" className="btn btn-primary !h-11 shrink-0" disabled={quickBusy}>
            {quickBusy ? <span className="spinner" /> : <Plus size={17} strokeWidth={2.6} />} Add
          </button>
        </form>
      )}
      {isOwner && (
        <p className="mt-2.5 text-[12.5px] dim">
          Shopping right now?{' '}
          <Link href="/bookmarklet" className="text-[var(--color-violet-lift)] hover:underline inline-flex items-center gap-1">
            <Bookmark size={12} /> Add straight from the store page with the bookmarklet
          </Link>
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-9 flex flex-wrap items-center gap-3 justify-between">
          <div className="segmented" role="group" aria-label="Sort">
            {([
              ['custom', isOwner ? 'My order' : 'Featured'],
              ['priceAsc', 'Price ↑'],
              ['priceDesc', 'Price ↓'],
              ['newest', 'Newest'],
            ] as [Sort, string][]).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={sort === value} onClick={() => setSort(value)}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {isOwner && sort === 'custom' && items.length > 1 && <p className="text-[12px] dim hidden lg:block">Drag to reorder. Most wanted stays on top.</p>}
            <CurrencyPicker />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-10 card p-10 sm:p-14 text-center">
          <Gift size={40} strokeWidth={1.5} className="mx-auto text-[var(--color-violet-lift)]" />
          <h2 className="display text-[26px] mt-4">{isOwner ? 'Add your first wish' : 'Nothing here yet'}</h2>
          <p className="muted mt-2 max-w-md mx-auto">
            {isOwner
              ? 'Paste a link from any store above, type what you want, or import a list you already have.'
              : 'Check back soon. Good things are on their way.'}
          </p>
          {isOwner && (
            <div className="mt-6 flex justify-center gap-2 flex-wrap">
              <button type="button" className="btn btn-ghost" onClick={() => setEditor({ mode: 'add', values: emptyValues({}, defaultCurrency) })}>
                <Plus size={16} /> Add by hand
              </button>
              <Link href={`/import?into=${list.id}`} className="btn btn-ghost">Import into this list</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sorted.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isOwner={isOwner}
              revealReservations={revealReservations}
              onOpen={() => setOpenId(item.id)}
              drag={{
                enabled: isOwner && sort === 'custom',
                isOver: overId === item.id && dragId !== item.id,
                onDragStart: () => setDragId(item.id),
                onDragOver: (e) => {
                  e.preventDefault();
                  setOverId(item.id);
                },
                onDrop: () => {
                  void dropOn(item.id);
                  setOverId(null);
                },
                onDragEnd: () => {
                  setDragId(null);
                  setOverId(null);
                },
              }}
            />
          ))}
        </div>
      )}

      {isOwner && items.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button type="button" className="btn btn-bare" onClick={() => setEditor({ mode: 'add', values: emptyValues({}, defaultCurrency) })}>
            <Plus size={16} /> Add a wish by hand
          </button>
        </div>
      )}

      <Modal open={Boolean(openItem)} onClose={() => setOpenId(null)} wide>
        {openItem && (
          <ItemDetail
            item={openItem}
            isOwner={isOwner}
            revealReservations={revealReservations}
            busy={busy}
            onEdit={() => {
              setEditor({
                mode: 'edit',
                id: openItem.id,
                values: emptyValues({
                  title: openItem.title,
                  variant: openItem.variant,
                  url: openItem.url || '',
                  imageUrl: openItem.imageUrl || '',
                  price: openItem.price !== null ? String(openItem.price) : '',
                  currency: openItem.currency || defaultCurrency,
                  quantity: openItem.quantity,
                  priority: openItem.priority,
                  note: openItem.note,
                }),
              });
              setOpenId(null);
            }}
            onToggle={(patch) => patchItem(openItem.id, patch)}
            onDelete={() => removeItem(openItem.id)}
            onReserve={(name) => reserve(openItem.id, name)}
            onUnreserve={() => unreserve(openItem.id)}
          />
        )}
      </Modal>

      <Modal open={Boolean(editor)} onClose={() => setEditor(null)} title={editor?.mode === 'edit' ? 'Edit wish' : 'Add a wish'}>
        {editor && <ItemEditor key={editor.id ?? 'new'} initial={editor.values} initialVariants={editor.variants} mode={editor.mode} onSave={saveItem} onCancel={() => setEditor(null)} />}
      </Modal>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Wishlist settings">
        {settingsOpen && <ListSettings list={list} canBePublic={canBePublic} onSave={saveSettings} onDelete={deleteList} onCancel={() => setSettingsOpen(false)} />}
      </Modal>
    </div>
  );
}
