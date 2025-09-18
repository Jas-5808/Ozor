import './App.css'
import { Outlet} from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider } from './hooks/useAuth'
import DeliveryModal from './components/DeliveryModal'
import { useEffect } from 'react'

function AppContent() {
  const { state, setLocation, showLocationModal, hideLocationModal, setDeliveryMethod, hideDeliveryModal } = useApp();

  useEffect(() => {
    const hasShownLocationModal = localStorage.getItem('hasShownLocationModal');
    const hasLocation = localStorage.getItem('userLocation');

    if (!hasShownLocationModal && !hasLocation) {
      showLocationModal();
      localStorage.setItem('hasShownLocationModal', 'true');
    }
  }, [showLocationModal]);

  const handleLocationConfirm = (deliveryData) => {
    if (deliveryData.location) {
      setLocation(deliveryData.location);
    }
    if (deliveryData.type) {
      setDeliveryMethod(deliveryData.type, deliveryData.address);
    }
  };

  const handleDeliveryConfirm = (deliveryData) => {
    setDeliveryMethod(deliveryData.type, deliveryData.address);
  };

  return (
    <>
      <div className="wrapper">
        <Header />
        <div className="main">
          <Outlet />
        </div>
        <Footer />
      </div>

      <DeliveryModal
        isOpen={state.location.showLocationModal}
        onClose={hideLocationModal}
        onConfirm={handleLocationConfirm}
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}

export default App
