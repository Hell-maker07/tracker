import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');
    const goalId = searchParams.get('goal_id');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const db = getDb();
    let query = 'SELECT ss.*, s.name as subject_name, g.name as goal_name FROM study_sessions ss LEFT JOIN subjects s ON ss.subject_id = s.id LEFT JOIN goals g ON ss.goal_id = g.id WHERE ss.user_id = ?';
    const params = [user.id];

    if (subjectId) { query += ' AND ss.subject_id = ?'; params.push(subjectId); }
    if (goalId) { query += ' AND ss.goal_id = ?'; params.push(goalId); }
    if (start && end) { query += ' AND ss.start_time >= ? AND ss.start_time <= ?'; params.push(start, end); }

    query += ' ORDER BY ss.start_time DESC LIMIT 100';

    const sessions = db.prepare(query).all(...params);

    // Summary stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMinutes = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ? AND date(start_time) = ?").get(user.id, todayStr).total;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekMinutes = db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE user_id = ? AND date(start_time) >= ?").get(user.id, weekStart.toISOString().split('T')[0]).total;

    return NextResponse.json({
      sessions,
      stats: { today_minutes: todayMinutes, week_minutes: weekMinutes },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch study sessions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { subject_id, goal_id, task_id, topic, duration_minutes, start_time, end_time, type = 'study', notes } = body;

    if (!duration_minutes || !start_time) return NextResponse.json({ error: 'Duration and start time required' }, { status: 400 });

    const db = getDb();
    const id = generateId();
    db.prepare('INSERT INTO study_sessions (id, user_id, subject_id, goal_id, task_id, topic, duration_minutes, start_time, end_time, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, subject_id || null, goal_id || null, task_id || null, topic || null, duration_minutes, start_time, end_time || null, type, notes || null);

    const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create study session' }, { status: 500 });
  }
}
