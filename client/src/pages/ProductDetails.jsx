import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { api, money } from '../api.js';
import { Button, Card } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product } = useApi(`/products/${id}`, {});
  return (
    <div className="space-y-5">
      <Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</Button>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card>
        <img className="aspect-[4/3] w-full rounded-md border border-slate-200 object-cover" src={product.image || '/placeholder-medicine.svg'} alt="" />
      </Card>
      <Card>
        <h1 className="text-3xl font-bold text-ink">{product.name}</h1>
        <p className="mt-2 text-slate-600">{product.composition}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ['MRP', money(product.mrp)],
            ['PTR', money(product.ptr)],
            ['Pack size', product.packSize],
            ['Company', product.companyName],
            ['Distributor', product.distributorName],
            ['Stock', `${product.stockStatus} (${product.stock || 0})`]
          ].map(([label, value]) => <div key={label} className="rounded-md bg-slate-50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="font-semibold">{value}</div></div>)}
        </div>
        <Button className="mt-6" onClick={() => api.post('/cart/items', { productId: id, quantity: 1 })}><Plus size={18} /> Add to cart</Button>
      </Card>
      </div>
    </div>
  );
}
