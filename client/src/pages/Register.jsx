import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Field } from '../components/Ui.jsx';
import { useAuth } from '../state/AuthContext.jsx';

export default function Register() {
  const [form, setForm] = useState({ role: 'DISTRIBUTOR', name: '', email: '', password: '', phone: '', gstNumber: '', drugLicenseNumber: '', address: '', city: '', region: '', serviceAreas: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 py-8">
      <Card className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Register wholesaler</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" value={form.role} />
          <Field label="Business name" value={form.name} onChange={set('name')} required />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
          <Field label="Password" type="password" value={form.password} onChange={set('password')} minLength="8" required />
          <Field label="Phone" value={form.phone} onChange={set('phone')} />
          <Field label="GST number" value={form.gstNumber} onChange={set('gstNumber')} />
          <Field label="Drug license number" value={form.drugLicenseNumber} onChange={set('drugLicenseNumber')} />
          <Field label="City" value={form.city} onChange={set('city')} placeholder="Pune" />
          <Field label="Region / state" value={form.region} onChange={set('region')} placeholder="Maharashtra" />
          <Field label="Service areas" value={form.serviceAreas} onChange={set('serviceAreas')} placeholder="Pune, Mumbai" />
          <Field label="Address" value={form.address} onChange={set('address')} />
          {error && <div className="md:col-span-2 rounded-md bg-red-50 p-3 text-sm text-coral">{error}</div>}
          <div className="md:col-span-2 flex items-center justify-between">
            <Link className="text-sm font-semibold text-pine" to="/login">Back to login</Link>
            <Button>Create account</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
