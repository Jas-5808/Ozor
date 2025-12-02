import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import './DeliveryModal.css';
import { useApp } from '../context/AppContext';

// Lazy load ModernMap to keep the initial bundle lean
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

const sanitizeAddresses = (list: Address[]) => {
  const seen = new Set<string>();
  return list.filter((addr) => {
    if (!addr) return false;
    const text = (addr.text || '').trim();
    const looksTemplate = !text || /template|sample|example|draft/i.test(text);
    const hasCoords = typeof addr.latitude === 'number' && typeof addr.longitude === 'number';
    const key = text.toLowerCase();
    if (looksTemplate || !hasCoords || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const DeliveryModal: React.FC<DeliveryModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const { state } = useApp();
  const [selectedMethod, setSelectedMethod] = useState<'pickup' | 'courier'>('courier');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Load addresses from localStorage when the modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const savedAddresses = localStorage.getItem(STORAGE_KEY);
        if (savedAddresses) {
          const parsed = JSON.parse(savedAddresses) as Address[];
          const cleaned = sanitizeAddresses(parsed);
          setAddresses(cleaned);
          // Restore selected address if it was saved previously
          const savedSelectedId = localStorage.getItem('selectedAddressId');
          if (savedSelectedId && cleaned.some(addr => addr.id === Number(savedSelectedId))) {
            setSelectedAddressId(Number(savedSelectedId));
          }
        }
      } catch (error) {
        console.error('Failed to load saved addresses:', error);
      }
    }
  }, [isOpen]);

  // Persist addresses into localStorage when they change
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
        console.error('Failed to save addresses:', error);
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
        city: selected?.city || t('common.location.unknownCity'),
        address: selected?.text || '',
        country: selected?.country || t('common.location.unknownCountry'),
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
    // Build a compact string: street, region, city (apartment extracted if present)
    const addressParts: string[] = [];
    
    // Street (may include house number)
    if (location.address && location.address.trim()) {
      addressParts.push(location.address.trim());
    }
    
    // Region
    if (location.region && location.region.trim()) {
      addressParts.push(location.region.trim());
    }
    
    // City
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
          <h3>{t('deliveryModal.title')}</h3>
          <button className="close-btn" onClick={onClose} aria-label={t('common.actions.close')}>
            ×
          </button>
        </div>
        <div className="delivery-tabs">
          <button 
            className={`tab ${selectedMethod === 'pickup' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('pickup')}
          >
            {t('deliveryModal.tabs.pickup')}
          </button>
          <button 
            className={`tab ${selectedMethod === 'courier' ? 'active' : ''}`}
            onClick={() => setSelectedMethod('courier')}
          >
            {t('deliveryModal.tabs.courier')}
          </button>
        </div>
        <div className="delivery-content">
          {selectedMethod === 'pickup' ? (
            <div className="pickup-content">
              <div className="coming-soon">
                <div className="coming-soon-icon">📦</div>
                <h4>{t('deliveryModal.pickup.comingSoonTitle')}</h4>
                <p>{t('deliveryModal.pickup.comingSoonDescription')}</p>
              </div>
            </div>
          ) : (
            <div className="courier-content">
              <div className="addresses-list">
                {addresses.length === 0 && (
                  <div className="empty-addresses">
                    <img 
                      src="/icons/empty-addresses.svg" 
                      alt={t('deliveryModal.empty.illustrationAlt')} 
                      className="empty-addresses-icon"
                      onError={(e) => {
                        // If the image fails to load, show an emoji fallback
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
                            {t('common.actions.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="add-address-btn" onClick={handleAddNewAddress}>
                <div className="add-icon">+</div>
                {t('deliveryModal.addresses.add')}
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
            {t('deliveryModal.confirm')}
          </button>
        </div>
      </div>
      <Suspense fallback={<div className="delivery-modal-map-loading">{t('deliveryModal.mapLoading')}</div>}>
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
