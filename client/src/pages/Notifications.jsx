import { useEffect, useState } from 'react';
import { Bell, Star } from 'lucide-react';
import { api } from '../api.js';
import { Card } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

const formatDateTime = (value) => {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

export default function Notifications() {
  const { data: notificationResult, setData } = useApi('/notifications?limit=80', { items: [], total: 0, hasMore: false });
  const data = notificationResult.items || [];
  const [messages, setMessages] = useState({});

  useEffect(() => {
    if (!data.some((item) => !item.read)) return;
    const timer = setTimeout(async () => {
      await api.patch('/notifications/read');
      setData((current) => ({ ...current, items: (current.items || []).map((item) => ({ ...item, read: true })) }));
    }, 1200);
    return () => clearTimeout(timer);
  }, [data, setData]);

  const rate = async (item, rating) => {
    const id = item.id || item._id;
    const { data: feedback } = await api.post('/feedback', { orderId: item.orderId, rating });
    setMessages((current) => ({ ...current, [id]: feedback.message }));
    setData((current) => ({
      ...current,
      items: (current.items || []).map((entry) => String(entry.id || entry._id) === String(id)
        ? { ...entry, rating, ratedMessage: feedback.message }
        : entry)
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-ink">Alerts</h1>
        <p className="text-slate-600">Offer announcements and order status updates appear here.</p>
      </div>
      {notificationResult.hasMore && <Card>Showing latest {data.length} of {notificationResult.total} alerts.</Card>}
      {data.map((item) => (
        <Card key={item.id || item._id} className={`flex gap-4 ${!item.read ? 'border-amber bg-amber/10' : ''}`}>
          <Bell className={!item.read ? 'text-amber' : 'text-pine'} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-semibold">{item.title}</div>
              {!item.read && <span className="rounded bg-amber px-2 py-0.5 text-xs font-bold text-ink">New</span>}
            </div>
            <p className="text-slate-600">{item.message}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">{formatDateTime(item.createdAt)}</p>
            {item.rating && !item.canRate && (
              <div className="mt-4 rounded-md bg-mist p-3">
                <div className="text-sm font-semibold text-ink">You rated this order</div>
                <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-amber">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Star key={rating} size={16} className={Number(item.rating || 0) >= rating ? 'fill-amber text-amber' : 'text-slate-300'} />
                  ))}
                  <span className="ml-2 text-slate-700">{item.rating} star{Number(item.rating) === 1 ? '' : 's'}</span>
                </div>
                {item.ratedMessage && <p className="mt-3 text-sm font-semibold text-pine">{item.ratedMessage}</p>}
              </div>
            )}
            {item.canRate && (
              <div className="mt-4 rounded-md bg-mist p-3">
                <div className="text-sm font-semibold text-ink">Rate this delivered order</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => rate(item, rating)}
                      className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-semibold ${Number(item.rating) === rating ? 'border-amber bg-amber/20 text-ink' : 'border-slate-200 bg-white text-slate-700'}`}
                    >
                      {rating}
                      <Star size={15} className={Number(item.rating || 0) >= rating ? 'fill-amber text-amber' : 'text-slate-400'} />
                    </button>
                  ))}
                </div>
                {(messages[item.id || item._id] || item.ratedMessage) && (
                  <p className="mt-3 text-sm font-semibold text-pine">{messages[item.id || item._id] || item.ratedMessage}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
      {data.length === 0 && <Card>No alerts yet.</Card>}
    </div>
  );
}
