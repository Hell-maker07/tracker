'use client';
import { useState, useEffect, useCallback } from 'react';

const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };
const LOCATIONS = ['all', 'backlog', 'week', 'today'];
const STATUSES = ['all', 'not_started', 'in_progress', 'completed', 'skipped'];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', goal_id: '', priority: 'medium', due_date: '', scheduled_date: '', estimated_minutes: '', location: 'backlog', start_time: '', end_time: '' });
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      let params = [];
      if (location !== 'all') params.push(`location=${location}`);
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      const query = params.length > 0 ? `?${params.join('&')}` : '';
      const res = await fetch(`/api/tasks${query}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [location, statusFilter]);

  const fetchGoals = useCallback(async () => {
    const res = await fetch('/api/goals');
    const data = await res.json();
    setGoals(data.goals || []);
  }, []);

  useEffect(() => { fetchTasks(); fetchGoals(); }, [fetchTasks, fetchGoals]);

  useEffect(() => {
    const handler = () => fetchTasks();
    window.addEventListener('data-updated', handler);
    return () => window.removeEventListener('data-updated', handler);
  }, [fetchTasks]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : undefined, goal_id: form.goal_id || undefined }),
      });
      setShowCreate(false);
      setForm({ name: '', description: '', goal_id: '', priority: 'medium', due_date: '', scheduled_date: '', estimated_minutes: '', location: 'backlog', start_time: '', end_time: '' });
      fetchTasks();
    } catch (err) { console.error(err); } finally { setCreating(false); }
  };

  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed';
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchTasks();
  };

  const moveTask = async (taskId, newLocation) => {
    const scheduled_date = newLocation === 'today' ? new Date().toISOString().split('T')[0] : null;
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: newLocation, scheduled_date }),
    });
    fetchTasks();
  };

  const deleteTask = async (taskId) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    fetchTasks();
  };

  const handleMissedAction = async (taskId, action) => {
    if (action === 'complete') await toggleTask(taskId, 'not_started');
    else if (action === 'reschedule') await moveTask(taskId, 'today');
    else if (action === 'backlog') await moveTask(taskId, 'backlog');
    else if (action === 'skip') {
      await fetch(`/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'skipped' }) });
      fetchTasks();
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{completedTasks} of {totalTasks} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
      </div>

      {/* Location Filter */}
      <div className="filter-bar">
        {LOCATIONS.map(loc => (
          <button key={loc} className={`filter-chip ${location === loc ? 'active' : ''}`} onClick={() => setLocation(loc)}>
            {loc === 'all' ? 'All' : loc === 'week' ? 'This Week' : loc.charAt(0).toUpperCase() + loc.slice(1)}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 var(--space-sm)' }}></div>
        {STATUSES.map(s => (
          <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All Status' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✓</div>
          <div className="empty-state-title">{location === 'all' ? 'No tasks yet' : `No ${location} tasks`}</div>
          <div className="empty-state-desc">Create tasks and organize them into Backlog, Week, or Today to stay on track.</div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create a Task</button>
        </div>
      ) : (
        <div className="card">
          <div className="task-list">
            {tasks.map(task => (
              <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
                <div className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTask(task.id, task.status)} role="checkbox" aria-checked={task.status === 'completed'} tabIndex={0}>
                  {task.status === 'completed' && <span style={{ fontSize: 12, color: 'white' }}>✓</span>}
                </div>
                <div className="task-content" style={{ flex: 1 }}>
                  <div className="task-name">{task.name}</div>
                  <div className="task-meta">
                    <span className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }}></span>
                    <span className="task-meta-item">{task.priority}</span>
                    {task.due_date && <span className="task-meta-item">Due: {task.due_date}</span>}
                    {task.goal_name && <span className="task-meta-item">→ {task.goal_name}</span>}
                    {task.estimated_minutes && <span className="task-meta-item">~{task.estimated_minutes}m</span>}
                    <span className="badge badge-default">{task.location}</span>
                  </div>
                  {/* Subtasks */}
                  {task.subtasks?.length > 0 && (
                    <div style={{ marginTop: 'var(--space-sm)', paddingLeft: 'var(--space-lg)', borderLeft: '2px solid var(--border-subtle)' }}>
                      {task.subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-sm" style={{ padding: '2px 0' }}>
                          <div className={`task-checkbox ${sub.status === 'completed' ? 'checked' : ''}`} style={{ width: 16, height: 16 }} onClick={() => toggleTask(sub.id, sub.status)} role="checkbox" aria-checked={sub.status === 'completed'} tabIndex={0}>
                            {sub.status === 'completed' && <span style={{ fontSize: 9, color: 'white' }}>✓</span>}
                          </div>
                          <span className="text-sm" style={{ textDecoration: sub.status === 'completed' ? 'line-through' : 'none', color: sub.status === 'completed' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{sub.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="task-actions">
                  {task.status !== 'completed' && (
                    <>
                      {task.location !== 'today' && <button className="btn btn-ghost btn-sm" onClick={() => moveTask(task.id, 'today')} title="Move to Today">📌</button>}
                      {task.location !== 'week' && <button className="btn btn-ghost btn-sm" onClick={() => moveTask(task.id, 'week')} title="Move to Week">📅</button>}
                      {task.location !== 'backlog' && <button className="btn btn-ghost btn-sm" onClick={() => moveTask(task.id, 'backlog')} title="Move to Backlog">📥</button>}
                    </>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteTask(task.id)} title="Delete">🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Create Task</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Task Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="What needs to be done?" autoFocus required /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add details..." /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Goal</label><select className="form-select" value={form.goal_id} onChange={e => setForm({ ...form, goal_id: e.target.value })}><option value="">No goal</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Estimated Duration (min)</label><input className="form-input" type="number" min="1" value={form.estimated_minutes} onChange={e => setForm({ ...form, estimated_minutes: e.target.value })} placeholder="e.g., 60" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Location</label><select className="form-select" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}><option value="backlog">Backlog</option><option value="week">This Week</option><option value="today">Today</option></select></div>
                  <div className="form-group"><label className="form-label">Scheduled Date</label><input className="form-input" type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Time</label><input className="form-input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">End Time</label><input className="form-input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!form.name.trim() || creating}>{creating ? <span className="spinner"></span> : 'Create Task'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
