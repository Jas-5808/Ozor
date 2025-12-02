import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { uzbekistanLocations, getRegions, getCitiesByRegion, searchLocations, Location } from '../data/uzbekistanLocations';
import './CitySelector.css';
interface CitySelectorProps {
  onSelect: (location: Location) => void;
  onClose: () => void;
  currentLocation?: Location | null;
}
const CitySelector: React.FC<CitySelectorProps> = ({ onSelect, onClose, currentLocation }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'regions' | 'cities' | 'search'>('regions');
  const [showMapModal, setShowMapModal] = useState(false);
  const regions = useMemo(() => getRegions(), []);
  const filteredCities = useMemo(() => {
    if (selectedRegion) {
      return getCitiesByRegion(selectedRegion);
    }
    return [];
  }, [selectedRegion]);
  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    return searchLocations(searchQuery);
  }, [searchQuery]);
  const handleRegionSelect = (region: Location) => {
    setSelectedRegion(region.id);
    setViewMode('cities');
  };
  const handleCitySelect = (city: Location) => {
    onSelect(city);
  };
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      setViewMode('search');
    } else {
      setViewMode('regions');
    }
  };
  const handleBackToRegions = () => {
    setSelectedRegion(null);
    setViewMode('regions');
  };
  const handleBackToCities = () => {
    setViewMode('cities');
  };
  const handleMapSelection = () => {
    setShowMapModal(true);
  };
  const handleMapLocationSelect = (location: any) => {
    const mapLocation: Location = {
      id: `map_${Date.now()}`,
      name: location.city || t('citySelector.mapSelection'),
      type: 'city',
      coordinates: {
        lat: location.latitude,
        lng: location.longitude
      }
    };
    onSelect(mapLocation);
    setShowMapModal(false);
  };
  const renderRegions = () => (
    <div className="city-selector-content">
      <div className="city-selector-header">
        <h3>{t('citySelector.title')}</h3>
        <button className="close-btn" onClick={onClose} aria-label={t('common.actions.close')}>×</button>
      </div>
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder={t('citySelector.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <a 
          className="map-selection-link"
          onClick={(e) => {
            e.preventDefault();
            handleMapSelection();
          }}
          href="#"
        >
          <span className="map-icon">🗺️</span>
          {t('citySelector.pickOnMap')}
        </a>
      </div>
      <div className="regions-grid">
        {regions.map((region) => (
          <div
            key={region.id}
            className="region-card"
            onClick={() => handleRegionSelect(region)}
          >
            <div className="region-icon">🏛️</div>
            <div className="region-info">
              <h4>{region.name}</h4>
              <p>{t('citySelector.cards.citiesCount', { count: getCitiesByRegion(region.id).length })}</p>
            </div>
            <div className="region-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
  const renderCities = () => {
    const region = regions.find(r => r.id === selectedRegion);
    return (
      <div className="city-selector-content">
        <div className="city-selector-header">
          <button className="back-btn" onClick={handleBackToRegions}>
            ← {t('citySelector.back')}
          </button>
          <h3>{region?.name}</h3>
          <button className="close-btn" onClick={onClose} aria-label={t('common.actions.close')}>×</button>
        </div>
        <div className="cities-list">
          {filteredCities.map((city) => (
            <div
              key={city.id}
              className={`city-item ${currentLocation?.id === city.id ? 'selected' : ''}`}
              onClick={() => handleCitySelect(city)}
            >
              <div className="city-icon">🏙️</div>
              <div className="city-info">
                <h4>{city.name}</h4>
                  <p>{t('citySelector.cards.cityLabel')}</p>
              </div>
              {currentLocation?.id === city.id && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  const renderSearchResults = () => (
    <div className="city-selector-content">
      <div className="city-selector-header">
        <button className="back-btn" onClick={() => setViewMode('regions')}>
          ← {t('citySelector.back')}
        </button>
        <h3>{t('citySelector.resultsTitle')}</h3>
        <button className="close-btn" onClick={onClose} aria-label={t('common.actions.close')}>×</button>
      </div>
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder={t('citySelector.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
      <div className="search-results">
        {searchResults.length > 0 ? (
          searchResults.map((location) => (
            <div
              key={location.id}
              className={`search-result-item ${currentLocation?.id === location.id ? 'selected' : ''}`}
              onClick={() => onSelect(location)}
            >
              <div className="result-icon">
                {location.type === 'region' ? '🏛️' : '🏙️'}
              </div>
              <div className="result-info">
                <h4>{location.name}</h4>
                <p>
                  {location.type === 'region'
                    ? t('citySelector.cards.regionLabel')
                    : t('citySelector.cards.cityLabel')}
                </p>
              </div>
              {currentLocation?.id === location.id && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          ))
        ) : (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <p>{t('citySelector.empty.title')}</p>
            <span>{t('citySelector.empty.hint')}</span>
          </div>
        )}
      </div>
    </div>
  );
  return (
    <div className="city-selector-overlay">
      <div className="city-selector-modal">
        {viewMode === 'regions' && renderRegions()}
        {viewMode === 'cities' && renderCities()}
        {viewMode === 'search' && renderSearchResults()}
      </div>
      {}
      {showMapModal && (
        <div className="map-modal-overlay" style={{ zIndex: 1002 }}>
          <div className="map-modal">
        <div className="map-modal-header">
          <h3>{t('citySelector.mapModal.title')}</h3>
          <button className="close-btn" onClick={() => setShowMapModal(false)} aria-label={t('common.actions.close')}>×</button>
            </div>
            <div className="map-container">
              <div className="interactive-map">
                <div className="map-header">
                  <h4>{t('citySelector.mapModal.header')}</h4>
                  <p>{t('citySelector.mapModal.hint')}</p>
                </div>
                <div className="map-regions">
                  <div 
                    className="map-region tashkent"
                    onClick={() => handleMapLocationSelect({
                      latitude: 41.2995,
                      longitude: 69.2401,
                      city: t('profileUpdate.regions.tashkent')
                    })}
                    title={t('profileUpdate.regions.tashkent')}
                  >
                    <span className="region-label">{t('profileUpdate.regions.tashkent')}</span>
                  </div>
                  <div 
                    className="map-region samarkand"
                    onClick={() => handleMapLocationSelect({
                      latitude: 39.6542,
                      longitude: 66.9597,
                      city: t('profileUpdate.regions.samarkand')
                    })}
                    title={t('profileUpdate.regions.samarkand')}
                  >
                    <span className="region-label">{t('profileUpdate.regions.samarkand')}</span>
                  </div>
                  <div 
                    className="map-region andijan"
                    onClick={() => handleMapLocationSelect({
                      latitude: 40.7833,
                      longitude: 72.3333,
                      city: t('profileUpdate.regions.andijan')
                    })}
                    title={t('profileUpdate.regions.andijan')}
                  >
                    <span className="region-label">{t('profileUpdate.regions.andijan')}</span>
                  </div>
                  <div 
                    className="map-region bukhara"
                    onClick={() => handleMapLocationSelect({
                      latitude: 39.7756,
                      longitude: 64.4286,
                      city: t('profileUpdate.regions.bukhara')
                    })}
                    title={t('profileUpdate.regions.bukhara')}
                  >
                    <span className="region-label">{t('profileUpdate.regions.bukhara')}</span>
                  </div>
                  <div 
                    className="map-region fergana"
                    onClick={() => handleMapLocationSelect({
                      latitude: 40.3833,
                      longitude: 71.7833,
                      city: t('profileUpdate.regions.fergana')
                    })}
                    title={t('profileUpdate.regions.fergana')}
                  >
                    <span className="region-label">{t('profileUpdate.regions.fergana')}</span>
                  </div>
                  <div 
                    className="map-region namangan"
                    onClick={() => handleMapLocationSelect({
                      latitude: 40.9969,
                      longitude: 71.6725,
                      city: t('profileUpdate.regions.namangan')
                    })}
                    title={t('profileUpdate.regions.namangan')}
                  >
                    <span className="region-label">{t('profileUpdate.regions.namangan')}</span>
                  </div>
                </div>
                <div className="map-legend">
                  <div className="legend-item">
                    <div className="legend-color"></div>
                    <span>{t('citySelector.mapModal.hint')}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="map-modal-footer">
              <button 
                className="confirm-location-btn"
                onClick={() => setShowMapModal(false)}
              >
                {t('citySelector.mapModal.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CitySelector;
