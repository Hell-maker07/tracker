import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get('semester_id');

    const db = getDb();
    let query = 'SELECT * FROM subjects WHERE user_id = ?';
    const params = [user.id];
    if (semesterId) { query += ' AND semester_id = ?'; params.push(semesterId); }
    query += ' ORDER BY name ASC';

    const subjects = db.prepare(query).all(...params);

    const enriched = subjects.map(sub => {
      const classes = db.prepare('SELECT * FROM classes WHERE subject_id = ? ORDER BY day_of_week ASC').all(sub.id);
      const assignments = db.prepare('SELECT * FROM assignments WHERE subject_id = ? ORDER BY deadline ASC').all(sub.id);
      const exams = db.prepare('SELECT * FROM exams WHERE subject_id = ? ORDER BY date ASC').all(sub.id);
      const attendance = sub.total_classes > 0 ? Math.round((sub.attended_classes / sub.total_classes) * 100) : 0;
      return { ...sub, classes, assignments, exams, attendance_percentage: attendance };
    });

    return NextResponse.json({ subjects: enriched });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, code, semester_id, goal_id, teacher, credits, target_grade, color = '#6366f1' } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const db = getDb();
    const id = generateId();
    db.prepare('INSERT INTO subjects (id, user_id, semester_id, goal_id, name, code, teacher, credits, target_grade, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, semester_id || null, goal_id || null, name, code || null, teacher || null, credits || null, target_grade || null, color);

    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}
