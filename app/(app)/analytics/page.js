'use client';
import { useState, useEffect, useCallback } from 'react';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) setData(await res.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>;
  if (!data) return <div className="empty-state"><div className="empty-state-title">Unable to load analytics</div></div>;

  const formatDuration = (min) => { const h = Math.floor(min / 60); const m = min % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const maxDailyTasks = Math.max(...data.daily_completion.map(d => Math.max(d.planned, d.completed)), 1);
  const maxWeeklyStudy = Math.max(...data.study.weekly_trend.map(w => w.minutes), 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Track your progress and identify patterns</p>
      </div>

      {/* Overview Stats */}
      <div className="review-stat-grid">
        <div className="review-stat">
          <div className="review-stat-value" style={{ color: 'var(--accent-primary)' }}>{data.goals.in_progress}</div>
          <div className="review-stat-label">Active Goals</div>
        </div>
        <div className="review-stat">
          <div className="review-stat-value" style={{ color: 'var(--success)' }}>{data.tasks.completion_rate}%</div>
          <div className="review-stat-label">Task Completion</div>
        </div>
        <div className="review-stat">
          <div className="review-stat-value" style={{ color: 'var(--accent-purple)' }}>{formatDuration(data.study.total_minutes)}</div>
          <div className="review-stat-label">Total Study Time</div>
        </div>
        <div className="review-stat">
          <div className="review-stat-value" style={{ color: 'var(--warning)' }}>{data.habits.avg_completion}%</div>
          <div className="review-stat-label">Habit Consistency</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
        {/* Goal Health */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🎯 Goal Health</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {[
              { label: 'On Track', value: data.goals.on_track, color: 'var(--success)' },
              { label: 'At Risk', value: data.goals.at_risk, color: 'var(--warning)' },
              { label: 'Behind', value: data.goals.behind, color: 'var(--danger)' },
              { label: 'Completed', value: data.goals.completed, color: 'var(--accent-primary)' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }}></div>
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="text-sm" style={{ fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks This Week */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">✓ Tasks This Week</h3></div>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {data.tasks.week_completed}/{data.tasks.week_total}
            </div>
            <div className="text-sm text-muted">completed this week</div>
          </div>
          <div className="progress-bar progress-bar-lg">
            <div className="progress-fill success" style={{ width: `${data.tasks.week_total > 0 ? (data.tasks.week_completed / data.tasks.week_total * 100) : 0}%` }}></div>
          </div>
        </div>

        {/* Daily Task Completion Chart */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">📊 Daily Tasks (14 days)</h3></div>
          <div className="chart-bar-group" style={{ paddingBottom: 24 }}>
            {data.daily_completion.map((day, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, height: 120, justifyContent: 'flex-end', width: '100%' }}>
                  <div style={{ width: '60%', height: `${(day.completed / maxDailyTasks) * 100}%`, background: 'var(--success)', borderRadius: '3px 3px 0 0', minHeight: day.completed > 0 ? 2 : 0 }}></div>
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{new Date(day.date).getDate()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Study Trend */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">📖 Weekly Study Hours</h3></div>
          <div className="chart-bar-group" style={{ paddingBottom: 24 }}>
            {data.study.weekly_trend.map((week, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, height: 120, justifyContent: 'flex-end', width: '100%' }}>
                  <div style={{ width: '60%', height: `${(week.minutes / maxWeeklyStudy) * 100}%`, background: 'var(--accent-primary)', borderRadius: '3px 3px 0 0', minHeight: week.minutes > 0 ? 2 : 0 }}></div>
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Habit Completion */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🔄 Habit Consistency</h3></div>
          {data.habits.details.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {data.habits.details.map((habit, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span className="text-sm">{habit.name}</span>
                    <span className="text-sm" style={{ fontWeight: 600 }}>{habit.completion_rate}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${habit.completion_rate}%`, background: habit.color || 'var(--accent-primary)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>No habits to analyze yet</div>
          )}
        </div>

        {/* Planned vs Actual */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">⏱ Planned vs Actual</h3></div>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="text-xs text-muted">Planned</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{formatDuration(data.planned_vs_actual.planned)}</div>
            </div>
            <div style={{ fontSize: 'var(--text-xl)', color: 'var(--text-muted)' }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <div className="text-xs text-muted">Actual</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: data.planned_vs_actual.actual > data.planned_vs_actual.planned ? 'var(--danger-text)' : 'var(--success-text)' }}>
                {formatDuration(data.planned_vs_actual.actual)}
              </div>
            </div>
          </div>
          {data.planned_vs_actual.planned > 0 && (
            <div className="text-sm text-secondary" style={{ textAlign: 'center' }}>
              {data.planned_vs_actual.actual > data.planned_vs_actual.planned
                ? `Tasks took ${Math.round(((data.planned_vs_actual.actual - data.planned_vs_actual.planned) / data.planned_vs_actual.planned) * 100)}% longer than planned`
                : `Tasks completed ${Math.round(((data.planned_vs_actual.planned - data.planned_vs_actual.actual) / data.planned_vs_actual.planned) * 100)}% faster than planned`}
            </div>
          )}
        </div>

        {/* Study Distribution */}
        {data.study.subject_distribution.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h3 className="card-title">📚 Study Time by Subject</h3></div>
            <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
              {data.study.subject_distribution.filter(s => s.minutes > 0).map((sub, i) => (
                <div key={i} className="flex items-center gap-md">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: sub.color }}></div>
                  <span className="text-sm">{sub.name}</span>
                  <span className="text-sm" style={{ fontWeight: 600 }}>{formatDuration(sub.minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
