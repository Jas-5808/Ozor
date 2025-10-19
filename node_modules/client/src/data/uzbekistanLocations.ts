
export interface Location {
  id: string;
  name: string;
  type: 'region' | 'city' | 'district';
  parentId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}
export const uzbekistanLocations: Location[] = [
  {
    id: 'karakalpakstan',
    name: 'Республика Каракалпакстан',
    type: 'region',
    coordinates: { lat: 42.4531, lng: 59.6103 }
  },
  {
    id: 'nukus',
    name: 'Нукус',
    type: 'city',
    parentId: 'karakalpakstan',
    coordinates: { lat: 42.4531, lng: 59.6103 }
  },
  {
    id: 'muynak',
    name: 'Муйнак',
    type: 'city',
    parentId: 'karakalpakstan',
    coordinates: { lat: 43.7683, lng: 59.0214 }
  },
  {
    id: 'andijan',
    name: 'Андижанская область',
    type: 'region',
    coordinates: { lat: 40.7833, lng: 72.3333 }
  },
  {
    id: 'andijan_city',
    name: 'Андижан',
    type: 'city',
    parentId: 'andijan',
    coordinates: { lat: 40.7833, lng: 72.3333 }
  },
  {
    id: 'asaka',
    name: 'Асака',
    type: 'city',
    parentId: 'andijan',
    coordinates: { lat: 40.6417, lng: 72.2389 }
  },
  {
    id: 'khanabad',
    name: 'Ханабад',
    type: 'city',
    parentId: 'andijan',
    coordinates: { lat: 40.8167, lng: 72.1167 }
  },
  {
    id: 'bukhara',
    name: 'Бухарская область',
    type: 'region',
    coordinates: { lat: 39.7756, lng: 64.4286 }
  },
  {
    id: 'bukhara_city',
    name: 'Бухара',
    type: 'city',
    parentId: 'bukhara',
    coordinates: { lat: 39.7756, lng: 64.4286 }
  },
  {
    id: 'kagan',
    name: 'Каган',
    type: 'city',
    parentId: 'bukhara',
    coordinates: { lat: 39.7167, lng: 64.5500 }
  },
  {
    id: 'gijduvan',
    name: 'Гиждуван',
    type: 'city',
    parentId: 'bukhara',
    coordinates: { lat: 40.1000, lng: 64.6833 }
  },
  {
    id: 'jizzakh',
    name: 'Джизакская область',
    type: 'region',
    coordinates: { lat: 40.1167, lng: 67.8500 }
  },
  {
    id: 'jizzakh_city',
    name: 'Джизак',
    type: 'city',
    parentId: 'jizzakh',
    coordinates: { lat: 40.1167, lng: 67.8500 }
  },
  {
    id: 'dustlik',
    name: 'Дустлик',
    type: 'city',
    parentId: 'jizzakh',
    coordinates: { lat: 40.5167, lng: 68.0333 }
  },
  {
    id: 'kashkadarya',
    name: 'Кашкадарьинская область',
    type: 'region',
    coordinates: { lat: 38.8667, lng: 65.8000 }
  },
  {
    id: 'karshi',
    name: 'Карши',
    type: 'city',
    parentId: 'kashkadarya',
    coordinates: { lat: 38.8667, lng: 65.8000 }
  },
  {
    id: 'shakhrisabz',
    name: 'Шахрисабз',
    type: 'city',
    parentId: 'kashkadarya',
    coordinates: { lat: 39.0500, lng: 66.8333 }
  },
  {
    id: 'kitab',
    name: 'Китаб',
    type: 'city',
    parentId: 'kashkadarya',
    coordinates: { lat: 39.1167, lng: 66.8833 }
  },
  {
    id: 'navoiy',
    name: 'Навоийская область',
    type: 'region',
    coordinates: { lat: 40.0833, lng: 65.3667 }
  },
  {
    id: 'navoiy_city',
    name: 'Навои',
    type: 'city',
    parentId: 'navoiy',
    coordinates: { lat: 40.0833, lng: 65.3667 }
  },
  {
    id: 'zarafshan',
    name: 'Зарафшан',
    type: 'city',
    parentId: 'navoiy',
    coordinates: { lat: 41.5833, lng: 64.2000 }
  },
  {
    id: 'nurata',
    name: 'Нурата',
    type: 'city',
    parentId: 'navoiy',
    coordinates: { lat: 40.5667, lng: 65.6833 }
  },
  {
    id: 'namangan',
    name: 'Наманганская область',
    type: 'region',
    coordinates: { lat: 40.9969, lng: 71.6725 }
  },
  {
    id: 'namangan_city',
    name: 'Наманган',
    type: 'city',
    parentId: 'namangan',
    coordinates: { lat: 40.9969, lng: 71.6725 }
  },
  {
    id: 'chust',
    name: 'Чуст',
    type: 'city',
    parentId: 'namangan',
    coordinates: { lat: 41.0167, lng: 71.2333 }
  },
  {
    id: 'pap',
    name: 'Пап',
    type: 'city',
    parentId: 'namangan',
    coordinates: { lat: 40.8667, lng: 71.1000 }
  },
  {
    id: 'samarkand',
    name: 'Самаркандская область',
    type: 'region',
    coordinates: { lat: 39.6542, lng: 66.9597 }
  },
  {
    id: 'samarkand_city',
    name: 'Самарканд',
    type: 'city',
    parentId: 'samarkand',
    coordinates: { lat: 39.6542, lng: 66.9597 }
  },
  {
    id: 'kattakurgan',
    name: 'Каттакурган',
    type: 'city',
    parentId: 'samarkand',
    coordinates: { lat: 39.9000, lng: 66.2500 }
  },
  {
    id: 'urgut',
    name: 'Ургут',
    type: 'city',
    parentId: 'samarkand',
    coordinates: { lat: 39.4000, lng: 67.2500 }
  },
  {
    id: 'surkhandarya',
    name: 'Сурхандарьинская область',
    type: 'region',
    coordinates: { lat: 37.2333, lng: 67.2833 }
  },
  {
    id: 'termez',
    name: 'Термез',
    type: 'city',
    parentId: 'surkhandarya',
    coordinates: { lat: 37.2333, lng: 67.2833 }
  },
  {
    id: 'denau',
    name: 'Денау',
    type: 'city',
    parentId: 'surkhandarya',
    coordinates: { lat: 38.2667, lng: 67.9000 }
  },
  {
    id: 'shurchi',
    name: 'Шурчи',
    type: 'city',
    parentId: 'surkhandarya',
    coordinates: { lat: 37.6667, lng: 67.7833 }
  },
  {
    id: 'syrdarya',
    name: 'Сырдарьинская область',
    type: 'region',
    coordinates: { lat: 40.3833, lng: 68.6667 }
  },
  {
    id: 'gulistan',
    name: 'Гулистан',
    type: 'city',
    parentId: 'syrdarya',
    coordinates: { lat: 40.3833, lng: 68.6667 }
  },
  {
    id: 'yangiyer',
    name: 'Янгиер',
    type: 'city',
    parentId: 'syrdarya',
    coordinates: { lat: 40.2833, lng: 68.8167 }
  },
  {
    id: 'shirin',
    name: 'Ширин',
    type: 'city',
    parentId: 'syrdarya',
    coordinates: { lat: 40.2000, lng: 68.7000 }
  },
  {
    id: 'tashkent_region',
    name: 'Ташкентская область',
    type: 'region',
    coordinates: { lat: 41.2667, lng: 69.2167 }
  },
  {
    id: 'angren',
    name: 'Ангрен',
    type: 'city',
    parentId: 'tashkent_region',
    coordinates: { lat: 41.0167, lng: 70.1333 }
  },
  {
    id: 'bekabad',
    name: 'Бекабад',
    type: 'city',
    parentId: 'tashkent_region',
    coordinates: { lat: 40.2167, lng: 69.2167 }
  },
  {
    id: 'chirchik',
    name: 'Чирчик',
    type: 'city',
    parentId: 'tashkent_region',
    coordinates: { lat: 41.4667, lng: 69.5833 }
  },
  {
    id: 'gazalkent',
    name: 'Газалкент',
    type: 'city',
    parentId: 'tashkent_region',
    coordinates: { lat: 41.5500, lng: 70.0167 }
  },
  {
    id: 'parkent',
    name: 'Паркент',
    type: 'city',
    parentId: 'tashkent_region',
    coordinates: { lat: 41.2833, lng: 69.6833 }
  },
  {
    id: 'fergana',
    name: 'Ферганская область',
    type: 'region',
    coordinates: { lat: 40.3833, lng: 71.7833 }
  },
  {
    id: 'fergana_city',
    name: 'Фергана',
    type: 'city',
    parentId: 'fergana',
    coordinates: { lat: 40.3833, lng: 71.7833 }
  },
  {
    id: 'kokand',
    name: 'Коканд',
    type: 'city',
    parentId: 'fergana',
    coordinates: { lat: 40.5286, lng: 70.9425 }
  },
  {
    id: 'margilan',
    name: 'Маргилан',
    type: 'city',
    parentId: 'fergana',
    coordinates: { lat: 40.4667, lng: 71.7167 }
  },
  {
    id: 'quva',
    name: 'Кува',
    type: 'city',
    parentId: 'fergana',
    coordinates: { lat: 40.5167, lng: 72.0667 }
  },
  {
    id: 'rishtan',
    name: 'Риштан',
    type: 'city',
    parentId: 'fergana',
    coordinates: { lat: 40.3500, lng: 71.2833 }
  },
  {
    id: 'khorezm',
    name: 'Хорезмская область',
    type: 'region',
    coordinates: { lat: 41.5500, lng: 60.6333 }
  },
  {
    id: 'urgench',
    name: 'Ургенч',
    type: 'city',
    parentId: 'khorezm',
    coordinates: { lat: 41.5500, lng: 60.6333 }
  },
  {
    id: 'khiva',
    name: 'Хива',
    type: 'city',
    parentId: 'khorezm',
    coordinates: { lat: 41.3833, lng: 60.3667 }
  },
  {
    id: 'pitnak',
    name: 'Питнак',
    type: 'city',
    parentId: 'khorezm',
    coordinates: { lat: 41.6167, lng: 61.0667 }
  },
  {
    id: 'tashkent',
    name: 'Ташкент',
    type: 'city',
    coordinates: { lat: 41.2995, lng: 69.2401 }
  }
];
export const getRegions = (): Location[] => {
  return uzbekistanLocations.filter(location => location.type === 'region');
};
export const getCitiesByRegion = (regionId: string): Location[] => {
  return uzbekistanLocations.filter(location => 
    location.type === 'city' && location.parentId === regionId
  );
};
export const searchLocations = (query: string): Location[] => {
  const lowerQuery = query.toLowerCase();
  return uzbekistanLocations.filter(location => 
    location.name.toLowerCase().includes(lowerQuery)
  );
};
export const getLocationById = (id: string): Location | undefined => {
  return uzbekistanLocations.find(location => location.id === id);
};