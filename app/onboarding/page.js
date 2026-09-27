'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const STEPS = [
  { title: 'What is your most important goal right now?', subtitle: 'This could be academic, career, personal, or anything that matters to you.', field: 'goal_name', placeholder: 'e.g., Get a software engineering internship' },
  { title: 'Why does this goal matter to you?', subtitle: 'Understanding your "why" will keep you motivated when things get tough.', field: 'goal_why', placeholder: 'e.g., I want to gain real-world experience and build my career', optional: true },
  { title: 'What do you want to achieve this month?', subtitle: 'A concrete monthly objective that moves you toward your goal.', field: 'monthly_objective', placeholder: 'e.g., Complete DSA fundamentals', optional: true },
  { title: 'What\'s your focus for this week?', subtitle: 'Pick one important thing to accomplish this week.', field: 'weekly_objective', placeholder: 'e.g., Complete sorting algorithms + solve 15 problems', optional: true },
  { title: 'What habits will help you succeed?', subtitle: 'Add recurring behaviors that support your goals.', field: 'habits', type: 'habits' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ goal_name: '', goal_why: '', monthly_objective: '', weekly_objective: '', habits: [{ name: '', target_value: 1, unit: 'times', frequency: 'daily' }] });
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const router = useRouter();

  const current = STEPS[step];

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleFinish();
  };

  const handleBack = () => { if (step > 0) setStep(step - 1); };

  const canProceed = () => {
    if (current.optional || current.type === 'habits') return true;
    return data[current.field]?.trim().length > 0;
  };

  const addHabit = () => {
    setData({ ...data, habits: [...data.habits, { name: '', target_value: 1, unit: 'times', frequency: 'daily' }] });
  };

  const updateHabit = (idx, field, value) => {
    const habits = [...data.habits];
    habits[idx] = { ...habits[idx], [field]: value };
    setData({ ...data, habits });
  };

  const removeHabit = (idx) => {
    setData({ ...data, habits: data.habits.filter((_, i) => i !== idx) });
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          habits: data.habits.filter(h => h.name.trim()),
        }),
      });
      if (res.ok) {
        updateUser({ onboarded: 1 });
        router.push('/today');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-step-indicator">
          {STEPS.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`} />
          ))}
        </div>

        <h1 className="onboarding-title">{current.title}</h1>
        <p className="onboarding-subtitle">{current.subtitle}</p>

        {current.type === 'habits' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {data.habits.map((habit, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <input className="form-input" placeholder="e.g., Study DSA" value={habit.name} onChange={e => updateHabit(i, 'name', e.target.value)} style={{ flex: 1 }} />
                <input className="form-input" type="number" min="1" value={habit.target_value} onChange={e => updateHabit(i, 'target_value', Number(e.target.value))} style={{ width: 60 }} />
                <select className="form-select" value={habit.unit} onChange={e => updateHabit(i, 'unit', e.target.value)} style={{ width: 100 }}>
                  <option value="times">times</option>
                  <option value="hours">hours</option>
                  <option value="minutes">minutes</option>
                  <option value="pages">pages</option>
                  <option value="problems">problems</option>
                </select>
                {data.habits.length > 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => removeHabit(i)} aria-label="Remove habit">✕</button>
                )}
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addHabit} style={{ alignSelf: 'flex-start' }}>+ Add another habit</button>
          </div>
        ) : (
          <div className="form-group">
            <input className="form-input" style={{ height: 48, fontSize: 'var(--text-md)' }} placeholder={current.placeholder} value={data[current.field]} onChange={e => setData({ ...data, [current.field]: e.target.value })} autoFocus />
          </div>
        )}

        <div className="onboarding-actions">
          <button className="btn btn-ghost" onClick={handleBack} disabled={step === 0}>Back</button>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {current.optional && step < STEPS.length - 1 && (
              <button className="btn btn-ghost" onClick={handleNext}>Skip</button>
            )}
            <button className="btn btn-primary" onClick={handleNext} disabled={!canProceed() || loading}>
              {loading ? <span className="spinner"></span> : step === STEPS.length - 1 ? 'Get Started' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
