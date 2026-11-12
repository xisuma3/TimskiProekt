import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

// The account menu lives at the bottom of the sidebar (UserMenu); the top bar keeps
// the page title and the always-visible controls.
const TopBar = ({ title }) => (
  <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <SidebarTrigger className="-ml-1" aria-label="Toggle menu" />
    <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
    <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
    <NotificationBell />
    <ThemeToggle />
  </header>
);

export default TopBar;
