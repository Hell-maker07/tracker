import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goal_id');
    const subjectId = searchParams.get('subject_id');
    const search = searchParams.get('search');

    const db = getDb();
    let query = 'SELECT * FROM notes WHERE user_id = ?';
    const params = [user.id];

    if (goalId) { query += ' AND goal_id = ?'; params.push(goalId); }
    if (subjectId) { query += ' AND subject_id = ?'; params.push(subjectId); }
    if (search) { query += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY pinned DESC, updated_at DESC';
    const notes = db.prepare(query).all(...params);

    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, content, tags, goal_id, milestone_id, subject_id, task_id, assignment_id, exam_id, pinned = false } = body;

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const db = getDb();
    const id = generateId();
    db.prepare('INSERT INTO notes (id, user_id, goal_id, milestone_id, subject_id, task_id, assignment_id, exam_id, title, content, tags, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, goal_id || null, milestone_id || null, subject_id || null, task_id || null, assignment_id || null, exam_id || null, title, content || null, tags || null, pinned ? 1 : 0);

    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
