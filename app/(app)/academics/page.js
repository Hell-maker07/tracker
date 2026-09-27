'use client';
import { useState, useEffect, useCallback } from 'react';

export default function AcademicsPage() {
  const [tab, setTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState('subject');
  const [form, setForm] = useState({});
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [subRes, semRes, assRes, examRes] = await Promise.all([
        fetch('/api/academics/subjects'),
        fetch('/api/academics/semesters'),
        fetch('/api/academics/assignments'),
        fetch('/api/academics/exams'),
      ]);
      setSubjects((await subRes.json()).subjects || []);
      setSemesters((await semRes.json()).semesters || []);
      setAssignments((await assRes.json()).assignments || []);
      setExams((await examRes.json()).exams || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = (type) => {
    setCreateType(type);
    setForm({});
    setShowCreate(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      let url;
      if (createType === 'subject') url = '/api/academics/subjects';
      else if (createType === 'semester') url = '/api/academics/semesters';
      else if (createType === 'assignment') url = '/api/academics/assignments';
      else if (createType === 'exam') url = '/api/academics/exams';

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      fetchData();
    } catch (err) { console.error(err); } finally { setCreating(false); }
  };

  const updateAssignment = async (id, status) => {
    // Use a simple approach: update via task-like pattern
    const url = `/api/academics/assignments`;
    // We need a PUT endpoint, but for now toggle via re-fetch after status change
    // This is a simplified approach
    await fetch(`/api/academics/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _update: true, id, status }),
    });
    fetchData();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-5xl)' }}><div className="spinner spinner-lg"></div></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Academics</h1>
          <p className="page-subtitle">{subjects.length} subjects • {assignments.length} assignments • {exams.length} exams</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={() => openCreate('semester')}>+ Semester</button>
          <button className="btn btn-secondary" onClick={() => openCreate('subject')}>+ Subject</button>
          <button className="btn btn-primary" onClick={() => openCreate('assignment')}>+ Assignment</button>
        </div>
      </div>

      <div className="tabs">
        {['subjects', 'assignments', 'exams', 'semesters'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'subjects' && (
        subjects.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">No subjects yet</div><div className="empty-state-desc">Add your subjects to track attendance, assignments, and exams.</div><button className="btn btn-primary" onClick={() => openCreate('subject')}>Add Subject</button></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            {subjects.map(sub => (
              <div key={sub.id} className="card card-hover">
                <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: sub.color }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{sub.name}</div>
                    <div className="text-xs text-muted">{sub.code} {sub.teacher && `• ${sub.teacher}`}</div>
                  </div>
                  {sub.credits && <span className="badge badge-default">{sub.credits} cr</span>}
                </div>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className="text-sm text-secondary">Attendance</span>
                  <span className="text-sm" style={{ fontWeight: 600 }}>{sub.attendance_percentage}%</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 'var(--space-md)' }}>
                  <div className={`progress-fill ${sub.attendance_percentage >= 75 ? 'success' : sub.attendance_percentage >= 60 ? 'warning' : 'danger'}`} style={{ width: `${sub.attendance_percentage}%` }}></div>
                </div>
                <div className="flex items-center gap-lg text-xs text-muted">
                  <span>{sub.assignments?.length || 0} assignments</span>
                  <span>{sub.exams?.length || 0} exams</span>
                  <span>{sub.classes?.length || 0} classes/week</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'assignments' && (
        assignments.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No assignments</div><div className="empty-state-desc">Track your assignments and never miss a deadline.</div><button className="btn btn-primary" onClick={() => openCreate('assignment')}>Add Assignment</button></div>
        ) : (
          <div className="card">
            <div className="task-list">
              {assignments.map(a => (
                <div key={a.id} className={`task-item ${a.status === 'completed' || a.status === 'submitted' ? 'completed' : ''}`}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.subject_color, flexShrink: 0, marginTop: 6 }}></div>
                  <div className="task-content">
                    <div className="task-name">{a.name}</div>
                    <div className="task-meta">
                      <span className="task-meta-item">{a.subject_name}</span>
                      <span className="task-meta-item">Due: {a.deadline}</span>
                      <span className={`badge ${a.status === 'completed' || a.status === 'submitted' ? 'badge-success' : new Date(a.deadline) < new Date() ? 'badge-danger' : 'badge-default'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {tab === 'exams' && (
        exams.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No exams</div><div className="empty-state-desc">Add your exams and track preparation progress.</div><button className="btn btn-primary" onClick={() => openCreate('exam')}>Add Exam</button></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
            {exams.map(exam => (
              <div key={exam.id} className="card card-hover">
                <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: exam.subject_color }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{exam.name}</div>
                    <div className="text-xs text-muted">{exam.subject_name} • {exam.exam_type}</div>
                  </div>
                  <span className={`badge ${new Date(exam.date) < new Date() ? 'badge-default' : 'badge-warning'}`}>{exam.date}</span>
                </div>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className="text-sm text-secondary">Preparation</span>
                  <span className="text-sm" style={{ fontWeight: 600 }}>{exam.preparation_progress}%</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 'var(--space-md)' }}>
                  <div className={`progress-fill ${exam.preparation_progress >= 80 ? 'success' : exam.preparation_progress >= 50 ? 'warning' : 'danger'}`} style={{ width: `${exam.preparation_progress}%` }}></div>
                </div>
                {exam.topics?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {exam.topics.map(topic => (
                      <div key={topic.id} className="flex items-center gap-sm">
                        <span style={{ color: topic.completed ? 'var(--success)' : 'var(--text-muted)' }}>{topic.completed ? '✓' : '○'}</span>
                        <span className="text-sm" style={{ color: topic.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: topic.completed ? 'line-through' : 'none' }}>{topic.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'semesters' && (
        semesters.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🎓</div><div className="empty-state-title">No semesters</div><div className="empty-state-desc">Create a semester to organize your academic life.</div><button className="btn btn-primary" onClick={() => openCreate('semester')}>Create Semester</button></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            {semesters.map(sem => (
              <div key={sem.id} className="card card-hover">
                <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>{sem.name}</div>
                <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>{sem.start_date} → {sem.end_date}</div>
                <div className="flex items-center gap-lg text-sm">
                  <span>{sem.subjects?.length || 0} subjects</span>
                  {sem.target_gpa && <span>Target GPA: {sem.target_gpa}</span>}
                  {sem.is_current ? <span className="badge badge-success">Current</span> : null}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add {createType.charAt(0).toUpperCase() + createType.slice(1)}</h2><button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {createType === 'subject' && (<>
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus /></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CS201" /></div>
                    <div className="form-group"><label className="form-label">Teacher</label><input className="form-input" value={form.teacher || ''} onChange={e => setForm({ ...form, teacher: e.target.value })} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Credits</label><input className="form-input" type="number" value={form.credits || ''} onChange={e => setForm({ ...form, credits: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Target Grade</label><input className="form-input" value={form.target_grade || ''} onChange={e => setForm({ ...form, target_grade: e.target.value })} placeholder="A+" /></div>
                  </div>
                  {semesters.length > 0 && <div className="form-group"><label className="form-label">Semester</label><select className="form-select" value={form.semester_id || ''} onChange={e => setForm({ ...form, semester_id: e.target.value })}><option value="">None</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
                </>)}
                {createType === 'semester' && (<>
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Fall 2024" required autoFocus /></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Start Date *</label><input className="form-input" type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">End Date *</label><input className="form-input" type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} required /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Target GPA</label><input className="form-input" type="number" step="0.1" value={form.target_gpa || ''} onChange={e => setForm({ ...form, target_gpa: e.target.value })} /></div>
                </>)}
                {createType === 'assignment' && (<>
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus /></div>
                  <div className="form-group"><label className="form-label">Subject *</label><select className="form-select" value={form.subject_id || ''} onChange={e => setForm({ ...form, subject_id: e.target.value })} required><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Deadline *</label><input className="form-input" type="date" value={form.deadline || ''} onChange={e => setForm({ ...form, deadline: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
                  </div>
                </>)}
                {createType === 'exam' && (<>
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Midterm Exam" required autoFocus /></div>
                  <div className="form-group"><label className="form-label">Subject *</label><select className="form-select" value={form.subject_id || ''} onChange={e => setForm({ ...form, subject_id: e.target.value })} required><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.exam_type || 'midterm'} onChange={e => setForm({ ...form, exam_type: e.target.value })}><option value="quiz">Quiz</option><option value="midterm">Midterm</option><option value="final">Final</option><option value="practical">Practical</option></select></div>
                  </div>
                </>)}
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={creating}>{creating ? <span className="spinner"></span> : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
