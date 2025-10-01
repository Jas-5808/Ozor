import React from 'react';
import { useApp } from '../context/AppContext';
import './LocationDisplay.css';
const LocationDisplay: React.FC = () => {
  const { state, showLocationModal, clearLocation } = useApp();
  if (!state.location.isDetected || !state.location.data) {
    return (
      <div className="location-display">
        <div className="location-not-detected">
          <div className="location-icon">📍</div>
          <div className="location-info">
            <h3>Местоположение не определено</h3>
            <p>Определите ваше местоположение для получения актуальных цен и условий доставки</p>
            <button 
              className="detect-location-btn"
              onClick={showLocationModal}
            >
              Определить местоположение
            </button>
          </div>
        </div>
      </div>
    );
  }
  const { city, address, country, isManual } = state.location.data;
  return (
    <div className="location-display">
      <div className="location-detected">
        <div className="location-icon">📍</div>
        <div className="location-info">
          <h3>Ваше местоположение</h3>
          <div className="location-details">
            <p><strong>Город:</strong> {city}</p>
            {address && <p><strong>Адрес:</strong> {address}</p>}
            {country && <p><strong>Страна:</strong> {country}</p>}
            <p className="location-method">
              <span className={`method-badge ${isManual ? 'manual' : 'auto'}`}>
                {isManual ? 'Указано вручную' : 'Определено автоматически'}
              </span>
            </p>
          </div>
          <div className="location-actions">
            <button 
              className="change-location-btn"
              onClick={showLocationModal}
            >
              Изменить местоположение
            </button>
            <button 
              className="clear-location-btn"
              onClick={clearLocation}
            >
              Очистить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LocationDisplay;