import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const type = searchParams.get('type');

    const db = getDb();
    let query = 'SELECT * FROM events WHERE user_id = ?';
    const params = [user.id];

    if (date) { query += ' AND date = ?'; params.push(date); }
    if (start && end) { query += ' AND date >= ? AND date <= ?'; params.push(start, end); }
    if (type) { query += ' AND type = ?'; params.push(type); }

    query += ' ORDER BY date ASC, start_time ASC';
    const events = db.prepare(query).all(...params);

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, description, type = 'event', date, start_time, end_time, location, color = '#6366f1', recurrence, recurrence_end, all_day = false } = body;

    if (!name || !date) return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });

    const db = getDb();
    const id = generateId();

    db.prepare('INSERT INTO events (id, user_id, name, description, type, date, start_time, end_time, location, color, recurrence, recurrence_end, all_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, name, description || null, type, date, start_time || null, end_time || null, location || null, color, recurrence || null, recurrence_end || null, all_day ? 1 : 0);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
