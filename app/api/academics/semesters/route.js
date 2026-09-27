import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

// --- SEMESTERS ---
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const semesters = db.prepare('SELECT * FROM semesters WHERE user_id = ? ORDER BY start_date DESC').all(user.id);

    const enriched = semesters.map(sem => {
      const subjects = db.prepare('SELECT * FROM subjects WHERE semester_id = ?').all(sem.id);
      const assignments = db.prepare(`SELECT a.* FROM assignments a JOIN subjects s ON a.subject_id = s.id WHERE s.semester_id = ?`).all(sem.id);
      const exams = db.prepare(`SELECT e.* FROM exams e JOIN subjects s ON e.subject_id = s.id WHERE s.semester_id = ?`).all(sem.id);
      return { ...sem, subjects, assignments_count: assignments.length, exams_count: exams.length };
    });

    return NextResponse.json({ semesters: enriched });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch semesters' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, start_date, end_date, target_gpa, is_current = false } = body;
    if (!name || !start_date || !end_date) return NextResponse.json({ error: 'Name, start and end dates required' }, { status: 400 });

    const db = getDb();
    if (is_current) db.prepare('UPDATE semesters SET is_current = 0 WHERE user_id = ?').run(user.id);

    const id = generateId();
    db.prepare('INSERT INTO semesters (id, user_id, name, start_date, end_date, is_current, target_gpa) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, name, start_date, end_date, is_current ? 1 : 0, target_gpa || null);

    const sem = db.prepare('SELECT * FROM semesters WHERE id = ?').get(id);
    return NextResponse.json({ semester: sem }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 });
  }
}
