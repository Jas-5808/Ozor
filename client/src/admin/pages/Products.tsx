import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminStore } from "../storage";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  categoryId?: string;
};

const inputBase =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const btnBase =
  "inline-flex items-center justify-center rounded-xl px-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
const btnPrimary =
  "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700";
const btnDanger =
  "bg-red-600 text-white shadow-sm hover:bg-red-700";

export default function Products() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Product[]>(
    adminStore.load<Product[]>("admin_products", [])
  );
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.categoryId || "").toLowerCase().includes(q);
      const matchStock =
        stockFilter === "all" ||
        (stockFilter === "in" && i.stock > 0) ||
        (stockFilter === "out" && i.stock <= 0);
      return matchSearch && matchStock;
    });
  }, [items, search, stockFilter]);

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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">
          {t("admin.productsPage.title")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <input
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:w-48"
            placeholder={t("admin.productsPage.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as "all" | "in" | "out")}
          >
            <option value="all">{t("admin.productsPage.filter.all")}</option>
            <option value="in">{t("admin.productsPage.filter.inStock")}</option>
            <option value="out">{t("admin.productsPage.filter.outOfStock")}</option>
          </select>
        </div>
      </div>

      <div className="mb-3 grid gap-2">
        <input
          className={inputBase}
          placeholder={t("admin.productsPage.form.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            className={inputBase}
            placeholder={t("admin.productsPage.form.pricePlaceholder")}
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
          <input
            className={inputBase}
            placeholder={t("admin.productsPage.form.stockPlaceholder")}
            type="number"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />
          <input
            className={inputBase}
            placeholder={t("admin.productsPage.form.categoryPlaceholder")}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            className={btnBase + " h-10 " + btnPrimary}
            onClick={addItem}
            disabled={!name.trim()}
          >
            {t("admin.productsPage.form.submit")}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-center">{t("admin.productsPage.table.name")}</th>
              <th className="px-3 py-3 text-center">{t("admin.productsPage.table.price")}</th>
              <th className="px-3 py-3 text-center">{t("admin.productsPage.table.stock")}</th>
              <th className="px-3 py-3 text-center">{t("admin.productsPage.table.category")}</th>
              <th className="px-3 py-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map((i, idx) => (
              <tr
                key={i.id}
                className={[
                  "border-t border-slate-200",
                  idx % 2 === 1 ? "bg-slate-50/40" : "",
                  "hover:bg-emerald-50/30 transition-colors",
                ].join(" ")}
              >
                <td className="px-3 py-3 text-center font-medium text-slate-900">{i.name}</td>
                <td className="px-3 py-3 text-center">{i.price.toLocaleString()}</td>
                <td className="px-3 py-3 text-center">
                  <span className={i.stock > 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                    {i.stock}
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-slate-600">{i.categoryId || "—"}</td>
                <td className="px-3 py-3 text-center">
                  <button
                    className={btnBase + " h-9 " + btnDanger}
                    onClick={() => removeItem(i.id)}
                  >
                    {t("admin.productsPage.table.delete")}
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr className="border-t border-slate-200">
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                  {items.length === 0
                    ? t("admin.productsPage.empty")
                    : t("admin.productsPage.noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
