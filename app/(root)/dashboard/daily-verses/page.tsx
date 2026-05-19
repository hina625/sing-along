'use client';

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Save, X, Lock } from 'lucide-react';
import Loader from '@/components/Loader';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

interface VerseRow {
  _id: string;
  reference: string;
  note: string | null;
  position: number;
  addedByUserId: string;
  createdAt: string;
}

const REF_PLACEHOLDER = 'e.g. John 3:16  or  Psalm 23:1-4';

const DailyVersesPage = () => {
  const { user, isLoaded } = useUser();
  const { activeWorkspace, can } = useContext(WorkspaceContext);
  const { toast } = useToast();

  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [serverCanEdit, setServerCanEdit] = useState(false);
  // The server's canEdit covers admin checks; pair it with the role-permission
  // matrix so an admin who's revoked the manage flag for a role still sees the
  // UI hidden when impersonating that role.
  const canEdit = serverCanEdit && can('dailyVerses', 'manage');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add form
  const [newRef, setNewRef] = useState('');
  const [newNote, setNewNote] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRef, setEditRef] = useState('');
  const [editNote, setEditNote] = useState('');

  const load = useCallback(async () => {
    if (!user?.id || !activeWorkspace?._id) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/workspace/daily-verses', {
        params: { workspace_id: activeWorkspace._id, user_id: user.id },
      });
      if (res.data?.success) {
        setVerses(res.data.verses || []);
        setServerCanEdit(!!res.data.canEdit);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not load verses';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeWorkspace?._id, toast]);

  useEffect(() => {
    if (isLoaded) load();
  }, [isLoaded, load]);

  const addVerse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !activeWorkspace?._id || !newRef.trim() || saving) return;
    setSaving(true);
    try {
      const res = await axios.post('/api/v1/workspace/daily-verses', {
        workspace_id: activeWorkspace._id,
        user_id: user.id,
        reference: newRef.trim(),
        note: newNote.trim() || undefined,
      });
      if (res.data?.success) {
        setVerses((cur) => [...cur, res.data.verse]);
        setNewRef('');
        setNewNote('');
        toast({ title: 'Verse added' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not add verse';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (v: VerseRow) => {
    setEditingId(v._id);
    setEditRef(v.reference);
    setEditNote(v.note || '');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditRef('');
    setEditNote('');
  };

  const saveEdit = async () => {
    if (!editingId || !user?.id || !activeWorkspace?._id || saving) return;
    setSaving(true);
    try {
      const res = await axios.patch('/api/v1/workspace/daily-verses', {
        id: editingId,
        workspace_id: activeWorkspace._id,
        user_id: user.id,
        reference: editRef.trim(),
        note: editNote.trim(),
      });
      if (res.data?.success) {
        setVerses((cur) => cur.map((v) => (v._id === editingId ? res.data.verse : v)));
        cancelEdit();
        toast({ title: 'Verse updated' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not update verse';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeVerse = async (id: string) => {
    if (!user?.id || !activeWorkspace?._id) return;
    if (!confirm('Remove this verse from the rotation?')) return;
    try {
      const res = await axios.delete('/api/v1/workspace/daily-verses', {
        params: { id, workspace_id: activeWorkspace._id, user_id: user.id },
      });
      if (res.data?.success) {
        setVerses((cur) => cur.filter((v) => v._id !== id));
        toast({ title: 'Verse removed' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not delete verse';
      toast({ title: msg, variant: 'destructive' });
    }
  };

  const todaysIndex = useMemo(() => {
    if (verses.length === 0) return -1;
    const start = new Date(new Date().getFullYear(), 0, 0);
    const now = new Date();
    const diff = (now.getTime() - start.getTime()) +
      ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const day = Math.floor(diff / (1000 * 60 * 60 * 24));
    return day % verses.length;
  }, [verses]);

  if (!isLoaded || loading) return <Loader />;

  if (!activeWorkspace) {
    return (
      <section className="flex size-full flex-col gap-6 text-white pb-12 px-4 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold mt-6">Daily Verses</h1>
        <p className="text-white/60">Pick or create a workspace to manage its verse rotation.</p>
      </section>
    );
  }

  return (
    <section className="flex size-full flex-col gap-6 text-white pb-12 px-4 max-w-4xl mx-auto w-full">
      <div className="mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <BookOpen size={26} className="text-deep-gold" />
          Daily Verses
        </h1>
        <p className="text-white/60 text-sm mt-1">
          Manage the daily verse rotation shown on the <strong>{activeWorkspace.name}</strong> dashboard.
          {verses.length > 0 ? (
            <> Verses cycle by day-of-year — {verses.length} in rotation, ~{Math.ceil(365 / verses.length)}× per year each.</>
          ) : (
            <> No verses yet — the daily verse card stays hidden until you add one.</>
          )}
        </p>
      </div>

      {!canEdit && (
        <div className="card-premium p-4 flex items-center gap-3 text-sm">
          <Lock size={18} className="text-deep-gold shrink-0" />
          <span>
            Read-only — only the workspace owner or admins can change the rotation.
          </span>
        </div>
      )}

      {canEdit && (
        <form onSubmit={addVerse} className="card-premium p-5 flex flex-col gap-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Plus size={18} className="text-deep-gold" /> Add a verse
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newRef}
              onChange={(e) => setNewRef(e.target.value)}
              placeholder={REF_PLACEHOLDER}
              maxLength={80}
              className="flex-1 rounded-lg bg-black/20 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-deep-gold/60"
              required
            />
            <button
              type="submit"
              disabled={saving || !newRef.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold bg-gradient-to-br from-royal-purple to-deep-gold text-white disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Optional note (only visible to admins on this page)"
            maxLength={240}
            className="rounded-lg bg-black/20 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-deep-gold/60"
          />
          <p className="text-[11px] text-white/45">
            Use Bible-API format: <code className="px-1 rounded bg-white/10">Book Chapter:Verse</code> or{' '}
            <code className="px-1 rounded bg-white/10">Book Chapter:Verse-Verse</code>.
          </p>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {verses.length === 0 ? (
          <div className="card-premium p-6 text-center text-sm text-white/60">
            No custom verses yet.
            {canEdit ? ' Add one above to start your own rotation.' : ''}
          </div>
        ) : (
          verses.map((v, i) => {
            const isToday = i === todaysIndex;
            const isEditing = editingId === v._id;
            return (
              <div
                key={v._id}
                className={`card-premium p-4 flex flex-col gap-2 ${isToday ? 'ring-2 ring-deep-gold/60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center min-w-[42px] pt-1">
                    <span className="text-xs uppercase tracking-wider text-white/45">Day</span>
                    <span className="text-lg font-bold leading-none">{i + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editRef}
                          onChange={(e) => setEditRef(e.target.value)}
                          maxLength={80}
                          className="rounded-lg bg-black/20 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-deep-gold/60"
                        />
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Optional note"
                          maxLength={240}
                          className="rounded-lg bg-black/20 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-deep-gold/60"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">{v.reference}</span>
                          {isToday && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-deep-gold/20 text-deep-gold border border-deep-gold/40">
                              Today
                            </span>
                          )}
                        </div>
                        {v.note && (
                          <p className="text-xs text-white/55 mt-1 italic">{v.note}</p>
                        )}
                      </>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={saving || !editRef.trim()}
                            className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 disabled:opacity-50"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/75"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(v)}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/75"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVerse(v._id)}
                            className="p-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default function DailyVersesPageGated() {
  return (
    <PermissionGate resource="dailyVerses" action="view">
      <DailyVersesPage />
    </PermissionGate>
  );
}
