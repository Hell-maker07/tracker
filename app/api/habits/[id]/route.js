import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!existing) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });

    const body = await request.json();
    const fields = ['name', 'description', 'goal_id', 'frequency', 'frequency_days', 'target_value', 'unit', 'reminder_time', 'start_date', 'end_date', 'color', 'active', 'sort_order'];

    const updates = [];
    const values = [];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    updates.push("updated_at = datetime('now')");
    values.push(id, user.id);
    db.prepare(`UPDATE habits SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
    return NextResponse.json({ habit });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
  }
}
