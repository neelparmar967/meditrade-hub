import { useEffect, useState } from 'react';
import { Edit3, Save, Star } from 'lucide-react';
import { api } from '../api.js';
import { Button, Card, Field } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

export default function Profile() {
  const { data, setData } = useApi('/me', { user: {}, profile: {} });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setForm({
      name: data.user?.name || '',
      businessName: data.profile?.name || data.profile?.shopName || data.user?.name || '',
      email: data.user?.email || '',
      phone: data.user?.phone || '',
      gstNumber: data.profile?.gstNumber || '',
      drugLicenseNumber: data.profile?.drugLicenseNumber || '',
      address: data.profile?.address || '',
      region: data.profile?.region || ''
    });
  }, [data]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    const { data: updated } = await api.patch('/me/profile', form);
    setData(updated);
    if (updated.user) localStorage.setItem('meditrade_user', JSON.stringify(updated.user));
    setEditing(false);
    setNotice('Profile updated.');
  };

  return (
    <div className="space-y-5">
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">Profile and settings</h1>
          <p className="text-slate-600">Your wholesaler details shown around orders and inventory.</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)}><Edit3 size={16} /> Edit profile</Button>
        ) : (
          <Button onClick={save}><Save size={16} /> Save profile</Button>
        )}
      </div>
      {notice && <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{notice}</div>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Owner / contact name" value={form.name || ''} onChange={set('name')} disabled={!editing} />
        <Field label="Wholesaler business name" value={form.businessName || ''} onChange={set('businessName')} disabled={!editing} />
        <Field label="Email" value={form.email || ''} disabled />
        <Field label="Phone" value={form.phone || ''} onChange={set('phone')} disabled={!editing} />
        <Field label="GST number" value={form.gstNumber || ''} onChange={set('gstNumber')} disabled={!editing} />
        <Field label="Drug license number" value={form.drugLicenseNumber || ''} onChange={set('drugLicenseNumber')} disabled={!editing} />
        <Field label="Region" value={form.region || ''} onChange={set('region')} disabled={!editing} />
        <Field label="Address" value={form.address || ''} onChange={set('address')} disabled={!editing} />
      </div>
    </Card>
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">My seller rating</h2>
          <p className="text-sm text-slate-600">Average rating from delivered orders rated by buyers.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-amber/15 px-4 py-3 font-bold text-ink">
          <Star className="fill-amber text-amber" size={20} />
          {Number(data.ratingSummary?.average || 0) > 0 ? data.ratingSummary.average : 'No rating yet'}
        </div>
      </div>
      <div className="mt-4 text-sm text-slate-600">{data.ratingSummary?.count || 0} rating(s)</div>
      {data.ratingSummary?.recent?.length > 0 && (
        <div className="mt-4 divide-y divide-slate-100">
          {data.ratingSummary.recent.map((item) => (
            <div key={item.id || item._id || item.orderId} className="flex items-center justify-between py-3 text-sm">
              <span>{item.message}</span>
              <strong>{item.rating} star{Number(item.rating) === 1 ? '' : 's'}</strong>
            </div>
          ))}
        </div>
      )}
    </Card>
    </div>
  );
}
