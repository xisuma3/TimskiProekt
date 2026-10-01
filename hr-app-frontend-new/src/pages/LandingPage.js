import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import './LandingPage.css';

const FEATURES = [
  {
    icon: 'bi-people',
    title: 'Employee records',
    text: 'One profile per person — department, manager, mentor and a private dossier, with soft delete so history is never lost.',
  },
  {
    icon: 'bi-calendar2-check',
    title: 'Leave with real approvals',
    text: 'Requests route to the employee’s manager. Overlaps are blocked and every decision is recorded with who, when and why.',
  },
  {
    icon: 'bi-pie-chart',
    title: 'Live leave balances',
    text: 'Yearly allowances per leave type. Remaining days are calculated from requests, so balances never drift.',
  },
  {
    icon: 'bi-laptop',
    title: 'Asset custody',
    text: 'Assign, transfer and return equipment with a full chain of custody — always know who held what, and when.',
  },
  {
    icon: 'bi-file-earmark-text',
    title: 'Document generation',
    text: 'Templates with placeholders turn into contracts and handover forms, filled from live employee and asset data.',
  },
  {
    icon: 'bi-shield-lock',
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

// Static illustration of the leave screen. Decorative — hidden from assistive tech.
const ProductPreview = () => (
  <div className="lp-preview" aria-hidden="true">
    <div className="lp-preview-bar"><i /><i /><i /></div>
    <div className="lp-preview-title">Leave balance · {new Date().getFullYear()}</div>
    <div className="lp-balances">
      <div className="lp-balance"><strong>14</strong><small>Vacation days left</small></div>
      <div className="lp-balance is-accent"><strong>6</strong><small>Days approved</small></div>
      <div className="lp-balance is-warn"><strong>2</strong><small>Days pending</small></div>
    </div>
    <div className="lp-preview-title">Team requests</div>
    <div className="lp-request">
      <span className="lp-avatar">AK</span>
      <div className="lp-request-body"><b>Vacation · 5 days</b><span>Awaiting your decision</span></div>
      <span className="lp-chip is-pending">Pending</span>
    </div>
    <div className="lp-request">
      <span className="lp-avatar">MS</span>
      <div className="lp-request-body"><b>Sick leave · 1 day</b><span>Approved by manager</span></div>
      <span className="lp-chip is-approved">Approved</span>
    </div>
    <div className="lp-preview-float">
      <i className="bi bi-check-circle-fill" />
      <span><b>Laptop returned</b> · custody closed</span>
    </div>
  </div>
);

const LandingPage = () => (
  <div className="lp">
    <a className="lp-skip" href="#main">Skip to content</a>

    <header className="lp-nav">
      <Container className="lp-nav-inner">
        <Link to="/" className="lp-brand" aria-label="HR Management System home">
          <span className="lp-brand-mark"><i className="bi bi-people-fill" aria-hidden="true" /></span>
          HR Management
        </Link>
        <Link to="/login" className="lp-btn lp-btn-ghost">Sign in</Link>
      </Container>
    </header>

    <main id="main">
      <section className="lp-hero">
        <Container>
          <Row className="align-items-center gx-4 gx-lg-5 gy-5">
            <Col lg={6}>
              <span className="lp-eyebrow">
                <i className="bi bi-stars" aria-hidden="true" /> Your HR workspace
              </span>
              <h1>
                People, leave and assets — <span>managed in one place.</span>
              </h1>
              <p className="lp-lead">
                Keep employee records, leave approvals, equipment and HR documents in sync,
                so everyone sees the same up-to-date picture.
              </p>
              <div className="lp-hero-actions">
                <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">
                  Sign in to your workspace <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
                <a href="#features" className="lp-btn lp-btn-ghost lp-btn-lg">See what’s inside</a>
              </div>
              <p className="lp-hero-note">
                <i className="bi bi-info-circle" aria-hidden="true" />
                Accounts are created by your HR administrator.
              </p>
            </Col>
            <Col lg={6}>
              <ProductPreview />
            </Col>
          </Row>
        </Container>
      </section>

      <section id="features" className="lp-section lp-section-alt" aria-labelledby="features-title">
        <Container>
          <div className="lp-section-head">
            <h2 id="features-title">Everything HR runs on</h2>
            <p>The day-to-day work of an HR team, without the spreadsheets.</p>
          </div>
          <Row className="g-4">
            {FEATURES.map((f) => (
              <Col md={6} lg={4} key={f.title}>
                <article className="lp-feature">
                  <div className="lp-feature-icon"><i className={`bi ${f.icon}`} aria-hidden="true" /></div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      <section className="lp-section" aria-labelledby="roles-title">
        <Container>
          <div className="lp-section-head">
            <h2 id="roles-title">Built for everyone on the team</h2>
            <p>Each person sees what they need — and only what they’re allowed to.</p>
          </div>
          <Row className="g-4">
            {ROLES.map((r) => (
              <Col md={4} key={r.tag}>
                <div className="lp-role">
                  <span className="lp-role-tag">{r.tag}</span>
                  <h3>{r.title}</h3>
                  <ul>
                    {r.items.map((item) => (
                      <li key={item}><i className="bi bi-check2-circle" aria-hidden="true" />{item}</li>
                    ))}
                  </ul>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      <section className="pb-5">
        <Container>
          <div className="lp-cta">
            <h2>Ready to get started?</h2>
            <p>Sign in with the account your HR administrator set up for you.</p>
            <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">
              Sign in <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </main>

    <footer className="lp-footer">
      <Container className="text-center">
        © {new Date().getFullYear()} HR Management System
      </Container>
    </footer>
  </div>
);

export default LandingPage;
