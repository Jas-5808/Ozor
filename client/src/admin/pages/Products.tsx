import React, { useEffect, useState } from "react";
import { adminStore } from "../storage";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  categoryId?: string;
};

const inputBase =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";
const btnBase =
  "inline-flex items-center justify-center rounded-xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary =
  "bg-blue-600 text-white shadow-sm hover:bg-blue-700";
const btnDanger =
  "bg-red-600 text-white shadow-sm hover:bg-red-700";

export default function Products() {
  const [items, setItems] = useState<Product[]>(
    adminStore.load<Product[]>("admin_products", [])
  );
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>("");

  const addItem = () => {
    if (!name.trim()) return;

    const p: Product = {
      id: Math.random().toString(36).slice(2),
      name: name.trim(),
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      categoryId: categoryId || undefined,
    };

    setItems([p, ...items]);
    setName("");
    setPrice(0);
    setStock(0);
    setCategoryId("");
  };

  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  useEffect(() => {
    adminStore.save("admin_products", items);
  }, [items]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-slate-900">Products</div>
      </div>

      <div className="mb-3 grid gap-2">
        <input
          className={inputBase}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            className={inputBase}
            placeholder="Price"
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
          <input
            className={inputBase}
            placeholder="Stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />
          <input
            className={inputBase}
            placeholder="Category ID"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button className={btnBase + " h-10 " + btnPrimary} onClick={addItem}>
            Add product
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-center">Name</th>
              <th className="px-3 py-3 text-center">Price</th>
              <th className="px-3 py-3 text-center">Stock</th>
              <th className="px-3 py-3 text-center">Category</th>
              <th className="px-3 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map((i, idx) => (
              <tr
                key={i.id}
                className={[
                  "border-t border-slate-200",
                  idx % 2 === 1 ? "bg-slate-50/40" : "",
                  "hover:bg-slate-50",
                ].join(" ")}
              >
                <td className="px-3 py-3 text-center">{i.name}</td>
                <td className="px-3 py-3 text-center">{i.price}</td>
                <td className="px-3 py-3 text-center">{i.stock}</td>
                <td className="px-3 py-3 text-center">{i.categoryId || "—"}</td>
                <td className="px-3 py-3 text-center">
                  <button
                    className={btnBase + " h-9 " + btnDanger}
                    onClick={() => removeItem(i.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                  No products yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
