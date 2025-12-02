import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  country: string | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
}

interface AddressData {
  address: string;
  city: string;
  country: string;
}

const useGeolocation = () => {
  const { t } = useTranslation();
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    address: null,
    city: null,
    country: null,
    error: null,
    loading: false,
    permissionGranted: false,
  });
  const getAddressFromCoords = async (
    lat: number,
    lng: number
  ): Promise<AddressData | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`
      );
      const data = await response.json();
      if (data && data.display_name) {
        const adr = data.address || {};
        const road =
          adr.road ||
          adr.pedestrian ||
          adr.cycleway ||
          adr.footway ||
          adr.path ||
          "";
        const house = adr.house_number || "";
        const streetHouse = `${road}${house ? " " + house : ""}`.trim();
        const city =
          adr.city ||
          adr.town ||
          adr.village ||
          adr.locality ||
          adr.county ||
          t("common.location.unknownCity");
        const country = adr.country || t("common.location.unknownCountry");
        const compactAddress = streetHouse || data.display_name;
        return {
          address: compactAddress,
          city,
          country,
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to resolve address:", error);
      return null;
    }
  };
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: t("common.errors.geolocation.unsupported"),
        loading: false,
      }));
      return;
    }
    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const addressData = await getAddressFromCoords(latitude, longitude);
        setLocation({
          latitude,
          longitude,
          address: addressData?.address || t("common.errors.geolocation.addressNotFound"),
          city: addressData?.city || t("common.location.unknownCity"),
          country: addressData?.country || t("common.location.unknownCountry"),
          error: null,
          loading: false,
          permissionGranted: true,
        });
      },
      (error) => {
        let errorMessage = t("common.errors.geolocation.failed");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t("common.errors.geolocation.denied");
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = t("common.errors.geolocation.unavailable");
            break;
          case error.TIMEOUT:
            errorMessage = t("common.errors.geolocation.timeout");
            break;
          default:
            errorMessage = t("common.errors.geolocation.unknown");
            break;
        }
        setLocation((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionGranted: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 минут
      }
    );
  };
  const requestLocationPermission = () => {
    getCurrentLocation();
  };
  useEffect(() => {
    const savedLocation = localStorage.getItem("userLocation");
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        setLocation((prev) => ({ ...prev, ...parsedLocation, loading: false }));
      } catch (error) {
        console.error(
          "Failed to read stored location:",
          error
        );
      }
    }
  }, []);
  useEffect(() => {
    if (
      location.latitude &&
      location.longitude &&
      !location.loading &&
      !location.error
    ) {
      localStorage.setItem("userLocation", JSON.stringify(location));
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
        permissionGranted: false,
      });
      localStorage.removeItem("userLocation");
    },
  };
};
export default useGeolocation;
