'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function StudyPage() {
  const [tab, setTab] = useState('timer');
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({ today_minutes: 0, week_minutes: 0 });
  const [subjects, setSubjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [timerMode, setTimerMode] = useState('stopwatch'); // stopwatch | pomodoro
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [pomodoroWork, setPomodoroWork] = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);
  const [pomodoroPhase, setPomodoroPhase] = useState('work'); // work | break
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [sessionSubject, setSessionSubject] = useState('');
  const [sessionGoal, setSessionGoal] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [startTime, setStartTime] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [sessRes, subRes, goalRes] = await Promise.all([
        fetch('/api/study'),
        fetch('/api/academics/subjects'),
        fetch('/api/goals'),
      ]);
      const sessData = await sessRes.json();
      setSessions(sessData.sessions || []);
      setStats(sessData.stats || { today_minutes: 0, week_minutes: 0 });
      setSubjects((await subRes.json()).subjects || []);
      setGoals((await goalRes.json()).goals || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          // Pomodoro auto-switch
          if (timerMode === 'pomodoro') {
            const limit = pomodoroPhase === 'work' ? pomodoroWork * 60 : pomodoroBreak * 60;
            if (next >= limit) {
              if (pomodoroPhase === 'work') {
                setPomodoroPhase('break');
                setPomodoroCount(c => c + 1);
              } else {
                setPomodoroPhase('work');
              }
              return 0;
            }
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timerMode, pomodoroPhase, pomodoroWork, pomodoroBreak]);

  const startTimer = () => {
    setIsRunning(true);
    if (!startTime) setStartTime(new Date().toISOString());
  };

  const pauseTimer = () => setIsRunning(false);

  const stopTimer = async () => {
    setIsRunning(false);
    const duration = Math.max(1, Math.round(elapsed / 60));

    if (duration > 0 && startTime) {
      await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration_minutes: duration,
          start_time: startTime,
          end_time: new Date().toISOString(),
          subject_id: sessionSubject || undefined,
          goal_id: sessionGoal || undefined,
          topic: sessionTopic || undefined,
          type: timerMode === 'pomodoro' ? 'pomodoro' : 'study',
        }),
      });
      fetchData();
    }

    setElapsed(0);
    setStartTime(null);
    setPomodoroPhase('work');
    setPomodoroCount(0);
  };

  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDuration = (min) => {
    if (!min) return '0m';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Study Tracker</h1>
          <p className="page-subtitle">Today: {formatDuration(stats.today_minutes)} • This week: {formatDuration(stats.week_minutes)}</p>
        </div>
      </div>

      <div className="tabs">
        {['timer', 'sessions'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'timer' && (
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          {/* Mode Toggle */}
          <div className="filter-bar" style={{ justifyContent: 'center', marginBottom: 'var(--space-2xl)' }}>
            <button className={`filter-chip ${timerMode === 'stopwatch' ? 'active' : ''}`} onClick={() => { setTimerMode('stopwatch'); setElapsed(0); }}>Stopwatch</button>
            <button className={`filter-chip ${timerMode === 'pomodoro' ? 'active' : ''}`} onClick={() => { setTimerMode('pomodoro'); setElapsed(0); }}>Pomodoro</button>
          </div>

          {/* Timer Display */}
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4xl)' }}>
            {timerMode === 'pomodoro' && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <span className={`badge ${pomodoroPhase === 'work' ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: 'var(--text-sm)', padding: '4px 16px' }}>
                  {pomodoroPhase === 'work' ? '🎯 Focus' : '☕ Break'} • Session {pomodoroCount + 1}
                </span>
              </div>
            )}

            <div className="timer-display">{formatTimer(elapsed)}</div>

            {timerMode === 'pomodoro' && (
              <div className="progress-bar" style={{ margin: 'var(--space-xl) auto', maxWidth: 300 }}>
                <div className="progress-fill" style={{
                  width: `${(elapsed / ((pomodoroPhase === 'work' ? pomodoroWork : pomodoroBreak) * 60)) * 100}%`,
                  background: pomodoroPhase === 'work' ? 'var(--accent-primary)' : 'var(--success)',
                }}></div>
              </div>
            )}

            <div className="timer-controls">
              {!isRunning ? (
                <button className="btn btn-primary btn-lg" onClick={startTimer} style={{ minWidth: 120 }}>
                  {elapsed > 0 ? '▶ Resume' : '▶ Start'}
                </button>
              ) : (
                <button className="btn btn-secondary btn-lg" onClick={pauseTimer} style={{ minWidth: 120 }}>⏸ Pause</button>
              )}
              {elapsed > 0 && (
                <button className="btn btn-success btn-lg" onClick={stopTimer} style={{ minWidth: 120 }}>⏹ Save</button>
              )}
            </div>
          </div>

          {/* Session Context */}
          <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="card-header"><h3 className="card-title">Session Details</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-select" value={sessionSubject} onChange={e => setSessionSubject(e.target.value)}>
                  <option value="">None</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Goal</label>
                <select className="form-select" value={sessionGoal} onChange={e => setSessionGoal(e.target.value)}>
                  <option value="">None</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Topic</label>
                <input className="form-input" value={sessionTopic} onChange={e => setSessionTopic(e.target.value)} placeholder="What are you studying?" />
              </div>
            </div>
          </div>

          {/* Pomodoro Settings */}
          {timerMode === 'pomodoro' && (
            <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
              <div className="card-header"><h3 className="card-title">Pomodoro Settings</h3></div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Work (min)</label>
                  <input className="form-input" type="number" min="1" max="120" value={pomodoroWork} onChange={e => setPomodoroWork(Number(e.target.value))} disabled={isRunning} />
                </div>
                <div className="form-group">
                  <label className="form-label">Break (min)</label>
                  <input className="form-input" type="number" min="1" max="60" value={pomodoroBreak} onChange={e => setPomodoroBreak(Number(e.target.value))} disabled={isRunning} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div> :
        sessions.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">⏱️</div><div className="empty-state-title">No study sessions</div><div className="empty-state-desc">Start a study session to track your learning time.</div></div>
        ) : (
          <div className="card">
            <div className="task-list">
              {sessions.map(s => (
                <div key={s.id} className="task-item">
                  <div style={{ width: 40, textAlign: 'center', fontWeight: 600, color: 'var(--accent-primary)' }}>{formatDuration(s.duration_minutes)}</div>
                  <div className="task-content">
                    <div className="task-name">{s.topic || s.subject_name || s.goal_name || 'Study session'}</div>
                    <div className="task-meta">
                      {s.subject_name && <span className="task-meta-item">{s.subject_name}</span>}
                      {s.goal_name && <span className="task-meta-item">→ {s.goal_name}</span>}
                      <span className="task-meta-item">{new Date(s.start_time).toLocaleDateString()}</span>
                      <span className="badge badge-default">{s.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
