import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, ShoppingBasket, Truck } from 'lucide-react';
import { Button, Card } from '../components/Ui.jsx';

export default function Landing() {
  return (
    <main className="min-h-screen bg-[#f7fbfa]">
      <section className="relative overflow-hidden border-b border-slate-200 bg-pine text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #f4a62a 0 12%, transparent 13%), radial-gradient(circle at 78% 24%, #1d9488 0 18%, transparent 19%)' }} />
        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl content-center gap-8 px-6 py-14 md:grid-cols-[1fr_460px] md:px-10">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-amber">Original B2B pharma commerce</p>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight md:text-6xl">MediTrade Hub</h1>
            <p className="mt-5 max-w-2xl text-lg text-white/85">A wholesaler-to-wholesaler ordering workspace. List your own medicine stock, buy from other wholesalers, and manage incoming orders from buyers.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login"><Button className="bg-amber text-ink hover:bg-[#f7b948]">Open workspace <ArrowRight size={18} /></Button></Link>
              <Link to="/register"><Button variant="secondary" className="border-white/25 bg-white/10 text-white hover:bg-white/15">Register business</Button></Link>
            </div>
          </div>
          <div className="grid gap-4">
            {[
              ['Wholesaler A: Northline demo seller and buyer', ShoppingBasket],
              ['Wholesaler B: Zenith demo seller and buyer', ShieldCheck],
              ['Medical shop demo: buyer-only test account', Truck]
            ].map(([label, Icon]) => (
              <div key={label} className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
                <Icon className="mb-5 text-amber" />
                <div className="text-xl font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-3 md:px-10">
        {['Search by composition, company, category, or distributor', 'Manage incoming and outgoing orders', 'Export reports and purchase orders'].map((text) => (
          <Card key={text}><p className="text-slate-700">{text}</p></Card>
        ))}
      </section>
    </main>
  );
}
