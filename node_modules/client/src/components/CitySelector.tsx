import React, { useState, useMemo } from 'react';
import { uzbekistanLocations, getRegions, getCitiesByRegion, searchLocations, Location } from '../data/uzbekistanLocations';
import './CitySelector.css';
interface CitySelectorProps {
  onSelect: (location: Location) => void;
  onClose: () => void;
  currentLocation?: Location | null;
}
const CitySelector: React.FC<CitySelectorProps> = ({ onSelect, onClose, currentLocation }) => {
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
      name: location.city || 'Выбранное местоположение',
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
        <h3>Выберите область</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Поиск города или области..."
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
          Выбрать на карте
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
              <p>{getCitiesByRegion(region.id).length} городов</p>
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
            ← Назад
          </button>
          <h3>{region?.name}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
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
                <p>Город</p>
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
          ← Назад
        </button>
        <h3>Результаты поиска</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Поиск города или области..."
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
                <p>{location.type === 'region' ? 'Область' : 'Город'}</p>
              </div>
              {currentLocation?.id === location.id && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          ))
        ) : (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <p>Ничего не найдено</p>
            <span>Попробуйте изменить запрос</span>
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
              <h3>Выберите местоположение на карте</h3>
              <button className="close-btn" onClick={() => setShowMapModal(false)}>×</button>
            </div>
            <div className="map-container">
              <div className="interactive-map">
                <div className="map-header">
                  <h4>Карта Узбекистана</h4>
                  <p>Нажмите на область для выбора города</p>
                </div>
                <div className="map-regions">
                  <div 
                    className="map-region tashkent"
                    onClick={() => handleMapLocationSelect({
                      latitude: 41.2995,
                      longitude: 69.2401,
                      city: 'Ташкент'
                    })}
                    title="Ташкент"
                  >
                    <span className="region-label">Ташкент</span>
                  </div>
                  <div 
                    className="map-region samarkand"
                    onClick={() => handleMapLocationSelect({
                      latitude: 39.6542,
                      longitude: 66.9597,
                      city: 'Самарканд'
                    })}
                    title="Самарканд"
                  >
                    <span className="region-label">Самарканд</span>
                  </div>
                  <div 
                    className="map-region andijan"
                    onClick={() => handleMapLocationSelect({
                      latitude: 40.7833,
                      longitude: 72.3333,
                      city: 'Андижан'
                    })}
                    title="Андижан"
                  >
                    <span className="region-label">Андижан</span>
                  </div>
                  <div 
                    className="map-region bukhara"
                    onClick={() => handleMapLocationSelect({
                      latitude: 39.7756,
                      longitude: 64.4286,
                      city: 'Бухара'
                    })}
                    title="Бухара"
                  >
                    <span className="region-label">Бухара</span>
                  </div>
                  <div 
                    className="map-region fergana"
                    onClick={() => handleMapLocationSelect({
                      latitude: 40.3833,
                      longitude: 71.7833,
                      city: 'Фергана'
                    })}
                    title="Фергана"
                  >
                    <span className="region-label">Фергана</span>
                  </div>
                  <div 
                    className="map-region namangan"
                    onClick={() => handleMapLocationSelect({
                      latitude: 40.9969,
                      longitude: 71.6725,
                      city: 'Наманган'
                    })}
                    title="Наманган"
                  >
                    <span className="region-label">Наманган</span>
                  </div>
                </div>
                <div className="map-legend">
                  <div className="legend-item">
                    <div className="legend-color"></div>
                    <span>Нажмите на область для выбора</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="map-modal-footer">
              <button 
                className="confirm-location-btn"
                onClick={() => setShowMapModal(false)}
              >
                Закрыть карту
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CitySelector;