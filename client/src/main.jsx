import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import './index.css'
import { router } from "./route.jsx";
import { AuthProvider } from './hooks/useAuth'
import { AppProvider } from './context/AppContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import i18n from './i18n';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <AppProvider>
          <RouterProvider router={router}></RouterProvider>
        </AppProvider>
      </AuthProvider>
    </I18nextProvider>
  </ErrorBoundary>,
)