import "./App.css";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider } from "./hooks/useAuth";
import { useAuth } from "./hooks/useAuth";
import useGeolocation from "./hooks/useGeolocation";
import DeliveryModal from "./components/DeliveryModal";
import SkipLink from "./components/SkipLink";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function AppContent() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useTranslation();
  
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
        city: geoLocation.city || t("common.location.unknownCity"),
        address: geoLocation.address,
        country: geoLocation.country || t("common.location.unknownCountry"),
        isManual: false,
      });
      hideLocationModal();
    }
  }, [
    geoLocation,
    isAuthenticated,
    state.location.data,
    setLocation,
    hideLocationModal,
  ]);

  return (
    <>
      <SkipLink />
      <div className="wrapper">
        {!shouldHideHeader && <Header />}
        {/* Навбар всегда показывается на мобильных, даже на странице каталога */}
        {isMobile && shouldHideHeader && <Header showOnlyNavbar={true} />}
        <main id="main-content" className="main" tabIndex={-1}>
          <Outlet />
        </main>
        {!shouldHideHeader && !isMobile && <Footer />}
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
