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

    const db = getDb();
    let query = 'SELECT e.*, s.name as subject_name, s.color as subject_color FROM exams e JOIN subjects s ON e.subject_id = s.id WHERE e.user_id = ?';
    const params = [user.id];
    if (subjectId) { query += ' AND e.subject_id = ?'; params.push(subjectId); }
    query += ' ORDER BY e.date ASC';

    const exams = db.prepare(query).all(...params);

    const enriched = exams.map(exam => {
      const topics = db.prepare('SELECT * FROM exam_topics WHERE exam_id = ? ORDER BY sort_order ASC').all(exam.id);
      const completedTopics = topics.filter(t => t.completed).length;
      const prep = topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : exam.preparation_progress;
      return { ...exam, topics, preparation_progress: prep };
    });

    return NextResponse.json({ exams: enriched });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, subject_id, exam_type = 'midterm', date, start_time, end_time, location, syllabus, notes, topics = [] } = body;
    if (!name || !subject_id || !date) return NextResponse.json({ error: 'Name, subject and date required' }, { status: 400 });

    const db = getDb();
    const id = generateId();
    db.prepare('INSERT INTO exams (id, user_id, subject_id, name, exam_type, date, start_time, end_time, location, syllabus, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, subject_id, name, exam_type, date, start_time || null, end_time || null, location || null, syllabus || null, notes || null);

    // Insert topics
    for (let i = 0; i < topics.length; i++) {
      const topicId = generateId();
      db.prepare('INSERT INTO exam_topics (id, exam_id, user_id, name, sort_order) VALUES (?, ?, ?, ?, ?)')
        .run(topicId, id, user.id, topics[i], i);
    }

    const exam = db.prepare('SELECT e.*, s.name as subject_name FROM exams e JOIN subjects s ON e.subject_id = s.id WHERE e.id = ?').get(id);
    const examTopics = db.prepare('SELECT * FROM exam_topics WHERE exam_id = ? ORDER BY sort_order ASC').all(id);
    return NextResponse.json({ exam: { ...exam, topics: examTopics } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
  }
}
