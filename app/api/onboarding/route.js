import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { goal_name, goal_why, monthly_objective, weekly_objective, habits = [], commitments = [] } = body;

    const db = getDb();
    const todayStr = new Date().toISOString().split('T')[0];

    // Create main goal
    if (goal_name) {
      const goalId = generateId();
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 6);

      db.prepare(`INSERT INTO goals (id, user_id, name, why_it_matters, type, category, priority, status, start_date, target_date) VALUES (?, ?, ?, ?, 'outcome', 'career', 'high', 'in_progress', ?, ?)`)
        .run(goalId, user.id, goal_name, goal_why || null, todayStr, targetDate.toISOString().split('T')[0]);

      // Monthly objective as milestone
      if (monthly_objective) {
        const msId = generateId();
        const monthEnd = new Date();
        monthEnd.setDate(1);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        db.prepare('INSERT INTO milestones (id, goal_id, user_id, name, target_date) VALUES (?, ?, ?, ?, ?)')
          .run(msId, goalId, user.id, monthly_objective, monthEnd.toISOString().split('T')[0]);
      }

      // Weekly objective as task
      if (weekly_objective) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
        const taskId = generateId();
        db.prepare(`INSERT INTO tasks (id, user_id, goal_id, name, priority, status, location, due_date) VALUES (?, ?, ?, ?, 'high', 'not_started', 'week', ?)`)
          .run(taskId, user.id, goalId, weekly_objective, weekEnd.toISOString().split('T')[0]);
      }
    }

    // Create habits
    for (const habit of habits) {
      if (habit.name) {
        const habitId = generateId();
        db.prepare('INSERT INTO habits (id, user_id, name, frequency, target_value, unit, start_date) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(habitId, user.id, habit.name, habit.frequency || 'daily', habit.target_value || 1, habit.unit || 'times', todayStr);
      }
    }

    // Mark user as onboarded
    db.prepare("UPDATE users SET onboarded = 1, updated_at = datetime('now') WHERE id = ?").run(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
