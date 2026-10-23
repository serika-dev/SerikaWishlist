'use client';

import { useState } from 'react';
import { Globe, Link2, Lock, Trash2, Users } from 'lucide-react';
import type { Visibility, Wishlist } from '@/lib/types';

const EMOJIS = ['🎁', '🎂', '🎄', '💜', '✨', '👑', '🎮', '📚', '🧸', '🎧', '👗', '👟', '💄', '🏠', '🖥️', '📷', '🎨', '🎸', '🌸', '🍜', '✈️', '⛺', '🐱', '🌙'];

const VISIBILITY: { value: Visibility; icon: typeof Globe; label: string; help: string }[] = [
  { value: 'unlisted', icon: Link2, label: 'Link only', help: 'Anyone with the link can see it.' },
  { value: 'friends', icon: Users, label: 'Friends', help: 'Only your Serika friends, the same friends as on SerikaCord.' },
  { value: 'public', icon: Globe, label: 'Public', help: 'Anyone, and shown on your profile and SerikaCord widget.' },
  { value: 'private', icon: Lock, label: 'Private', help: 'Only you.' },
];

export interface ListSettingsValues {
  title: string;
  description: string;
  emoji: string;
  visibility: Visibility;
  showReservations: boolean;
}

export function ListSettings({
  list,
  canBePublic,
  onSave,
  onDelete,
  onCancel,
}: {
  list: Wishlist;
  canBePublic: boolean;
  onSave: (values: ListSettingsValues) => Promise<boolean>;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ListSettingsValues>({
    title: list.title,
    description: list.description,
    emoji: list.emoji,
    visibility: list.visibility,
    showReservations: list.showReservations,
  });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof ListSettingsValues>(key: K, value: ListSettingsValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    if (!(await onSave(values))) setBusy(false);
  };

  return (
    <form onSubmit={submit} className="p-5 sm:p-6 space-y-5">
      <div>
        <label className="field-label" htmlFor="list-title">Name</label>
        <input id="list-title" className="field" required maxLength={80} value={values.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div>
        <span className="field-label">Icon</span>
        <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => set('emoji', emoji)}
              aria-pressed={values.emoji === emoji}
              className={`h-10 rounded-[3px] text-[20px] border transition ${values.emoji === emoji ? 'border-[var(--color-violet)] bg-[var(--color-violet)]/15' : 'border-transparent hover:bg-white/5'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="list-description">Description</label>
        <textarea id="list-description" className="field" maxLength={1000} placeholder="Sizes, favourite colours, what not to get…" value={values.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div>
        <span className="field-label">Who can see it</span>
        <div className="grid gap-2">
          {VISIBILITY.filter((v) => (v.value !== 'public' && v.value !== 'friends') || canBePublic || values.visibility === v.value).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => set('visibility', option.value)}
              aria-pressed={values.visibility === option.value}
              className={`flex items-center gap-3 text-left px-3.5 py-3 rounded-[4px] border transition ${values.visibility === option.value ? 'border-[var(--color-violet)] bg-[var(--color-violet)]/10' : 'border-[var(--color-line-strong)] hover:border-white/25'}`}
            >
              <option.icon size={18} className={values.visibility === option.value ? 'text-[var(--color-violet-lift)]' : 'dim'} />
              <span>
                <span className="block font-bold text-[14px]">{option.label}</span>
                <span className="block text-[12.5px] dim">{option.help}</span>
              </span>
            </button>
          ))}
          {!canBePublic && <p className="field-note">Friends-only and public lists are for Serika accounts. Link-only works the same for sharing.</p>}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <button type="button" role="switch" aria-checked={values.showReservations} className="toggle mt-0.5" onClick={() => set('showReservations', !values.showReservations)} />
        <span>
          <span className="block text-[14px] font-semibold">Show spoilers</span>
          <span className="block text-[12.5px] dim">See which wishes people have reserved for you, and who. Off keeps every gift a surprise.</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--color-line)]">
        {confirmDelete ? (
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={async () => { setBusy(true); await onDelete(); }}>
            <Trash2 size={14} /> Delete list and every wish
          </button>
        ) : (
          <button type="button" className="btn btn-bare btn-sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Delete list
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn btn-bare" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>Save</button>
        </div>
      </div>
    </form>
  );
}
