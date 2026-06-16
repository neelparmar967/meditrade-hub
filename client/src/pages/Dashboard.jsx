import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { PackagePlus, Search, ShoppingCart, TicketPercent, Warehouse } from 'lucide-react';
import { money, roleLabel } from '../api.js';
import { Button, Card, Stat } from '../components/Ui.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useApi } from '../hooks.js';

const actions = {
  RETAILER: [['Search medicines', '/products', Search], ['View offers', '/offers', TicketPercent], ['Open cart', '/cart', ShoppingCart]],
  DISTRIBUTOR: [['Add inventory', '/inventory', Warehouse], ['Create offer', '/offers', TicketPercent], ['Orders In/Out', '/orders', ShoppingCart]],
  BRANCH_MANAGER: [['Add inventory', '/inventory', Warehouse], ['Create offer', '/offers', TicketPercent], ['Orders In/Out', '/orders', ShoppingCart]],
  SUPER_ADMIN: [['Search medicines', '/products', Search], ['Orders In/Out', '/orders', ShoppingCart], ['Reports', '/reports', PackagePlus]]
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data } = useApi('/reports/summary', { monthly: [], totalSales: 0, pendingOrders: 0, cancelledOrders: 0, products: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">{roleLabel[user.role]} dashboard</h1>
          <p className="mt-1 text-slate-600">Orders, stock, schemes, reports, and partner activity in one workspace.</p>
        </div>
        <Link to="/products"><Button><Search size={18} /> Search catalog</Button></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="My sales" value={money(data.totalSales)} />
        <Stat label="Incoming pending" value={data.pendingOrders} tone="amber" />
        <Stat label="Cancelled orders" value={data.cancelledOrders ?? data.bouncedOrders} tone="coral" />
        <Stat label="Products" value={data.products} tone="teal" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="text-lg font-semibold text-ink">Monthly sales</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => money(value)} />
                <Bar dataKey="sales" fill="#1d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-ink">Role actions</h2>
          <div className="mt-4 space-y-3">
            {(actions[user.role] || actions.RETAILER).map(([label, to, Icon]) => (
              <Link key={label} to={to} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
                <Icon size={18} className="text-pine" />
                <span className="font-medium text-slate-700">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
