'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const { login, demoLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user.onboarded) router.push('/onboarding');
      else router.push('/today');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await demoLogin();
      router.push('/today');
    } catch (err) {
      setError(err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">S</div>
          <span className="auth-logo-text">StudentOS</span>
        </div>
        <h1 className="auth-title">Welcome to StudentOS</h1>
        <p className="auth-subtitle">Sign in or explore with a demo account</p>

        {error && <div className="auth-error">{error}</div>}

        <button 
          type="button" 
          onClick={handleDemoLogin} 
          className="btn btn-primary btn-lg w-full mb-4" 
          disabled={demoLoading || loading}
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', border: 'none', fontWeight: 600 }}
        >
          {demoLoading ? <span className="spinner"></span> : '🚀 One-Click Demo Login (Explore App)'}
        </button>

        <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
          <span>─── OR SIGN IN / CREATE ACCOUNT ───</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="form-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-secondary btn-lg w-full" disabled={loading || demoLoading}>
            {loading ? <span className="spinner"></span> : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account? <Link href="/signup">Create one in 10 seconds</Link>
        </div>
      </div>
    </div>
  );
}
