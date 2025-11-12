import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';
import './index.css'
import { router } from "./route.jsx";
import { AuthProvider } from './hooks/useAuth'
import { AppProvider } from './context/AppContext'
import { ErrorBoundary } from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <AuthProvider>
      <AppProvider>
        <RouterProvider router={router}></RouterProvider>
      </AppProvider>
    </AuthProvider>
  </ErrorBoundary>,
)