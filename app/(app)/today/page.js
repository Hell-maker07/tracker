'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

const HEALTH_LABELS = { on_track: 'On Track', at_risk: 'At Risk', behind: 'Behind', completed: 'Completed', not_started: 'Not Started' };
const HEALTH_CLASSES = { on_track: 'badge-success', at_risk: 'badge-warning', behind: 'badge-danger', completed: 'badge-primary', not_started: 'badge-default' };
const PRIORITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

export default function TodayPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('data-updated', handler);
    return () => window.removeEventListener('data-updated', handler);
  }, [fetchData]);

  const toggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed';
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const toggleHabit = async (habitId, completed) => {
    if (completed) {
      await fetch(`/api/habits/${habitId}/log`, { method: 'DELETE' });
    } else {
      await fetch(`/api/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    }
    fetchData();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>;

  if (!data) return <div className="empty-state"><div className="empty-state-title">Unable to load dashboard</div><button className="btn btn-primary" onClick={fetchData}>Retry</button></div>;

  const todayStr = new Date().toISOString().split('T')[0];
  const habitsCompleted = data.habits?.filter(h => h.today_completed).length || 0;
  const habitsTotal = data.habits?.length || 0;

  // Build schedule from classes + events + timed tasks
  const schedule = [];
  data.classes?.forEach(c => schedule.push({ time: c.start_time, end: c.end_time, name: c.subject_name, type: 'class', color: c.subject_color }));
  data.events?.forEach(e => schedule.push({ time: e.start_time, end: e.end_time, name: e.name, type: 'event', color: e.color }));
  data.tasks?.filter(t => t.start_time).forEach(t => schedule.push({ time: t.start_time, end: t.end_time, name: t.name, type: 'task', color: PRIORITY_COLORS[t.priority] }));
  schedule.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // Focus items: top 3-5 priority non-completed tasks
  const focusItems = data.tasks?.filter(t => t.status !== 'completed').slice(0, 5) || [];

  return (
    <div>
      {/* Greeting */}
      <div className="today-greeting">
        <h1>{getGreeting()}, {user?.name?.split(' ')[0]}</h1>
      </div>
      <div className="today-date">{formatDate(todayStr)}</div>

      {/* Today's Progress Card */}
      <div className="today-progress-card">
        <div className="today-progress-header">
          <span className="today-progress-label">Today&apos;s Progress</span>
          <span className="today-progress-value">{data.today?.progress || 0}%</span>
        </div>
        <div className="progress-bar progress-bar-lg">
          <div className="progress-fill" style={{ width: `${data.today?.progress || 0}%`, background: data.today?.progress >= 80 ? 'var(--success)' : data.today?.progress >= 50 ? 'var(--accent-primary)' : 'var(--warning)' }}></div>
        </div>
        <div className="today-stats">
          <div className="today-stat">
            <div className="today-stat-value">{data.today?.tasks_completed || 0}/{data.today?.tasks_total || 0}</div>
            <div className="today-stat-label">Tasks</div>
          </div>
          <div className="today-stat">
            <div className="today-stat-value">{habitsCompleted}/{habitsTotal}</div>
            <div className="today-stat-label">Habits</div>
          </div>
          <div className="today-stat">
            <div className="today-stat-value">{data.today?.study_minutes || 0}m</div>
            <div className="today-stat-label">Study Time</div>
          </div>
        </div>
      </div>

      <div className="today-grid">
        <div className="today-main">
          {/* Overdue Tasks */}
          {data.overdue_tasks?.length > 0 && (
            <div className="section">
              <div className="section-header">
                <h3 className="section-title" style={{ color: 'var(--danger-text)' }}>⚠ Overdue</h3>
                <span className="badge badge-danger">{data.overdue_tasks.length}</span>
              </div>
              <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div className="task-list">
                  {data.overdue_tasks.map(task => (
                    <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
                      <div className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTask(task.id, task.status)} role="checkbox" aria-checked={task.status === 'completed'} tabIndex={0}>
                        {task.status === 'completed' && <span style={{ fontSize: 12, color: 'white' }}>✓</span>}
                      </div>
                      <div className="task-content">
                        <div className="task-name">{task.name}</div>
                        <div className="task-meta">
                          <span className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }}></span>
                          <span className="task-meta-item">Due {task.due_date}</span>
                          {task.goal_name && <span className="task-meta-item">→ {task.goal_name}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Focus Today */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">🎯 Focus Today</h3>
            </div>
            {focusItems.length > 0 ? (
              <div className="card">
                <div className="task-list">
                  {focusItems.map((task, i) => (
                    <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
                      <div className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTask(task.id, task.status)} role="checkbox" aria-checked={task.status === 'completed'} tabIndex={0}>
                        {task.status === 'completed' && <span style={{ fontSize: 12, color: 'white' }}>✓</span>}
                      </div>
                      <div className="task-content">
                        <div className="task-name">{task.name}</div>
                        <div className="task-meta">
                          <span className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }}></span>
                          <span className="task-meta-item">{task.priority}</span>
                          {task.estimated_minutes && <span className="task-meta-item">~{task.estimated_minutes}m</span>}
                          {task.goal_name && <span className="task-meta-item">→ {task.goal_name}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                  <div className="empty-state-title">No tasks for today</div>
                  <div className="empty-state-desc">Schedule tasks for today from the Tasks page, or use Quick Add (⌘K)</div>
                </div>
              </div>
            )}
          </div>

          {/* All Today's Tasks */}
          {data.tasks?.length > focusItems.length && (
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">📋 All Tasks</h3>
                <span className="badge badge-default">{data.tasks.length}</span>
              </div>
              <div className="card">
                <div className="task-list">
                  {data.tasks.map(task => (
                    <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
                      <div className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTask(task.id, task.status)} role="checkbox" aria-checked={task.status === 'completed'} tabIndex={0}>
                        {task.status === 'completed' && <span style={{ fontSize: 12, color: 'white' }}>✓</span>}
                      </div>
                      <div className="task-content">
                        <div className="task-name">{task.name}</div>
                        <div className="task-meta">
                          <span className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }}></span>
                          {task.start_time && <span className="task-meta-item">{formatTime(task.start_time)}</span>}
                          {task.goal_name && <span className="task-meta-item">→ {task.goal_name}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          {schedule.length > 0 && (
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">📅 Schedule</h3>
              </div>
              <div className="card">
                {schedule.map((item, i) => (
                  <div key={i} className="schedule-item">
                    <span className="schedule-time">{formatTime(item.time)}</span>
                    <div className="schedule-content" style={{ borderLeftColor: item.color || 'var(--accent-primary)' }}>
                      <div>
                        <div className="schedule-content-name">{item.name}</div>
                        <div className="schedule-content-meta">{item.type} {item.end ? `• until ${formatTime(item.end)}` : ''}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="today-side">
          {/* Habits */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">🔄 Habits</h3>
              <span className="text-sm text-secondary">{habitsCompleted}/{habitsTotal}</span>
            </div>
            <div className="card">
              {data.habits?.length > 0 ? (
                data.habits.map(habit => (
                  <div key={habit.id} className="habit-item">
                    <div className={`habit-toggle ${habit.today_completed ? 'checked' : ''}`} onClick={() => toggleHabit(habit.id, habit.today_completed)} role="checkbox" aria-checked={habit.today_completed} tabIndex={0}>
                      {habit.today_completed && <span style={{ fontSize: 12, color: 'white' }}>✓</span>}
                    </div>
                    <div className="habit-info">
                      <div className="habit-name" style={{ textDecoration: habit.today_completed ? 'line-through' : 'none', color: habit.today_completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>{habit.name}</div>
                      <div className="habit-streak">
                        {habit.target_value > 1 && <span>{habit.today_value || 0}/{habit.target_value} {habit.unit}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                  <div className="empty-state-desc" style={{ marginBottom: 0 }}>No habits yet. Create habits to build consistency.</div>
                </div>
              )}
            </div>
          </div>

          {/* Goal Progress */}
          {data.goals?.length > 0 && (
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">🎯 Goals</h3>
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {data.goals.slice(0, 4).map(goal => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between gap-sm" style={{ marginBottom: 'var(--space-xs)' }}>
                      <span className="text-sm" style={{ fontWeight: 500 }}>{goal.name}</span>
                      <span className={`badge ${HEALTH_CLASSES[goal.health] || 'badge-default'}`}>
                        {HEALTH_LABELS[goal.health] || goal.health}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${goal.health === 'on_track' ? 'success' : goal.health === 'at_risk' ? 'warning' : goal.health === 'behind' ? 'danger' : ''}`} style={{ width: `${goal.progress}%` }}></div>
                    </div>
                    <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-xs)' }}>
                      <span className="text-xs text-muted">{goal.progress}%</span>
                      {goal.target_date && <span className="text-xs text-muted">Due {goal.target_date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          {data.upcoming?.length > 0 && (
            <div className="section">
              <div className="section-header">
                <h3 className="section-title">⏰ Upcoming</h3>
              </div>
              <div className="card">
                {data.upcoming.slice(0, 5).map((item, i) => (
                  <div key={i} style={{ padding: 'var(--space-sm) 0', borderBottom: i < data.upcoming.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div className="text-sm" style={{ fontWeight: 500 }}>{item.name}</div>
                    <div className="flex items-center gap-sm" style={{ marginTop: 2 }}>
                      <span className={`badge ${item.item_type === 'exam' ? 'badge-danger' : item.item_type === 'assignment' ? 'badge-warning' : 'badge-default'}`}>
                        {item.item_type}
                      </span>
                      <span className="text-xs text-muted">{item.deadline || item.date || item.due_date}</span>
                      {item.subject_name && <span className="text-xs text-muted">• {item.subject_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week Summary */}
          <div className="section">
            <div className="section-header">
              <h3 className="section-title">📊 This Week</h3>
            </div>
            <div className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
                <span className="text-sm text-secondary">Tasks completed</span>
                <span className="text-sm" style={{ fontWeight: 600 }}>{data.week?.tasks_done || 0}/{data.week?.tasks_total || 0}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${data.week?.tasks_total > 0 ? Math.round((data.week.tasks_done / data.week.tasks_total) * 100) : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
