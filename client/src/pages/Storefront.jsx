import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, PackagePlus, TicketPercent } from 'lucide-react';
import { Button, Card } from '../components/Ui.jsx';
import { api, money } from '../api.js';
import { useApi } from '../hooks.js';

export default function Storefront({ type, detail = false }) {
  const { id } = useParams();
  const endpoint = detail ? `/${type}/${id}` : `/${type}`;
  const { data, loading, error } = useApi(endpoint, detail ? { products: [], schemes: [] } : []);
  const list = detail ? [] : Array.isArray(data) ? data : [];
  const entity = detail ? data.company || data.distributor : null;
  const label = type === 'companies' ? 'Company pages' : 'Wholesaler storefronts';
  const backTo = type === 'companies' ? '/companies' : '/distributors';
  const products = Array.isArray(data.products) ? data.products : [];
  const schemes = Array.isArray(data.schemes) ? data.schemes : [];

  const addToCart = async (product) => {
    await api.post('/cart/items', { productId: product.id || product._id, quantity: 1 });
  };

  if (detail) {
    if (loading) return <Card>Loading storefront...</Card>;
    if (error) return <Card className="text-coral">{error}</Card>;
    if (!entity) {
      return (
        <div className="space-y-5">
          <Link to={backTo}><Button variant="secondary"><ArrowLeft size={16} /> Back</Button></Link>
          <Card>Storefront not found.</Card>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <Card>
          <Link to={backTo} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-pine"><ArrowLeft size={16} /> Back to wholesalers</Link>
          <h1 className="text-3xl font-bold text-ink">{entity?.name || 'Storefront'}</h1>
          <p className="mt-2 text-slate-600">{entity?.description || entity?.address || entity?.region || 'Area not set'}</p>
          {entity?.serviceAreas?.length > 0 && <p className="mt-2 text-sm text-slate-500">Areas: {entity.serviceAreas.join(', ')}</p>}
          {Number(entity?.rating || 0) > 0 && <p className="mt-2 text-sm font-semibold text-amber">Average rating {entity.rating} ({entity.ratingCount || 0})</p>}
        </Card>
        {schemes.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold text-ink"><TicketPercent size={20} /> Active offers</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {schemes.map((scheme) => (
                <Card key={scheme.id || scheme._id}>
                  <div className="font-semibold text-ink">{scheme.title}</div>
                  <p className="mt-1 text-sm text-slate-600">{scheme.description}</p>
                  <p className="mt-3 text-sm font-semibold text-pine">{money(scheme.discountAmount)} off above {money(scheme.minOrderAmount)}</p>
                </Card>
              ))}
            </div>
          </section>
        )}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink"><PackagePlus size={20} /> Products</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id || product._id}>
              <div className="font-semibold">{product.name}</div>
              <div className="text-sm text-slate-500">{product.composition}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">PTR</span><div className="font-bold">{money(product.ptr)}</div></div>
                <div><span className="text-slate-500">Stock</span><div className="font-bold">{product.stock}</div></div>
              </div>
              <Button className="mt-4 w-full" disabled={!product.stock} onClick={() => addToCart(product)}>Add to cart</Button>
            </Card>
          ))}
        </div>
          {products.length === 0 && <Card>No products listed by this wholesaler yet.</Card>}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold text-ink">{label}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((item) => (
          <Link key={item.id || item._id} to={`/${type}/${item.id || item._id}`}>
            <Card className="h-full hover:border-teal">
              <div className="text-xl font-bold text-ink">{item.name}</div>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin size={15} /> {item.region || item.address || 'Area not set'}</p>
              {item.serviceAreas?.length > 0 && <p className="mt-2 text-sm text-slate-500">Serves: {item.serviceAreas.join(', ')}</p>}
              {Number(item.rating || 0) > 0 && <div className="mt-4 text-sm font-semibold text-amber">Average rating {item.rating} ({item.ratingCount || 0})</div>}
            </Card>
          </Link>
        ))}
      </div>
      {list.length === 0 && <Card>No storefronts found.</Card>}
    </div>
  );
}
