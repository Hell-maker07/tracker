import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateId, today } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const goalId = searchParams.get('goal_id');
    const location = searchParams.get('location');
    const scheduledDate = searchParams.get('scheduled_date');
    const dueBefore = searchParams.get('due_before');

    const db = getDb();
    let query = 'SELECT t.*, g.name as goal_name, g.category as goal_category FROM tasks t LEFT JOIN goals g ON t.goal_id = g.id WHERE t.user_id = ?';
    const params = [user.id];

    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
    if (goalId) { query += ' AND t.goal_id = ?'; params.push(goalId); }
    if (location) { query += ' AND t.location = ?'; params.push(location); }
    if (scheduledDate) { query += ' AND t.scheduled_date = ?'; params.push(scheduledDate); }
    if (dueBefore) { query += ' AND t.due_date <= ?'; params.push(dueBefore); }

    query += ' AND t.parent_task_id IS NULL ORDER BY t.sort_order ASC, t.created_at DESC';

    const tasks = db.prepare(query).all(...params);

    // Attach subtasks
    const enriched = tasks.map(task => {
      const subtasks = db.prepare('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY sort_order ASC').all(task.id);
      return { ...task, subtasks };
    });

    return NextResponse.json({ tasks: enriched });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name, description, goal_id, milestone_id, monthly_goal_id, weekly_goal_id,
      parent_task_id, subject_id, category = 'general', priority = 'medium',
      due_date, start_date, start_time, end_time, scheduled_date,
      estimated_minutes, tags, notes, recurrence, location = 'backlog',
    } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const db = getDb();
    const id = generateId();

    db.prepare(`
      INSERT INTO tasks (id, user_id, goal_id, milestone_id, monthly_goal_id, weekly_goal_id, parent_task_id, subject_id, name, description, category, priority, status, location, due_date, start_date, start_time, end_time, scheduled_date, estimated_minutes, tags, notes, recurrence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user.id, goal_id || null, milestone_id || null, monthly_goal_id || null, weekly_goal_id || null, parent_task_id || null, subject_id || null, name, description || null, category, priority, location, due_date || null, start_date || null, start_time || null, end_time || null, scheduled_date || null, estimated_minutes || null, tags || null, notes || null, recurrence || null);

    const task = db.prepare('SELECT t.*, g.name as goal_name FROM tasks t LEFT JOIN goals g ON t.goal_id = g.id WHERE t.id = ?').get(id);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
