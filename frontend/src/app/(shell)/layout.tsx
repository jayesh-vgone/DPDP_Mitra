import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ zoom: 1.0 }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
