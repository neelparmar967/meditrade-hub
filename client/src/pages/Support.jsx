import { MessageSquare, Send } from 'lucide-react';
import { Button, Card, Field } from '../components/Ui.jsx';

export default function Support() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card>
        <h1 className="text-3xl font-bold text-ink">Support and feedback</h1>
        <div className="mt-6 space-y-4">
          <Field label="Subject" placeholder="Order, stock, upload, account..." />
          <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Message</span><textarea className="min-h-36 w-full rounded-md border border-slate-300 p-3 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" /></label>
          <Button><Send size={16} /> Send</Button>
        </div>
      </Card>
      <Card>
        <MessageSquare className="text-pine" />
        <h2 className="mt-4 font-semibold">Help desk</h2>
        <p className="mt-2 text-sm text-slate-600">Raise issues for order status, product uploads, buyer mapping, schemes, and account access.</p>
      </Card>
    </div>
  );
}
