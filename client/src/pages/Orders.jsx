import { Download, Eye, Repeat2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, money } from '../api.js';
import { Button, Card, Select } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

const statuses = ['Placed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Cancelled'];

function OrderCard({ order, update, repeat, downloadPdf }) {
  const [open, setOpen] = useState(false);
  const canReorder = order.orderDirection === 'outgoing' || order.orderDirection === 'all';
  return (
    <Card>
      <div className="grid gap-4 md:grid-cols-[1fr_180px_180px_auto] md:items-center">
        <div>
          <div className="font-semibold text-ink">PO #{String(order.id || order._id).slice(-8)}</div>
          <div className="text-sm text-slate-500">{new Date(order.createdAt || Date.now()).toLocaleString()}</div>
        </div>
        <div>
          <span className="text-xs text-slate-500">Amount</span>
          <div className="font-semibold">{money(order.total)}</div>
        </div>
        {order.canUpdateStatus ? (
          <Select label="Status" value={order.status} onChange={(event) => update(order.id || order._id, event.target.value)}>
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
        ) : (
          <div>
            <span className="text-xs text-slate-500">Status</span>
            <div className="mt-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{order.status}</div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setOpen((current) => !current)}><Eye size={16} /> {open ? 'Hide' : 'View'}</Button>
          {canReorder && <Button variant="secondary" onClick={() => repeat(order.id || order._id)}><Repeat2 size={16} /> Reorder</Button>}
          <Button variant="secondary" onClick={() => downloadPdf(order.id || order._id)}><Download size={16} /> PDF</Button>
        </div>
      </div>
      <div className="mt-4 text-sm text-slate-600">{order.items?.length || 0} item(s) | Buyer: {order.buyerName} | Seller: {order.sellerName}</div>
      {open && (
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3 font-semibold">Product</th>
                <th className="p-3 font-semibold">Composition</th>
                <th className="p-3 font-semibold">Pack</th>
                <th className="p-3 font-semibold">Qty ordered</th>
                <th className="p-3 font-semibold">PTR</th>
                <th className="p-3 font-semibold">Line amount</th>
                <th className="p-3 font-semibold">Current stock</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item.productId} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-ink">{item.productName || item.productId}</td>
                  <td className="p-3 text-slate-600">{item.composition || '-'}</td>
                  <td className="p-3 text-slate-600">{item.packSize || '-'}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{money(item.price)}</td>
                  <td className="p-3 font-semibold">{money(Number(item.price || 0) * Number(item.quantity || 0))}</td>
                  <td className="p-3">{item.currentStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function Orders({ tracking = false, reorder = false }) {
  const { data: orderResult, setData } = useApi('/orders?limit=80', { items: [], total: 0, hasMore: false });
  const orders = orderResult.items || [];
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const update = async (id, status) => {
    await api.patch(`/orders/${id}/status`, { status });
    const { data } = await api.get('/orders?limit=80');
    setData(data);
  };
  const repeat = async (id) => {
    try {
      const { data } = await api.post(`/orders/${id}/reorder`);
      const skippedText = data.skipped?.length ? ` ${data.skipped.length} out-of-stock item(s) skipped.` : '';
      setNotice(`${data.added?.length || 0} item(s) copied to cart.${skippedText}`);
      navigate('/cart');
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to reorder this order.');
    }
  };
  const downloadPdf = async (id) => {
    const response = await api.get(`/orders/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `meditrade-po-${String(id).slice(-8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const title = reorder ? 'Reorder' : tracking ? 'Order tracking' : 'Orders';
  const incoming = orders.filter((order) => order.orderDirection === 'incoming');
  const outgoing = orders.filter((order) => order.orderDirection === 'outgoing');
  const other = orders.filter((order) => !['incoming', 'outgoing'].includes(order.orderDirection));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">{title}</h1>
        <p className="text-slate-600">Incoming orders are from wholesalers who bought your inventory. Outgoing orders are what you bought from others.</p>
      </div>
      {notice && <Card className="border-green-200 bg-green-50 text-green-800">{notice}</Card>}
      {orderResult.hasMore && <Card>Showing latest {orders.length} of {orderResult.total} orders. Use reports for older totals.</Card>}

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-ink">Orders to me</h2>
        {incoming.map((order) => <OrderCard key={order.id || order._id} order={order} update={update} repeat={repeat} downloadPdf={downloadPdf} />)}
        {incoming.length === 0 && <Card>No one has ordered from you yet.</Card>}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-ink">Orders from me</h2>
        {outgoing.map((order) => <OrderCard key={order.id || order._id} order={order} update={update} repeat={repeat} downloadPdf={downloadPdf} />)}
        {outgoing.length === 0 && <Card>You have not placed any orders yet.</Card>}
      </section>

      {other.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">Other orders</h2>
          {other.map((order) => <OrderCard key={order.id || order._id} order={order} update={update} repeat={repeat} downloadPdf={downloadPdf} />)}
        </section>
      )}
    </div>
  );
}
