import { useState, useEffect } from 'react';
const useGeolocation = () => {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    address: null,
    city: null,
    country: null,
    error: null,
    loading: false,
    permissionGranted: false
  });
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`
      );
      const data = await response.json();
      if (data && data.display_name) {
        const adr = data.address || {};
        const road = adr.road || adr.pedestrian || adr.cycleway || adr.footway || adr.path || '';
        const house = adr.house_number || '';
        const streetHouse = `${road}${house ? ' ' + house : ''}`.trim();
        const city = adr.city || adr.town || adr.village || adr.locality || adr.county || 'Неизвестно';
        const country = adr.country || 'Неизвестно';
        const compactAddress = streetHouse || data.display_name;
        return {
          address: compactAddress,
          city,
          country
        };
      }
      return null;
    } catch (error) {
      console.error('Ошибка при получении адреса:', error);
      return null;
    }
  };
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Геолокация не поддерживается вашим браузером',
        loading: false
      }));
      return;
    }
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const addressData = await getAddressFromCoords(latitude, longitude);
        setLocation({
          latitude,
          longitude,
          address: addressData?.address || 'Адрес не найден',
          city: addressData?.city || 'Неизвестно',
          country: addressData?.country || 'Неизвестно',
          error: null,
          loading: false,
          permissionGranted: true
        });
      },
      (error) => {
        let errorMessage = 'Не удалось определить местоположение';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Доступ к геолокации запрещен пользователем';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Информация о местоположении недоступна';
            break;
          case error.TIMEOUT:
            errorMessage = 'Время ожидания запроса геолокации истекло';
            break;
          default:
            errorMessage = 'Произошла неизвестная ошибка';
            break;
        }
        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionGranted: false
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 минут
      }
    );
  };
  const requestLocationPermission = () => {
    getCurrentLocation();
  };
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        setLocation(prev => ({ ...prev, ...parsedLocation, loading: false }));
      } catch (error) {
        console.error('Ошибка при загрузке сохраненного местоположения:', error);
      }
    }
  }, []);
  useEffect(() => {
    if (location.latitude && location.longitude && !location.loading && !location.error) {
      localStorage.setItem('userLocation', JSON.stringify(location));
    }
  }, [location]);
  return {
    location,
    getCurrentLocation,
    requestLocationPermission,
    clearLocation: () => {
      setLocation({
        latitude: null,
        longitude: null,
        address: null,
        city: null,
        country: null,
        error: null,
        loading: false,
        permissionGranted: false
      });
      localStorage.removeItem('userLocation');
    }
  };
};
export default useGeolocation;
