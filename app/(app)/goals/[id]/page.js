'use client';
import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';

const HEALTH_LABELS = { on_track: 'On Track', at_risk: 'At Risk', behind: 'Behind', completed: 'Completed', not_started: 'Not Started' };
const HEALTH_CLASSES = { on_track: 'badge-success', at_risk: 'badge-warning', behind: 'badge-danger', completed: 'badge-primary', not_started: 'badge-default' };
const CATEGORY_COLORS = { academic: '#6366f1', career: '#8b5cf6', personal: '#ec4899', fitness: '#10b981', finance: '#f59e0b', projects: '#3b82f6', other: '#64748b' };
const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };

export default function GoalDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [msName, setMsName] = useState('');
  const [msDate, setMsDate] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const fetchGoal = useCallback(async () => {
    try {
      const res = await fetch(`/api/goals/${id}`);
      if (!res.ok) { router.push('/goals'); return; }
      const data = await res.json();
      setGoal(data.goal);
      setEditForm({ status: data.goal.status, progress: data.goal.progress, current_value: data.goal.current_value });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchGoal(); }, [fetchGoal]);

  const addMilestone = async (e) => {
    e.preventDefault();
    if (!msName.trim()) return;
    await fetch(`/api/goals/${id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: msName, target_date: msDate || undefined }),
    });
    setMsName(''); setMsDate(''); setShowAddMilestone(false);
    fetchGoal();
  };

  const toggleMilestone = async (ms) => {
    const newStatus = ms.status === 'completed' ? 'not_started' : 'completed';
    await fetch(`/api/goals/${id}/milestones`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone_id: ms.id, status: newStatus }),
    });
    fetchGoal();
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: taskName, goal_id: id, priority: taskPriority, due_date: taskDueDate || undefined, location: 'backlog' }),
    });
    setTaskName(''); setTaskDueDate(''); setShowAddTask(false);
    fetchGoal();
  };

  const toggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchGoal();
  };

  const updateGoal = async () => {
    await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditing(false);
    fetchGoal();
  };

  const deleteGoal = async () => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    router.push('/goals');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>;
  if (!goal) return null;

  const completedMs = goal.milestones?.filter(m => m.status === 'completed').length || 0;
  const totalMs = goal.milestones?.length || 0;
  const completedTasks = goal.tasks?.filter(t => t.status === 'completed').length || 0;
  const totalTasks = goal.tasks?.length || 0;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/goals')}>← Back to Goals</button>
      </div>

      {/* Goal Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-sm)' }}>
          <div style={{ width: 6, height: 32, borderRadius: 'var(--radius-full)', background: CATEGORY_COLORS[goal.category] }}></div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{goal.name}</h1>
          <span className={`badge ${HEALTH_CLASSES[goal.health]}`}>{HEALTH_LABELS[goal.health]}</span>
        </div>
        {goal.why_it_matters && <p className="page-subtitle" style={{ marginLeft: 22 }}>&quot;{goal.why_it_matters}&quot;</p>}
      </div>

      {/* Progress */}
      <div className="today-progress-card" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="today-progress-header">
          <span className="today-progress-label">Progress ({goal.progress_method})</span>
          <span className="today-progress-value">{goal.progress}%</span>
        </div>
        <div className="progress-bar progress-bar-lg">
          <div className={`progress-fill ${goal.health === 'on_track' ? 'success' : goal.health === 'at_risk' ? 'warning' : 'danger'}`} style={{ width: `${goal.progress}%` }}></div>
        </div>
        <div className="today-stats">
          <div className="today-stat"><div className="today-stat-value">{completedMs}/{totalMs}</div><div className="today-stat-label">Milestones</div></div>
          <div className="today-stat"><div className="today-stat-value">{completedTasks}/{totalTasks}</div><div className="today-stat-label">Tasks</div></div>
          <div className="today-stat"><div className="today-stat-value">{goal.target_date || '—'}</div><div className="today-stat-label">Target Date</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'milestones', 'tasks', 'settings'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Details</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {[['Type', goal.type], ['Category', goal.category], ['Priority', goal.priority], ['Status', goal.status], ['Start', goal.start_date || '—'], ['Target', goal.target_date || '—'], ['Created', goal.created_at?.split('T')[0]]].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-secondary">{label}</span>
                  <span className="text-sm" style={{ fontWeight: 500, textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Description</h3></div>
            <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>{goal.description || 'No description added.'}</p>
          </div>
        </div>
      )}

      {tab === 'milestones' && (
        <div>
          <div className="section-header">
            <h3 className="section-title">Milestones ({totalMs})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddMilestone(true)}>+ Add Milestone</button>
          </div>
          {goal.milestones?.length > 0 ? (
            <div className="card">
              <div className="task-list">
                {goal.milestones.map(ms => (
                  <div key={ms.id} className={`task-item ${ms.status === 'completed' ? 'completed' : ''}`}>
                    <div className={`task-checkbox ${ms.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleMilestone(ms)} role="checkbox" aria-checked={ms.status === 'completed'} tabIndex={0}>
                      {ms.status === 'completed' && <span style={{ fontSize: 12, color: 'white' }}>✓</span>}
                    </div>
                    <div className="task-content">
                      <div className="task-name">{ms.name}</div>
                      <div className="task-meta">
                        {ms.target_date && <span className="task-meta-item">Due: {ms.target_date}</span>}
                        <span className={`badge ${ms.status === 'completed' ? 'badge-success' : 'badge-default'}`}>{ms.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card"><div className="empty-state" style={{ padding: 'var(--space-2xl)' }}><div className="empty-state-title">No milestones yet</div><div className="empty-state-desc">Break your goal into milestones to track progress effectively.</div></div></div>
          )}

          {showAddMilestone && (
            <div className="modal-overlay" onClick={() => setShowAddMilestone(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Add Milestone</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowAddMilestone(false)}>✕</button></div>
                <form onSubmit={addMilestone}>
                  <div className="modal-body">
                    <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={msName} onChange={e => setMsName(e.target.value)} placeholder="e.g., Complete DSA fundamentals" autoFocus required /></div>
                    <div className="form-group"><label className="form-label">Target Date</label><input className="form-input" type="date" value={msDate} onChange={e => setMsDate(e.target.value)} /></div>
                  </div>
                  <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowAddMilestone(false)}>Cancel</button><button type="submit" className="btn btn-primary">Add Milestone</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          <div className="section-header">
            <h3 className="section-title">Tasks ({totalTasks})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>+ Add Task</button>
          </div>
          {goal.tasks?.length > 0 ? (
            <div className="card">
              <div className="task-list">
                {goal.tasks.map(task => (
                  <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
                    <div className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTask(task)} role="checkbox" aria-checked={task.status === 'completed'} tabIndex={0}>
                      {task.status === 'completed' && <span style={{ fontSize: 12, color: 'white' }}>✓</span>}
                    </div>
                    <div className="task-content">
                      <div className="task-name">{task.name}</div>
                      <div className="task-meta">
                        <span className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }}></span>
                        <span className="task-meta-item">{task.priority}</span>
                        {task.due_date && <span className="task-meta-item">Due: {task.due_date}</span>}
                        <span className="badge badge-default">{task.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card"><div className="empty-state" style={{ padding: 'var(--space-2xl)' }}><div className="empty-state-title">No tasks yet</div><div className="empty-state-desc">Add tasks to break this goal into actionable work.</div></div></div>
          )}

          {showAddTask && (
            <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Add Task</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowAddTask(false)}>✕</button></div>
                <form onSubmit={addTask}>
                  <div className="modal-body">
                    <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="e.g., Solve 5 binary search problems" autoFocus required /></div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={taskPriority} onChange={e => setTaskPriority(e.target.value)}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
                      <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowAddTask(false)}>Cancel</button><button type="submit" className="btn btn-primary">Add Task</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-header"><h3 className="card-title">Goal Settings</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {goal.progress_method === 'percentage' && (
              <div className="form-group">
                <label className="form-label">Manual Progress (%)</label>
                <input className="form-input" type="number" min="0" max="100" value={editForm.progress || 0} onChange={e => setEditForm({ ...editForm, progress: Number(e.target.value) })} />
              </div>
            )}
            {goal.progress_method === 'quantity' && (
              <div className="form-group">
                <label className="form-label">Current Value ({goal.unit || 'units'})</label>
                <input className="form-input" type="number" min="0" value={editForm.current_value || 0} onChange={e => setEditForm({ ...editForm, current_value: Number(e.target.value) })} />
              </div>
            )}
            <div className="flex items-center gap-sm">
              <button className="btn btn-primary" onClick={updateGoal}>Save Changes</button>
              <button className="btn btn-danger" onClick={deleteGoal}>Delete Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
