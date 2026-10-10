import { ShieldCheckIcon } from '@/components/admin/icons';

export default function AuthLayout({
  judul,
  sorotan,
  deskripsi,
  catatan,
  lebar = 'max-w-sm',
  children,
}: {
  judul: string;
  sorotan: string;
  deskripsi: string;
  catatan: string;
  lebar?: 'max-w-sm' | 'max-w-md';
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="bg-brand-gradient relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-navy-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <img
            src="/assets/img/logo-color.png"
            alt="Logo Universitas Sapta Mandiri"
            className="h-11 w-11 object-contain drop-shadow"
          />
          <div className="leading-tight">
            <p className="font-bold tracking-wide">LPPM UnivSM</p>
            <p className="text-gold-300 text-[11px] font-medium tracking-widest uppercase">
              Universitas Sapta Mandiri
            </p>
          </div>
        </div>

        <div className="relative hidden lg:block max-w-md">
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight">
            {judul}
            <br />
            <span className="text-gold-400">{sorotan}</span>
          </h1>
          <p className="mt-4 text-white/70 leading-relaxed">{deskripsi}</p>
        </div>

        <div className="relative flex items-center gap-2 text-white/60 text-xs">
          <ShieldCheckIcon className="w-4 h-4 text-gold-400" />
          <span>{catatan}</span>
        </div>
      </div>

      <div className="flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className={`w-full ${lebar}`}>
          {children}
          <p className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} LPPM Universitas Sapta Mandiri
          </p>
        </div>
      </div>
    </div>
  );
}
