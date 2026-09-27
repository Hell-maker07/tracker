import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const milestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ? AND user_id = ? ORDER BY sort_order ASC').all(id, user.id);

    return NextResponse.json({ milestones });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: goalId } = await params;
    const body = await request.json();
    const { name, description, target_date } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const db = getDb();
    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(goalId, user.id);
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const msId = generateId();
    const count = db.prepare('SELECT COUNT(*) as c FROM milestones WHERE goal_id = ?').get(goalId).c;

    db.prepare('INSERT INTO milestones (id, goal_id, user_id, name, description, target_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(msId, goalId, user.id, name, description || null, target_date || null, count);

    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(msId);
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { milestone_id, name, description, status, target_date, sort_order } = body;

    if (!milestone_id) return NextResponse.json({ error: 'milestone_id required' }, { status: 400 });

    const db = getDb();
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (status !== undefined) {
      updates.push('status = ?'); values.push(status);
      if (status === 'completed') updates.push("completed_date = datetime('now')");
    }
    if (target_date !== undefined) { updates.push('target_date = ?'); values.push(target_date); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }

    updates.push("updated_at = datetime('now')");
    values.push(milestone_id, user.id);

    db.prepare(`UPDATE milestones SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestone_id);
    return NextResponse.json({ milestone });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestone_id');

    if (!milestoneId) return NextResponse.json({ error: 'milestone_id required' }, { status: 400 });

    const db = getDb();
    db.prepare('DELETE FROM milestones WHERE id = ? AND user_id = ?').run(milestoneId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
  }
}
