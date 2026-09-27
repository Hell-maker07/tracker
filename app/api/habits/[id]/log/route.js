import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { date, value = 1, notes } = body;

    const logDate = date || new Date().toISOString().split('T')[0];

    const db = getDb();
    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });

    // Upsert
    const existing = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(id, logDate);
    if (existing) {
      db.prepare('UPDATE habit_logs SET value = ?, notes = ? WHERE id = ?').run(value, notes || null, existing.id);
      const log = db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(existing.id);
      return NextResponse.json({ log });
    }

    const logId = generateId();
    db.prepare('INSERT INTO habit_logs (id, habit_id, user_id, date, value, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(logId, id, user.id, logDate, value, notes || null);

    const log = db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(logId);
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Habit log error:', error);
    return NextResponse.json({ error: 'Failed to log habit' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const db = getDb();
    db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ? AND date = ?').run(id, user.id, date);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete habit log' }, { status: 500 });
  }
}
