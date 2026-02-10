import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { shopAPI } from "../../services/api";

type OperatorRow = {
  operator_id: string;
  first_name: string;
  last_name: string;
  total_orders: number;
  period_orders: number;
  accepted_count: number;
  cancelled_count: number;
  accepted_in_period?: number;
  cancelled_in_period?: number;
};

type WarehouseUserRow = {
  warehouse_user_id: string;
  first_name: string;
  last_name: string;
  total_orders: number;
  period_orders: number;
};

export default function Stats() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [warehouseUsers, setWarehouseUsers] = useState<WarehouseUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [operatorOrders, setOperatorOrders] = useState<any[]>([]);
  const [warehouseOrders, setWarehouseOrders] = useState<any[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<OperatorRow | null>(null);
  const [selectedWarehouseUser, setSelectedWarehouseUser] = useState<WarehouseUserRow | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const params = {
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [opRes, whRes] = await Promise.all([
        shopAPI.getOperatorsStats(params),
        shopAPI.getWarehouseUsersStats(params),
      ]);
      const opData = (opRes as any)?.data ?? [];
      const whData = (whRes as any)?.data ?? [];
      setOperators(Array.isArray(opData) ? opData : []);
      setWarehouseUsers(Array.isArray(whData) ? whData : []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Ошибка загрузки");
      setOperators([]);
      setWarehouseUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadOperatorOrders = async (row: OperatorRow) => {
    setSelectedOperator(row);
    setSelectedWarehouseUser(null);
    setWarehouseOrders([]);
    setOrdersLoading(true);
    setOperatorOrders([]);
    try {
      const res = await shopAPI.getOrdersByOperator({
        operator_id: row.operator_id,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: 100,
      });
      const data = (res as any)?.data ?? [];
      setOperatorOrders(Array.isArray(data) ? data : []);
    } catch {
      setOperatorOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadWarehouseOrders = async (row: WarehouseUserRow) => {
    setSelectedWarehouseUser(row);
    setSelectedOperator(null);
    setOperatorOrders([]);
    setOrdersLoading(true);
    setWarehouseOrders([]);
    try {
      const res = await shopAPI.getOrdersByWarehouseUser({
        warehouse_user_id: row.warehouse_user_id,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: 100,
      });
      const data = (res as any)?.data ?? [];
      setWarehouseOrders(Array.isArray(data) ? data : []);
    } catch {
      setWarehouseOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const name = (first: string, last: string) => [first, last].filter(Boolean).join(" ").trim() || "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-bold text-slate-900">
          {t("admin.nav.stats", "Статистика")}
        </h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Загрузка…" : "Обновить"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">Операторы</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">Оператор</th>
                  <th className="px-2 py-2" title="За всё время">Всего</th>
                  <th className="px-2 py-2" title="За выбранный период (напр. месяц)">За период</th>
                  <th className="px-2 py-2" title="Принято за всё время">Принято (всего)</th>
                  <th className="px-2 py-2" title="Отменено за всё время">Отменено (всего)</th>
                  <th className="px-2 py-2" title="Принято за выбранный период">Принято (период)</th>
                  <th className="px-2 py-2" title="Отменено за выбранный период">Отменено (период)</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((row) => (
                  <tr
                    key={row.operator_id}
                    onClick={() => loadOperatorOrders(row)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2 py-2 font-medium text-slate-900">
                      {name(row.first_name, row.last_name)}
                    </td>
                    <td className="px-2 py-2">{row.total_orders}</td>
                    <td className="px-2 py-2">{row.period_orders}</td>
                    <td className="px-2 py-2 text-emerald-600">{row.accepted_count}</td>
                    <td className="px-2 py-2 text-red-600">{row.cancelled_count}</td>
                    <td className="px-2 py-2 text-emerald-600">{row.accepted_in_period ?? "—"}</td>
                    <td className="px-2 py-2 text-red-600">{row.cancelled_in_period ?? "—"}</td>
                  </tr>
                ))}
                {operators.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {selectedOperator && (
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-600">
                Заказы: {name(selectedOperator.first_name, selectedOperator.last_name)}
              </p>
              {ordersLoading ? (
                <p className="text-sm text-slate-500">Загрузка…</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto text-xs">
                  {operatorOrders.map((o) => (
                    <li key={o.id} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                      <span>{o.order_number}</span>
                      <span>{o.status}</span>
                      <span>{o.total_price != null ? Number(o.total_price).toLocaleString() : ""}</span>
                    </li>
                  ))}
                  {operatorOrders.length === 0 && (
                    <li className="text-slate-500">Нет заказов за выбранный период</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">Упаковщики</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">Упаковщик</th>
                  <th className="px-2 py-2">Всего</th>
                  <th className="px-2 py-2">За период</th>
                </tr>
              </thead>
              <tbody>
                {warehouseUsers.map((row) => (
                  <tr
                    key={row.warehouse_user_id}
                    onClick={() => loadWarehouseOrders(row)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-2 py-2 font-medium text-slate-900">
                      {name(row.first_name, row.last_name)}
                    </td>
                    <td className="px-2 py-2">{row.total_orders}</td>
                    <td className="px-2 py-2">{row.period_orders}</td>
                  </tr>
                ))}
                {warehouseUsers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center text-slate-500">
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {selectedWarehouseUser && (
            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-600">
                Заказы: {name(selectedWarehouseUser.first_name, selectedWarehouseUser.last_name)}
              </p>
              {ordersLoading ? (
                <p className="text-sm text-slate-500">Загрузка…</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto text-xs">
                  {warehouseOrders.map((o) => (
                    <li key={o.id} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                      <span>{o.order_number}</span>
                      <span>{o.status}</span>
                      <span>{o.total_price != null ? Number(o.total_price).toLocaleString() : ""}</span>
                    </li>
                  ))}
                  {warehouseOrders.length === 0 && (
                    <li className="text-slate-500">Нет заказов за выбранный период</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
