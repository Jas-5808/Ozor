import { Link, useLocation, useNavigate } from "react-router-dom";
import useSEO from "../hooks/useSEO";
import { useTranslation } from "react-i18next";

type LocationState = {
  productName?: string;
  variantTitle?: string;
  phone?: string;
  fullName?: string;
};

export function OrderRequestSent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: LocationState };

  useSEO({
    title: `${t("common.orderRequest.title")} — OZAR`,
    robots: "noindex,nofollow",
  });

  const productName = state?.productName || t("common.orderRequest.fallbackProduct");
  const phone = state?.phone;
  const variantTitle = state?.variantTitle;
  const fullName = state?.fullName || t("common.orderRequest.fallbackName");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex flex-col items-center text-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-md">
            <div className="absolute h-14 w-14 rounded-full bg-emerald-200/50 animate-ping" aria-hidden />
            <svg className="relative" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="m-0 text-2xl font-black text-slate-900">{t("common.orderRequest.title")}</h1>
            <p className="m-0 text-sm text-slate-600">{t("common.orderRequest.subtitle")}</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          {t("common.orderRequest.paymentInfo")}
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("common.orderRequest.productLabel")}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{productName}</div>
            {variantTitle && <div className="text-xs text-slate-500">{variantTitle}</div>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("common.orderRequest.contactLabel")}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {fullName}
            </div>
            {phone && <div className="text-xs text-slate-500">{phone}</div>}
          </div>
        </div>

        <div className="mb-4 text-sm text-slate-600">{t("common.orderRequest.nextSteps")}</div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
            onClick={() => navigate("/")}
          >
            {t("common.orderRequest.goHome")}
          </button>
          <Link
            to="/catalog"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {t("common.orderRequest.goCatalog")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OrderRequestSent;

