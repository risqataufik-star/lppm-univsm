import Sidebar from '@/components/admin/Sidebar';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 bg-gray-100 min-w-0">{children}</main>
    </div>
  );
}
