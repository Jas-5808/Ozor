import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type mapboxgl from 'mapbox-gl';
import { MAPBOX_CONFIG } from '../config/mapbox';
import './ModernMap.css';

// Dynamically import mapbox-gl to reduce the initial bundle size
let mapboxglLib: typeof mapboxgl | null = null;
let mapboxglCssLoaded = false;

const loadMapbox = async () => {
  if (!mapboxglLib) {
    const [mapboxModule] = await Promise.all([
      import('mapbox-gl'),
      // Load the CSS bundle only once
      mapboxglCssLoaded 
        ? Promise.resolve() 
        : import('mapbox-gl/dist/mapbox-gl.css').then(() => { mapboxglCssLoaded = true; })
    ]);
    mapboxglLib = mapboxModule.default;
  }
  return mapboxglLib;
};
interface ModernMapProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
    fullAddress?: string;
    city: string;
    country: string;
    region?: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
}
const ModernMap: React.FC<ModernMapProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  initialLocation
}) => {
  const { t } = useTranslation();
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [marker, setMarker] = useState<mapboxgl.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string; // short form: street + house number
    fullAddress?: string; // full formatted address
    city: string;
    country: string;
    region?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentMapStyle, setCurrentMapStyle] = useState(MAPBOX_CONFIG.defaultStyle);
  const [favoritePlaces, setFavoritePlaces] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchType, setSearchType] = useState<'address' | 'poi'>('address');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Manual address input
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [manualStreet, setManualStreet] = useState('');
  const [manualHouse, setManualHouse] = useState('');
  const [manualApartment, setManualApartment] = useState('');
  const [manualNote, setManualNote] = useState('');

  const reverseGeocodeOSM = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`);
      const data = await res.json();
      const adr = data?.address || {};
      const road = adr.road || adr.pedestrian || adr.cycleway || adr.footway || adr.path || '';
      const house = adr.house_number || '';
      const streetHouse = `${road}${house ? ' ' + house : ''}`.trim();
      const city = adr.city || adr.town || adr.village || adr.locality || adr.county || t('common.location.unknownCity');
      const country = adr.country || t('common.location.unknownCountry');
      const fullAddress = data?.display_name || [streetHouse, city, country].filter(Boolean).join(', ');
      return {
        latitude: lat,
        longitude: lng,
        address: streetHouse || fullAddress,
        fullAddress,
        city,
        country,
        region: adr.state || adr.region || ''
      };
    } catch (e) {
      return null;
    }
  };
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Load Mapbox assets only when the modal is open
  useEffect(() => {
    if (isOpen && !mapboxLoaded) {
      loadMapbox().then((mapbox) => {
        mapbox.accessToken = MAPBOX_CONFIG.accessToken;
        setMapboxLoaded(true);
      });
    }
  }, [isOpen, mapboxLoaded]);
  
  const createCustomMarker = (isFavorite = false) => {
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    markerElement.innerHTML = `
      <div class="marker-container ${isFavorite ? 'favorite' : ''}">
        <div class="marker-shadow"></div>
        <div class="marker-pulse"></div>
        <div class="marker-pin">
          <div class="marker-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <div class="marker-ripple"></div>
      </div>
    `;
    return markerElement;
  };
  const getAddressFromCoords = async (lat: number, lng: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_CONFIG.accessToken}&language=ru&types=address,poi,place`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        // Prefer the most precise feature: address → poi → everything else
        const sorted = [...data.features].sort((a: any, b: any) => {
          const priority = (f: any) => (f.place_type?.includes('address') ? 0 : f.place_type?.includes('poi') ? 1 : 2);
          const da = priority(a);
          const db = priority(b);
          if (da !== db) return da - db;
          // fallback to relevance when available
          return (b.relevance || 0) - (a.relevance || 0);
        });
        const feature = sorted[0];
        const context = feature.context || [];
        const city = feature.text?.length && feature.place_type?.includes('place') ? feature.text :
                    context.find((c: any) => c.id.startsWith('place.'))?.text || 
                    context.find((c: any) => c.id.startsWith('locality.'))?.text || 
                    t('common.location.unknownCity');
        const country = context.find((c: any) => c.id.startsWith('country.'))?.text || t('common.location.unknownCountry');
        const region = context.find((c: any) => c.id.startsWith('region.'))?.text || '';
        // Build a short address (street + house) for address features, otherwise use place_name
        const isAddress = feature.place_type?.includes('address');
        const street = feature.text; // street label
        const house = (feature as any).address; // house number if present
        const shortAddress = isAddress && (street || house)
          ? `${street || ''}${house ? ' ' + house : ''}`.trim()
          : feature.place_name;
        const fullAddress = feature.place_name;
        const result = {
          latitude: lat,
          longitude: lng,
          address: shortAddress,
          fullAddress,
          city: city,
          country: country,
          region
        };
        // If Mapbox misses street/house data, try OSM as a fallback
        const lacksStreet = !isAddress || !street;
        const onlyCityCountry = !shortAddress || shortAddress === city || shortAddress === country || shortAddress === `${city}, ${country}`;
        if (lacksStreet || onlyCityCountry) {
          const osm = await reverseGeocodeOSM(lat, lng);
          if (osm && osm.address && osm.address !== city && osm.address !== country) {
            return osm;
          }
        }
        return result;
      }
      return null;
    } catch (error) {
      console.error('Address lookup failed:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  const geocodeManualAddress = async () => {
    const parts = [] as string[];
    if (manualStreet) parts.push(manualStreet);
    if (manualHouse) parts.push(manualHouse);
    const streetPart = parts.join(' ').trim();
    const queryCore = [streetPart, manualCity, 'Uzbekistan'].filter(Boolean).join(', ');
    if (!queryCore) return;
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryCore)}.json?access_token=${MAPBOX_CONFIG.accessToken}&country=UZ&limit=1&language=ru&types=address,poi,place`
      );
      const data = await response.json();
      const feature = data.features?.[0];
      if (feature && feature.center && feature.center.length === 2) {
        const [lng, lat] = feature.center;
        if (map && marker) {
          map.flyTo({ center: [lng, lat], zoom: 16 });
          marker.setLngLat([lng, lat]);
        }
        const context = feature.context || [];
        const city = feature.text?.length && feature.place_type?.includes('place') ? feature.text :
          context.find((c: any) => c.id.startsWith('place.'))?.text ||
          context.find((c: any) => c.id.startsWith('locality.'))?.text || manualCity || t('common.location.unknownCity');
        const country = context.find((c: any) => c.id.startsWith('country.'))?.text || 'Uzbekistan';
        const isAddress = feature.place_type?.includes('address');
        const street = feature.text;
        const house = (feature as any).address;
        const shortAddress = isAddress && (street || house)
          ? `${street || ''}${house ? ' ' + house : ''}`.trim()
          : feature.place_name;
        const fullAddress = feature.place_name;
        setSelectedLocation({
          latitude: lat,
          longitude: lng,
          address: shortAddress,
          fullAddress,
          city,
          country
        });
        setShowSearchResults(false);
        setShowSearchHistory(false);
      }
    } catch (error) {
      console.error('Manual geocoding failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const searchAddresses = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    try {
      let types = 'address,poi,place,locality,neighborhood';
      let proximity = '';
      if (selectedLocation) {
        proximity = `&proximity=${selectedLocation.longitude},${selectedLocation.latitude}`;
      }
      if (searchType === 'poi') {
        types = 'poi';
      }
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_CONFIG.accessToken}&country=UZ&limit=10&language=ru&types=${types}${proximity}`
      );
      const data = await response.json();
      const filteredResults = (data.features || []).filter((result: any) => {
        return result.center && result.center.length === 2;
      }).sort((a: any, b: any) => {
        return (b.relevance || 0) - (a.relevance || 0);
      });
      setSearchResults(filteredResults);
      setShowSearchResults(filteredResults.length > 0);
    } catch (error) {
      console.error('Search request failed:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('map.alerts.geolocationUnsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (map && marker) {
          map.flyTo({ center: [longitude, latitude], zoom: 16 });
          marker.setLngLat([longitude, latitude]);
          const locationData = await getAddressFromCoords(latitude, longitude);
          if (locationData) {
            setSelectedLocation(locationData);
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert(t('map.alerts.geolocationFailed'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };
  const toggleFavorite = (location: any) => {
    const isFavorite = favoritePlaces.some(fav => 
      fav.latitude === location.latitude && fav.longitude === location.longitude
    );
    if (isFavorite) {
      setFavoritePlaces(favoritePlaces.filter(fav => 
        !(fav.latitude === location.latitude && fav.longitude === location.longitude)
      ));
    } else {
      setFavoritePlaces([...favoritePlaces, location]);
    }
  };
  const changeMapStyle = (style: string) => {
    setCurrentMapStyle(style);
    if (map) {
      map.setStyle(style);
    }
  };
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    const newStyle = isDarkMode ? MAPBOX_CONFIG.styles.streets : MAPBOX_CONFIG.styles.dark;
    changeMapStyle(newStyle);
  };
  const addToSearchHistory = (query: string) => {
    if (query.trim() && !searchHistory.includes(query.trim())) {
    const newHistory = [query.trim(), ...searchHistory.slice(0, 4)]; // keep last 5 queries
      setSearchHistory(newHistory);
      localStorage.setItem('mapSearchHistory', JSON.stringify(newHistory));
    }
  };
  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('mapSearchHistory');
  };
  const selectFromHistory = (query: string) => {
    setSearchQuery(query);
    searchAddresses(query);
    setShowSearchHistory(false);
  };
  useEffect(() => {
    const savedHistory = localStorage.getItem('mapSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  }, []);
  useEffect(() => {
    if (!isOpen || !mapRef.current || !mapboxLoaded) return;
    
    let mapInstance: mapboxgl.Map | null = null;
    let markerInstance: mapboxgl.Marker | null = null;
    
    const initMap = async () => {
      const mapbox = await loadMapbox();
      if (!mapRef.current) return;
      
      const defaultLat = initialLocation?.latitude || MAPBOX_CONFIG.defaultCenter[1];
      const defaultLng = initialLocation?.longitude || MAPBOX_CONFIG.defaultCenter[0];
      
      try {
        mapInstance = new mapbox.Map({
        container: mapRef.current,
        style: currentMapStyle,
        center: [defaultLng, defaultLat], // [longitude, latitude]
        zoom: MAPBOX_CONFIG.defaultZoom,
        attributionControl: true
      });
      const markerElement = createCustomMarker();
      markerInstance = new mapbox.Marker({
        element: markerElement,
        draggable: MAPBOX_CONFIG.marker.draggable
      })
        .setLngLat([defaultLng, defaultLat])
        .addTo(mapInstance);
      mapInstance.on('click', async (e) => {
        const { lng, lat } = e.lngLat;
        markerInstance.setLngLat([lng, lat]);
        const locationData = await getAddressFromCoords(lat, lng);
        if (locationData) {
          setSelectedLocation(locationData);
        }
      });
      markerInstance.on('dragend', async () => {
        const lngLat = markerInstance.getLngLat();
        const locationData = await getAddressFromCoords(lngLat.lat, lngLat.lng);
        if (locationData) {
          setSelectedLocation(locationData);
        }
      });
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery) {
          e.preventDefault();
          if (searchResults.length > 0) {
            handleSearchResultSelect(searchResults[0]);
          }
        } else if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'g' && e.ctrlKey) {
          e.preventDefault();
          getCurrentLocation();
        }
      };
      document.addEventListener('keydown', handleKeyPress);
      const getInitialAddress = async () => {
        const initialLocationData = await getAddressFromCoords(defaultLat, defaultLng);
        if (initialLocationData) {
          setSelectedLocation(initialLocationData);
        }
      };
      mapInstance.on('load', getInitialAddress);
      setMap(mapInstance);
      setMarker(markerInstance);
    } catch (error) {
      console.error('Failed to initialize Mapbox map:', error);
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f3f4f6; color: #6b7280; text-align: center; padding: 20px;">
            <div>
              <h4>${t('map.errors.mapUnavailableTitle')}</h4>
              <p>${t('map.errors.mapUnavailableDescription')}</p>
            </div>
          </div>
        `;
      }
      return;
    }
    };
    
    initMap();
    
    return () => {
      const cleanupHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery) {
          e.preventDefault();
          if (searchResults.length > 0) {
            handleSearchResultSelect(searchResults[0]);
          }
        } else if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'g' && e.ctrlKey) {
          e.preventDefault();
          getCurrentLocation();
        }
      };
      document.removeEventListener('keydown', cleanupHandler);
      // Clear pending timers when unmounting
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (mapInstance) {
        mapInstance.remove();
        setMap(null);
        setMarker(null);
      }
    };
  }, [isOpen, initialLocation, mapboxLoaded, currentMapStyle, searchQuery, searchResults]);
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Reset previous debounce timer
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.length >= 2) {
      // Debounce: wait ~300ms before firing search
      searchTimeoutRef.current = setTimeout(() => {
        searchAddresses(query);
        setShowSearchHistory(false);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      if (query.length === 0) {
        setShowSearchHistory(true);
      }
    }
  };
  const handleSearchResultSelect = async (result: any) => {
    const [lng, lat] = result.center;
    if (map && marker) {
      map.flyTo({ center: [lng, lat], zoom: 16 });
      marker.setLngLat([lng, lat]);
      const locationData = await getAddressFromCoords(lat, lng);
      if (locationData) {
        setSelectedLocation(locationData);
      }
    }
    addToSearchHistory(result.place_name || result.text || searchQuery);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setShowSearchHistory(false);
  };
  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };
  if (!isOpen) return null;
  return (
    <div className="modern-map-overlay">
      <div className="modern-map-modal">
        <div className="map-modal-header">
          <div className="header-content">
            <div className="search-box">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <input
                type="text"
                placeholder={t('map.search.placeholder')}
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => {
                  setIsSearchFocused(true);
                  if (searchQuery.length === 0) {
                    setShowSearchHistory(true);
                  }
                  if (searchQuery.length >= 2 && searchResults.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
                onBlur={(e) => {
                  setIsSearchFocused(false);
                    // Delay hiding results so users can click
                  setTimeout(() => {
                    setShowSearchHistory(false);
                    // Hide results only when focus truly leaves the list
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (document.activeElement !== e.target && !relatedTarget?.closest('.search-results')) {
                      setShowSearchResults(false);
                    }
                  }, 200);
                }}
                className="search-input"
              />
              {}
              <div className="search-type-toggle">
                <button 
                  className={`search-type-btn ${searchType === 'address' ? 'active' : ''}`}
                  onClick={() => setSearchType('address')}
                  title={t('map.search.addressMode')}
                >
                  🏠
                </button>
                <button 
                  className={`search-type-btn ${searchType === 'poi' ? 'active' : ''}`}
                  onClick={() => setSearchType('poi')}
                  title={t('map.search.poiMode')}
                >
                  📍
                </button>
              </div>
              {searchQuery && (
                <button 
                  className="clear-search"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                    setShowSearchHistory(true);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              )}
            </div>
            {showManualInput && (
              <div className="manual-input-panel" role="region" aria-label={t('map.manual.aria')}>
                <div className="manual-row">
                  <div className="field">
                    <label htmlFor="manual-city">{t('map.manual.labels.city')}</label>
                    <input
                      id="manual-city"
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      placeholder={t('map.manual.placeholders.city')}
                    />
                  </div>
                  <div className="field field-large">
                    <label htmlFor="manual-street">{t('map.manual.labels.street')}</label>
                    <input
                      id="manual-street"
                      value={manualStreet}
                      onChange={(e) => setManualStreet(e.target.value)}
                      placeholder={t('map.manual.placeholders.street')}
                    />
                  </div>
                  <div className="field field-small">
                    <label htmlFor="manual-house">{t('map.manual.labels.house')}</label>
                    <input
                      id="manual-house"
                      value={manualHouse}
                      onChange={(e) => setManualHouse(e.target.value)}
                      placeholder={t('map.manual.placeholders.house')}
                    />
                  </div>
                </div>
                <div className="manual-row">
                  <div className="field">
                    <label htmlFor="manual-apartment">{t('map.manual.labels.apartment')}</label>
                    <input
                      id="manual-apartment"
                      value={manualApartment}
                      onChange={(e) => setManualApartment(e.target.value)}
                      placeholder={t('map.manual.placeholders.apartment')}
                    />
                  </div>
                  <div className="field field-grow">
                    <label htmlFor="manual-note">{t('map.manual.labels.note')}</label>
                    <input
                      id="manual-note"
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      placeholder={t('map.manual.placeholders.note')}
                    />
                  </div>
                  <div className="actions">
                    <button className="locate-btn" onClick={geocodeManualAddress} title={t('map.manual.findTitle')}>
                      {t('map.manual.find')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {}
            {showSearchHistory && searchHistory.length > 0 && !searchQuery && (
              <div className="search-history">
                <div className="search-history-header">
                  <span>{t('map.search.historyTitle')}</span>
                  <button 
                    className="clear-history-btn"
                    onClick={clearSearchHistory}
                    title={t('map.search.clearHistory')}
                  >
                    🗑️
                  </button>
                </div>
                {searchHistory.map((query, index) => (
                  <div
                    key={index}
                    className="search-history-item"
                    onClick={() => selectFromHistory(query)}
                  >
                    <div className="history-icon">🕒</div>
                    <div className="history-text">{query}</div>
                  </div>
                ))}
              </div>
            )}
            {}
            {searchQuery.length >= 2 && showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.id || index}-${result.place_name}`}
                    className="search-result-item"
                    onClick={() => handleSearchResultSelect(result)}
                    onMouseDown={(e) => {
                      // Prevent blur when clicking inside the list
                      e.preventDefault();
                    }}
                  >
                    <div className="result-icon">
                      {searchType === 'poi' ? '📍' : '🏠'}
                    </div>
                    <div className="result-content">
                      <div className="result-name">{result.place_name}</div>
                      <div className="result-type">
                        {result.place_type?.join(', ') || t('map.resultType')}
                        {result.distance && ` • ${t('map.search.distanceMeters', { value: Math.round(result.distance) })}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && showSearchResults && searchResults.length === 0 && !isLoading && (
              <div className="search-results">
                <div className="search-no-results">
                  <p>{t('map.search.noResults')}</p>
                  <p className="search-no-results-hint">{t('map.search.noResultsHint')}</p>
                </div>
              </div>
            )}
          </div>
          <div className="header-controls">
            {favoritePlaces.length > 0 && (
              <div className="favorites-dropdown">
                <button className="favorites-toggle" title={t('map.favorites.title')}>
                  ⭐ {favoritePlaces.length}
                </button>
                <div className="favorites-dropdown-content">
                  {favoritePlaces.map((place, index) => (
                    <div 
                      key={index} 
                      className="favorite-dropdown-item"
                      onClick={() => {
                        if (map && marker) {
                          map.flyTo({ center: [place.longitude, place.latitude], zoom: 16 });
                          marker.setLngLat([place.longitude, place.latitude]);
                          setSelectedLocation(place);
                        }
                      }}
                    >
                      <div className="favorite-dropdown-name">{place.address.split(',')[0]}</div>
                      <div className="favorite-dropdown-city">{place.city}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="close-btn" onClick={onClose} title={`${t('map.controls.close')} (Esc)`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="map-container">
          <div ref={mapRef} className="map" />
          {}
          <button 
            className="map-control-btn map-geolocation-btn" 
            onClick={getCurrentLocation} 
            title={`${t('map.controls.myLocation')} (Ctrl+G)`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
            </svg>
          </button>
          {}
            <button 
              className="map-control-btn map-zoom-in-btn" 
              onClick={() => map && map.zoomIn()} 
              title={t('map.controls.zoomIn')}
              aria-label={t('map.controls.zoomIn')}
            >
              +
            </button>
            <button 
              className="map-control-btn map-zoom-out-btn" 
              onClick={() => map && map.zoomOut()} 
              title={t('map.controls.zoomOut')}
              aria-label={t('map.controls.zoomOut')}
            >
              −
            </button>
            <button 
              className="map-control-btn map-recenter-btn" 
              onClick={() => {
                if (map && marker) {
                  const pos = marker.getLngLat();
                  map.flyTo({ center: [pos.lng, pos.lat], zoom: 16 });
                }
              }} 
              title={t('map.controls.recenter')}
              aria-label={t('map.controls.recenter')}
            >
              ⊙
            </button>
            {}
          <div className="map-style-controls">
            <button 
              className={`map-style-btn ${currentMapStyle === MAPBOX_CONFIG.styles.streets ? 'active' : ''}`}
              onClick={() => changeMapStyle(MAPBOX_CONFIG.styles.streets)}
              title={t('map.controls.streets')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" fill="currentColor"/>
              </svg>
            </button>
            <button 
              className={`map-style-btn ${currentMapStyle === MAPBOX_CONFIG.styles.satellite ? 'active' : ''}`}
              onClick={() => changeMapStyle(MAPBOX_CONFIG.styles.satellite)}
              title={t('map.controls.satellite')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
              </svg>
            </button>
            <button 
              className={`map-style-btn ${currentMapStyle === MAPBOX_CONFIG.styles.dark ? 'active' : ''}`}
              onClick={() => changeMapStyle(MAPBOX_CONFIG.styles.dark)}
              title={t('map.controls.dark')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          {isLoading && (
            <div className="map-loading">
              <div className="loading-spinner"></div>
              <p>{t('map.status.gettingAddress')}</p>
            </div>
          )}
        </div>
        <div className="map-modal-footer">
          <div className="footer-left">
          </div>
          <div className="footer-center">
            <div 
              className="selected-address" 
              title={selectedLocation ? (selectedLocation.fullAddress || selectedLocation.address) : t('map.status.selectOnMap')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
              </svg>
              <div className="selected-address-text">
                {selectedLocation ? (selectedLocation.fullAddress || selectedLocation.address) : t('map.status.selectOnMap')}
              </div>
            </div>
          </div>
          <div className="footer-right">
            {selectedLocation && (
              <button 
                className="favorite-btn"
                onClick={() => toggleFavorite(selectedLocation)}
                title={t('map.controls.addFavorite')}
              >
                {favoritePlaces.some(fav => 
                  fav.latitude === selectedLocation.latitude && fav.longitude === selectedLocation.longitude
                ) ? '⭐' : '☆'}
              </button>
            )}
            <button 
              className="confirm-btn" 
              onClick={handleConfirm}
              disabled={!selectedLocation || isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('map.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ModernMap;
