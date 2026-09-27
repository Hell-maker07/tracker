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
    const status = searchParams.get('status');

    const db = getDb();
    let query = 'SELECT a.*, s.name as subject_name, s.color as subject_color FROM assignments a JOIN subjects s ON a.subject_id = s.id WHERE a.user_id = ?';
    const params = [user.id];
    if (subjectId) { query += ' AND a.subject_id = ?'; params.push(subjectId); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    query += ' ORDER BY a.deadline ASC';

    const assignments = db.prepare(query).all(...params);
    return NextResponse.json({ assignments });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, subject_id, description, deadline, priority = 'medium', estimated_minutes, notes } = body;
    if (!name || !subject_id || !deadline) return NextResponse.json({ error: 'Name, subject and deadline required' }, { status: 400 });

    const db = getDb();
    const id = generateId();
    db.prepare('INSERT INTO assignments (id, user_id, subject_id, name, description, deadline, priority, estimated_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, subject_id, name, description || null, deadline, priority, estimated_minutes || null, notes || null);

    const assignment = db.prepare('SELECT a.*, s.name as subject_name FROM assignments a JOIN subjects s ON a.subject_id = s.id WHERE a.id = ?').get(id);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
