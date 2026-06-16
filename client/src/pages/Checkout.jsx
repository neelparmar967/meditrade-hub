import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api, money } from '../api.js';
import { Button, Card } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

function playOrderSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  gain.connect(ctx.destination);
  [660, 880].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(ctx.currentTime + index * 0.12);
    osc.stop(ctx.currentTime + 0.18 + index * 0.12);
  });
}

export default function Checkout() {
  const { data: cart } = useApi('/cart', { groups: [], total: 0, discount: 0, payable: 0 });
  const [message, setMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const place = async () => {
    const { data } = await api.post('/orders/checkout');
    playOrderSound();
    setMessage(`${data.orders.length} purchase order(s) placed.`);
    setShowPopup(true);
  };
  return (
    <Card>
      <h1 className="text-3xl font-bold text-ink">Checkout</h1>
      <p className="mt-2 text-slate-600">Review distributor-wise purchase orders before placing them.</p>
      <div className="mt-6 space-y-3">
        {cart.groups.map((group) => <div key={group.distributorId} className="flex justify-between rounded-md bg-slate-50 p-4"><span>{group.distributorName} | {group.items.length} item(s)</span><strong>{money(group.payable)}</strong></div>)}
      </div>
      <div className="mt-6 space-y-2 border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between"><span>Principal amount</span><strong>{money(cart.total)}</strong></div>
        <div className="flex items-center justify-between text-green-700"><span>Offer discount</span><strong>-{money(cart.discount)}</strong></div>
        <div className="flex items-center justify-between text-lg"><span className="font-semibold">Payable bill amount</span><strong>{money(cart.payable)}</strong></div>
      </div>
      {message && <div className="mt-4 flex gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 size={18} /> {message}</div>}
      <Button className="mt-5" onClick={place} disabled={!cart.payable}>Place purchase order</Button>
      {showPopup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-panel">
            <CheckCircle2 className="mx-auto text-green-600" size={42} />
            <h2 className="mt-4 text-xl font-bold text-ink">Order placed</h2>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <Button className="mt-5 w-full" onClick={() => navigate('/orders')}>View orders</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
