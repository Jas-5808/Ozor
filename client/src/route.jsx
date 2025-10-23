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
import { AdminLayout, Dashboard, Products as AdminProducts, Categories as AdminCategories, Banners as AdminBanners, Orders as AdminOrders, Users as AdminUsers, Audit as AdminAudit } from './admin';
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
      { path: "/admin", element: <Dashboard /> },
      { path: "/admin/products", element: <AdminProducts /> },
      { path: "/admin/categories", element: <AdminCategories /> },
      { path: "/admin/banners", element: <AdminBanners /> },
      { path: "/admin/orders", element: <AdminOrders /> },
      { path: "/admin/users", element: <AdminUsers /> },
      { path: "/admin/audit", element: <AdminAudit /> },
    ],
  },
]);
