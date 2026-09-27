import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateGoalProgress, calculateGoalHealth, getWeekBounds } from '@/lib/utils';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const todayStr = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();
    const { start: weekStart, end: weekEnd } = getWeekBounds();

    // Today's tasks
    const todayTasks = db.prepare(`
      SELECT t.*, g.name as goal_name, g.category as goal_category
      FROM tasks t LEFT JOIN goals g ON t.goal_id = g.id
      WHERE t.user_id = ? AND (t.scheduled_date = ? OR (t.due_date = ? AND t.status != 'completed'))
      AND t.parent_task_id IS NULL
      ORDER BY
        CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        t.start_time ASC NULLS LAST
    `).all(user.id, todayStr, todayStr);

    // Overdue tasks
    const overdueTasks = db.prepare(`
      SELECT t.*, g.name as goal_name FROM tasks t LEFT JOIN goals g ON t.goal_id = g.id
      WHERE t.user_id = ? AND t.due_date < ? AND t.status NOT IN ('completed', 'cancelled', 'skipped')
      AND t.parent_task_id IS NULL
      ORDER BY t.due_date ASC
    `).all(user.id, todayStr);

    // Today's classes
    const todayClasses = db.prepare(`
      SELECT c.*, s.name as subject_name, s.color as subject_color
      FROM classes c JOIN subjects s ON c.subject_id = s.id
      WHERE c.user_id = ? AND c.day_of_week = ?
      ORDER BY c.start_time ASC
    `).all(user.id, dayOfWeek);

    // Today's events
    const todayEvents = db.prepare('SELECT * FROM events WHERE user_id = ? AND date = ? ORDER BY start_time ASC').all(user.id, todayStr);

    // Active goals
    const goals = db.prepare("SELECT * FROM goals WHERE user_id = ? AND status IN ('not_started', 'in_progress') AND parent_goal_id IS NULL ORDER BY priority ASC").all(user.id);
    const enrichedGoals = goals.map(goal => {
      const milestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ?').all(goal.id);
      const tasks = db.prepare('SELECT * FROM tasks WHERE goal_id = ?').all(goal.id);
      const progress = calculateGoalProgress(goal, milestones, tasks);
      const health = calculateGoalHealth({ ...goal, progress }, milestones, tasks);
      return { ...goal, progress, health, milestones_total: milestones.length, milestones_completed: milestones.filter(m => m.status === 'completed').length };
    });

    // Habits
    const habits = db.prepare('SELECT h.*, g.name as goal_name FROM habits h LEFT JOIN goals g ON h.goal_id = g.id WHERE h.user_id = ? AND h.active = 1 ORDER BY h.sort_order ASC').all(user.id);
    const habitData = habits.map(habit => {
      const todayLog = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit.id, todayStr);
      return { ...habit, today_completed: !!todayLog, today_value: todayLog?.value || 0 };
    });

    // Upcoming deadlines (next 7 days)
    const upcomingDeadlines = [];
    const upcomingAssignments = db.prepare(`
      SELECT a.*, s.name as subject_name, 'assignment' as item_type
      FROM assignments a JOIN subjects s ON a.subject_id = s.id
      WHERE a.user_id = ? AND a.deadline >= ? AND a.deadline <= ? AND a.status != 'completed'
      ORDER BY a.deadline ASC
    `).all(user.id, todayStr, weekEnd);
    upcomingDeadlines.push(...upcomingAssignments);

    const upcomingExams = db.prepare(`
      SELECT e.*, s.name as subject_name, 'exam' as item_type
      FROM exams e JOIN subjects s ON e.subject_id = s.id
      WHERE e.user_id = ? AND e.date >= ? AND e.date <= date(?, '+14 days')
      ORDER BY e.date ASC
    `).all(user.id, todayStr, todayStr);
    upcomingDeadlines.push(...upcomingExams);

    const upcomingTaskDeadlines = db.prepare(`
      SELECT t.*, 'task' as item_type FROM tasks t
      WHERE t.user_id = ? AND t.due_date >= ? AND t.due_date <= ? AND t.status NOT IN ('completed', 'cancelled')
      ORDER BY t.due_date ASC LIMIT 10
    `).all(user.id, todayStr, weekEnd);
    upcomingDeadlines.push(...upcomingTaskDeadlines);

    // Study time today
    const studyToday = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ? AND date(start_time) = ?").get(user.id, todayStr).total;

    // Week progress
    const weekTasksTotal = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND scheduled_date >= ? AND scheduled_date <= ? AND parent_task_id IS NULL").get(user.id, weekStart, weekEnd).c;
    const weekTasksDone = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND scheduled_date >= ? AND scheduled_date <= ? AND status = 'completed' AND parent_task_id IS NULL").get(user.id, weekStart, weekEnd).c;

    // Today progress
    const todayTotal = todayTasks.length;
    const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;
    const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    return NextResponse.json({
      today: {
        date: todayStr,
        progress: todayProgress,
        tasks_total: todayTotal,
        tasks_completed: todayCompleted,
        study_minutes: studyToday,
      },
      tasks: todayTasks,
      overdue_tasks: overdueTasks,
      classes: todayClasses,
      events: todayEvents,
      goals: enrichedGoals,
      habits: habitData,
      upcoming: upcomingDeadlines.sort((a, b) => (a.deadline || a.date || '').localeCompare(b.deadline || b.date || '')),
      week: {
        start: weekStart,
        end: weekEnd,
        tasks_total: weekTasksTotal,
        tasks_done: weekTasksDone,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
