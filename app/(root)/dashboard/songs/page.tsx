'use client';

import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FileMusic, Upload, Trash2, Play, Pause, Search, RefreshCw, Music } from 'lucide-react';
import Loader from '@/components/Loader';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/ui/use-toast';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';

interface Song {
  _id: string;
  title: string;
  artist: string;
  fileUrl: string;
  durationSec: number | null;
  fileSize: number | null;
  uploadedAt: string;
}

const formatDuration = (sec: number | null): string => {
  if (!sec || sec < 1) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatSize = (bytes: number | null): string => {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

const SongsPage = () => {
  const { user, isLoaded } = useUser();
  const { activeWorkspace, can } = useContext(WorkspaceContext);
  const canManage = can('songs', 'manage');
  const { toast } = useToast();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingTitle, setPendingTitle] = useState('');
  const [pendingArtist, setPendingArtist] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSongs = useCallback(async () => {
    if (!activeWorkspace?._id) {
      setSongs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/songs?workspace_id=${activeWorkspace._id}`);
      if (res.data?.success) setSongs(res.data.songs || []);
    } catch (err) {
      console.error('Failed to load songs', err);
      toast({ title: 'Could not load songs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?._id, toast]);

  useEffect(() => { if (isLoaded) fetchSongs(); }, [isLoaded, fetchSongs]);

  // Cleanup audio on unmount.
  useEffect(() => () => { try { audioRef.current?.pause(); } catch { /* ignore */ } }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPendingFile(file);
    if (!pendingTitle) {
      // Use filename (sans extension) as default title.
      const stem = file.name.replace(/\.[^/.]+$/, '');
      setPendingTitle(stem);
    }
  };

  const upload = async () => {
    if (!user?.id || !activeWorkspace?._id || !pendingFile || !pendingTitle.trim()) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', pendingFile);
      fd.append('workspace_id', activeWorkspace._id);
      fd.append('uploaderUserId', user.id);
      fd.append('title', pendingTitle.trim());
      fd.append('artist', pendingArtist.trim());
      const res = await axios.post('/api/v1/songs', fd);
      if (!res.data?.success) throw new Error(res.data?.message || 'Upload failed');
      toast({ title: '🎵 Song added', description: pendingTitle.trim() });
      setPendingFile(null);
      setPendingTitle('');
      setPendingArtist('');
      fetchSongs();
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err?.response?.data?.message || err?.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (song: Song) => {
    if (!user?.id) return;
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${song.title}"? This cannot be undone.`)) return;
    setBusyId(song._id);
    try {
      const res = await axios.delete('/api/v1/songs', {
        data: { id: song._id, callerUserId: user.id },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      setSongs((cur) => cur.filter((s) => s._id !== song._id));
      if (previewId === song._id) {
        try { audioRef.current?.pause(); } catch { /* ignore */ }
        setPreviewId(null);
      }
    } catch (err: any) {
      toast({
        title: 'Could not delete',
        description: err?.response?.data?.message || err?.message,
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const togglePreview = (song: Song) => {
    if (previewId === song._id) {
      try { audioRef.current?.pause(); } catch { /* ignore */ }
      setPreviewId(null);
      return;
    }
    try { audioRef.current?.pause(); } catch { /* ignore */ }
    const a = new Audio(song.fileUrl);
    a.volume = 0.6;
    a.play().catch((e) => toast({ title: 'Could not preview', description: e?.message, variant: 'destructive' }));
    a.addEventListener('ended', () => setPreviewId(null));
    audioRef.current = a;
    setPreviewId(song._id);
  };

  const filtered = songs.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.title.toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q);
  });

  if (!isLoaded) return <Loader />;

  return (
    <section className="flex size-full flex-col gap-6 text-white pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4 mt-24">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <Music className="text-deep-gold" size={32} />
            Song Library
          </h2>
          <p className="text-white/60 mt-2 italic text-sm">
            Upload worship songs once — pick them in any service from <strong>{activeWorkspace?.name || 'your workspace'}</strong>.
          </p>
        </div>
        <button type="button" onClick={fetchSongs} className="hero-quick-link" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* === Upload card === */}
      {canManage && (
      <div className="card-premium p-5 flex flex-col gap-3">
        <h3 className="text-deep-gold font-semibold">Add a song</h3>
        {!pendingFile ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="songs-upload-pick"
          >
            <Upload size={20} />
            <span>Pick an audio file (MP3, WAV, OGG — up to 50 MB)</span>
          </button>
        ) : (
          <div className="songs-upload-row">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={pendingTitle}
                onChange={(e) => setPendingTitle(e.target.value)}
                placeholder="Title"
                className="songs-input"
                maxLength={200}
              />
              <input
                type="text"
                value={pendingArtist}
                onChange={(e) => setPendingArtist(e.target.value)}
                placeholder="Artist (optional)"
                className="songs-input"
                maxLength={200}
              />
            </div>
            <div className="songs-upload-meta">
              <FileMusic size={16} className="text-deep-gold shrink-0" />
              <span className="truncate" title={pendingFile.name}>{pendingFile.name}</span>
              <span className="text-white/45 shrink-0">{formatSize(pendingFile.size)}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={uploading || !pendingTitle.trim()}
                onClick={upload}
                className="songs-upload-go"
              >
                {uploading ? 'Uploading…' : 'Upload to library'}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => { setPendingFile(null); setPendingTitle(''); setPendingArtist(''); }}
                className="songs-upload-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="audio/*"
          onChange={onPickFile}
        />
      </div>
      )}

      {/* === Search === */}
      <div className="songs-search">
        <Search size={16} className="text-white/45" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or artist"
          className="songs-search-input"
        />
        <span className="songs-search-count">{filtered.length} of {songs.length}</span>
      </div>

      {/* === Songs grid === */}
      {loading && songs.length === 0 ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <div className="card-premium p-10 text-center text-white/60">
          <Music size={40} className="mx-auto mb-4 text-deep-gold/60" />
          <p className="text-lg">{songs.length === 0 ? 'No songs in your library yet.' : 'No songs match your search.'}</p>
          {songs.length === 0 && <p className="text-sm mt-2">Upload your first song above to start your worship library.</p>}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const playing = previewId === s._id;
            return (
              <li key={s._id} className="card-premium p-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => togglePreview(s)}
                  className="songs-play-btn"
                  title={playing ? 'Pause preview' : 'Preview'}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold truncate" title={s.title}>{s.title}</div>
                  <div className="text-xs text-white/55 truncate">
                    {s.artist || 'Unknown artist'} · {formatDuration(s.durationSec)} · {formatSize(s.fileSize)}
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    disabled={busyId === s._id}
                    title="Delete"
                    className="songs-delete-btn"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default function SongsPageGated() {
  return (
    <PermissionGate resource="songs" action="view">
      <SongsPage />
    </PermissionGate>
  );
}
