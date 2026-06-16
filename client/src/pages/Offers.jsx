import { useState } from 'react';
import { CalendarDays, TicketPercent, Trash2 } from 'lucide-react';
import { api, money } from '../api.js';
import { Button, Card, Field } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

const blank = { title: '', minOrderAmount: 1000, discountAmount: 500, validUntil: '2026-12-31' };

export default function Offers() {
  const { data: schemes, setData } = useApi('/schemes', []);
  const [form, setForm] = useState(blank);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const refresh = async () => {
    const { data } = await api.get('/schemes');
    setData(data);
  };

  const create = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');
    try {
      await api.post('/schemes', form);
      setForm(blank);
      setNotice('Offer created. Buyers can apply it in mini cart when eligible.');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create offer. Log in as a wholesaler.');
    }
  };

  const remove = async (scheme) => {
    setNotice('');
    setError('');
    try {
      await api.delete(`/schemes/${scheme.id || scheme._id}`);
      setNotice('Offer deleted.');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this offer.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-ink">Offers</h1>
        <p className="text-slate-600">Create basket discounts for your wholesaler inventory.</p>
      </div>
      {notice && <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{notice}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-coral">{error}</div>}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Create offer</h2>
        <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-4">
          <Field label="Offer name" value={form.title} onChange={set('title')} placeholder="Rs. 500 off" required />
          <Field label="Minimum order" type="number" value={form.minOrderAmount} onChange={set('minOrderAmount')} required />
          <Field label="Discount amount" type="number" value={form.discountAmount} onChange={set('discountAmount')} required />
          <Field label="Valid until" type="date" value={form.validUntil} onChange={set('validUntil')} required />
          <Button className="md:col-span-4 md:w-fit"><TicketPercent size={16} /> Create offer</Button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {schemes.map((scheme) => (
          <Card key={scheme.id || scheme._id} className="overflow-hidden">
            <div className="mb-5 rounded-md bg-pine p-5 text-white">
              <div className="text-sm text-amber">{scheme.banner}</div>
              <div className="mt-2 text-2xl font-bold">{scheme.title}</div>
            </div>
            <p className="text-slate-700">{scheme.description}</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              <div><span className="text-slate-500">Minimum</span><div className="font-semibold">{money(scheme.minOrderAmount)}</div></div>
              <div><span className="text-slate-500">Discount</span><div className="font-semibold">{money(scheme.discountAmount)}</div></div>
              <div className="flex items-end gap-2"><CalendarDays size={16} /> {scheme.validUntil}</div>
            </div>
            {scheme.canDelete && <Button className="mt-4" variant="danger" onClick={() => remove(scheme)}><Trash2 size={16} /> Delete offer</Button>}
          </Card>
        ))}
      </div>
      {schemes.length === 0 && <Card>No active offers. Expired offers disappear automatically.</Card>}
    </div>
  );
}
