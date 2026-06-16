import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Button, Card, Field, Select } from '../components/Ui.jsx';
import { useAuth } from '../state/AuthContext.jsx';

const demo = {
  'Wholesaler A - Northline': 'distributor@meditradehub.test',
  'Wholesaler B - Zenith': 'branch@meditradehub.test',
  'Medical shop demo': 'retailer@meditradehub.test'
};

const demoHelp = {
  'distributor@meditradehub.test': 'Wholesaler A can add Northline inventory, buy from other wholesalers, and update orders sent to Northline.',
  'branch@meditradehub.test': 'Wholesaler B can add Zenith inventory, buy from other wholesalers, and update orders sent to Zenith.',
  'retailer@meditradehub.test': 'Medical shop demo is only a buyer test account. It cannot list inventory or create offers; use it if you want to test how a non-wholesaler buyer places an order.'
};

export default function Login() {
  const [email, setEmail] = useState(demo['Wholesaler A - Northline']);
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in');
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-ink">Sign in to MediTrade Hub</h1>
        <p className="mt-2 text-sm text-slate-600">Demo password is Password@123.</p>
        <div className="mt-4 rounded-md bg-mist p-3 text-sm text-slate-700">{demoHelp[email]}</div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Select label="Demo role" value={email} onChange={(event) => setEmail(event.target.value)}>
            {Object.entries(demo).map(([label, roleEmail]) => <option key={label} value={roleEmail}>{label}</option>)}
          </Select>
          <Field label="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-coral">{error}</div>}
          <Button className="w-full" disabled={loading}><LogIn size={18} /> Sign in</Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">New wholesaler? <Link className="font-semibold text-pine" to="/register">Register here</Link></p>
      </Card>
    </main>
  );
}
