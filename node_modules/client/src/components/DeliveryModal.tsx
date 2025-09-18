import React, { useState } from 'react';
import './DeliveryModal.css';
import ModernMap from './ModernMap';
interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deliveryData: { type: string; address?: string; location?: any }) => void;
}
const DeliveryModal: React.FC<DeliveryModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [selectedMethod, setSelectedMethod] = useState<'pickup' | 'courier'>('pickup');
  const [address, setAddress] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<number>(1);
  const [showOptionsMenu, setShowOptionsMenu] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [addresses, setAddresses] = useState([
    { id: 1, text: "Улица Навои, дом 15, кв. 42\nТашкент, Узбекистан" },
    { id: 2, text: "Проспект Амира Темура, дом 8\nТашкент, Узбекистан" }
  ]);
  const handleConfirm = () => {
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    onConfirm({
      type: selectedMethod,
      address: selectedMethod === 'courier' ? selectedAddress?.text : undefined,
      location: {
        city: 'Ташкент',
        address: selectedAddress?.text || 'Ташкент, Узбекистан',
        country: 'Узбекистан',
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
    if (addresses.length > 1) {
      setAddresses(addresses.filter(addr => addr.id !== addressId));
      if (selectedAddressId === addressId) {
        setSelectedAddressId(addresses.find(addr => addr.id !== addressId)?.id || 1);
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
    city: string;
    country: string;
  }) => {
    const newAddress = {
      id: Math.max(...addresses.map(a => a.id)) + 1,
      text: `${location.address}\n${location.city}, ${location.country}`
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
          >
            Подтвердить
          </button>
        </div>
      </div>
      <ModernMap
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onLocationSelect={handleMapLocationSelect}
      />
    </div>
  );
};
export default DeliveryModal;