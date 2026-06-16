import { Link } from 'react-router-dom';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { api, money } from '../api.js';
import { Button, Card } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

export default function Cart() {
  const { data: cart, setData } = useApi('/cart', { groups: [], total: 0, discount: 0, payable: 0 });
  const refresh = async () => {
    const { data } = await api.get('/cart');
    setData(data);
  };
  const updateQty = async (productId, quantity) => {
    await api.patch(`/cart/items/${productId}`, { quantity });
    await refresh();
  };
  const applyOffer = async (schemeId) => {
    await api.post('/cart/apply-offer', { schemeId });
    await refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div><h1 className="text-3xl font-bold text-ink">Mini cart</h1><p className="text-slate-600">Items are grouped by wholesaler. Apply eligible offers before checkout.</p></div>
        <Link to="/checkout"><Button disabled={!cart.payable}>Checkout</Button></Link>
      </div>
      {cart.groups.map((group) => (
        <Card key={group.distributorId}>
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-semibold text-ink">{group.distributorName}</h2>
              <p className="text-sm text-slate-500">{group.area || 'Area not set'}</p>
            </div>
            {group.appliedOffer && <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700"><CheckCircle2 size={16} /> {group.appliedOffer.title}</div>}
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {group.items.map((item) => (
              <div key={item.productId} className="grid gap-3 py-3 md:grid-cols-[1fr_110px_120px_44px] md:items-center">
                <div><div className="font-medium">{item.product.name}</div><div className="text-sm text-slate-500">{item.product.packSize}</div></div>
                <input className="rounded-md border border-slate-300 px-3 py-2" type="number" min="1" value={item.quantity} onChange={(event) => updateQty(item.productId, event.target.value)} />
                <div className="font-semibold">{money(item.lineTotal)}</div>
                <Button variant="secondary" onClick={() => updateQty(item.productId, 0)}><Trash2 size={16} /></Button>
              </div>
            ))}
          </div>
          {group.offers?.length > 0 && !group.appliedOffer && (
            <div className="mt-4 space-y-2 rounded-md bg-mist p-3">
              <div className="text-sm font-semibold text-ink">Eligible offers</div>
              {group.offers.map((offer) => (
                <div key={offer.id || offer._id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <span className="text-sm text-slate-700">{offer.title}: {money(offer.discountAmount)} off above {money(offer.minOrderAmount)}</span>
                  <Button variant="secondary" onClick={() => applyOffer(offer.id || offer._id)}>Apply offer</Button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 space-y-1 text-right">
            <div className="font-semibold">Subtotal: {money(group.subtotal)}</div>
            {group.discount > 0 && <div className="font-semibold text-green-700">Discount: -{money(group.discount)}</div>}
            <div className="font-bold">Payable: {money(group.payable)}</div>
          </div>
        </Card>
      ))}
      <Card className="space-y-2">
        <div className="flex items-center justify-between"><span>Principal amount</span><strong>{money(cart.total)}</strong></div>
        <div className="flex items-center justify-between text-green-700"><span>Offer discount</span><strong>-{money(cart.discount)}</strong></div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-lg"><span>Payable amount</span><strong>{money(cart.payable)}</strong></div>
      </Card>
    </div>
  );
}
