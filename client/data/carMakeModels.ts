/**
 * Comprehensive mapping of car makes to their popular models
 * Used for autocomplete and validation in the listing creation form
 */

export interface CarMakeModel {
  make: string;
  models: string[];
}

export const CAR_MAKE_MODELS: Record<string, string[]> = {
  // Japanese Brands
  'Toyota': [
    'Camry', 'Corolla', 'RAV4', 'Highlander', 'Land Cruiser', 'Prado', 
    'Fortuner', 'Hilux', 'Yaris', 'Avalon', 'C-HR', 'Venza', 'Sequoia',
    'Tacoma', 'Tundra', 'Supra', 'Sienna', 'Prius', 'Crown', 'Innova'
  ],
  'Honda': [
    'Accord', 'Civic', 'CR-V', 'Pilot', 'HR-V', 'Odyssey', 'Ridgeline',
    'Passport', 'Insight', 'Fit', 'City', 'Jazz', 'Element', 'Prelude'
  ],
  'Nissan': [
    'Altima', 'Maxima', 'Sentra', 'Versa', 'Rogue', 'Murano', 'Pathfinder',
    'Armada', 'Patrol', 'Xterra', 'Frontier', 'Titan', 'Kicks', 'Juke',
    'Qashqai', '370Z', 'GT-R', 'Leaf', 'X-Trail', 'Sunny'
  ],
  'Mazda': [
    'Mazda3', 'Mazda6', 'CX-3', 'CX-5', 'CX-9', 'CX-30', 'CX-50', 'CX-90',
    'MX-5 Miata', 'MX-30', 'RX-8', 'Tribute', 'BT-50', 'Premacy'
  ],
  'Subaru': [
    'Outback', 'Forester', 'Crosstrek', 'Impreza', 'Legacy', 'Ascent',
    'WRX', 'BRZ', 'Tribeca', 'XV', 'Baja'
  ],
  'Mitsubishi': [
    'Outlander', 'Eclipse Cross', 'Pajero', 'Lancer', 'Mirage', 'Montero',
    'ASX', 'L200', 'Attrage', 'Xpander', 'Galant'
  ],
  'Suzuki': [
    'Swift', 'Vitara', 'S-Cross', 'Jimny', 'Ertiga', 'Ciaz', 'Baleno',
    'Dzire', 'Alto', 'Celerio', 'Grand Vitara'
  ],
  'Lexus': [
    'ES', 'IS', 'GS', 'LS', 'RX', 'GX', 'LX', 'NX', 'UX', 'RC', 'LC',
    'RZ', 'TX', 'LFA', 'CT'
  ],
  'Infiniti': [
    'Q50', 'Q60', 'Q70', 'QX50', 'QX55', 'QX60', 'QX80', 'QX30', 'FX',
    'G35', 'G37', 'M35', 'M37'
  ],
  'Acura': [
    'TLX', 'ILX', 'RLX', 'MDX', 'RDX', 'NSX', 'Integra', 'TSX', 'RSX',
    'ZDX', 'Legend', 'Vigor'
  ],

  // Korean Brands
  'Hyundai': [
    'Elantra', 'Sonata', 'Accent', 'Veloster', 'Tucson', 'Santa Fe',
    'Palisade', 'Kona', 'Venue', 'Ioniq', 'Genesis', 'Azera', 'i10',
    'i20', 'i30', 'Creta', 'Verna', 'Grand i10', 'Santro'
  ],
  'Kia': [
    'Optima', 'Forte', 'Rio', 'Sorento', 'Sportage', 'Telluride', 'Seltos',
    'Soul', 'Niro', 'Stinger', 'K5', 'K8', 'Carnival', 'Picanto', 'Cerato',
    'Cadenza', 'EV6', 'Mohave'
  ],
  'Genesis': [
    'G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80', 'Electrified G80',
    'Electrified GV70', 'Coupe'
  ],

  // American Brands
  'Ford': [
    'F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Bronco',
    'Ranger', 'Maverick', 'Fusion', 'Focus', 'Fiesta', 'Taurus', 'Flex',
    'EcoSport', 'Transit', 'Super Duty', 'Raptor', 'GT'
  ],
  'Chevrolet': [
    'Silverado', 'Tahoe', 'Suburban', 'Equinox', 'Traverse', 'Blazer',
    'Colorado', 'Camaro', 'Corvette', 'Malibu', 'Impala', 'Cruze', 'Sonic',
    'Trax', 'Bolt', 'Captiva', 'Spark', 'Aveo', 'Avalanche'
  ],
  'GMC': [
    'Sierra', 'Yukon', 'Acadia', 'Terrain', 'Canyon', 'Denali', 'Savana',
    'Jimmy', 'Envoy', 'Hummer EV'
  ],
  'Dodge': [
    'Charger', 'Challenger', 'Durango', 'Journey', 'Caravan', 'Ram 1500',
    'Ram 2500', 'Dakota', 'Nitro', 'Avenger', 'Caliber', 'Viper'
  ],
  'Jeep': [
    'Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade',
    'Gladiator', 'Commander', 'Patriot', 'Liberty', 'Wagoneer', 'Grand Wagoneer'
  ],
  'Cadillac': [
    'Escalade', 'XT4', 'XT5', 'XT6', 'CT4', 'CT5', 'CT6', 'Lyriq',
    'CTS', 'ATS', 'SRX', 'XTS', 'DTS', 'STS', 'Eldorado'
  ],
  'Chrysler': [
    'Pacifica', '300', 'Voyager', 'Town & Country', 'Aspen', 'Sebring',
    'PT Cruiser', 'Crossfire', '200'
  ],
  'Tesla': [
    'Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster'
  ],
  'Lincoln': [
    'Navigator', 'Aviator', 'Corsair', 'Nautilus', 'Continental', 'MKZ',
    'MKX', 'MKC', 'MKT', 'Town Car'
  ],

  // German Brands
  'BMW': [
    '1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series',
    '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
    'Z4', 'i3', 'i4', 'iX', 'M2', 'M3', 'M4', 'M5', 'M8'
  ],
  'Mercedes-Benz': [
    'A-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS', 'GLA',
    'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'SL', 'SLK', 'AMG GT',
    'EQC', 'EQE', 'EQS', 'Maybach', 'Metris', 'Sprinter'
  ],
  'Audi': [
    'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8',
    'TT', 'R8', 'e-tron', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'S3',
    'S4', 'S5', 'S6', 'S7', 'S8', 'Q2', 'Q4 e-tron'
  ],
  'Volkswagen': [
    'Golf', 'Jetta', 'Passat', 'Tiguan', 'Atlas', 'Arteon', 'Touareg',
    'ID.4', 'Beetle', 'CC', 'Polo', 'Amarok', 'T-Roc', 'Taos', 'Teramont'
  ],
  'Porsche': [
    '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman',
    '718', 'Carrera', 'Turbo', 'GT3', 'GT4'
  ],
  'Mini': [
    'Cooper', 'Countryman', 'Clubman', 'Paceman', 'Convertible', 'Hardtop',
    'John Cooper Works', 'Electric'
  ],
  'Opel': [
    'Astra', 'Corsa', 'Insignia', 'Mokka', 'Grandland', 'Crossland',
    'Zafira', 'Vectra', 'Omega'
  ],

  // European Brands
  'Volvo': [
    'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C40', 'EX90',
    'Polestar', 'Cross Country'
  ],
  'Jaguar': [
    'XE', 'XF', 'XJ', 'F-Type', 'E-Pace', 'F-Pace', 'I-Pace', 'X-Type',
    'S-Type', 'XK'
  ],
  'Land Rover': [
    'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar',
    'Discovery', 'Discovery Sport', 'Defender', 'Freelander', 'LR2', 'LR3', 'LR4'
  ],
  'Peugeot': [
    '208', '308', '408', '508', '2008', '3008', '5008', 'Rifter',
    'Partner', 'Traveller', '107', '207', '307', '407'
  ],
  'Renault': [
    'Clio', 'Megane', 'Captur', 'Kadjar', 'Koleos', 'Talisman', 'Duster',
    'Logan', 'Sandero', 'Fluence', 'Scenic', 'Espace'
  ],
  'Citroën': [
    'C3', 'C4', 'C5', 'C3 Aircross', 'C5 Aircross', 'Berlingo', 'Dispatch',
    'DS', 'Xsara', 'Picasso'
  ],
  'Fiat': [
    '500', '500X', '500L', 'Tipo', 'Panda', 'Punto', 'Doblo', '124 Spider',
    'Uno', 'Palio', 'Strada'
  ],
  'Alfa Romeo': [
    'Giulia', 'Stelvio', 'Tonale', '4C', 'Spider', 'MiTo', 'Giulietta',
    '159', '156', 'Brera'
  ],
  'Seat': [
    'Ibiza', 'Leon', 'Ateca', 'Arona', 'Tarraco', 'Toledo', 'Altea',
    'Alhambra'
  ],
  'Skoda': [
    'Octavia', 'Superb', 'Fabia', 'Scala', 'Kamiq', 'Karoq', 'Kodiaq',
    'Enyaq', 'Rapid', 'Yeti'
  ],

  // Luxury Brands
  'Ferrari': [
    '488', 'F8 Tributo', 'SF90', 'Roma', 'Portofino', '812', 'LaFerrari',
    'California', '458', '599', 'F12', 'GTC4Lusso', 'Enzo', 'Purosangue'
  ],
  'Lamborghini': [
    'Aventador', 'Huracán', 'Urus', 'Gallardo', 'Murciélago', 'Revuelto',
    'Countach', 'Diablo'
  ],
  'Maserati': [
    'Ghibli', 'Quattroporte', 'Levante', 'GranTurismo', 'GranCabrio',
    'MC20', 'Grecale'
  ],
  'Bentley': [
    'Continental GT', 'Flying Spur', 'Bentayga', 'Mulsanne', 'Azure',
    'Arnage', 'Brooklands'
  ],
  'Rolls-Royce': [
    'Phantom', 'Ghost', 'Wraith', 'Dawn', 'Cullinan', 'Spectre', 
    'Silver Shadow', 'Corniche'
  ],
  'Aston Martin': [
    'DB11', 'DBS', 'Vantage', 'DBX', 'Rapide', 'Vanquish', 'Valkyrie',
    'DB9', 'V8 Vantage', 'Virage'
  ],
  'McLaren': [
    '720S', '765LT', 'Artura', 'GT', '570S', '600LT', 'P1', 'Senna',
    '12C', '650S'
  ],
  'Bugatti': [
    'Chiron', 'Veyron', 'Divo', 'Centodieci', 'Bolide', 'Mistral'
  ],

  // Chinese Brands
  'BYD': [
    'Tang', 'Han', 'Song', 'Qin', 'Seal', 'Atto 3', 'Dolphin', 'F3',
    'G6', 'S6', 'Yuan'
  ],
  'Geely': [
    'Emgrand', 'Coolray', 'Azkarra', 'Okavango', 'Atlas', 'Tugella',
    'Preface', 'Xingyue', 'Boyue'
  ],
  'Chery': [
    'Tiggo', 'Arrizo', 'QQ', 'Fulwin', 'Omoda', 'Exeed', 'eQ', 'A3'
  ],
  'MG': [
    'MG5', 'MG6', 'HS', 'ZS', 'RX5', 'Marvel R', 'Hector', 'Gloster',
    'ZS EV', 'MG3'
  ],
  'Haval': [
    'H6', 'H9', 'Jolion', 'F7', 'Dargo', 'M6', 'H2', 'H4'
  ],
  'Great Wall': [
    'Wingle', 'Poer', 'Cannon', 'Haval', 'Ora', 'Tank', 'Voleex'
  ],

  // Other Brands
  'Isuzu': [
    'D-Max', 'MU-X', 'Trooper', 'Rodeo', 'Axiom', 'Ascender', 'i-Series'
  ],
  'SsangYong': [
    'Tivoli', 'Korando', 'Rexton', 'Musso', 'Actyon', 'Kyron'
  ],
  'Tata': [
    'Nexon', 'Harrier', 'Safari', 'Tiago', 'Tigor', 'Altroz', 'Nano',
    'Indica', 'Indigo'
  ],
  'Mahindra': [
    'Scorpio', 'XUV700', 'XUV500', 'Thar', 'Bolero', 'KUV100', 'Marazzo'
  ],
  'Dacia': [
    'Duster', 'Sandero', 'Logan', 'Lodgy', 'Dokker', 'Spring'
  ],
  'Lada': [
    'Niva', 'Vesta', 'Granta', 'Largus', 'XRAY', 'Oka', 'Samara'
  ],
  'Proton': [
    'X50', 'X70', 'Saga', 'Persona', 'Iriz', 'Exora', 'Perdana'
  ],
  'Perodua': [
    'Myvi', 'Axia', 'Bezza', 'Aruz', 'Alza', 'Viva', 'Kancil'
  ]
};

/**
 * Get all available car makes
 */
export const getCarMakes = (): string[] => {
  return Object.keys(CAR_MAKE_MODELS).sort();
};

/**
 * Get models for a specific make
 */
export const getModelsForMake = (make: string): string[] => {
  return CAR_MAKE_MODELS[make] || [];
};

/**
 * Check if a make exists in the database
 */
export const isValidMake = (make: string): boolean => {
  return make in CAR_MAKE_MODELS;
};

/**
 * Get all makes as autocomplete options
 */
export const getMakeOptions = (includeOther: boolean = true) => {
  const makes = getCarMakes().map(make => ({ value: make, label: make }));
  
  if (includeOther) {
    makes.push({ value: 'other', label: 'Other (custom)' });
  }
  
  return makes;
};

/**
 * Get models for a make as autocomplete options
 */
export const getModelOptions = (make: string, includeOther: boolean = true) => {
  const models = getModelsForMake(make).map(model => ({ value: model, label: model }));
  
  if (includeOther && models.length > 0) {
    models.push({ value: 'other', label: 'Other (custom)' });
  }
  
  return models;
};
