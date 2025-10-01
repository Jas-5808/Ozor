import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorPage } from "./pages/ErrorPage";
import { MainPage } from "./pages/MainPage";
import { Registration } from "./pages/Registration";
import { Login } from "./pages/Login";
import { Product } from "./pages/Product";
import { Profile } from "./pages/Profile";
import { UpdateProfile } from "./pages/UpdateProfile";
import { TestAuth } from "./pages/TestAuth";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "",
                element: <MainPage />,
            },
            {
                path: "login",
                element: <Login />,
            },
            {
                path: "registration",
                element: <Registration />,
            },
            {
                path: "/product/:id",
                element: <Product />,
            },
            {
                path: "profile",
                element: <Profile />,
            },
            {
                path: "update-profile",
                element: <UpdateProfile />,
            },
            {
                path: "test-auth",
                element: <TestAuth />,
            },
        ]
    }
]);
