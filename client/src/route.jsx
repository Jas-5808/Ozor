import { createBrowserRouter } from "react-router-dom";
import { Navigate } from "react-router-dom";
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
import React, { Suspense, lazy } from 'react';
import { AdminLayout } from './admin';
import AdminSkeleton from './admin/AdminSkeleton';

const Dashboard = lazy(()=> import('./admin/pages/Dashboard'));
const AdminProducts = lazy(()=> import('./admin/pages/Products'));
const AdminCategories = lazy(()=> import('./admin/pages/Categories'));
const AdminBanners = lazy(()=> import('./admin/pages/Banners'));
const AdminOrders = lazy(()=> import('./admin/pages/Orders'));
const AdminUsers = lazy(()=> import('./admin/pages/Users'));
const AdminAudit = lazy(()=> import('./admin/pages/Audit'));
const AdminWarehouse = lazy(()=> import('./admin/pages/Warehouse'));
import { useAuth } from './hooks/useAuth';

function RequireAuth({ children }){
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
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
      { path: "profile", element: <Profile /> },
      { path: "favorites", element: <Favorites /> },
      { path: "cart", element: <Cart /> },
      { path: "update-profile", element: <UpdateProfile /> },
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
      { path: "/admin", element: <Suspense fallback={<AdminSkeleton rows={6} />}><Dashboard /></Suspense> },
      { path: "/admin/products", element: <Suspense fallback={<AdminSkeleton rows={8} />}><AdminProducts /></Suspense> },
      { path: "/admin/categories", element: <Suspense fallback={<AdminSkeleton rows={8} />}><AdminCategories /></Suspense> },
      { path: "/admin/warehouse", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminWarehouse /></Suspense> },
      { path: "/admin/banners", element: <Suspense fallback={<AdminSkeleton rows={6} />}><AdminBanners /></Suspense> },
      { path: "/admin/orders", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminOrders /></Suspense> },
      { path: "/admin/users", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminUsers /></Suspense> },
      { path: "/admin/audit", element: <Suspense fallback={<AdminSkeleton rows={8} />}><AdminAudit /></Suspense> },
    ],
  },
]);
