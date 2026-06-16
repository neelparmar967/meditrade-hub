import { useState } from 'react';
import { PackagePlus, Save, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { Button, Card, Field } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

const emptyProduct = {
  name: '',
  composition: '',
  category: '',
  packSize: '',
  mrp: '',
  ptr: '',
  stock: ''
};

export default function Inventory() {
  const { data: products, setData } = useApi('/inventory', []);
  const { data: me } = useApi('/me', { user: {}, profile: {} });
  const [form, setForm] = useState(emptyProduct);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const refresh = async () => {
    const { data } = await api.get('/inventory');
    setData(data);
  };

  const create = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await api.post('/inventory', form);
      setForm(emptyProduct);
      setNotice('Product added to your inventory.');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add product. Check all required fields and make sure you are logged in as a wholesaler.');
    } finally {
      setSaving(false);
    }
  };

  const update = async (product, payload) => {
    setError('');
    try {
      await api.patch(`/inventory/${product.id || product._id}`, payload);
      setNotice('Inventory updated.');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update this product.');
    }
  };

  const remove = async (product) => {
    setError('');
    try {
      await api.delete(`/inventory/${product.id || product._id}`);
      setNotice('Product deleted from your inventory.');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this product.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-ink">My inventory</h1>
        <p className="text-slate-600">Add and control only your own listed medicines. Search is the marketplace and shows everyone’s listings.</p>
      </div>
      <Card className="bg-mist">
        <p className="text-sm text-slate-700">
          You are editing inventory for <strong>{me.profile?.name || me.profile?.shopName || me.user?.name || 'your wholesaler account'}</strong>. Products from other wholesalers do not appear here.
        </p>
        <p className="mt-2 text-sm text-slate-700"><strong>Stock rule:</strong> 0 is Out of stock, 1-74 is Low stock, and 75+ is In stock.</p>
      </Card>
      {notice && <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{notice}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-coral">{error}</div>}
      <Card>
        <h2 className="text-lg font-semibold text-ink">Add product</h2>
        <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-4">
          <Field label="Medicine name" value={form.name} onChange={set('name')} required />
          <Field label="Composition / formula" value={form.composition} onChange={set('composition')} placeholder="Paracetamol 650mg" required />
          <Field label="Category" value={form.category} onChange={set('category')} placeholder="Pain relief" />
          <Field label="Pack size" value={form.packSize} onChange={set('packSize')} placeholder="15x10 tablets" required />
          <Field label="MRP" type="number" value={form.mrp} onChange={set('mrp')} required />
          <Field label="PTR" type="number" value={form.ptr} onChange={set('ptr')} required />
          <Field label="Stock quantity" type="number" value={form.stock} onChange={set('stock')} required />
          <Button className="self-end" disabled={saving}><PackagePlus size={16} /> {saving ? 'Adding...' : 'Add to inventory'}</Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-ink">Your listed products</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Product</th>
                <th className="py-3 pr-3 font-semibold">Formula</th>
                <th className="py-3 pr-3 font-semibold">PTR</th>
                <th className="py-3 pr-3 font-semibold">MRP</th>
                <th className="py-3 pr-3 font-semibold">Stock</th>
                <th className="py-3 pr-3 font-semibold">Status</th>
                <th className="py-3 pr-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id || product._id} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-3 font-semibold text-ink">{product.name}<div className="text-xs font-normal text-slate-500">{product.packSize}</div></td>
                  <td className="py-3 pr-3">{product.composition}</td>
                  <td className="py-3 pr-3"><input className="w-24 rounded-md border border-slate-300 px-2 py-1" type="number" defaultValue={product.ptr} onBlur={(event) => update(product, { ptr: Number(event.target.value) })} /></td>
                  <td className="py-3 pr-3"><input className="w-24 rounded-md border border-slate-300 px-2 py-1" type="number" defaultValue={product.mrp} onBlur={(event) => update(product, { mrp: Number(event.target.value) })} /></td>
                  <td className="py-3 pr-3"><input className="w-28 rounded-md border border-slate-300 px-2 py-1" type="number" defaultValue={product.stock} onBlur={(event) => update(product, { stock: Number(event.target.value) })} /></td>
                  <td className="py-3 pr-3">{product.stockStatus}</td>
                  <td className="py-3 pr-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => update(product, {})}><Save size={16} /></Button>
                      <Button variant="danger" onClick={() => remove(product)}><Trash2 size={16} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && <p className="mt-4 text-sm text-slate-600">No products listed yet.</p>}
      </Card>
      <Card className="bg-mist">
        <p className="text-sm text-slate-700">When you add stock here, other wholesalers will see it in Search with your wholesaler name, PTR, MRP, and stock quantity.</p>
      </Card>
    </div>
  );
}
