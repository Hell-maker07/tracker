import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getWeekBounds, getMonthBounds, calculateGoalProgress, calculateGoalHealth } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const todayStr = new Date().toISOString().split('T')[0];
    const { start: weekStart, end: weekEnd } = getWeekBounds();
    const { start: monthStart, end: monthEnd } = getMonthBounds();

    // Goal analytics
    const allGoals = db.prepare("SELECT * FROM goals WHERE user_id = ? AND parent_goal_id IS NULL").all(user.id);
    const goalStats = {
      total: allGoals.length,
      completed: allGoals.filter(g => g.status === 'completed').length,
      in_progress: allGoals.filter(g => g.status === 'in_progress').length,
      on_track: 0, at_risk: 0, behind: 0,
    };
    allGoals.forEach(goal => {
      const milestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ?').all(goal.id);
      const tasks = db.prepare('SELECT * FROM tasks WHERE goal_id = ?').all(goal.id);
      const progress = calculateGoalProgress(goal, milestones, tasks);
      const health = calculateGoalHealth({ ...goal, progress }, milestones, tasks);
      if (health === 'on_track') goalStats.on_track++;
      if (health === 'at_risk') goalStats.at_risk++;
      if (health === 'behind') goalStats.behind++;
    });

    // Task analytics
    const totalTasks = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND parent_task_id IS NULL").get(user.id).c;
    const completedTasks = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = 'completed' AND parent_task_id IS NULL").get(user.id).c;
    const weekTasks = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND scheduled_date >= ? AND scheduled_date <= ? AND parent_task_id IS NULL").get(user.id, weekStart, weekEnd).c;
    const weekCompletedTasks = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND scheduled_date >= ? AND scheduled_date <= ? AND status = 'completed' AND parent_task_id IS NULL").get(user.id, weekStart, weekEnd).c;

    // Study analytics
    const totalStudyMinutes = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ?").get(user.id).total;
    const weekStudyMinutes = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ? AND date(start_time) >= ? AND date(start_time) <= ?").get(user.id, weekStart, weekEnd).total;
    const monthStudyMinutes = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ? AND date(start_time) >= ? AND date(start_time) <= ?").get(user.id, monthStart, monthEnd).total;

    // Subject study distribution
    const subjectStudy = db.prepare(`
      SELECT s.name, s.color, COALESCE(SUM(ss.duration_minutes), 0) as minutes
      FROM subjects s LEFT JOIN study_sessions ss ON ss.subject_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id ORDER BY minutes DESC
    `).all(user.id);

    // Weekly study trend (last 7 weeks)
    const weeklyStudy = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      const ws = new Date(d);
      ws.setDate(ws.getDate() - ws.getDay() + 1);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      const minutes = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ? AND date(start_time) >= ? AND date(start_time) <= ?")
        .get(user.id, ws.toISOString().split('T')[0], we.toISOString().split('T')[0]).total;
      weeklyStudy.push({ week: ws.toISOString().split('T')[0], minutes });
    }

    // Daily task completion (last 14 days)
    const dailyCompletion = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const planned = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND scheduled_date = ? AND parent_task_id IS NULL").get(user.id, ds).c;
      const completed = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND scheduled_date = ? AND status = 'completed' AND parent_task_id IS NULL").get(user.id, ds).c;
      dailyCompletion.push({ date: ds, planned, completed });
    }

    // Habit analytics
    const allHabits = db.prepare('SELECT * FROM habits WHERE user_id = ? AND active = 1').all(user.id);
    let habitTotalCompletion = 0;
    const habitStats = allHabits.map(habit => {
      const last30 = db.prepare("SELECT COUNT(DISTINCT date) as c FROM habit_logs WHERE habit_id = ? AND date >= date('now', '-30 days')").get(habit.id).c;
      const rate = Math.round((last30 / 30) * 100);
      habitTotalCompletion += rate;
      return { name: habit.name, completion_rate: rate, color: habit.color };
    });
    const avgHabitCompletion = allHabits.length > 0 ? Math.round(habitTotalCompletion / allHabits.length) : 0;

    // Planned vs Actual
    const plannedVsActual = db.prepare(`
      SELECT COALESCE(SUM(estimated_minutes), 0) as planned, COALESCE(SUM(actual_minutes), 0) as actual
      FROM tasks WHERE user_id = ? AND status = 'completed' AND estimated_minutes IS NOT NULL AND actual_minutes IS NOT NULL
    `).get(user.id);

    return NextResponse.json({
      goals: goalStats,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        week_total: weekTasks,
        week_completed: weekCompletedTasks,
      },
      study: {
        total_minutes: totalStudyMinutes,
        week_minutes: weekStudyMinutes,
        month_minutes: monthStudyMinutes,
        subject_distribution: subjectStudy,
        weekly_trend: weeklyStudy,
      },
      habits: {
        total: allHabits.length,
        avg_completion: avgHabitCompletion,
        details: habitStats,
      },
      daily_completion: dailyCompletion,
      planned_vs_actual: plannedVsActual,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
