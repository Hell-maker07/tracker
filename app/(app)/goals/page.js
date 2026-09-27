'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const CATEGORIES = ['all', 'academic', 'career', 'personal', 'fitness', 'finance', 'projects', 'other'];
const CATEGORY_COLORS = { academic: '#6366f1', career: '#8b5cf6', personal: '#ec4899', fitness: '#10b981', finance: '#f59e0b', projects: '#3b82f6', other: '#64748b' };
const HEALTH_LABELS = { on_track: 'On Track', at_risk: 'At Risk', behind: 'Behind', completed: 'Completed', not_started: 'Not Started' };
const HEALTH_CLASSES = { on_track: 'badge-success', at_risk: 'badge-warning', behind: 'badge-danger', completed: 'badge-primary', not_started: 'badge-default' };

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', why_it_matters: '', type: 'outcome', category: 'career', priority: 'high', start_date: new Date().toISOString().split('T')[0], target_date: '', progress_method: 'milestone', target_value: '', unit: '' });

  const fetchGoals = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?category=${filter}` : '';
      const res = await fetch(`/api/goals${params}`);
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  useEffect(() => {
    const handler = () => fetchGoals();
    window.addEventListener('data-updated', handler);
    return () => window.removeEventListener('data-updated', handler);
  }, [fetchGoals]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, target_value: form.target_value ? Number(form.target_value) : undefined }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ name: '', description: '', why_it_matters: '', type: 'outcome', category: 'career', priority: 'high', start_date: new Date().toISOString().split('T')[0], target_date: '', progress_method: 'milestone', target_value: '', unit: '' });
        fetchGoals();
      }
    } catch (err) { console.error(err); } finally { setCreating(false); }
  };

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const atRiskCount = goals.filter(g => g.health === 'at_risk' || g.health === 'behind').length;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="page-subtitle">{activeGoals.length} active • {completedGoals.length} completed {atRiskCount > 0 && <span style={{ color: 'var(--warning-text)' }}>• {atRiskCount} need attention</span>}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Goal</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {CATEGORIES.map(cat => (
          <button key={cat} className={`filter-chip ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>
      ) : goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">No goals yet</div>
          <div className="empty-state-desc">Create your first goal to start tracking your progress toward what matters most.</div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Your First Goal</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-lg)' }}>
          {goals.map(goal => (
            <Link key={goal.id} href={`/goals/${goal.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="goal-card">
                <div className="goal-card-header">
                  <div className="flex items-center gap-md" style={{ flex: 1 }}>
                    <div className="goal-card-category" style={{ background: CATEGORY_COLORS[goal.category] || '#64748b' }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="goal-card-title truncate">{goal.name}</div>
                      {goal.why_it_matters && <div className="goal-card-desc truncate">{goal.why_it_matters}</div>}
                    </div>
                  </div>
                  <span className={`badge ${HEALTH_CLASSES[goal.health] || 'badge-default'}`}>
                    {HEALTH_LABELS[goal.health] || goal.health}
                  </span>
                </div>

                <div className="progress-bar" style={{ marginBottom: 'var(--space-sm)' }}>
                  <div className={`progress-fill ${goal.health === 'on_track' ? 'success' : goal.health === 'at_risk' ? 'warning' : goal.health === 'behind' ? 'danger' : ''}`} style={{ width: `${goal.progress}%` }}></div>
                </div>

                <div className="goal-card-footer">
                  <span className="goal-progress-text">{goal.progress}%</span>
                  <div className="flex items-center gap-sm">
                    <span className="badge badge-default">{goal.type}</span>
                    {goal.milestones?.length > 0 && (
                      <span className="text-xs text-muted">
                        {goal.milestones.filter(m => m.status === 'completed').length}/{goal.milestones.length} milestones
                      </span>
                    )}
                  </div>
                </div>
                {goal.target_date && (
                  <div className="text-xs text-muted" style={{ marginTop: 'var(--space-sm)' }}>Target: {goal.target_date}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Goal</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Goal Name *</label>
                  <input className="form-input" placeholder="What do you want to achieve?" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus required />
                </div>

                <div className="form-group">
                  <label className="form-label">Why does this matter?</label>
                  <textarea className="form-textarea" placeholder="Your motivation..." rows={2} value={form.why_it_matters} onChange={e => setForm({ ...form, why_it_matters: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="Details about this goal..." rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="outcome">Outcome Goal</option>
                      <option value="milestone">Milestone</option>
                      <option value="process">Process Goal</option>
                      <option value="project">Project</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Progress Method</label>
                    <select className="form-select" value={form.progress_method} onChange={e => setForm({ ...form, progress_method: e.target.value })}>
                      <option value="milestone">Milestone-based</option>
                      <option value="task">Task-based</option>
                      <option value="quantity">Quantity-based</option>
                      <option value="percentage">Manual Percentage</option>
                      <option value="binary">Binary (Done/Not Done)</option>
                    </select>
                  </div>
                </div>

                {form.progress_method === 'quantity' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Target Value</label>
                      <input className="form-input" type="number" min="1" placeholder="e.g., 100" value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit</label>
                      <input className="form-input" placeholder="e.g., problems, hours" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Date</label>
                    <input className="form-input" type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!form.name.trim() || creating}>
                  {creating ? <span className="spinner"></span> : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
