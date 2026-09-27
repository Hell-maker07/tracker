'use client';
import { useState, useEffect, useCallback } from 'react';

export default function ReviewsPage() {
  const [tab, setTab] = useState('weekly');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reflection, setReflection] = useState({ went_well: '', didnt_go_well: '', changes: '', next_focus: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) setAnalytics(await res.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveReview = async () => {
    setSaving(true);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: tab,
          period_start: weekStart.toISOString().split('T')[0],
          period_end: weekEnd.toISOString().split('T')[0],
          ...reflection,
          tasks_completed: analytics?.tasks?.week_completed || 0,
          tasks_missed: (analytics?.tasks?.week_total || 0) - (analytics?.tasks?.week_completed || 0),
          study_hours: Math.round((analytics?.study?.week_minutes || 0) / 60 * 10) / 10,
          habit_consistency: analytics?.habits?.avg_completion || 0,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>;

  const formatDuration = (min) => { const h = Math.floor(min / 60); return h > 0 ? `${h}h ${min % 60}m` : `${min}m`; };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reviews</h1>
        <p className="page-subtitle">Reflect on your progress and plan ahead</p>
      </div>

      <div className="tabs">
        {['weekly', 'monthly'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} Review
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      {analytics && (
        <div className="review-stat-grid">
          <div className="review-stat">
            <div className="review-stat-value" style={{ color: 'var(--success)' }}>{tab === 'weekly' ? analytics.tasks.week_completed : analytics.tasks.completed}</div>
            <div className="review-stat-label">Tasks Completed</div>
          </div>
          <div className="review-stat">
            <div className="review-stat-value" style={{ color: 'var(--danger-text)' }}>{tab === 'weekly' ? (analytics.tasks.week_total - analytics.tasks.week_completed) : (analytics.tasks.total - analytics.tasks.completed)}</div>
            <div className="review-stat-label">Tasks Missed</div>
          </div>
          <div className="review-stat">
            <div className="review-stat-value" style={{ color: 'var(--accent-primary)' }}>{formatDuration(tab === 'weekly' ? analytics.study.week_minutes : analytics.study.month_minutes)}</div>
            <div className="review-stat-label">Study Time</div>
          </div>
          <div className="review-stat">
            <div className="review-stat-value" style={{ color: 'var(--warning)' }}>{analytics.habits.avg_completion}%</div>
            <div className="review-stat-label">Habit Consistency</div>
          </div>
        </div>
      )}

      {/* Goal Status */}
      {analytics && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header"><h3 className="card-title">🎯 Goal Status</h3></div>
          <div className="flex items-center gap-xl">
            <div className="flex items-center gap-sm"><div className="health-dot" style={{ background: 'var(--success)' }}></div><span className="text-sm">{analytics.goals.on_track} on track</span></div>
            <div className="flex items-center gap-sm"><div className="health-dot" style={{ background: 'var(--warning)' }}></div><span className="text-sm">{analytics.goals.at_risk} at risk</span></div>
            <div className="flex items-center gap-sm"><div className="health-dot" style={{ background: 'var(--danger)' }}></div><span className="text-sm">{analytics.goals.behind} behind</span></div>
          </div>
        </div>
      )}

      {/* Planned vs Actual */}
      {analytics?.planned_vs_actual?.planned > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header"><h3 className="card-title">⏱ Planned vs Actual</h3></div>
          <div className="flex items-center gap-xl">
            <div><span className="text-sm text-secondary">Planned: </span><span className="text-sm" style={{ fontWeight: 600 }}>{formatDuration(analytics.planned_vs_actual.planned)}</span></div>
            <div><span className="text-sm text-secondary">Actual: </span><span className="text-sm" style={{ fontWeight: 600 }}>{formatDuration(analytics.planned_vs_actual.actual)}</span></div>
          </div>
        </div>
      )}

      {/* Reflection */}
      <div className="card">
        <div className="card-header"><h3 className="card-title">💭 Reflection</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          <div className="form-group">
            <label className="form-label">What went well?</label>
            <textarea className="form-textarea" rows={3} value={reflection.went_well} onChange={e => setReflection({ ...reflection, went_well: e.target.value })} placeholder="Reflect on your wins this period..." />
          </div>
          <div className="form-group">
            <label className="form-label">What didn&apos;t go well?</label>
            <textarea className="form-textarea" rows={3} value={reflection.didnt_go_well} onChange={e => setReflection({ ...reflection, didnt_go_well: e.target.value })} placeholder="What challenges did you face?" />
          </div>
          <div className="form-group">
            <label className="form-label">What should change next week?</label>
            <textarea className="form-textarea" rows={3} value={reflection.changes} onChange={e => setReflection({ ...reflection, changes: e.target.value })} placeholder="Adjustments for improvement..." />
          </div>
          <div className="form-group">
            <label className="form-label">What is the most important focus next week?</label>
            <textarea className="form-textarea" rows={2} value={reflection.next_focus} onChange={e => setReflection({ ...reflection, next_focus: e.target.value })} placeholder="Your #1 priority..." />
          </div>
          <div className="flex items-center gap-sm">
            <button className="btn btn-primary" onClick={saveReview} disabled={saving}>{saving ? <span className="spinner"></span> : 'Save Review'}</button>
            {saved && <span className="text-sm" style={{ color: 'var(--success-text)' }}>✓ Review saved</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
