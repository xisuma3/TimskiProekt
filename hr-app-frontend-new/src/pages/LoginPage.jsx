import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { login, fetchEmployeeDetails } from '../services/authService';
import ThemeToggle from '../components/ThemeToggle';
import './LandingPage.css';
import './LoginPage.css';

// The API answers 401 for unknown email, wrong password and locked accounts alike,
// so the message stays generic on purpose — it must not reveal which one it was.
const errorMessage = (err) => {
  if (!err?.response) return 'Can’t reach the server. Check your connection and try again.';
  if (err.response.status === 401) return 'Email or password is incorrect.';
  return 'Something went wrong on our side. Please try again in a moment.';
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await login(email, password);
      localStorage.setItem('token', data.token);

      // Store login response data immediately
      const userInfo = {
        email: data.email,
        roles: data.roles,
        userId: data.userId
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));

      // Fetch employee details for the logged-in user
      if (data.userId) {
        await fetchEmployeeDetails(data.userId);
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="lp lg">
      <aside className="lg-aside">
        <Link to="/" className="lp-brand" aria-label="HR Management System home">
          <span className="lp-brand-mark"><i className="bi bi-people-fill" aria-hidden="true" /></span>
          HR Management
        </Link>
        <div>
          <h2>Everything about your work, in one place.</h2>
          <p>Request leave, check your balance and find your documents — no emails or spreadsheets.</p>
          <ul className="lg-points">
            <li><i className="bi bi-calendar2-check" aria-hidden="true" />Leave requests with manager approval</li>
            <li><i className="bi bi-laptop" aria-hidden="true" />Your assigned equipment at a glance</li>
            <li><i className="bi bi-file-earmark-text" aria-hidden="true" />Contracts and HR documents on demand</li>
          </ul>
        </div>
        <small>© {new Date().getFullYear()} HR Management System</small>
      </aside>

      <main className="lg-main">
        <div className="lg-top">
          <Link to="/" className="lp-brand" aria-label="HR Management System home">
            <span className="lp-brand-mark"><i className="bi bi-people-fill" aria-hidden="true" /></span>
            HR Management
          </Link>
          <div className="d-flex align-items-center gap-2">
            <Link to="/" className="lg-back">
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to home
          </Link>
            <ThemeToggle className="lp-btn lp-btn-ghost" />
          </div>
        </div>

        <div className="lg-card">
          <h1>Welcome back</h1>
          <p className="lg-sub">Sign in to your HR workspace.</p>

          {error && (
            <div className="lg-alert" role="alert" id="login-error">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="lg-field">
              <label htmlFor="login-email">Work email</label>
              <div className="lg-input-wrap">
                <i className="bi bi-envelope" aria-hidden="true" />
                <input
                  id="login-email"
                  className="lg-input"
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="lg-field">
              <label htmlFor="login-password">Password</label>
              <div className="lg-input-wrap">
                <i className="bi bi-lock" aria-hidden="true" />
                <input
                  id="login-password"
                  className="lg-input has-toggle"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  required
                />
                <button
                  type="button"
                  className="lg-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lg-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="lg-spinner" aria-hidden="true" /> Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="lg-help">
            <i className="bi bi-info-circle" aria-hidden="true" />
            <span>Don’t have an account or forgot your password? Contact your HR administrator.</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
