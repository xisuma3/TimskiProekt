import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  FileText,
  IdCard,
  LayoutDashboard,
  Laptop,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import BrandMark from './app/BrandMark';
import TopBar from './TopBar';
import UserMenu from './UserMenu';
import { isAdmin } from '../services/authService';

// One list drives the sidebar, its collapsed icon rail and the mobile sheet.
// `adminOnly` hides an item from the menu; the route guard in AppRouter is what enforces it.
const navSections = (admin) => [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'People',
    items: [
      { to: '/employees', icon: Users, label: 'Employees', adminOnly: true },
      { to: '/departments', icon: Building2, label: 'Departments', adminOnly: true },
      { to: '/employee-dossiers', icon: IdCard, label: admin ? 'Employee Dossiers' : 'My Dossier' },
    ],
  },
  {
    label: 'Time off',
    items: [
      { to: '/leave-requests', icon: CalendarCheck, label: admin ? 'Leave Requests' : 'My Leave Requests' },
      { to: '/leave-allowances', icon: CalendarDays, label: 'Leave Allowances', adminOnly: true },
      { to: '/approval-cover', icon: UserCheck, label: 'Approval Cover' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/assets', icon: Laptop, label: admin ? 'Assets' : 'My Assets' },
      // Admins get the hub (templates + generated); an employee goes straight to theirs.
      { to: admin ? '/documents' : '/generated-documents', icon: FileText, label: admin ? 'Documents' : 'My Documents' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/system-analysis', icon: BarChart3, label: 'System Analysis', adminOnly: true },
    ],
  },
];

const matches = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

export const pageTitleFor = (pathname) => {
  for (const section of navSections(isAdmin())) {
    const match = section.items.find((i) => matches(pathname, i.to));
    if (match) return match.label;
  }
  if (pathname.startsWith('/document-templates')) return 'Document Templates';
  if (pathname.startsWith('/generated-documents')) return 'Generated Documents';
  return 'HR Management';
};

const AppSidebar = () => {
  const admin = isAdmin();
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="HR Management">
              <Link to="/dashboard">
                <BrandMark />
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">HR Management</span>
                  <span className="truncate text-xs text-muted-foreground">{admin ? 'Administrator' : 'Employee portal'}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Main">
          {navSections(admin).map((section) => {
            const items = section.items.filter((i) => admin || !i.adminOnly);
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={section.label}>
                <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map(({ to, icon: Icon, label }) => (
                      <SidebarMenuItem key={to}>
                        <SidebarMenuButton asChild isActive={matches(pathname, to)} tooltip={label}>
                          <NavLink to={to}>
                            <Icon aria-hidden="true" />
                            <span>{label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

// Close the mobile sheet whenever the route changes.
const CloseMobileOnNavigate = () => {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);
  return null;
};

// The window is the scroll container, so without this a new page opens at the previous
// page's scroll position, with its header out of view.
const ScrollToTopOnNavigate = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    (document.scrollingElement || document.documentElement).scrollTop = 0;
  }, [pathname]);
  return null;
};

const SidebarLayout = () => {
  const { pathname } = useLocation();

  return (
    <SidebarProvider>
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <CloseMobileOnNavigate />
      <ScrollToTopOnNavigate />
      <AppSidebar />
      <SidebarInset>
        <TopBar title={pageTitleFor(pathname)} />
        <main id="app-content" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default SidebarLayout;
