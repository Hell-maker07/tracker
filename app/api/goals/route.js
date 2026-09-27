import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId, calculateGoalProgress, calculateGoalHealth } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const parentId = searchParams.get('parent_id');

    const db = getDb();
    let query = 'SELECT * FROM goals WHERE user_id = ?';
    const params = [user.id];

    if (category) { query += ' AND category = ?'; params.push(category); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (type) { query += ' AND type = ?'; params.push(type); }
    if (parentId) { query += ' AND parent_goal_id = ?'; params.push(parentId); }
    else { query += ' AND parent_goal_id IS NULL'; }

    query += ' ORDER BY sort_order ASC, created_at DESC';

    const goals = db.prepare(query).all(...params);

    // Enrich with milestones, progress, and health
    const enriched = goals.map(goal => {
      const milestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ? ORDER BY sort_order ASC').all(goal.id);
      const tasks = db.prepare('SELECT * FROM tasks WHERE goal_id = ?').all(goal.id);
      const subgoals = db.prepare('SELECT * FROM goals WHERE parent_goal_id = ?').all(goal.id);
      const progress = calculateGoalProgress(goal, milestones, tasks);
      const health = calculateGoalHealth({ ...goal, progress }, milestones, tasks);

      return {
        ...goal,
        milestones,
        tasks_count: tasks.length,
        tasks_completed: tasks.filter(t => t.status === 'completed').length,
        subgoals_count: subgoals.length,
        progress,
        health,
      };
    });

    return NextResponse.json({ goals: enriched });
  } catch (error) {
    console.error('Goals GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name, description, why_it_matters, type = 'outcome', category = 'other',
      priority = 'medium', start_date, target_date, parent_goal_id,
      progress_method = 'milestone', target_value, unit,
    } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const db = getDb();
    const id = generateId();

    db.prepare(`
      INSERT INTO goals (id, user_id, parent_goal_id, name, description, why_it_matters, type, category, priority, status, progress_method, target_value, unit, start_date, target_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?, ?, ?, ?, ?)
    `).run(id, user.id, parent_goal_id || null, name, description || null, why_it_matters || null, type, category, priority, progress_method, target_value || null, unit || null, start_date || null, target_date || null);

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Goals POST error:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
