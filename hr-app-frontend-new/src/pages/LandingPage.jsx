import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CircleCheck,
  FileText,
  Info,
  Laptop,
  PieChart,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import IconTile from '../components/app/IconTile';
import StatusBadge from '../components/app/StatusBadge';
import BrandMark from '../components/app/BrandMark';
import ThemeToggle from '../components/ThemeToggle';

const FEATURES = [
  {
    icon: Users,
    tone: 'indigo',
    title: 'Employee records',
    text: 'One profile per person — department, manager, mentor and a private dossier, with soft delete so history is never lost.',
  },
  {
    icon: CalendarCheck,
    tone: 'green',
    title: 'Leave with real approvals',
    text: 'Requests route to the employee’s manager. Overlaps are blocked and every decision is recorded with who, when and why.',
  },
  {
    icon: PieChart,
    tone: 'sky',
    title: 'Live leave balances',
    text: 'Yearly allowances per leave type. Remaining days are calculated from requests, so balances never drift.',
  },
  {
    icon: Laptop,
    tone: 'amber',
    title: 'Asset custody',
    text: 'Assign, transfer and return equipment with a full chain of custody — always know who held what, and when.',
  },
  {
    icon: FileText,
    tone: 'violet',
    title: 'Document generation',
    text: 'Templates with placeholders turn into contracts and handover forms, filled from live employee and asset data.',
  },
  {
    icon: ShieldAlert,
    tone: 'indigo',
    title: 'Role-based access',
    text: 'Admins manage the organisation; employees see only their own data. Access is enforced by the server, not the screen.',
  },
];

const ROLES = [
  {
    tag: 'Employees',
    title: 'Self-service, in one place',
    items: ['Request leave and track its status', 'See your remaining balance', 'View your assets and documents'],
  },
  {
    tag: 'Managers',
    title: 'Decide for your team',
    items: ['See your reports’ pending requests', 'Approve or reject with a reason', 'Balances checked before you decide'],
  },
  {
    tag: 'HR admins',
    title: 'Run the organisation',
    items: ['Manage people and departments', 'Set yearly leave allowances', 'Generate documents from templates'],
  },
];

const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

const PreviewBalance = ({ value, label, className }) => (
  <div className={`rounded-lg p-3 ${className}`}>
    <strong className="block text-2xl leading-tight font-semibold tabular-nums">{value}</strong>
    <small className="text-xs text-muted-foreground">{label}</small>
  </div>
);

const PreviewRequest = ({ initials, title, detail, status }) => (
  <div className="flex items-center gap-3 rounded-lg border bg-background/60 p-3">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </span>
    <div className="min-w-0 flex-1 text-sm">
      <b className="block font-medium">{title}</b>
      <span className="text-muted-foreground">{detail}</span>
    </div>
    <StatusBadge status={status} />
  </div>
);

// Static illustration of the leave screen. Decorative — hidden from assistive tech.
const ProductPreview = () => (
  <div className="relative isolate mx-auto w-full max-w-lg lg:max-w-none" aria-hidden="true">
    <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-linear-to-tr from-primary/25 via-violet-500/10 to-sky-500/10 blur-2xl dark:from-primary/30" />
    <div className="rounded-2xl border bg-card p-5 text-left text-card-foreground shadow-2xl shadow-primary/10">
      <div className="mb-4 flex gap-1.5">
        <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        <span className="size-2.5 rounded-full bg-muted-foreground/25" />
      </div>
      <p className="mb-3 text-sm font-semibold">Leave balance · {new Date().getFullYear()}</p>
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <PreviewBalance value="14" label="Vacation days left" className="bg-primary/10" />
        <PreviewBalance value="6" label="Days approved" className="bg-success/10" />
        <PreviewBalance value="2" label="Days pending" className="col-span-2 bg-warning/10 sm:col-span-1" />
      </div>
      <p className="mb-3 text-sm font-semibold">Team requests</p>
      <div className="space-y-2">
        <PreviewRequest initials="AK" title="Vacation · 5 days" detail="Awaiting your decision" status="Pending" />
        <PreviewRequest initials="MS" title="Sick leave · 1 day" detail="Approved by manager" status="Approved" />
      </div>
    </div>
    <div className="absolute -top-5 right-3 flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 text-sm text-card-foreground shadow-lg sm:-right-5">
      <CircleCheck className="size-5 text-success" />
      <span><b className="font-semibold">Laptop returned</b> · custody closed</span>
    </div>
  </div>
);

