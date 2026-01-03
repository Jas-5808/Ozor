import { createBrowserRouter } from "react-router-dom";
import { Navigate, useLocation } from "react-router-dom";
import App from "./App";
import { ErrorPage } from "./pages/ErrorPage";
import React, { Suspense, lazy } from 'react';
import AdminSkeleton from './admin/AdminSkeleton';
import PageSkeleton from './components/PageSkeleton';

// Lazy load основных страниц для code splitting
const MainPage = lazy(() => import('./pages/MainPage').then(m => ({ default: m.MainPage })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Registration = lazy(() => import('./pages/Registration').then(m => ({ default: m.Registration })));
const Product = lazy(() => import('./pages/Product').then(m => ({ default: m.Product })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const UpdateProfile = lazy(() => import('./pages/UpdateProfile').then(m => ({ default: m.UpdateProfile })));
const Favorites = lazy(() => import('./pages/Favorites'));
const Cart = lazy(() => import('./pages/Cart'));
const CatalogPage = lazy(() => import('./pages/CatalogPage').then(m => ({ default: m.CatalogPage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then(m => ({ default: m.CategoryPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const TestAuth = lazy(() => import('./pages/TestAuth').then(m => ({ default: m.TestAuth })));
const OrderRequestSent = lazy(() => import('./pages/OrderRequestSent').then(m => ({ default: m.OrderRequestSent })));

// Admin pages (уже lazy)
const AdminDashboard = lazy(()=> import('./admin/pages/Dashboard'));
const AdminOrders = lazy(()=> import('./admin/pages/Orders'));
const AdminUsers = lazy(()=> import('./admin/pages/Users'));
const AdminProducts = lazy(()=> import('./admin/pages/Products'));
const AdminWarehouse = lazy(()=> import('./admin/pages/Warehouse'));
const AdminCategories = lazy(()=> import('./admin/pages/Categories'));
const AdminBanners = lazy(()=> import('./admin/pages/Banners'));
const AdminAudit = lazy(()=> import('./admin/pages/Audit'));
const AdminPayments = lazy(()=> import('./admin/pages/Payments'));
const AdminLayout = lazy(()=> import('./admin/AdminLayout'));
const SaleLayout = lazy(()=> import('./admin/SaleLayout'));
// other admin pages enabled
import { useAuth } from './hooks/useAuth';
import { userAPI } from './services/api';

function RequireAuth({ children }){
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSkeleton />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequireRole({ children, roles }){
  const { isAuthenticated, loading, profile } = useAuth();
  const location = useLocation();
  const [roleState, setRoleState] = React.useState(null);
  const [fetching, setFetching] = React.useState(false);
  const hasFetchedRef = React.useRef(false);
  const [roleResolved, setRoleResolved] = React.useState(false);
  const profileRoleRaw = String(profile?.role || profile?.user_role || profile?.data?.role || '').toLowerCase();

  React.useEffect(() => {
    // Если пользователь не аутентифицирован или идет загрузка, сбрасываем состояние
    if (!isAuthenticated || loading) {
      setRoleState(null);
      setFetching(false);
      hasFetchedRef.current = false;
      setRoleResolved(false);
      return;
    }
    
    // Если уже загружаем роль, не делаем повторный запрос
    if (fetching) return;
    
    // Если роль уже загружена, не загружаем снова
    if (hasFetchedRef.current) return;
    
    if (profileRoleRaw) {
      setRoleState(profileRoleRaw);
      setFetching(false);
      hasFetchedRef.current = true;
      setRoleResolved(true);
      return;
    }

    let ignore = false;
    hasFetchedRef.current = true; // Помечаем сразу, чтобы предотвратить повторные запросы
    
    const fetchRole = async () => {
      try {
        setFetching(true);
        // Всегда загружаем роль через API /api/v1/profile/user-info
        const info = await userAPI.getUsersInfo();
        const roleFromInfo = String(info?.data?.role || info?.data?.user_role || '').toLowerCase();
        if (!ignore && roleFromInfo) {
          setRoleState(roleFromInfo);
          setRoleResolved(true);
          return;
        }

        const prof = await userAPI.getProfile();
        const roleFromProfile = String(prof?.data?.role || prof?.data?.user_role || '').toLowerCase();
        if (!ignore) {
          setRoleState(roleFromProfile || '');
          setRoleResolved(true);
        }
      } catch (error) {
        // Если API не вернул роль, устанавливаем пустую строку
        // Это позволит компоненту перенаправить пользователя
        if (!ignore) {
          setRoleState('');
          setRoleResolved(true);
        }
      } finally {
        if (!ignore) setFetching(false);
      }
    };
    
    fetchRole();
    return () => { 
      ignore = true;
      // Не сбрасываем hasFetchedRef здесь, чтобы не делать повторный запрос при размонтировании
    };
  }, [isAuthenticated, loading, profileRoleRaw]);

  if (loading || fetching) return <PageSkeleton />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Если роль еще не загружена (null), показываем скелетон
  if (roleState === null) return <PageSkeleton />;
  
  // Если роль пустая строка (загрузка завершена, но роль не найдена), перенаправляем
  if (roleState === '' && roleResolved) return <Navigate to="/" replace />;

  // Нормализуем роль: sale_operator -> sale
  const normalized = (roleState || '').toLowerCase() === 'sale_operator'
    ? 'sale'
    : (roleState || '').toLowerCase();
  
  // Проверяем разрешенные роли (в нижнем регистре)
  const allowed = Array.isArray(roles) ? roles.map(r => String(r).toLowerCase()) : [];
  
  // Проверяем как нормализованную роль, так и оригинальную (для sale_operator)
  const roleLower = (roleState || '').toLowerCase();
  const hasAccess = allowed.includes(normalized) || allowed.includes(roleLower);

  if (!hasAccess) return <Navigate to="/" replace />;
  return children;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { 
        path: "", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <MainPage />
          </Suspense>
        ) 
      },
      { 
        path: "login", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Login />
          </Suspense>
        ) 
      },
      { 
        path: "registration", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Registration />
          </Suspense>
        ) 
      },
      { 
        path: "product/:id", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Product />
          </Suspense>
        ) 
      },
      { 
        path: "profile", 
        element: (
          <RequireAuth>
            <Suspense fallback={<PageSkeleton />}>
              <Profile />
            </Suspense>
          </RequireAuth>
        ) 
      },
      { 
        path: "favorites", 
        element: (
          <RequireAuth>
            <Suspense fallback={<PageSkeleton />}>
              <Favorites />
            </Suspense>
          </RequireAuth>
        ) 
      },
      { 
        path: "cart", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Cart />
          </Suspense>
        ) 
      },
      { 
        path: "order/requested", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <OrderRequestSent />
          </Suspense>
        ) 
      },
      { 
        path: "catalog", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <CatalogPage />
          </Suspense>
        ) 
      },
      { 
        path: "category/:id", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <CategoryPage />
          </Suspense>
        ) 
      },
      { 
        path: "search", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <SearchPage />
          </Suspense>
        ) 
      },
      { 
        path: "update-profile", 
        element: (
          <RequireAuth>
            <Suspense fallback={<PageSkeleton />}>
              <UpdateProfile />
            </Suspense>
          </RequireAuth>
        ) 
      },
      { 
        path: "test-auth", 
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <TestAuth />
          </Suspense>
        ) 
      },
    ],
  },
  {
    path: "/admin",
    element: (
      <RequireRole roles={["ceo", "sale_manager", "driver_manager", "driver", "sale_operator", "warehouse_manager", "admin", "manager", "seo"]}>
        <Suspense fallback={<AdminSkeleton rows={10} />}>
          <AdminLayout />
        </Suspense>
      </RequireRole>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/admin",
        element: (
          <RequireRole roles={["admin", "manager", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminDashboard /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/orders",
        element: (
          <RequireRole roles={["admin", "manager", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminOrders /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/users",
        element: (
          <RequireRole roles={["admin", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminUsers /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/products",
        element: (
          <RequireRole roles={["admin", "manager", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminProducts /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/warehouse",
        element: (
          <RequireRole roles={["admin", "manager", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminWarehouse /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/warehouse/orders",
        element: (
          <RequireRole roles={["admin", "manager", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminWarehouse /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/warehouse/add",
        element: (
          <RequireRole roles={["admin", "manager", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminWarehouse /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/warehouse/locations",
        element: (
          <RequireRole roles={["admin", "manager", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminWarehouse /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/categories",
        element: (
          <RequireRole roles={["admin", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminCategories /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/banners",
        element: (
          <RequireRole roles={["admin", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminBanners /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/audit",
        element: (
          <RequireRole roles={["admin", "seo", "ceo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminAudit /></Suspense>
          </RequireRole>
        )
      },
      {
        path: "/admin/payments",
        element: (
          <RequireRole roles={["ceo", "admin", "seo"]}>
            <Suspense fallback={<AdminSkeleton rows={10} />}><AdminPayments /></Suspense>
          </RequireRole>
        )
      },
    ],
  },
  {
    path: "/sale",
    element: (
      <RequireRole roles={["sale"]}>
        <Suspense fallback={<AdminSkeleton rows={10} />}>
          <SaleLayout />
        </Suspense>
      </RequireRole>
    ),
    errorElement: <ErrorPage />,
    children: [
      { path: "/sale", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminOrders /></Suspense> },
      { path: "/sale/orders", element: <Suspense fallback={<AdminSkeleton rows={10} />}><AdminOrders /></Suspense> },
    ],
  },
]);
