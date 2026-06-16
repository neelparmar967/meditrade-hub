import { clsx } from 'clsx';

export function Card({ children, className }) {
  return <section className={clsx('rounded-lg border border-slate-200 bg-white p-5 shadow-panel', className)}>{children}</section>;
}

export function Stat({ label, value, tone = 'pine' }) {
  const tones = { pine: 'bg-mist text-pine', coral: 'bg-red-50 text-coral', amber: 'bg-amber-50 text-amber', teal: 'bg-teal-50 text-teal' };
  return (
    <Card>
      <div className={clsx('mb-4 inline-flex rounded-md px-2 py-1 text-xs font-semibold', tones[tone])}>{label}</div>
      <div className="text-2xl font-bold text-ink">{value}</div>
    </Card>
  );
}

export function Button({ children, className, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-pine text-white hover:bg-[#0f4f4a]',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-coral text-white hover:bg-[#d54d3e]'
  };
  return (
    <button className={clsx('inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60', variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" {...props} />
      {error && <span className="mt-1 block text-xs text-coral">{error}</span>}
    </label>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" {...props}>
        {children}
      </select>
    </label>
  );
}