const SectionHead = ({ id, title, text }) => (
  <div className="mx-auto max-w-2xl text-center">
    <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
    <p className="mt-4 text-lg text-pretty text-muted-foreground">{text}</p>
  </div>
);

const LandingPage = () => (
  <div className="relative isolate min-h-svh overflow-x-clip bg-background text-foreground">
    {/* Soft brand glow behind the header and hero. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-radial-[ellipse_at_top] from-primary/15 via-primary/5 via-40% to-transparent to-70%"
    />

    <a
      href="#main"
      className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium shadow-md ring-1 ring-border focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50"
    >
      Skip to content
    </a>

    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className={`${CONTAINER} flex h-16 items-center justify-between gap-4`}>
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="HR Management System home"
        >
          <BrandMark />
          HR Management
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </header>

    <main id="main">
      <section className={`${CONTAINER} grid items-center gap-16 py-16 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-28`}>
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-sm font-medium text-muted-foreground shadow-xs backdrop-blur">
            <Sparkles className="size-4 text-primary" aria-hidden="true" /> Your HR workspace
          </span>
          <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl">
            People, leave and assets — <span className="text-primary">managed in one place.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground lg:mx-0">
            Keep employee records, leave approvals, equipment and HR documents in sync,
            so everyone sees the same up-to-date picture.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="h-11 px-5 shadow-lg shadow-primary/25">
              <Link to="/login">
                Sign in to your workspace <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-5">
              <a href="#features">See what’s inside</a>
            </Button>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground lg:justify-start">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            Accounts are created by your HR administrator.
          </p>
        </div>
        <ProductPreview />
      </section>

      <section id="features" className="scroll-mt-16 border-y bg-muted/40 py-20 sm:py-24" aria-labelledby="features-title">
        <div className={CONTAINER}>
          <SectionHead
            id="features-title"
            title="Everything HR runs on"
            text="The day-to-day work of an HR team, without the spreadsheets."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="h-full">
                <Card className="h-full transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <CardContent>
                    <IconTile icon={f.icon} tone={f.tone} />
                    <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                  </CardContent>
                </Card>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24" aria-labelledby="roles-title">
        <div className={CONTAINER}>
          <SectionHead
            id="roles-title"
            title="Built for everyone on the team"
            text="Each person sees what they need — and only what they’re allowed to."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {ROLES.map((r) => (
              <Card key={r.tag} className="h-full bg-muted/30 shadow-none">
                <CardContent>
                  <span className="text-xs font-semibold tracking-wider text-primary uppercase">{r.tag}</span>
                  <h3 className="mt-2 text-lg font-semibold">{r.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {r.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-24">
        <div className={CONTAINER}>
          <div className="relative isolate overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-xl shadow-primary/20 sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-radial-[at_100%_0%] from-white/25 to-transparent to-60%"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-24 -z-10 size-72 rounded-full bg-white/10 blur-3xl"
            />
            <h2 className="text-3xl font-semibold tracking-tight text-balance">Ready to get started?</h2>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-primary-foreground/80">
              Sign in with the account your HR administrator set up for you.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 h-11 bg-background px-5 text-foreground hover:bg-background/90 focus-visible:ring-primary-foreground/60"
            >
              <Link to="/login">
                Sign in <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>

    <footer className="border-t">
      <div className={`${CONTAINER} flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted-foreground sm:flex-row`}>
        <span className="flex items-center gap-2 font-medium text-foreground">
          <BrandMark className="size-6" />
          HR Management
        </span>
        <span>© {new Date().getFullYear()} HR Management System</span>
      </div>
    </footer>
  </div>
);

export default LandingPage;
