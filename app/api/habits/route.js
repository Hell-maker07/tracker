import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const db = getDb();
    let query = 'SELECT h.*, g.name as goal_name FROM habits h LEFT JOIN goals g ON h.goal_id = g.id WHERE h.user_id = ?';
    const params = [user.id];

    if (active !== null) { query += ' AND h.active = ?'; params.push(active === 'true' ? 1 : 0); }
    query += ' ORDER BY h.sort_order ASC, h.created_at ASC';

    const habits = db.prepare(query).all(...params);

    // Enrich with streak data and today's log
    const today = new Date().toISOString().split('T')[0];
    const enriched = habits.map(habit => {
      const todayLog = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit.id, today);
      const logs = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC LIMIT 90').all(habit.id);

      // Calculate streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const dateSet = new Set(logs.map(l => l.date));

      // Current streak from today backwards
      const d = new Date(today);
      while (true) {
        const dateStr = d.toISOString().split('T')[0];
        if (dateSet.has(dateStr)) {
          currentStreak++;
          d.setDate(d.getDate() - 1);
        } else {
          // Allow checking yesterday if today is not yet logged
          if (dateStr === today) {
            d.setDate(d.getDate() - 1);
            continue;
          }
          break;
        }
      }

      // Longest streak
      const sortedDates = [...dateSet].sort();
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) { tempStreak = 1; }
        else {
          const prev = new Date(sortedDates[i - 1]);
          const curr = new Date(sortedDates[i]);
          const diff = (curr - prev) / (1000 * 60 * 60 * 24);
          tempStreak = diff === 1 ? tempStreak + 1 : 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      // Last 7 days completion
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const dd = new Date(today);
        dd.setDate(dd.getDate() - i);
        const ds = dd.toISOString().split('T')[0];
        last7.push({ date: ds, completed: dateSet.has(ds), value: logs.find(l => l.date === ds)?.value || 0 });
      }

      // Completion rate (last 30 days)
      const last30 = new Set();
      for (let i = 0; i < 30; i++) {
        const dd = new Date(today);
        dd.setDate(dd.getDate() - i);
        if (dateSet.has(dd.toISOString().split('T')[0])) last30.add(dd.toISOString().split('T')[0]);
      }
      const completionRate = Math.round((last30.size / 30) * 100);

      return {
        ...habit,
        today_completed: !!todayLog,
        today_value: todayLog?.value || 0,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        completion_rate: completionRate,
        last_7_days: last7,
      };
    });

    return NextResponse.json({ habits: enriched });
  } catch (error) {
    console.error('Habits GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, description, goal_id, frequency = 'daily', frequency_days, target_value = 1, unit = 'times', reminder_time, start_date, end_date, color = '#6366f1' } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const db = getDb();
    const id = generateId();

    db.prepare(`INSERT INTO habits (id, user_id, goal_id, name, description, frequency, frequency_days, target_value, unit, reminder_time, start_date, end_date, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, user.id, goal_id || null, name, description || null, frequency, frequency_days || null, target_value, unit, reminder_time || null, start_date || null, end_date || null, color);

    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
    return NextResponse.json({ habit }, { status: 201 });
  } catch (error) {
    console.error('Habits POST error:', error);
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}
