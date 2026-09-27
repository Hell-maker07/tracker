'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

const NAV_ITEMS = [
  { label: 'Today', href: '/today', icon: '☀️' },
  { label: 'Goals', href: '/goals', icon: '🎯' },
  { label: 'Tasks', href: '/tasks', icon: '✓' },
  { label: 'Calendar', href: '/calendar', icon: '📅' },
  { label: 'Habits', href: '/habits', icon: '🔄' },
  { label: 'Academics', href: '/academics', icon: '📚' },
  { label: 'Study', href: '/study', icon: '⏱️' },
  { label: 'Analytics', href: '/analytics', icon: '📊' },
  { label: 'Reviews', href: '/reviews', icon: '📝' },
  { label: 'Notes', href: '/notes', icon: '📒' },
];

const MOBILE_NAV = ['Today', 'Goals', 'Tasks', 'Calendar', 'More'];

export default function AppLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddType, setQuickAddType] = useState('task');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Keyboard shortcut for quick add
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickAdd(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddName.trim()) return;
    setQuickAddLoading(true);
    try {
      let url = '/api/tasks';
      let body = { name: quickAddName, location: 'backlog' };

      if (quickAddType === 'goal') {
        url = '/api/goals';
        body = { name: quickAddName, type: 'outcome' };
      } else if (quickAddType === 'habit') {
        url = '/api/habits';
        body = { name: quickAddName };
      } else if (quickAddType === 'note') {
        url = '/api/notes';
        body = { title: quickAddName };
      } else if (quickAddType === 'event') {
        url = '/api/events';
        body = { name: quickAddName, date: new Date().toISOString().split('T')[0] };
      }

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      setQuickAddName('');
      setShowQuickAdd(false);
      // Trigger re-fetch on the current page
      window.dispatchEvent(new Event('data-updated'));
    } catch (err) {
      console.error(err);
    } finally {
      setQuickAddLoading(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner spinner-lg"></div></div>;
  if (!user) return null;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">S</div>
          <span className="sidebar-brand">StudentOS</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Menu</div>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} className={`sidebar-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}>
                <span style={{ fontSize: '16px', width: 18, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={logout} role="button" tabIndex={0} aria-label="Sign out">
            <div className="sidebar-avatar">{user.name?.charAt(0)?.toUpperCase()}</div>
            <div>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-email">Sign out</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="page-container">
          {children}
        </div>
      </main>

      {/* Quick Add FAB */}
      <button className="fab" onClick={() => setShowQuickAdd(true)} aria-label="Quick add" title="Quick add (⌘K)">+</button>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="modal-overlay" onClick={() => setShowQuickAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Quick Add</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowQuickAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleQuickAdd}>
              <div className="modal-body">
                <div className="filter-bar" style={{ marginBottom: 0 }}>
                  {['task', 'goal', 'habit', 'event', 'note'].map(type => (
                    <button key={type} type="button" className={`filter-chip ${quickAddType === type ? 'active' : ''}`} onClick={() => setQuickAddType(type)}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                <input className="form-input" style={{ height: 48, fontSize: 'var(--text-md)' }} placeholder={`Add a new ${quickAddType}...`} value={quickAddName} onChange={e => setQuickAddName(e.target.value)} autoFocus />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowQuickAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!quickAddName.trim() || quickAddLoading}>
                  {quickAddLoading ? <span className="spinner"></span> : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <div className="mobile-nav">
        {NAV_ITEMS.slice(0, 4).map(item => (
          <Link key={item.href} href={item.href} className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button className={`mobile-nav-item`} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span style={{ fontSize: 18 }}>☰</span>
          <span>More</span>
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
