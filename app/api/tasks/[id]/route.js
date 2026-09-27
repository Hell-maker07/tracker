import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const task = db.prepare('SELECT t.*, g.name as goal_name FROM tasks t LEFT JOIN goals g ON t.goal_id = g.id WHERE t.id = ? AND t.user_id = ?').get(id, user.id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const subtasks = db.prepare('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY sort_order ASC').all(id);
    return NextResponse.json({ task: { ...task, subtasks } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const body = await request.json();
    const fields = ['name', 'description', 'goal_id', 'milestone_id', 'monthly_goal_id', 'weekly_goal_id', 'subject_id', 'category', 'priority', 'status', 'location', 'due_date', 'start_date', 'start_time', 'end_time', 'scheduled_date', 'estimated_minutes', 'actual_minutes', 'tags', 'notes', 'recurrence', 'sort_order'];

    const updates = [];
    const values = [];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (body.status === 'completed' && existing.status !== 'completed') {
      updates.push("completed_at = datetime('now')");
    }
    if (body.status && body.status !== 'completed') {
      updates.push('completed_at = NULL');
    }

    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    updates.push("updated_at = datetime('now')");
    values.push(id, user.id);

    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const task = db.prepare('SELECT t.*, g.name as goal_name FROM tasks t LEFT JOIN goals g ON t.goal_id = g.id WHERE t.id = ?').get(id);
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
