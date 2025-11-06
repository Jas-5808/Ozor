import "./App.css";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider } from "./hooks/useAuth";
import { useAuth } from "./hooks/useAuth";
import useGeolocation from "./hooks/useGeolocation";
import DeliveryModal from "./components/DeliveryModal";
import { useEffect, useState } from "react";

function AppContent() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  
  // Проверяем, мобильное ли устройство и находимся ли на странице каталога
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const isCatalogPage = location.pathname === '/catalog';
  const shouldHideHeader = isCatalogPage && isMobile; // Скрываем только верхнюю часть на каталоге
  const {
    state,
    setLocation,
    showLocationModal,
    hideLocationModal,
    setDeliveryMethod,
    hideDeliveryModal,
  } = useApp();
  const { isAuthenticated } = useAuth();
  const { location: geoLocation, requestLocationPermission } = useGeolocation();

  useEffect(() => {
    const hasShownLocationModal = localStorage.getItem("hasShownLocationModal");
    const hasLocation = localStorage.getItem("userLocation");

    if (!hasShownLocationModal && !hasLocation) {
      showLocationModal();
      localStorage.setItem("hasShownLocationModal", "true");
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

  // После успешного входа пытаемся автоматически определить геолокацию
  useEffect(() => {
    if (isAuthenticated && !state.location.data) {
      requestLocationPermission();
    }
  }, [isAuthenticated, state.location.data, requestLocationPermission]);

  // Когда геолокация получена, записываем её в контекст и закрываем модалку
  useEffect(() => {
    if (
      geoLocation?.latitude &&
      geoLocation?.longitude &&
      geoLocation?.address &&
      (!state.location.data || !state.location.isDetected)
    ) {
      setLocation({
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        city: geoLocation.city || "Неизвестно",
        address: geoLocation.address,
        country: geoLocation.country || "Неизвестно",
        isManual: false,
      });
      hideLocationModal();
    } else if (geoLocation?.error && isAuthenticated && !state.location.data) {
      // Если не удалось получить геопозицию — показываем модалку выбора вручную
      showLocationModal();
    }
  }, [
    geoLocation,
    isAuthenticated,
    state.location.data,
    setLocation,
    hideLocationModal,
    showLocationModal,
  ]);

  return (
    <>
      <div className="wrapper">
        {!shouldHideHeader && <Header />}
        {/* Навбар всегда показывается на мобильных, даже на странице каталога */}
        {isMobile && shouldHideHeader && <Header showOnlyNavbar={true} />}
        <div className="main">
          <Outlet />
        </div>
        {!shouldHideHeader && <Footer />}
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
    <AppContent />
  )
}

export default App;
