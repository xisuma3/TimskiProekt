import { TooltipProvider } from '@/components/ui/tooltip';
import AppRouter from './AppRouter';

function App() {
  return (
    <TooltipProvider>
      <AppRouter />
    </TooltipProvider>
  );
}

export default App;
