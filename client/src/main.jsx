import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';
import './index.css'
import { router } from "./route.jsx";
import { AuthProvider } from './hooks/useAuth'
import { AppProvider } from './context/AppContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <RouterProvider router={router}></RouterProvider>
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>,
)