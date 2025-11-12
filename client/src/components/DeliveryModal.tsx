import React, { useState, useEffect, lazy, Suspense } from 'react';
import './DeliveryModal.css';
import { useApp } from '../context/AppContext';

// Lazy load ModernMap для уменьшения initial bundle size
const ModernMap = lazy(() => import('./ModernMap'));

const STORAGE_KEY = 'deliveryAddresses';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deliveryData: { type: string; address?: string; location?: any }) => void;
}

interface Address {
  id: number;
  text: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { state } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<'pickup' | 'courier'>('courier');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Загрузка адресов из localStorage при открытии модалки
  useEffect(() => {
    if (isOpen) {
      try {
        const savedAddresses = localStorage.getItem(STORAGE_KEY);
        if (savedAddresses) {
          const parsed = JSON.parse(savedAddresses) as Address[];
          setAddresses(parsed);
          // Восстанавливаем выбранный адрес, если он был сохранен
          const savedSelectedId = localStorage.getItem('selectedAddressId');
          if (savedSelectedId && parsed.some(addr => addr.id === Number(savedSelectedId))) {
            setSelectedAddressId(Number(savedSelectedId));
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке адресов из localStorage:', error);
      }
    }
  }, [isOpen]);

  // Сохранение адресов в localStorage при изменении
  useEffect(() => {
    if (isOpen && addresses.length >= 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
        if (selectedAddressId !== null) {
          localStorage.setItem('selectedAddressId', String(selectedAddressId));
        } else {
          localStorage.removeItem('selectedAddressId');
        }
      } catch (error) {
        console.error('Ошибка при сохранении адресов в localStorage:', error);
      }
    }
  }, [addresses, selectedAddressId, isOpen]);
  const handleConfirm = () => {
    const selected = addresses.find(addr => addr.id === selectedAddressId!);
    onConfirm({
      type: selectedMethod,
      address: selectedMethod === 'courier' ? selected?.text : undefined,
      location: {
        latitude: selected?.latitude,
        longitude: selected?.longitude,
        city: selected?.city || 'Неизвестно',
        address: selected?.text || '',
        country: selected?.country || 'Неизвестно',
        isManual: true
      }
    });
    onClose();
  };
  const handleAddressSelect = (addressId: number) => {
    setSelectedAddressId(addressId);
    setShowOptionsMenu(null);
  };
  const handleDeleteAddress = (addressId: number) => {
    const newAddresses = addresses.filter(addr => addr.id !== addressId);
    if (newAddresses.length > 0 || addresses.length === 1) {
      setAddresses(newAddresses);
      if (selectedAddressId === addressId) {
        const next = newAddresses.length > 0 ? newAddresses[0] : null;
        setSelectedAddressId(next ? next.id : null);
      }
    }
    setShowOptionsMenu(null);
  };
  const toggleOptionsMenu = (addressId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowOptionsMenu(showOptionsMenu === addressId ? null : addressId);
  };
  const handleAddNewAddress = () => {
    setShowMap(true);
  };
  const handleMapLocationSelect = (location: {
    latitude: number;
    longitude: number;
    address: string;
    fullAddress?: string;
    city: string;
    country: string;
    region?: string;
  }) => {
    // Формируем компактный адрес: улица, район, город (квартиру извлекаем из адреса если есть)
    const addressParts: string[] = [];
    
    // Улица (может содержать номер дома)
    if (location.address && location.address.trim()) {
      addressParts.push(location.address.trim());
    }
    
    // Район
    if (location.region && location.region.trim()) {
      addressParts.push(location.region.trim());
    }
    
    // Город
    if (location.city && location.city.trim()) {
      addressParts.push(location.city.trim());
    }
    
    const compactAddress = addressParts.length > 0 
      ? addressParts.join(', ') 
      : location.fullAddress || location.address;
    
    const newAddress = {
      id: addresses.length ? Math.max(...addresses.map(a => a.id)) + 1 : 1,
      text: compactAddress,
      city: location.city,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
    };
    setAddresses([...addresses, newAddress]);
    setSelectedAddressId(newAddress.id);
    setShowMap(false);
  };
  if (!isOpen) return null;
  return (
    <div className="delivery-modal-overlay">
      <div className="delivery-modal">
        <div className="delivery-modal-header">
          <h3>Доставка</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="delivery-tabs">
          <button 
            className={`tab ${selectedMethod === 'pickup' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('pickup')}
          >
            Пункт выдачи
          </button>
          <button 
            className={`tab ${selectedMethod === 'courier' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('courier')}
          >
            Курьером
          </button>
        </div>
        <div className="delivery-content">
          {selectedMethod === 'pickup' ? (
            <div className="pickup-content">
              <div className="coming-soon">
                <div className="coming-soon-icon">📦</div>
                <h4>Скоро</h4>
                <p>Пункты выдачи будут доступны в ближайшее время</p>
              </div>
            </div>
          ) : (
            <div className="courier-content">
              <div className="addresses-list">
                {addresses.length === 0 && (
                  <div className="empty-addresses">
                    <img 
                      src="/icons/empty-addresses.svg" 
                      alt="Пусто" 
                      className="empty-addresses-icon"
                      onError={(e) => {
                        // Если изображение не найдено, показываем emoji
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className = 'empty-addresses-placeholder';
                        placeholder.innerHTML = '📭';
                        img.parentElement?.appendChild(placeholder);
                      }}
                    />
                  </div>
                )}
                {addresses.map((address) => (
                  <div 
                    key={address.id}
                    className={`address-item ${selectedAddressId === address.id ? 'selected' : ''}`}
                    onClick={() => handleAddressSelect(address.id)}
                  >
                    <div className="address-radio">
                      <input 
                        type="radio" 
                        name="address" 
                        checked={selectedAddressId === address.id}
                        onChange={() => handleAddressSelect(address.id)}
                      />
                    </div>
                    <div className="address-text">
                      {address.text.split('\n').map((line, index) => (
                        <React.Fragment key={index}>
                          {line}
                          {index < address.text.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="address-options">
                      <button 
                        className="options-btn"
                        onClick={(e) => toggleOptionsMenu(address.id, e)}
                      >
                        ⋯
                      </button>
                      {showOptionsMenu === address.id && (
                        <div className="options-menu">
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteAddress(address.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="add-address-btn" onClick={handleAddNewAddress}>
                <div className="add-icon">+</div>
                Добавить новый адрес
              </button>
            </div>
          )}
        </div>
        <div className="delivery-modal-footer">
          <button 
            className="confirm-delivery-btn"
            onClick={handleConfirm}
            disabled={selectedMethod === 'courier' && (selectedAddressId === null)}
          >
            Подтвердить
          </button>
        </div>
      </div>
      <Suspense fallback={<div className="delivery-modal-map-loading">Загрузка карты...</div>}>
        <ModernMap
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          onLocationSelect={handleMapLocationSelect}
          initialLocation={state.location.data?.latitude && state.location.data?.longitude ? {
            latitude: state.location.data.latitude,
            longitude: state.location.data.longitude,
          } : undefined}
        />
      </Suspense>
    </div>
  );
};
export default DeliveryModal;
