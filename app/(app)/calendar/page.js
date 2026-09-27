'use client';
import { useState, useEffect, useCallback } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'event', date: '', start_time: '', end_time: '', color: '#6366f1' });
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    try {
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = new Date(year, month + 1, 0);
      const end = endDate.toISOString().split('T')[0];

      const [evRes, taskRes] = await Promise.all([
        fetch(`/api/events?start=${start}&end=${end}`),
        fetch(`/api/tasks?status=not_started&status=in_progress`),
      ]);

      const evData = await evRes.json();
      const taskData = await taskRes.json();
      setEvents(evData.events || []);
      setTasks(taskData.tasks || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) return;
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ name: '', type: 'event', date: '', start_time: '', end_time: '', color: '#6366f1' });
    fetchData();
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setForm({ ...form, date: dateStr });
    setShowCreate(true);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const cells = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const d = new Date(year, month - 1, day);
    cells.push({ day, date: d.toISOString().split('T')[0], otherMonth: true });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ day: d, date: dt.toISOString().split('T')[0], otherMonth: false });
  }

  // Next month fill
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const dt = new Date(year, month + 1, d);
    cells.push({ day: d, date: dt.toISOString().split('T')[0], otherMonth: true });
  }

  // Map events and tasks to dates
  const dateMap = {};
  events.forEach(ev => {
    if (!dateMap[ev.date]) dateMap[ev.date] = [];
    dateMap[ev.date].push({ name: ev.name, color: ev.color, type: ev.type });
  });
  tasks.forEach(t => {
    const d = t.scheduled_date || t.due_date;
    if (d) {
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push({ name: t.name, color: '#3b82f6', type: 'task' });
    }
  });

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <h1 className="page-title">Calendar</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ ...form, date: todayStr }); setShowCreate(true); }}>+ New Event</button>
      </div>

      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>←</button>
          <h2 className="heading-5" style={{ minWidth: 180, textAlign: 'center' }}>{MONTHS[month]} {year}</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(1)}>→</button>
          <button className="btn btn-ghost btn-sm" onClick={goToday}>Today</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>
      ) : (
        <div className="calendar-grid">
          {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
          {cells.map((cell, i) => (
            <div key={i} className={`calendar-day ${cell.otherMonth ? 'other-month' : ''} ${cell.date === todayStr ? 'today' : ''}`} onClick={() => handleDayClick(cell.date)}>
              <div className="calendar-day-number">{cell.day}</div>
              {dateMap[cell.date]?.slice(0, 3).map((item, j) => (
                <div key={j} className="calendar-event" style={{ background: item.color + '20', color: item.color }}>
                  {item.name}
                </div>
              ))}
              {dateMap[cell.date]?.length > 3 && (
                <div className="text-xs text-muted" style={{ paddingLeft: 4 }}>+{dateMap[cell.date].length - 3} more</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Event</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Event name" autoFocus required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="event">Event</option><option value="meeting">Meeting</option><option value="deadline">Deadline</option><option value="personal">Personal</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Start Time</label><input className="form-input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">End Time</label><input className="form-input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Event</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
