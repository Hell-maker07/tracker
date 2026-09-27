import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateGoalProgress, calculateGoalHealth } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const milestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ? ORDER BY sort_order ASC').all(goal.id);
    const tasks = db.prepare('SELECT * FROM tasks WHERE goal_id = ? ORDER BY sort_order ASC').all(goal.id);
    const subgoals = db.prepare('SELECT * FROM goals WHERE parent_goal_id = ? ORDER BY sort_order ASC').all(goal.id);
    const dependencies = db.prepare(`
      SELECT g.* FROM goal_dependencies gd
      JOIN goals g ON g.id = gd.depends_on_id
      WHERE gd.goal_id = ?
    `).all(goal.id);
    const dependents = db.prepare(`
      SELECT g.* FROM goal_dependencies gd
      JOIN goals g ON g.id = gd.goal_id
      WHERE gd.depends_on_id = ?
    `).all(goal.id);
    const notes = db.prepare('SELECT * FROM notes WHERE goal_id = ? ORDER BY created_at DESC').all(goal.id);

    const progress = calculateGoalProgress(goal, milestones, tasks);
    const health = calculateGoalHealth({ ...goal, progress }, milestones, tasks);

    return NextResponse.json({
      goal: {
        ...goal,
        milestones,
        tasks,
        subgoals,
        dependencies,
        dependents,
        notes,
        progress,
        health,
      }
    });
  } catch (error) {
    console.error('Goal GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch goal' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!existing) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const body = await request.json();
    const fields = ['name', 'description', 'why_it_matters', 'type', 'category', 'priority', 'status', 'progress', 'progress_method', 'target_value', 'current_value', 'unit', 'start_date', 'target_date', 'sort_order', 'parent_goal_id'];

    const updates = [];
    const values = [];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (body.status === 'completed' && existing.status !== 'completed') {
      updates.push("completed_date = datetime('now')");
    }

    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    updates.push("updated_at = datetime('now')");
    values.push(id, user.id);

    db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Goal PUT error:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, user.id);
    if (result.changes === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Goal DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
