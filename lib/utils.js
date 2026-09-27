import { v4 as uuidv4 } from 'uuid';

export function generateId() {
  return uuidv4();
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function now() {
  return new Date().toISOString();
}

export function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

export function getMonthBounds(date = new Date()) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function calculateGoalHealth(goal, milestones = [], tasks = []) {
  if (goal.status === 'completed') return 'completed';
  if (goal.status === 'not_started') return 'not_started';
  if (!goal.target_date) return goal.progress > 0 ? 'on_track' : 'not_started';

  const totalDays = daysBetween(goal.start_date || goal.created_at, goal.target_date);
  const elapsed = daysBetween(goal.start_date || goal.created_at, today());
  if (totalDays <= 0) return 'behind';
  
  const expectedProgress = Math.min(100, (elapsed / totalDays) * 100);
  const actualProgress = goal.progress || 0;
  const gap = expectedProgress - actualProgress;

  if (gap <= 5) return 'on_track';
  if (gap <= 20) return 'at_risk';
  return 'behind';
}

export function calculateGoalProgress(goal, milestones = [], tasks = []) {
  switch (goal.progress_method) {
    case 'milestone': {
      if (milestones.length === 0) return goal.progress || 0;
      const completed = milestones.filter(m => m.status === 'completed').length;
      return Math.round((completed / milestones.length) * 100);
    }
    case 'task': {
      if (tasks.length === 0) return goal.progress || 0;
      const completed = tasks.filter(t => t.status === 'completed').length;
      return Math.round((completed / tasks.length) * 100);
    }
    case 'quantity': {
      if (!goal.target_value) return goal.progress || 0;
      return Math.min(100, Math.round(((goal.current_value || 0) / goal.target_value) * 100));
    }
    case 'binary': {
      return goal.status === 'completed' ? 100 : 0;
    }
    case 'percentage':
    default:
      return goal.progress || 0;
  }
}

export function formatDuration(minutes) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export function getDayName(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const CATEGORIES = ['academic', 'career', 'personal', 'fitness', 'finance', 'projects', 'other'];
export const PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const TASK_STATUSES = ['not_started', 'in_progress', 'completed', 'skipped', 'cancelled'];
export const GOAL_STATUSES = ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'];
export const GOAL_TYPES = ['outcome', 'milestone', 'process', 'project'];
export const HEALTH_STATUSES = ['on_track', 'at_risk', 'behind', 'completed', 'not_started'];

export const CATEGORY_COLORS = {
  academic: '#6366f1',
  career: '#8b5cf6',
  personal: '#ec4899',
  fitness: '#10b981',
  finance: '#f59e0b',
  projects: '#3b82f6',
  other: '#64748b',
};

export const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
};

export const HEALTH_COLORS = {
  on_track: '#10b981',
  at_risk: '#f59e0b',
  behind: '#ef4444',
  completed: '#6366f1',
  not_started: '#94a3b8',
};

export const STATUS_COLORS = {
  not_started: '#94a3b8',
  in_progress: '#3b82f6',
  completed: '#10b981',
  skipped: '#f59e0b',
  cancelled: '#6b7280',
  on_hold: '#8b5cf6',
};
