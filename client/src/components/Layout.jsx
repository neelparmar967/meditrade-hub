import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Bell, ChartNoAxesCombined, HelpCircle, History, Home, LogOut, PackageSearch, Settings, ShoppingCart, Store, TicketPercent, UserCog, Warehouse } from 'lucide-react';
import { clsx } from 'clsx';
import { api, roleLabel } from '../api.js';
import { useAuth } from '../state/AuthContext.jsx';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/products', label: 'Search', icon: PackageSearch },
  { to: '/inventory', label: 'My Inventory', icon: Warehouse },
  { to: '/offers', label: 'Offers', icon: TicketPercent },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/orders', label: 'Orders In/Out', icon: History },
  { to: '/distributors', label: 'Wholesalers', icon: Store },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
  { to: '/profile', label: 'Profile', icon: Settings },
  { to: '/support', label: 'Support', icon: HelpCircle }
];

function playIncomingOrderSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  gain.connect(ctx.destination);
  [420, 560, 740].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(ctx.currentTime + index * 0.16);
    osc.stop(ctx.currentTime + 0.18 + index * 0.16);
  });
}

function playAlertSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  gain.connect(ctx.destination);
  [880, 660].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(ctx.currentTime + index * 0.12);
    osc.stop(ctx.currentTime + 0.16 + index * 0.12);
  });
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [incomingCount, setIncomingCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const incomingIdsRef = useRef([]);
  const locationRef = useRef(location.pathname);
  const previousCountRef = useRef(0);
  const previousAlertCountRef = useRef(0);
  const initializedRef = useRef(false);
  const alertInitializedRef = useRef(false);
  const seenKey = `meditrade_seen_incoming_${user?.id || user?._id || user?.email}`;

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const { data } = await api.get('/orders?limit=80');
        if (!active) return;
        const incomingIds = (data.items || [])
          .filter((order) => order.orderDirection === 'incoming')
          .map((order) => String(order.id || order._id));
        incomingIdsRef.current = incomingIds;
        const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
        const unseen = incomingIds.filter((id) => !seen.includes(id));
        setIncomingCount(unseen.length);
        if (initializedRef.current && unseen.length > previousCountRef.current) playIncomingOrderSound();
        previousCountRef.current = unseen.length;
        initializedRef.current = true;
      } catch {
        // Keep navigation usable if polling fails.
      }
    };
    poll();
    const timer = setInterval(poll, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [seenKey]);

  useEffect(() => {
    let active = true;
    const pollAlerts = async () => {
      try {
        const { data } = await api.get('/notifications?limit=80');
        if (!active) return;
        if (locationRef.current.startsWith('/notifications')) {
          setAlertCount(0);
          previousAlertCountRef.current = 0;
          return;
        }
        const unread = (data.items || []).filter((item) => !item.read).length;
        setAlertCount(unread);
        if (alertInitializedRef.current && unread > previousAlertCountRef.current) playAlertSound();
        previousAlertCountRef.current = unread;
        alertInitializedRef.current = true;
      } catch {
        // Alert polling should never block navigation.
      }
    };
    pollAlerts();
    const timer = setInterval(pollAlerts, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.id, user?._id, user?.email]);

  useEffect(() => {
    if (location.pathname.startsWith('/orders')) {
      localStorage.setItem(seenKey, JSON.stringify(incomingIdsRef.current));
      setIncomingCount(0);
      previousCountRef.current = 0;
    }
    if (location.pathname.startsWith('/notifications')) {
      setAlertCount(0);
      previousAlertCountRef.current = 0;
    }
  }, [location.pathname, seenKey]);

  return (
    <div className="min-h-screen bg-[#f7fbfa]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="grid h-10 w-10 place-items-center rounded bg-pine text-white">
            <UserCog size={20} />
          </div>
          <div>
            <div className="font-bold text-ink">MediTrade Hub</div>
            <div className="text-xs text-slate-500">{roleLabel[user?.role]}</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium', isActive ? 'bg-mist text-pine' : 'text-slate-600 hover:bg-slate-50')
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {to === '/orders' && incomingCount > 0 && (
                <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-white shadow-panel animate-pulse">({incomingCount})</span>
              )}
              {to === '/notifications' && alertCount > 0 && (
                <span className="rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-ink shadow-panel animate-pulse">({alertCount})</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="min-w-0">
            <div className="text-sm text-slate-500">Secure B2B ordering workspace</div>
            <div className="truncate text-lg font-semibold text-ink">{user?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications')}
              className="relative inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Bell size={16} />
              Alerts
              {alertCount > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-amber px-1.5 text-[10px] font-bold text-ink animate-pulse">({alertCount})</span>}
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </header>
        <nav className="sticky top-[89px] z-10 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('relative inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold', isActive ? 'border-teal bg-mist text-pine' : 'border-slate-200 text-slate-600')
              }
            >
              <Icon size={15} />
              {label}
              {to === '/orders' && incomingCount > 0 && <span className="rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">({incomingCount})</span>}
              {to === '/notifications' && alertCount > 0 && <span className="rounded-full bg-amber px-1.5 text-[10px] font-bold text-ink">({alertCount})</span>}
            </NavLink>
          ))}
        </nav>
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:px-8 lg:pb-6">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white p-1 lg:hidden">
          {[nav[0], nav[1], nav[2], nav[4], nav[5]].map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => clsx('grid place-items-center rounded py-2 text-xs', isActive ? 'text-pine' : 'text-slate-500')}>
              <span className="relative">
                <Icon size={18} />
                {to === '/orders' && incomingCount > 0 && <span className="absolute -right-4 -top-2 rounded-full bg-coral px-1.5 text-[10px] font-bold text-white animate-pulse">{incomingCount}</span>}
                {to === '/notifications' && alertCount > 0 && <span className="absolute -right-4 -top-2 rounded-full bg-amber px-1.5 text-[10px] font-bold text-ink animate-pulse">{alertCount}</span>}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
