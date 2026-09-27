import getDb from '@/lib/db';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { crypto } from 'crypto';

export async function createDemoUser() {
  const db = getDb();
  const demoEmail = 'demo@studentos.com';

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(demoEmail);

  if (!user) {
    const userId = 'user_demo_123';
    const passwordHash = await hashPassword('password123');

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, avatar, onboarded)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(userId, demoEmail, passwordHash, 'Alex Student', '🎓');

    user = { id: userId, email: demoEmail, name: 'Alex Student', onboarded: 1 };

    // Seed sample semester & subjects
    const semId = 'sem_1';
    db.prepare(`
      INSERT INTO semesters (id, user_id, name, start_date, end_date, is_current, target_gpa, current_gpa)
      VALUES (?, ?, 'Fall 2026', '2026-09-01', '2026-12-20', 1, 3.8, 3.75)
    `).run(semId, userId);

    const sub1 = 'sub_cs101';
    const sub2 = 'sub_math201';
    db.prepare(`
      INSERT INTO subjects (id, user_id, semester_id, name, code, teacher, credits, target_grade, current_grade, color)
      VALUES (?, ?, ?, 'Data Structures & Algorithms', 'CS201', 'Dr. Alan Turing', 4.0, 'A', 'A-', '#6366f1')
    `).run(sub1, userId, semId);

    db.prepare(`
      INSERT INTO subjects (id, user_id, semester_id, name, code, teacher, credits, target_grade, current_grade, color)
      VALUES (?, ?, ?, 'Linear Algebra', 'MATH201', 'Prof. Emmy Noether', 3.0, 'A', 'A', '#10b981')
    `).run(sub2, userId, semId);

    // Seed Goals
    const goal1 = 'goal_1';
    db.prepare(`
      INSERT INTO goals (id, user_id, name, description, why_it_matters, category, priority, status, health, progress, start_date, target_date)
      VALUES (?, ?, 'Achieve 3.8 GPA this Semester', 'Maintain top grades in CS and Math courses', 'Unlocks research assistantship & honors distinction', 'academic', 'high', 'in_progress', 'on_track', 65, '2026-09-01', '2026-12-20')
    `).run(goal1, userId);

    const goal2 = 'goal_2';
    db.prepare(`
      INSERT INTO goals (id, user_id, name, description, why_it_matters, category, priority, status, health, progress, start_date, target_date)
      VALUES (?, ?, 'Build Portfolio Project', 'Develop Fullstack Student OS App', 'Demonstrate engineering skills for summer internships', 'career', 'high', 'in_progress', 'on_track', 80, '2026-09-01', '2026-10-15')
    `).run(goal2, userId);

    // Seed Milestones
    db.prepare(`
      INSERT INTO milestones (id, goal_id, user_id, name, status, target_date)
      VALUES ('m_1', ?, ?, 'Score >90% on CS201 Midterm', 'completed', '2026-09-20')
    `).run(goal1, userId);
    db.prepare(`
      INSERT INTO milestones (id, goal_id, user_id, name, status, target_date)
      VALUES ('m_2', ?, ?, 'Finish Linear Algebra Problem Sets 1-4', 'in_progress', '2026-10-05')
    `).run(goal1, userId);

    // Seed Tasks
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO tasks (id, user_id, goal_id, subject_id, name, category, priority, status, location, scheduled_date, estimated_minutes)
      VALUES ('t_1', ?, ?, ?, 'Review Graph Traversal Algorithms', 'academic', 'high', 'in_progress', 'today', ?, 45)
    `).run(userId, goal1, sub1, today);

    db.prepare(`
      INSERT INTO tasks (id, user_id, goal_id, subject_id, name, category, priority, status, location, scheduled_date, estimated_minutes)
      VALUES ('t_2', ?, ?, ?, 'Complete Vector Spaces Exercises', 'academic', 'medium', 'not_started', 'today', ?, 60)
    `).run(userId, goal1, sub2, today);

    db.prepare(`
      INSERT INTO tasks (id, user_id, goal_id, name, category, priority, status, location, scheduled_date, estimated_minutes)
      VALUES ('t_3', ?, ?, 'Refactor Auth System Components', 'project', 'medium', 'completed', 'today', ?, 30)
    `).run(userId, goal2, today);

    // Seed Habits
    db.prepare(`
      INSERT INTO habits (id, user_id, goal_id, name, frequency, color)
      VALUES ('h_1', ?, ?, 'Deep Study (2 Hours/day)', 'daily', '#6366f1')
    `).run(userId, goal1);
    db.prepare(`
      INSERT INTO habits (id, user_id, goal_id, name, frequency, color)
      VALUES ('h_2', ?, ?, 'Morning Review & Planning', 'daily', '#10b981')
    `).run(userId, goal1);

    // Log habit today
    db.prepare(`
      INSERT OR IGNORE INTO habit_logs (id, habit_id, user_id, date, value)
      VALUES ('hl_1', 'h_2', ?, ?, 1)
    `).run(userId, today);
  }

  const token = generateToken(user.id);
  await setAuthCookie(token);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    onboarded: user.onboarded,
  };
}
