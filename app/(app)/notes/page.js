'use client';
import { useState, useEffect, useCallback } from 'react';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/notes${q}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    fetchNotes();
    fetch('/api/goals').then(r => r.json()).then(d => setGoals(d.goals || []));
    fetch('/api/academics/subjects').then(r => r.json()).then(d => setSubjects(d.subjects || []));
  }, [fetchNotes]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({ title: '', content: '' });
      fetchNotes();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const updateNote = async (id, data) => {
    await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchNotes();
  };

  const deleteNote = async (id) => {
    if (!confirm('Delete this note?')) return;
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (activeNoteId === id) setActiveNoteId(null);
    fetchNotes();
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 'var(--space-xl)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', flexShrink: 0, borderRight: '1px solid var(--border-subtle)', paddingRight: 'var(--space-xl)' }}>
        <div className="flex items-center justify-between">
          <h2 className="heading-3">Notes</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(true)}>+ New</button>
        </div>
        <input className="form-input" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}><div className="spinner"></div></div>
        ) : (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', paddingRight: 4, paddingBottom: 32 }}>
            {notes.map(note => (
              <div key={note.id} onClick={() => setActiveNoteId(note.id)} style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: activeNoteId === note.id ? 'var(--bg-card)' : 'transparent', border: activeNoteId === note.id ? '1px solid var(--border-subtle)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{note.title}</div>
                <div className="text-sm text-secondary truncate">{note.content || 'No content...'}</div>
                <div className="flex items-center gap-xs text-xs text-muted" style={{ marginTop: 8 }}>
                  <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                  {(note.goal_name || note.subject_name) && <span>• {note.goal_name || note.subject_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex items-center justify-between" style={{ paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-lg)' }}>
              <input value={activeNote.title} onChange={e => {
                const updated = { ...activeNote, title: e.target.value };
                setNotes(notes.map(n => n.id === activeNote.id ? updated : n));
              }} onBlur={() => updateNote(activeNote.id, { title: activeNote.title })} style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', width: '100%' }} />
              <button className="btn btn-ghost btn-sm" onClick={() => deleteNote(activeNote.id)}>🗑</button>
            </div>
            
            <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-lg)' }}>
              <select className="form-select form-select-sm" value={activeNote.goal_id || ''} onChange={e => updateNote(activeNote.id, { goal_id: e.target.value || null })}>
                <option value="">No Goal Link</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select className="form-select form-select-sm" value={activeNote.subject_id || ''} onChange={e => updateNote(activeNote.id, { subject_id: e.target.value || null })}>
                <option value="">No Subject Link</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <textarea value={activeNote.content || ''} onChange={e => {
              const updated = { ...activeNote, content: e.target.value };
              setNotes(notes.map(n => n.id === activeNote.id ? updated : n));
            }} onBlur={() => updateNote(activeNote.id, { content: activeNote.content })} placeholder="Start typing..." style={{ flex: 1, width: '100%', resize: 'none', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: 'var(--text-md)', lineHeight: 1.6, paddingBottom: 'var(--space-4xl)' }} />
          </div>
        ) : (
          <div className="empty-state" style={{ height: '100%', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            <div className="empty-state-icon">📒</div>
            <div className="empty-state-title">Select or Create a Note</div>
            <div className="empty-state-desc">Capture your thoughts, ideas, and lecture notes.</div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Note</button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Note</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Note title" autoFocus required /></div>
                <div className="form-group"><label className="form-label">Goal (Optional)</label><select className="form-select" value={form.goal_id || ''} onChange={e => setForm({ ...form, goal_id: e.target.value })}><option value="">None</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Subject (Optional)</label><select className="form-select" value={form.subject_id || ''} onChange={e => setForm({ ...form, subject_id: e.target.value })}><option value="">None</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!form.title.trim() || saving}>{saving ? <span className="spinner"></span> : 'Create Note'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
