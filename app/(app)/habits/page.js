'use client';
import { useState, useEffect, useCallback } from 'react';

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', goal_id: '', frequency: 'daily', target_value: 1, unit: 'times', color: '#6366f1' });
  const [creating, setCreating] = useState(false);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch('/api/habits?active=true');
      const data = await res.json();
      setHabits(data.habits || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchHabits();
    fetch('/api/goals').then(r => r.json()).then(d => setGoals(d.goals || []));
  }, [fetchHabits]);

  useEffect(() => {
    const handler = () => fetchHabits();
    window.addEventListener('data-updated', handler);
    return () => window.removeEventListener('data-updated', handler);
  }, [fetchHabits]);

  const toggleHabit = async (habitId, completed) => {
    if (completed) {
      await fetch(`/api/habits/${habitId}/log`, { method: 'DELETE' });
    } else {
      await fetch(`/api/habits/${habitId}/log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    }
    fetchHabits();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, goal_id: form.goal_id || undefined }) });
      setShowCreate(false);
      setForm({ name: '', description: '', goal_id: '', frequency: 'daily', target_value: 1, unit: 'times', color: '#6366f1' });
      fetchHabits();
    } catch (err) { console.error(err); } finally { setCreating(false); }
  };

  const deleteHabit = async (id) => {
    if (!confirm('Delete this habit?')) return;
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
    fetchHabits();
  };

  const totalHabits = habits.length;
  const completedToday = habits.filter(h => h.today_completed).length;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Habits</h1>
          <p className="page-subtitle">{completedToday} of {totalHabits} completed today</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Habit</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>
      ) : habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔄</div>
          <div className="empty-state-title">No habits yet</div>
          <div className="empty-state-desc">Build consistency with daily habits. Link them to your goals for measurable progress.</div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Your First Habit</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-lg)' }}>
          {habits.map(habit => (
            <div key={habit.id} className="card card-hover">
              <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-md)' }}>
                <div className={`habit-toggle ${habit.today_completed ? 'checked' : ''}`} onClick={() => toggleHabit(habit.id, habit.today_completed)} role="checkbox" aria-checked={habit.today_completed} tabIndex={0} style={{ width: 28, height: 28 }}>
                  {habit.today_completed && <span style={{ fontSize: 14, color: 'white' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{habit.name}</div>
                  <div className="text-xs text-muted">{habit.target_value} {habit.unit} • {habit.frequency}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteHabit(habit.id)} title="Delete">🗑</button>
              </div>

              {/* Last 7 days */}
              <div className="habit-week" style={{ marginBottom: 'var(--space-md)', justifyContent: 'space-between' }}>
                {habit.last_7_days?.map((day, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div className={`habit-day-dot ${day.completed ? 'filled' : ''}`} style={{ width: 12, height: 12 }}></div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{new Date(day.date).toLocaleDateString('en', { weekday: 'narrow' })}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-lg">
                  <div>
                    <div className="text-xs text-muted">Streak</div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{habit.current_streak}🔥</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Best</div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{habit.longest_streak}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Rate</div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{habit.completion_rate}%</div>
                  </div>
                </div>
                {habit.goal_name && <span className="badge badge-primary">→ {habit.goal_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Habit Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Create Habit</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Habit Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Study DSA" autoFocus required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Target</label><input className="form-input" type="number" min="1" value={form.target_value} onChange={e => setForm({ ...form, target_value: Number(e.target.value) })} /></div>
                  <div className="form-group"><label className="form-label">Unit</label><select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="times">times</option><option value="hours">hours</option><option value="minutes">minutes</option><option value="pages">pages</option><option value="problems">problems</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Frequency</label><select className="form-select" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option><option value="weekly">Weekly</option></select></div>
                  <div className="form-group"><label className="form-label">Goal</label><select className="form-select" value={form.goal_id} onChange={e => setForm({ ...form, goal_id: e.target.value })}><option value="">No goal</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!form.name.trim() || creating}>{creating ? <span className="spinner"></span> : 'Create Habit'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
