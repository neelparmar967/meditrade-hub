import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { api, money } from '../api.js';
import { Button, Card, Field, Select } from '../components/Ui.jsx';
import { useApi, useDebouncedValue } from '../hooks.js';

function QuantityBox({ value, onChange, max }) {
  const setValue = (next) => onChange(Math.max(1, Math.min(Number(next || 1), Number(max || 1))));
  return (
    <div className="flex h-10 overflow-hidden rounded-md border border-slate-300">
      <button type="button" className="w-10 border-r border-slate-300 font-bold text-pine" onClick={() => setValue(value - 1)}>-</button>
      <input
        className="w-16 text-center outline-none"
        type="number"
        min="1"
        max={max || 1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="button" className="w-10 border-l border-slate-300 font-bold text-pine" onClick={() => setValue(value + 1)}>+</button>
    </div>
  );
}

export default function Products() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [quantities, setQuantities] = useState({});
  const [notice, setNotice] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: productResult } = useApi(`/products?q=${encodeURIComponent(debouncedQuery)}${category ? `&category=${category}` : ''}&limit=60`, { items: [], total: 0, hasMore: false });
  const products = productResult.items || [];
  const formulaMatchesExist = debouncedQuery && products.some((product) => product.formulaMatch);
  const displayedProducts = formulaMatchesExist ? products.filter((product) => product.formulaMatch) : products;
  const categories = useMemo(() => [...new Set(products.map((item) => item.category))], [products]);
  const wholesalerList = useMemo(() => {
    const groups = displayedProducts.reduce((acc, product) => {
      const key = product.distributorName || 'Unknown wholesaler';
      if (!acc[key]) acc[key] = { distributorName: key, area: product.distributorRegion || product.distributorAddress || product.distributorAreas?.join(', '), items: [], totalStock: 0, bestPtr: Number(product.ptr || 0), bestProduct: product };
      acc[key].items.push(product);
      acc[key].totalStock += Number(product.stock || 0);
      if (Number(product.ptr || 0) < acc[key].bestPtr) {
        acc[key].bestPtr = Number(product.ptr || 0);
        acc[key].bestProduct = product;
      }
      return acc;
    }, {});
    return Object.values(groups).sort((a, b) => a.bestPtr - b.bestPtr);
  }, [displayedProducts]);
  const getQty = (product) => quantities[product.id || product._id] || 1;
  const setQty = (product, quantity) => {
    setQuantities((current) => ({ ...current, [product.id || product._id]: quantity }));
  };
  const add = async (product) => {
    const productId = product.id || product._id;
    const quantity = getQty(product);
    await api.post('/cart/items', { productId, quantity });
    setNotice(`${quantity} x ${product.name} added to cart.`);
    setTimeout(() => setNotice(''), 2500);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-ink">Product search</h1>
        <p className="text-slate-600">Medical shops can compare wholesalers by medicine, price, and available stock.</p>
      </div>
      <Card className="bg-mist">
        <p className="text-sm text-slate-700">
          <strong>PTR</strong> means Price to Retailer: the wholesale price you pay per pack or unit before your selling margin.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Formula matching uses the product composition field. It can confirm the active ingredient text, but you should still check strength, pack size, manufacturer, and license details before ordering.
        </p>
      </Card>
      <Card className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Field label="Search catalog" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paracetamol, Metformin, Vanta..." />
        <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</Select>
        <Button className="self-end"><Search size={18} /> Search</Button>
      </Card>
      {notice && <div className="fixed right-4 top-20 z-50 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 shadow-panel">{notice}</div>}
      {debouncedQuery && wholesalerList.length > 0 && (
        <Card>
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Wholesaler comparison for "{debouncedQuery}"</h2>
              <p className="text-sm text-slate-600">This section groups formula-matched results by wholesaler and shows the best available PTR and stock.</p>
            </div>
            <div className="text-sm font-semibold text-pine">{wholesalerList.length} wholesaler(s) shown</div>
          </div>
          {productResult.hasMore && <p className="mt-3 text-sm text-slate-600">Showing first {products.length} of {productResult.total} matches. Refine the search to narrow results.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Wholesaler</th>
                  <th className="py-3 pr-4 font-semibold">Area</th>
                  <th className="py-3 pr-4 font-semibold">Matching products</th>
                  <th className="py-3 pr-4 font-semibold">Best PTR</th>
                  <th className="py-3 pr-4 font-semibold">Total stock</th>
                  <th className="py-3 pr-4 font-semibold">Stock status</th>
                  <th className="py-3 pr-4 font-semibold">Qty</th>
                  <th className="py-3 pr-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {wholesalerList.map((group) => (
                  <tr key={group.distributorName} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-semibold text-ink">{group.distributorName}</td>
                    <td className="py-3 pr-4">{group.area || 'Not set'}</td>
                    <td className="py-3 pr-4">{group.items.map((item) => item.name).join(', ')}</td>
                    <td className="py-3 pr-4 font-semibold">{money(group.bestPtr)}</td>
                    <td className="py-3 pr-4">{group.totalStock}</td>
                    <td className="py-3 pr-4">{group.totalStock > 100 ? 'Available' : group.totalStock > 0 ? 'Limited' : 'Out of stock'}</td>
                    <td className="py-3 pr-4">
                      <QuantityBox value={getQty(group.bestProduct)} max={group.bestProduct.stock} onChange={(value) => setQty(group.bestProduct, value)} />
                    </td>
                    <td className="py-3 pr-4">
                      <Button onClick={() => add(group.bestProduct)} disabled={!group.bestProduct.stock}>
                        <Plus size={16} /> Add best price
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayedProducts.length > 0 && <h2 className="md:col-span-2 xl:col-span-3 text-xl font-bold text-ink">Matching products</h2>}
        {displayedProducts.map((product) => (
          <Card key={product.id || product._id}>
            <div className="flex gap-4">
              <img className="h-20 w-24 rounded-md border border-slate-200 object-cover" src={product.image || '/placeholder-medicine.svg'} alt="" />
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.id || product._id}`} className="font-semibold text-ink hover:text-pine">{product.name}</Link>
                <p className="truncate text-sm text-slate-600">{product.composition}</p>
                <p className="mt-1 text-xs text-slate-500">{product.companyName} | {product.distributorName}</p>
                <p className="mt-2 inline-flex rounded bg-mist px-2 py-1 text-xs font-semibold text-pine">{product.matchType}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div><span className="text-slate-500">MRP</span><div className="font-semibold">{money(product.mrp)}</div></div>
              <div><span className="text-slate-500">PTR</span><div className="font-semibold">{money(product.ptr)}</div></div>
              <div><span className="text-slate-500">Stock</span><div className="font-semibold">{product.stock} units</div></div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <QuantityBox value={getQty(product)} max={product.stock} onChange={(value) => setQty(product, value)} />
              <Button className="flex-1" onClick={() => add(product)} disabled={!product.stock}><Plus size={18} /> Add to cart</Button>
            </div>
          </Card>
        ))}
      </div>
      {productResult.hasMore && <Card>Showing {products.length} of {productResult.total} products. Search by exact medicine, formula, company, or wholesaler to reduce the list.</Card>}
      {displayedProducts.length === 0 && <Card>No matching products found.</Card>}
    </div>
  );
}
