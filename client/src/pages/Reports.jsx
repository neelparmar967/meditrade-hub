import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '../api.js';
import { Button, Card, Stat } from '../components/Ui.jsx';
import { useApi } from '../hooks.js';

export default function Reports() {
  const { data } = useApi('/reports/summary', { monthly: [], topProducts: [] });
  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Sales to me', data.totalSales || 0],
      ['Incoming pending', data.pendingOrders || 0],
      ['Cancelled', data.cancelledOrders || 0],
      [],
      ['Month', 'Sales'],
      ...(data.monthly || []).map((item) => [item.month, item.sales || 0])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meditrade-sales-report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-ink">My sales reports</h1><Button variant="secondary" onClick={exportCsv}><Download size={16} /> Export</Button></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Sales to me" value={money(data.totalSales)} />
        <Stat label="Incoming pending" value={data.pendingOrders} tone="amber" />
        <Stat label="Cancelled" value={data.cancelledOrders ?? data.bouncedOrders} tone="coral" />
      </div>
      <Card>
        <h2 className="font-semibold">Monthly seller sales</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => money(value)} />
              <Bar dataKey="sales" fill="#14615b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Top products sold by me</h2>
        <div className="mt-4 divide-y divide-slate-100">{data.topProducts?.map((item) => <div key={item.name} className="flex justify-between py-3"><span>{item.name}</span><strong>{money(item.sales)}</strong></div>)}</div>
      </Card>
    </div>
  );
}
