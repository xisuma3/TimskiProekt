import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CalendarCheck, Eye, EyeOff, FileText, Info, Laptop, Lock, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { login, fetchEmployeeDetails } from '../services/authService';
import BrandMark from '../components/app/BrandMark';
import ThemeToggle from '../components/ThemeToggle';

// The API answers 401 for unknown email, wrong password and locked accounts alike,
// so the message stays generic on purpose — it must not reveal which one it was.
const errorMessage = (err) => {
  if (!err?.response) return 'Can’t reach the server. Check your connection and try again.';
  if (err.response.status === 401) return 'Email or password is incorrect.';
  return 'Something went wrong on our side. Please try again in a moment.';
};

const POINTS = [
  { icon: CalendarCheck, text: 'Leave requests with manager approval' },
  { icon: Laptop, text: 'Your assigned equipment at a glance' },
  { icon: FileText, text: 'Contracts and HR documents on demand' },
];

// Brand panel beside the form (md and up). Sits on the primary colour in both themes;
// the logo lives in the page header above the card, so it isn't repeated here.
const BrandPanel = () => (
  <aside className="relative isolate hidden flex-col justify-between gap-10 overflow-hidden bg-primary p-10 text-primary-foreground md:flex">
    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-radial-[at_100%_0%] from-white/25 to-transparent to-60%" />
    <div aria-hidden="true" className="absolute -bottom-28 -left-28 -z-10 size-80 rounded-full bg-white/10 blur-3xl" />
    <div className="pt-2">
      <h2 className="max-w-sm text-3xl leading-tight font-semibold tracking-tight text-balance">
        Everything about your work, in one place.
      </h2>
      <p className="mt-4 max-w-sm text-pretty text-primary-foreground/80">
        Request leave, check your balance and find your documents — no emails or spreadsheets.
      </p>
      <ul className="mt-8 space-y-3.5">
        {POINTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15" aria-hidden="true">
              <Icon className="size-4" />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
    <small className="text-xs text-primary-foreground/70">© {new Date().getFullYear()} HR Management System</small>
  </aside>
);

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
    <div className="relative isolate flex min-h-svh flex-col bg-muted/40 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-radial-[ellipse_at_top] from-primary/10 to-transparent to-70%"
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="HR Management System home"
        >
          <BrandMark />
          <span className="hidden sm:inline">HR Management</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" className="text-muted-foreground">
            <Link to="/">
              <ArrowLeft aria-hidden="true" /> Back to home
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pt-4 pb-12 sm:px-6 md:pb-16">
        <Card className="w-full max-w-sm overflow-hidden py-0 shadow-xl shadow-foreground/5 md:max-w-4xl">
          <CardContent className="grid p-0 md:grid-cols-2">
            <BrandPanel />

            <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your HR workspace.</p>

              {error && (
                <Alert variant="destructive" role="alert" id="login-error" className="mt-6 border-destructive/30 bg-destructive/5">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="mt-6">
                <FieldGroup className="gap-5">
                  <Field>
                    <FieldLabel htmlFor="login-email">Work email</FieldLabel>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="login-email"
                        className="h-10 pl-9"
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
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="login-password">Password</FieldLabel>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="login-password"
                        className="h-10 pr-11 pl-9"
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                      </Button>
                    </div>
                  </Field>

                  <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Spinner aria-hidden="true" /> Signing in…
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </FieldGroup>
              </form>

              <p className="mt-6 flex gap-2 border-t pt-5 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>Don’t have an account or forgot your password? Contact your HR administrator.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LoginPage;
