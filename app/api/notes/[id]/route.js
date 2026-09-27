import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const fields = ['title', 'content', 'tags', 'goal_id', 'subject_id', 'pinned'];
    const updates = []; const values = [];
    for (const f of fields) { if (body[f] !== undefined) { updates.push(`${f} = ?`); values.push(f === 'pinned' ? (body[f] ? 1 : 0) : body[f]); } }
    if (updates.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 });
    updates.push("updated_at = datetime('now')"); values.push(id, user.id);
    db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    return NextResponse.json({ note });
  } catch (error) { return NextResponse.json({ error: 'Failed to update note' }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const db = getDb();
    db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 }); }
}
