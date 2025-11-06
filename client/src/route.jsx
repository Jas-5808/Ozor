import { createBrowserRouter } from "react-router-dom";
import { Navigate, useLocation } from "react-router-dom";
import App from "./App";
import { ErrorPage } from "./pages/ErrorPage";
import { MainPage } from "./pages/MainPage";
import { Registration } from "./pages/Registration";
import { Login } from "./pages/Login";
import { Product } from "./pages/Product";
import { Profile } from "./pages/Profile";
import { UpdateProfile } from "./pages/UpdateProfile";
import { TestAuth } from "./pages/TestAuth";
import Favorites from "./pages/Favorites";
import Cart from "./pages/Cart";
import { CatalogPage } from "./pages/CatalogPage";
import React, { Suspense, lazy } from 'react';
import { AdminLayout } from './admin';
import SaleLayout from './admin/SaleLayout';
import AdminSkeleton from './admin/AdminSkeleton';

const AdminDashboard = lazy(()=> import('./admin/pages/Dashboard'));
const AdminOrders = lazy(()=> import('./admin/pages/Orders'));
const AdminUsers = lazy(()=> import('./admin/pages/Users'));
const AdminProducts = lazy(()=> import('./admin/pages/Products'));
const AdminWarehouse = lazy(()=> import('./admin/pages/Warehouse'));
const AdminCategories = lazy(()=> import('./admin/pages/Categories'));
const AdminBanners = lazy(()=> import('./admin/pages/Banners'));
const AdminAudit = lazy(()=> import('./admin/pages/Audit'));
// other admin pages enabled
import { useAuth } from './hooks/useAuth';
import { userAPI } from './services/api';

function RequireAuth({ children }){
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequireRole({ children, roles }){
  const { isAuthenticated, loading, profile } = useAuth();
  const location = useLocation();
  const [roleState, setRoleState] = React.useState<string | null>(null);
  const [fetching, setFetching] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!isAuthenticated || loading) return;
    const localRole = String((profile && (profile.role || profile.user_role || (profile.data && profile.data.role))) || '').toLowerCase();
    if (localRole) {
      setRoleState(localRole);
      return;
    }
    const uid = (profile && (profile.id || profile.user_id || (profile.data && profile.data.id))) || null;
    if (!uid || fetching) return;
    let ignore = false;
    const fetchRole = async () => {
      try {
        setFetching(true);
        // Try user-info first
        const info = await userAPI.getUsersInfo();
        const roleFromInfo = String(info?.data?.role || '').toLowerCase();
        if (!ignore && roleFromInfo) {
          setRoleState(roleFromInfo);
          return;
        }
        // Fallback to users/{id}
        const res = await userAPI.getUserById(String(uid));
        const apiRole = String(res?.data?.role || '').toLowerCase();
        if (!ignore) setRoleState(apiRole);
      } catch {
        if (!ignore) setRoleState(null);
      } finally {
        if (!ignore) setFetching(false);
      }
    };
    fetchRole();
    return () => { ignore = true; };
  }, [isAuthenticated, loading, profile, fetching]);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const normalized = (roleState || '').toLowerCase() === 'sale_operator'
    ? 'sale'
    : (roleState || '').toLowerCase();
  const allowed = Array.isArray(roles) ? roles.map(r => String(r).toLowerCase()) : [];

  if (!roleState) return null; // ждём роль
  if (!allowed.includes(normalized)) return <Navigate to="/" replace />;
  return children;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "", element: <MainPage /> },
      { path: "login", element: <Login /> },
      { path: "registration", element: <Registration /> },
      { path: "/product/:id", element: <Product /> },
      { path: "profile", element: (
        <RequireAuth>
          <Profile />
        </RequireAuth>
      ) },
      { path: "favorites", element: (
        <RequireAuth>
          <Favorites />
        </RequireAuth>
      ) },
      { path: "cart", element: <Cart /> },
      { path: "catalog", element: <CatalogPage /> },
      { path: "update-profile", element: (
        <RequireAuth>
          <UpdateProfile />
        </RequireAuth>
      ) },
      { path: "test-auth", element: <TestAuth /> },
    ],
  },
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    errorElement: <ErrorPage />,
    children: [
      { path: "/admin", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminDashboard /></Suspense> },
      { path: "/admin/orders", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminOrders /></Suspense> },
      { path: "/admin/users", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminUsers /></Suspense> },
      { path: "/admin/products", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminProducts /></Suspense> },
      { path: "/admin/warehouse", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminWarehouse /></Suspense> },
      { path: "/admin/categories", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminCategories /></Suspense> },
      { path: "/admin/banners", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminBanners /></Suspense> },
      { path: "/admin/audit", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminAudit /></Suspense> },
    ],
  },
  {
    path: "/sale",
    element: (
      <RequireRole roles={["sale"]}>
        <SaleLayout />
      </RequireRole>
    ),
    errorElement: <ErrorPage />,
    children: [
      { path: "/sale", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminOrders /></Suspense> },
      { path: "/sale/orders", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminOrders /></Suspense> },
    ],
  },
]);
