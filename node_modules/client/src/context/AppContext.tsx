import React, { createContext, useContext, useReducer, ReactNode } from 'react';
interface CartItem {
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    refferal_price: number;
    base_price: number;
  };
}
interface LocationData {
  latitude?: number;
  longitude?: number;
  city: string;
  address: string;
  country?: string;
  isManual: boolean;
}
interface AppState {
  cart: CartItem[];
  likedProducts: Set<string>;
  user: {
    isAuthenticated: boolean;
    profile: any | null;
  };
  location: {
    data: LocationData | null;
    isDetected: boolean;
    showLocationModal: boolean;
  };
  delivery: {
    showDeliveryModal: boolean;
    selectedMethod: 'pickup' | 'courier' | null;
    selectedAddress: string | null;
  };
}
const initialState: AppState = {
  cart: [],
  likedProducts: new Set(),
  user: {
    isAuthenticated: false,
    profile: null,
  },
  location: {
    data: null,
    isDetected: false,
    showLocationModal: false,
  },
  delivery: {
    showDeliveryModal: false,
    selectedMethod: null,
    selectedAddress: null,
  },
};
type AppAction =
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_ITEM'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_LIKE'; payload: string }
  | { type: 'SET_USER'; payload: any }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOCATION'; payload: LocationData }
  | { type: 'SHOW_LOCATION_MODAL' }
  | { type: 'HIDE_LOCATION_MODAL' }
  | { type: 'CLEAR_LOCATION' }
  | { type: 'SHOW_DELIVERY_MODAL' }
  | { type: 'HIDE_DELIVERY_MODAL' }
  | { type: 'SET_DELIVERY_METHOD'; payload: { method: 'pickup' | 'courier'; address?: string } };
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItem = state.cart.find(item => item.productId === action.payload.productId);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.productId === action.payload.productId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, action.payload],
      };
    }
    case 'REMOVE_FROM_CART': {
      return {
        ...state,
        cart: state.cart.filter(item => item.productId !== action.payload),
      };
    }
    case 'UPDATE_CART_ITEM': {
      return {
        ...state,
        cart: state.cart.map(item =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    }
    case 'CLEAR_CART': {
      return {
        ...state,
        cart: [],
      };
    }
    case 'TOGGLE_LIKE': {
      const newLikedProducts = new Set(state.likedProducts);
      if (newLikedProducts.has(action.payload)) {
        newLikedProducts.delete(action.payload);
      } else {
        newLikedProducts.add(action.payload);
      }
      return {
        ...state,
        likedProducts: newLikedProducts,
      };
    }
    case 'SET_USER': {
      return {
        ...state,
        user: {
          isAuthenticated: true,
          profile: action.payload,
        },
      };
    }
    case 'LOGOUT': {
      return {
        ...state,
        user: {
          isAuthenticated: false,
          profile: null,
        },
      };
    }
    case 'SET_LOCATION': {
      return {
        ...state,
        location: {
          data: action.payload,
          isDetected: true,
          showLocationModal: false,
        },
      };
    }
    case 'SHOW_LOCATION_MODAL': {
      return {
        ...state,
        location: {
          ...state.location,
          showLocationModal: true,
        },
      };
    }
    case 'HIDE_LOCATION_MODAL': {
      return {
        ...state,
        location: {
          ...state.location,
          showLocationModal: false,
        },
      };
    }
    case 'CLEAR_LOCATION': {
      return {
        ...state,
        location: {
          data: null,
          isDetected: false,
          showLocationModal: false,
        },
      };
    }
    case 'SHOW_DELIVERY_MODAL': {
      return {
        ...state,
        delivery: {
          ...state.delivery,
          showDeliveryModal: true,
        },
      };
    }
    case 'HIDE_DELIVERY_MODAL': {
      return {
        ...state,
        delivery: {
          ...state.delivery,
          showDeliveryModal: false,
        },
      };
    }
    case 'SET_DELIVERY_METHOD': {
      return {
        ...state,
        delivery: {
          ...state.delivery,
          selectedMethod: action.payload.method,
          selectedAddress: action.payload.address || null,
          showDeliveryModal: false,
        },
      };
    }
    default:
      return state;
  }
};
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addToCart: (product: any, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItem: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleLike: (productId: string) => void;
  isLiked: (productId: string) => boolean;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  setLocation: (location: LocationData) => void;
  showLocationModal: () => void;
  hideLocationModal: () => void;
  clearLocation: () => void;
  showDeliveryModal: () => void;
  hideDeliveryModal: () => void;
  setDeliveryMethod: (method: 'pickup' | 'courier', address?: string) => void;
}
const AppContext = createContext<AppContextType | undefined>(undefined);
interface AppProviderProps {
  children: ReactNode;
}
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const addToCart = (product: any, quantity = 1) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        productId: product.id,
        quantity,
        product: {
          id: product.id,
          name: product.name,
          refferal_price: product.refferal_price,
          base_price: product.base_price,
        },
      },
    });
  };
  const removeFromCart = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
  };
  const updateCartItem = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { productId, quantity } });
  };
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };
  const toggleLike = (productId: string) => {
    dispatch({ type: 'TOGGLE_LIKE', payload: productId });
  };
  const isLiked = (productId: string) => {
    return state.likedProducts.has(productId);
  };
  const getCartTotal = () => {
    return state.cart.reduce((total, item) => {
      return total + (item.product.refferal_price * item.quantity);
    }, 0);
  };
  const getCartItemCount = () => {
    return state.cart.reduce((count, item) => count + item.quantity, 0);
  };
  const setLocation = (location: LocationData) => {
    dispatch({ type: 'SET_LOCATION', payload: location });
  };
  const showLocationModal = () => {
    dispatch({ type: 'SHOW_LOCATION_MODAL' });
  };
  const hideLocationModal = () => {
    dispatch({ type: 'HIDE_LOCATION_MODAL' });
  };
  const clearLocation = () => {
    dispatch({ type: 'CLEAR_LOCATION' });
  };
  const showDeliveryModal = () => {
    dispatch({ type: 'SHOW_DELIVERY_MODAL' });
  };
  const hideDeliveryModal = () => {
    dispatch({ type: 'HIDE_DELIVERY_MODAL' });
  };
  const setDeliveryMethod = (method: 'pickup' | 'courier', address?: string) => {
    dispatch({ type: 'SET_DELIVERY_METHOD', payload: { method, address } });
  };
  const value: AppContextType = {
    state,
    dispatch,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    toggleLike,
    isLiked,
    getCartTotal,
    getCartItemCount,
    setLocation,
    showLocationModal,
    hideLocationModal,
    clearLocation,
    showDeliveryModal,
    hideDeliveryModal,
    setDeliveryMethod,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};