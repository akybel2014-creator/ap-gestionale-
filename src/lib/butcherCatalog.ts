export type ButcherCategory =
  | 'tutte'
  | 'carni-fresche'
  | 'tagli-bbq'
  | 'preparazioni-pronte'
  | 'salumi'
  | 'sughi'
  | 'pane';

export interface ButcherProduct {
  id: string;
  name: string;
  category: Exclude<ButcherCategory, 'tutte'>;
  categoryLabel: string;
  pricePerUnit: number;
  unit: string; // es. 'kg', 'etto (100g)', 'vasetto 280g', 'pagnotta 600g', 'porzione 400g'
  defaultWeightLabel: string;
  origin: string;
  agingOrPrep: string;
  cookingTip: string;
  description: string;
  image: string;
  imageWebp?: string;
  imageAlt?: string;
  stockQty: number;
  featured?: boolean;
  bbqHighlight?: boolean;
  badgeText?: string;
}

export interface CartItem {
  product: ButcherProduct;
  quantity: number;
  customNotes?: string;
}

export type FulfillmentType = 'ritiro' | 'consegna';
export type PaymentMethodType =
  | 'carta-online'
  | 'satispay'
  | 'bonifico-istantaneo'
  | 'pagamento-al-ritiro';
export type OrderStatus =
  | 'in-attesa'
  | 'confermato'
  | 'pronto'
  | 'consegnato'
  | 'annullato';

export interface ButcherOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillment: FulfillmentType;
  pickupOrDeliveryDate: string;
  pickupOrDeliveryTimeSlot: string;
  deliveryAddress?: string;
  deliveryMunicipality?: string;
  paymentMethod: PaymentMethodType;
  paymentStatus: 'pagato-online' | 'da-saldare-al-ritiro';
  items: {
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes?: string;
  }[];
  subtotalEur: number;
  deliveryFeeEur: number;
  totalEur: number;
  notes?: string;
  status: OrderStatus;
}

export interface RecipeArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  prepTime: string;
  cookTime: string;
  difficulty: 'Facile' | 'Media' | 'Maestro Griller';
  recommendedProductId: string;
  recommendedProductName: string;
  image: string;
  imageWebp?: string;
  excerpt: string;
  ingredients: string[];
  steps: {
    stepNumber: string;
    title: string;
    detail: string;
  }[];
  lucaSecretTip: string;
}

export interface CustomerReview {
  id: string;
  authorName: string;
  avatarUrl: string;
  badge: string;
  rating: number;
  dateLabel: string;
  text: string;
  ownerReply?: string;
  highlightTag: string;
}

export interface ButcherSiteConfig {
  whatsappNumber: string; // Default: "INSERISCI_NUMERO_WHATSAPP"
  shopPhoneDisplay: string;
  openingHoursText: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
}

export const DEFAULT_SITE_CONFIG: ButcherSiteConfig = {
  whatsappNumber: 'INSERISCI_NUMERO_WHATSAPP',
  shopPhoneDisplay: '+39 0444 945812',
  openingHoursText:
    'Mar–Ven: 07:30–12:45 / 15:30–19:30 · Sab: 07:30–13:00 / 15:30–19:00 · Dom–Lun: Chiuso',
  heroEyebrow: 'Macelleria Artigianale a Vigardolo (Vicenza) · Via S. Floriano 26',
  heroTitle: 'L’Arte della Carne Selezionata e dei Grandi Tagli BBQ nel Vicentino.',
  heroSubtitle:
    'Da Luca e il suo team trovi frollature certificate, tagli introvabili per barbecue e affumicatura, pronti a cuocere creati ogni mattina, salumi nostrani, sughi lenti fatti in casa e pane artigianale a lievitazione naturale.',
};

// ============================================================================
// LOGO UFFICIALE E 18 IMMAGINI UNICHE (WebP < 200KB + Fallback JPG)
// ============================================================================
export const LOGO_TORO = '/src/assets/images/logo_macelleria_toro_1791668405635.jpg';
export const LOGO_TORO_WEBP = '/src/assets/images/logo_macelleria_toro_1791668405635.webp';

export const HERO_IMAGE = '/src/assets/images/hero_butcher_bbq_vicenza_1791661453533.jpg';
export const HERO_IMAGE_WEBP = '/src/assets/images/hero_butcher_bbq_vicenza_1791661453533.webp';

export const IMG_FIORENTINA = '/src/assets/images/cut_fiorentina_frollata_1791661463326.jpg';
export const IMG_FIORENTINA_WEBP = '/src/assets/images/cut_fiorentina_frollata_1791661463326.webp';

export const IMG_COSTATA = '/src/assets/images/costata_manzo_selezione_oro_1791665082701.jpg';
export const IMG_COSTATA_WEBP = '/src/assets/images/costata_manzo_selezione_oro_1791665082701.webp';

export const IMG_FILETTO = '/src/assets/images/cuore_filetto_scottona_1791665093528.jpg';
export const IMG_FILETTO_WEBP = '/src/assets/images/cuore_filetto_scottona_1791665093528.webp';

export const IMG_TAGLIATA = '/src/assets/images/tagliata_scamone_scottona_1791665108308.jpg';
export const IMG_TAGLIATA_WEBP = '/src/assets/images/tagliata_scamone_scottona_1791665108308.webp';

export const IMG_BBQ = '/src/assets/images/cut_bbq_ribs_brisket_1791661471935.jpg';
export const IMG_BBQ_WEBP = '/src/assets/images/cut_bbq_ribs_brisket_1791661471935.webp';

export const IMG_BRISKET = '/src/assets/images/beef_brisket_smoker_bbq_1791665119466.jpg';
export const IMG_BRISKET_WEBP = '/src/assets/images/beef_brisket_smoker_bbq_1791665119466.webp';

export const IMG_PICANHA = '/src/assets/images/picanha_codone_manzo_bbq_1791665156260.jpg';
export const IMG_PICANHA_WEBP = '/src/assets/images/picanha_codone_manzo_bbq_1791665156260.webp';

export const IMG_INVOLTINI = '/src/assets/images/involtini_crosta_pistacchio_1791665168416.jpg';
export const IMG_INVOLTINI_WEBP =
  '/src/assets/images/involtini_crosta_pistacchio_1791665168416.webp';

export const IMG_BURGER = '/src/assets/images/burger_scottona_tartufo_1791665180261.jpg';
export const IMG_BURGER_WEBP = '/src/assets/images/burger_scottona_tartufo_1791665180261.webp';

export const IMG_PRONTI = '/src/assets/images/pronti_cuocere_spiedini_1791661481332.jpg';
export const IMG_PRONTI_WEBP = '/src/assets/images/pronti_cuocere_spiedini_1791661481332.webp';

export const IMG_ARROSTO = '/src/assets/images/arrosto_vitello_farcito_asiago_1791665191411.jpg';
export const IMG_ARROSTO_WEBP =
  '/src/assets/images/arrosto_vitello_farcito_asiago_1791665191411.webp';

export const IMG_SOPPRESSA = '/src/assets/images/soppressa_vicentina_artigianale_1791665056286.jpg';
export const IMG_SOPPRESSA_WEBP =
  '/src/assets/images/soppressa_vicentina_artigianale_1791665056286.webp';

export const IMG_PANCETTA = '/src/assets/images/pancetta_arrotolata_erbe_1791665072121.jpg';
export const IMG_PANCETTA_WEBP = '/src/assets/images/pancetta_arrotolata_erbe_1791665072121.webp';

export const IMG_SALUMI_SUGHI_PANE =
  '/src/assets/images/salumi_sughi_pane_artigianale_1791661490727.jpg';
export const IMG_SALUMI_SUGHI_PANE_WEBP =
  '/src/assets/images/salumi_sughi_pane_artigianale_1791661490727.webp';

export const IMG_RAGU_ANATRA = '/src/assets/images/ragu_anatra_veneto_vasetto_1791665202945.jpg';
export const IMG_RAGU_ANATRA_WEBP =
  '/src/assets/images/ragu_anatra_veneto_vasetto_1791665202945.webp';

export const IMG_PAGNOTTA = '/src/assets/images/pagnotta_rustica_lievito_madre_1791665214926.jpg';
export const IMG_PAGNOTTA_WEBP =
  '/src/assets/images/pagnotta_rustica_lievito_madre_1791665214926.webp';

export const IMG_CIABATTA = '/src/assets/images/ciabatta_veneta_croccante_1791665263108.jpg';
export const IMG_CIABATTA_WEBP = '/src/assets/images/ciabatta_veneta_croccante_1791665263108.webp';

export function getWebpVariant(imagePath: string): string | undefined {
  if (!imagePath) return undefined;
  if (imagePath.endsWith('.webp')) return imagePath;
  if (imagePath.startsWith('/src/assets/images/') && imagePath.endsWith('.jpg')) {
    return imagePath.replace(/\.jpg$/, '.webp');
  }
  return undefined;
}

export const BUTCHER_CATEGORIES: {
  id: ButcherCategory;
  label: string;
  wpCategoryName: string;
  shortDesc: string;
}[] = [
  {
    id: 'tutte',
    label: 'Tutto il Banco',
    wpCategoryName: 'Tutto il Banco',
    shortDesc: 'La selezione completa della Macelleria Da Luca',
  },
  {
    id: 'carni-fresche',
    label: 'Carni Fresche',
    wpCategoryName: 'Carni Fresche',
    shortDesc: 'Scottona veneta, tagli scelti e frollature controllate',
  },
  {
    id: 'tagli-bbq',
    label: 'Specialità BBQ',
    wpCategoryName: 'Specialità BBQ',
    shortDesc: 'Tomahawk, Brisket, Costine St. Louis e Picanha per griglia e smoker',
  },
  {
    id: 'preparazioni-pronte',
    label: 'Preparazioni Pronte',
    wpCategoryName: 'Preparazioni Pronte',
    shortDesc: 'Spiedini, arrosti farciti, hamburger gourmet e involtini creati in casa',
  },
  {
    id: 'salumi',
    label: 'Salumi',
    wpCategoryName: 'Salumi',
    shortDesc: 'Soppressa Vicentina, pancetta, lardo alle erbe e salumi selezionati',
  },
  {
    id: 'sughi',
    label: 'Sughi',
    wpCategoryName: 'Sughi',
    shortDesc: 'Ragù della tradizione, anatra e cinghiale cotti lentamente',
  },
  {
    id: 'pane',
    label: 'Pane Artigianale',
    wpCategoryName: 'Pane Artigianale',
    shortDesc: 'Pagnotta rustica a lievitazione naturale e ciabatta veneta croccante',
  },
];

// 18 Prodotti Artigianali Completi della Macelleria Da Luca — Ciascuno con la propria immagine specifica e diversa
export const INITIAL_PRODUCTS: ButcherProduct[] = [
  // 1-4: CARNI FRESCHE (4 prodotti con 4 foto diverse)
  {
    id: 'prod-fiorentina-scottona',
    name: 'Bistecca alla Fiorentina di Scottona Frollata 40gg',
    category: 'carni-fresche',
    categoryLabel: 'Carni Fresche',
    pricePerUnit: 44.0,
    unit: 'pezzo (~1.1 kg)',
    defaultWeightLabel: 'Circa 1,1 kg · Spessore 4 dita',
    origin: 'Allevamenti selezionati del Veneto',
    agingOrPrep: 'Dry-Aged 40 giorni in cella a umidità controllata',
    cookingTip:
      'Togliere dal frigo 2 ore prima. Brace viva o ghisa rovente, 4 minuti per lato più 5 minuti in piedi sull’osso.',
    description:
      'Taglio regale con filetto generoso e marezzatura fine. Frollatura dolce che esalta la tenerezza e il profumo di burro nocciola.',
    image: IMG_FIORENTINA,
    imageWebp: IMG_FIORENTINA_WEBP,
    imageAlt: 'Bistecca di manzo taglio spesso Fiorentina frollata - Macelleria Da Luca',
    stockQty: 14,
    featured: true,
    badgeText: 'Frollatura 40gg',
  },
  {
    id: 'prod-costata-frollata',
    name: 'Costata di Manzo Selezione Oro',
    category: 'carni-fresche',
    categoryLabel: 'Carni Fresche',
    pricePerUnit: 31.5,
    unit: 'pezzo (~750g)',
    defaultWeightLabel: 'Circa 750 g · Marezzatura superiore',
    origin: 'Filiera corta Pedemontana Veneta',
    agingOrPrep: 'Frollatura minima 30 giorni',
    cookingTip:
      'Ideale alla griglia o piastra in ghisa; riposo di 6 minuti sotto carta paglia prima del taglio.',
    description:
      'Equilibrio impeccabile tra fibra magra e venature di grasso nobile che si sciolgono in cottura lasciando la carne succosa.',
    image: IMG_COSTATA,
    imageWebp: IMG_COSTATA_WEBP,
    imageAlt: 'Costata di manzo selezione oro taglio spesso - Macelleria Da Luca',
    stockQty: 18,
    featured: false,
  },
  {
    id: 'prod-filetto-vitellone',
    name: 'Cuore di Filetto di Scottona al Coltello',
    category: 'carni-fresche',
    categoryLabel: 'Carni Fresche',
    pricePerUnit: 24.5,
    unit: 'porzione (400g)',
    defaultWeightLabel: '400 g (2 medaglioni alti)',
    origin: 'Allevamenti selezionati del Vicentino',
    agingOrPrep: 'Taglio fresco giornaliero',
    cookingTip: 'Rosolare in padella con noce di burro di malga, timo fresco e sale Maldon.',
    description:
      'Il taglio più tenero e pregiato, preparato a medaglioni regolari da Luca per una cottura al sangue precisa al secondo.',
    image: IMG_FILETTO,
    imageWebp: IMG_FILETTO_WEBP,
    imageAlt: 'Cuore di filetto di scottona tagliato a coltello - Macelleria Da Luca',
    stockQty: 12,
    featured: false,
  },
  {
    id: 'prod-tagliata-scamone',
    name: 'Tagliata di Scamone di Scottona Veneta',
    category: 'carni-fresche',
    categoryLabel: 'Carni Fresche',
    pricePerUnit: 19.5,
    unit: 'porzione (500g)',
    defaultWeightLabel: 'Circa 500 g · Senza osso',
    origin: 'Allevamenti selezionati della Provincia di Vicenza',
    agingOrPrep: 'Frollatura 25 giorni',
    cookingTip:
      'Piastra rovente 3 minuti per lato, scaloppare a fette diagonali e servire con olio dei Colli Berici e rosmarino.',
    description:
      'Taglio magro ma straordinariamente succoso e saporito, perfetto per una tagliata veloce in padella o sulla griglia.',
    image: IMG_TAGLIATA,
    imageWebp: IMG_TAGLIATA_WEBP,
    imageAlt: 'Tagliata di scamone di scottona veneta fresca - Macelleria Da Luca',
    stockQty: 16,
    badgeText: 'Scelta Quotidiana',
  },

  // 5-8: SPECIALITÀ BBQ (4 prodotti con 4 foto diverse)
  {
    id: 'prod-tomahawk-bbq',
    name: 'Tomahawk Steak Imperiale BBQ',
    category: 'tagli-bbq',
    categoryLabel: 'Specialità BBQ',
    pricePerUnit: 56.0,
    unit: 'pezzo (~1.3 kg)',
    defaultWeightLabel: 'Circa 1,3 kg · Osso lungo 25 cm',
    origin: 'Selezione speciale BBQ Da Luca',
    agingOrPrep: 'Dry-Aged 45 giorni',
    cookingTip:
      'Metodo Reverse Searing consigliato: cottura indiretta a 110°C fino a 48°C al cuore, poi sear finale su fiamma viva.',
    description:
      'Il re indiscusso delle grigliate nel Vicentino. Ribeye monumentale con osso intero pulito alla francese, marezzatura ricca e sapore profondo.',
    image: HERO_IMAGE,
    imageWebp: HERO_IMAGE_WEBP,
    imageAlt: 'Tomahawk Steak di manzo taglio spesso per BBQ - Macelleria Da Luca',
    stockQty: 9,
    featured: true,
    bbqHighlight: true,
    badgeText: 'Specialità BBQ',
  },
  {
    id: 'prod-costine-st-louis',
    name: 'Pork Ribs St. Louis Style con Rub Artigianale',
    category: 'tagli-bbq',
    categoryLabel: 'Specialità BBQ',
    pricePerUnit: 22.0,
    unit: 'baffa (~1.2 kg)',
    defaultWeightLabel: 'Baffa intera ~1,2 kg già trimmata',
    origin: 'Suino pesante italiano 100%',
    agingOrPrep:
      'Membrana rimossa · Rub segreto di Luca (paprika affumicata, zucchero di canna, pepe nero)',
    cookingTip:
      'Cottura Low & Slow 3-2-1 a 115°C su barbecue o in forno statico avvolte in carta butcher.',
    description:
      'Baffa di costine rifilata secondo il vero taglio americano St. Louis, carnosa e pronta per l’affumicatura o la cottura lenta.',
    image: IMG_BBQ,
    imageWebp: IMG_BBQ_WEBP,
    imageAlt: 'Costine Pork Ribs St. Louis Style con rub BBQ - Macelleria Da Luca',
    stockQty: 16,
    featured: true,
    bbqHighlight: true,
    badgeText: 'Top Griglia',
  },
  {
    id: 'prod-beef-brisket',
    name: 'Beef Brisket Punta di Petto per Smoker',
    category: 'tagli-bbq',
    categoryLabel: 'Specialità BBQ',
    pricePerUnit: 48.0,
    unit: 'taglio (~2.0 kg)',
    defaultWeightLabel: 'Circa 2,0 kg (Flat & Point)',
    origin: 'Bovino adulto ad alta infiltrazione',
    agingOrPrep: 'Rifilatura aerodinamica pronta per affumicatore',
    cookingTip:
      'Affumicare con legno di quercia o ciliegio a 110°C fino a 93°C interni (probe tender), poi lungo riposo in cambro.',
    description:
      'Unica macelleria in zona con veri tagli da BBQ americano preparati su misura: punta di petto rifilata alla perfezione.',
    image: IMG_BRISKET,
    imageWebp: IMG_BRISKET_WEBP,
    imageAlt: 'Beef Brisket punta di petto di manzo per affumicatore - Macelleria Da Luca',
    stockQty: 6,
    bbqHighlight: true,
  },
  {
    id: 'prod-picanha-bbq',
    name: 'Picanha (Codone di Manzo) con Cappa di Grasso',
    category: 'tagli-bbq',
    categoryLabel: 'Specialità BBQ',
    pricePerUnit: 34.0,
    unit: 'taglio (~1.0 kg)',
    defaultWeightLabel: 'Circa 1,0 kg',
    origin: 'Scottona selezionata',
    agingOrPrep: 'Cappa di grasso intagliata a losanghe',
    cookingTip:
      'Cuocere intera in indiretta o tagliata a fette a mezzaluna sullo spiedo con solo sale grosso.',
    description:
      'Succulenta, saporita e scenografica: la cappa di grasso uniforme protegge la carne e regala una crosticina dorata.',
    image: IMG_PICANHA,
    imageWebp: IMG_PICANHA_WEBP,
    imageAlt: 'Picanha codone di manzo per spiedo e barbecue - Macelleria Da Luca',
    stockQty: 11,
    bbqHighlight: true,
  },

  // 9-12: PREPARAZIONI PRONTE (4 prodotti con 4 foto diverse)
  {
    id: 'prod-involtini-pistacchio',
    name: 'Involtini Gourmet in Crosta di Pistacchio di Bronte',
    category: 'preparazioni-pronte',
    categoryLabel: 'Preparazioni Pronte',
    pricePerUnit: 16.5,
    unit: 'vassoio (500g)',
    defaultWeightLabel: '500 g (6 involtini artigianali)',
    origin: 'Preparazione giornaliera nel laboratorio di Vigardolo',
    agingOrPrep: 'Fatti a mano ogni mattina',
    cookingTip:
      '15 minuti in padella antiaderente con un filo d’olio extravergine o 18 minuti in forno a 180°C.',
    description:
      'Fettine sottili di lonza e scottona farcite con formaggio Asiago dolce e speck, panate a mano in granella di pistacchio.',
    image: IMG_INVOLTINI,
    imageWebp: IMG_INVOLTINI_WEBP,
    imageAlt: 'Involtini di carne gourmet al pistacchio pronti a cuocere - Macelleria Da Luca',
    stockQty: 22,
    featured: true,
    badgeText: 'Fatto in Casa',
  },
  {
    id: 'prod-burger-tartufo',
    name: 'Burger di Scottona al Tartufo Nero dei Berici',
    category: 'preparazioni-pronte',
    categoryLabel: 'Preparazioni Pronte',
    pricePerUnit: 11.0,
    unit: 'confezione (2x200g)',
    defaultWeightLabel: '400 g (2 maxi burger da 200g)',
    origin: 'Macinato fresco di Scottona e scaglie di tartufo',
    agingOrPrep: 'Senza conservanti · Macinato al momento',
    cookingTip:
      'Piastra ben calda 4 minuti per lato, adagiando una fetta di Morlacco o Asiago negli ultimi 60 secondi.',
    description:
      'Hamburger ad alto spessore preparati esclusivamente con tagli nobili macinati grossi e profumo autentico dei Colli Berici.',
    image: IMG_BURGER,
    imageWebp: IMG_BURGER_WEBP,
    imageAlt: 'Hamburger di Scottona al tartufo nero dei Berici - Macelleria Da Luca',
    stockQty: 25,
  },
  {
    id: 'prod-spiedini-rustici',
    name: 'Spiedini Reali Misti per Griglia e Forno',
    category: 'preparazioni-pronte',
    categoryLabel: 'Preparazioni Pronte',
    pricePerUnit: 14.5,
    unit: 'vassoio (600g)',
    defaultWeightLabel: '600 g (6 spiedini ricchi)',
    origin: 'Manzo, suino veneto, pancetta tesa e salvia fresca',
    agingOrPrep: 'Infilzati a mano',
    cookingTip: 'Cuocere a fuoco medio girandoli spesso per far sciogliere la pancetta.',
    description:
      'Un grande classico della Macelleria Da Luca: bocconcini calibrati per cuocere uniformemente restando morbidi all’interno.',
    image: IMG_PRONTI,
    imageWebp: IMG_PRONTI_WEBP,
    imageAlt: 'Spiedini rustici misti di carne infilzati a mano - Macelleria Da Luca',
    stockQty: 20,
  },
  {
    id: 'prod-arrosto-farcito-asiago',
    name: 'Arrosto di Vitello Farcito con Asiago DOP e Finferli',
    category: 'preparazioni-pronte',
    categoryLabel: 'Preparazioni Pronte',
    pricePerUnit: 23.0,
    unit: 'pezzo (~850g)',
    defaultWeightLabel: 'Circa 850 g (per 4-5 persone) · Legato a mano',
    origin: 'Laboratorio gastronomico di Via S. Floriano, Vigardolo',
    agingOrPrep: 'Legato a mano con spago da cucina e rosmarino fresco',
    cookingTip:
      'Rosolare in casseruola con burro e salvia, sfumare al vino bianco e cuocere in forno a 175°C per 55 minuti.',
    description:
      'Il re del pranzo della domenica: tenerissima fesa di vitello arrotolata a mano con cuore morbido di Asiago DOP e funghi.',
    image: IMG_ARROSTO,
    imageWebp: IMG_ARROSTO_WEBP,
    imageAlt: 'Arrosto di vitello farcito legato a mano pronto da cuocere - Macelleria Da Luca',
    stockQty: 10,
    badgeText: 'Pranzo Domenica',
  },

  // 13-14: SALUMI (2 prodotti con 2 foto diverse)
  {
    id: 'prod-soppressa-vicentina',
    name: 'Soppressa Vicentina Artigianale Stagionata',
    category: 'salumi',
    categoryLabel: 'Salumi',
    pricePerUnit: 18.5,
    unit: 'trancio (~600g)',
    defaultWeightLabel: 'Trancio sottovuoto ~600 g',
    origin: 'Tradizione norcina del Vicentino',
    agingOrPrep: 'Stagionatura naturale in cantina 4 mesi',
    cookingTip:
      'Affettare a coltello a spessore medio e servire a temperatura ambiente con pane rustico o polenta abbrustolita.',
    description:
      'Morbida, profumata di pepe macinato fresco e vino rosso locale, prodotta secondo l’antica ricetta vicentina.',
    image: IMG_SOPPRESSA,
    imageWebp: IMG_SOPPRESSA_WEBP,
    imageAlt: 'Soppressa Vicentina DOP artigianale stagionata affettata - Macelleria Da Luca',
    stockQty: 15,
    featured: true,
    badgeText: 'Tradizione VI',
  },
  {
    id: 'prod-pancetta-arrotolata',
    name: 'Pancetta Arrotolata alle Erbe di Montagna',
    category: 'salumi',
    categoryLabel: 'Salumi',
    pricePerUnit: 9.8,
    unit: 'vaschetta (250g)',
    defaultWeightLabel: '250 g affettata fresca al momento',
    origin: 'Selezione norcineria veneta',
    agingOrPrep: 'Conciata a mano con rosmarino, ginepro e pepe',
    cookingTip: 'Ottima sul pane caldo appena sfornato o per avvolgere filetti e arrosti.',
    description:
      'Dolcezza avvolgente che si scioglie al palato, affettata sottile poco prima del ritiro o della consegna.',
    image: IMG_PANCETTA,
    imageWebp: IMG_PANCETTA_WEBP,
    imageAlt: 'Pancetta arrotolata alle erbe di montagna affettata fresca - Macelleria Da Luca',
    stockQty: 19,
  },

  // 15-16: SUGHI (2 prodotti con 2 foto diverse)
  {
    id: 'prod-ragu-tradizionale',
    name: 'Ragù Antica Ricetta di Casa Da Luca',
    category: 'sughi',
    categoryLabel: 'Sughi',
    pricePerUnit: 8.5,
    unit: 'vasetto (280g)',
    defaultWeightLabel: 'Vasetto vetro 280 g (per 3-4 porzioni)',
    origin: 'Carni scelte macinate a coltello e verdure fresche',
    agingOrPrep: 'Cottura lenta di 5 ore come fatto in casa',
    cookingTip:
      'Scaldare a fuoco dolcissimo con un cucchiaio di acqua di cottura della pasta e mantecare con burro e Grana.',
    description:
      'Uno dei prodotti più amati dai nostri clienti: denso, ricco di carne vera e privo di conservanti, pronto per bigoli o tagliatelle.',
    image: IMG_SALUMI_SUGHI_PANE,
    imageWebp: IMG_SALUMI_SUGHI_PANE_WEBP,
    imageAlt: 'Vasetto di ragù artigianale fatto in casa - Macelleria Da Luca',
    stockQty: 24,
    featured: true,
    badgeText: 'Specialità di Luca',
  },
  {
    id: 'prod-ragu-anatra',
    name: 'Sugo d’Anatra alla Veneta Tagliato a Coltello',
    category: 'sughi',
    categoryLabel: 'Sughi',
    pricePerUnit: 10.5,
    unit: 'vasetto (280g)',
    defaultWeightLabel: 'Vasetto vetro 280 g (ideale per Bigoli)',
    origin: 'Anatra allevata a terra in Veneto',
    agingOrPrep: 'Sfumato al vino bianco con alloro, salvia e rosmarino',
    cookingTip: 'Il compagno perfetto per i bigoli al torchio della domenica vicentina.',
    description:
      'Sapore autentico delle feste venete, preparato nel nostro laboratorio con polpa d’anatra rosolata lentamente.',
    image: IMG_RAGU_ANATRA,
    imageWebp: IMG_RAGU_ANATRA_WEBP,
    imageAlt: 'Sugo di anatra alla veneta tagliato a coltello in vasetto - Macelleria Da Luca',
    stockQty: 16,
  },

  // 17-18: PANE ARTIGIANALE (2 prodotti con 2 foto diverse)
  {
    id: 'prod-pagnotta-lievito-madre',
    name: 'Pagnotta Rustica a Lievitazione Naturale',
    category: 'pane',
    categoryLabel: 'Pane Artigianale',
    pricePerUnit: 4.5,
    unit: 'pagnotta (600g)',
    defaultWeightLabel: 'Circa 600 g · Crosta croccante',
    origin: 'Forno artigianale locale · Fresco ogni mattina',
    agingOrPrep: 'Lievito madre vivo e farine macinate a pietra',
    cookingTip:
      'Perfetta per la scarpetta nei nostri sughi o bruschettata sulla brace accanto alla Fiorentina.',
    description:
      'In bottega da Luca trovi anche il pane fresco quotidiano: alveolatura ampia, profumo di grano tostato e lunga conservazione.',
    image: IMG_PAGNOTTA,
    imageWebp: IMG_PAGNOTTA_WEBP,
    imageAlt: 'Pagnotta rustica artigianale a lievitazione naturale - Macelleria Da Luca',
    stockQty: 18,
    badgeText: 'Sfornato Oggi',
  },
  {
    id: 'prod-ciabatta-veneta',
    name: 'Ciabatta Veneta Croccante (Confezione 4 Pezzi)',
    category: 'pane',
    categoryLabel: 'Pane Artigianale',
    pricePerUnit: 3.8,
    unit: 'sacchetto (4 pz)',
    defaultWeightLabel: '4 ciabatte dorate (~450g totali)',
    origin: 'Panificio artigianale del territorio',
    agingOrPrep: 'Impasto ad alta idratazione',
    cookingTip:
      'Ideale da farcire con la nostra Soppressa Vicentina o con gli hamburger di Scottona.',
    description:
      'Crosta sottile e friabile con mollica leggerissima, pensata per accompagnare salumi e grigliate in compagnia.',
    image: IMG_CIABATTA,
    imageWebp: IMG_CIABATTA_WEBP,
    imageAlt: 'Ciabatta veneta croccante pane fresco artigianale - Macelleria Da Luca',
    stockQty: 20,
  },
];

export const AUTHENTIC_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    authorName: 'Andrea Fanchin',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Andrea+Fanchin&background=721824&color=FCF9F4&bold=true',
    badge: 'Local Guide · 424 recensioni',
    rating: 5,
    dateLabel: '2 mesi fa su Google Maps',
    text: 'Tra le macellerie più importanti del Vicentino, con carni di altissima qualità. La qualità, appunto, oltre la cortesia e l’altissima professionalità fanno di questa realtà un locale unico.',
    ownerReply:
      'Grazie mille Andrea, è una grande soddisfazione per me ricevere tali gratificazioni! Mi dà la carica per fare sempre meglio il mio lavoro.',
    highlightTag: 'Eccellenza nel Vicentino',
  },
  {
    id: 'rev-2',
    authorName: 'Matteo Giaretta',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Matteo+Giaretta&background=D4AF37&color=1C1614&bold=true',
    badge: 'Local Guide · 41 recensioni',
    rating: 5,
    dateLabel: '1 mese fa su Google Maps',
    text: 'Carne squisita, preparazioni varie e sughi buonissimi. Carne di ottima qualità e professionalità da vendere. Nota non da meno, unica macelleria in zona dove puoi trovare tagli da fare nel BBQ, veramente il top in zona.',
    ownerReply: 'Grazie mille Matteo, è un piacere servirti.',
    highlightTag: 'Riferimento Tagli BBQ',
  },
  {
    id: 'rev-3',
    authorName: 'Enrico',
    avatarUrl: 'https://ui-avatars.com/api/?name=Enrico+V&background=460E16&color=FCF9F4&bold=true',
    badge: 'Local Guide · 127 recensioni',
    rating: 5,
    dateLabel: '11 mesi fa su Google Maps',
    text: 'Passione, conoscenza, dedizione, gentilezza e qualità dei prodotti sono al centro dell’attenzione e fulcro in questo esercizio gestito benissimo da Luca e i suoi collaboratori. Ora hanno anche il pane.',
    ownerReply: 'Grazie Enrico, per la fiducia e per il giudizio!',
    highlightTag: 'Qualità & Pane Fresco',
  },
  {
    id: 'rev-4',
    authorName: 'Giorgio M.',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Giorgio+M&background=8C2332&color=FCF9F4&bold=true',
    badge: 'Local Guide · 76 recensioni',
    rating: 5,
    dateLabel: '3 mesi fa su Google Maps',
    text: 'Cortesia, professionalità e disponibilità nel soddisfare tutte le esigenze del cliente, ottima carne, speciali sughi, e i salumi rendono questa macelleria il top della categoria. DA PROVARE!',
    highlightTag: 'Carni, Sughi & Salumi',
  },
  {
    id: 'rev-5',
    authorName: 'Franco Vallery',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Franco+Vallery&background=5C131D&color=FCF9F4&bold=true',
    badge: 'Local Guide · 27 recensioni',
    rating: 5,
    dateLabel: '6 mesi fa su Google Maps',
    text: 'Macelleria molto ben rifornita con prodotti particolari creati in casa. Titolare e personale molto gentile disponibile a qualsiasi chiarimento anche per quanto riguarda la cottura.',
    ownerReply: 'Grazie mille Franco.',
    highlightTag: 'Consigli di Cottura',
  },
  {
    id: 'rev-6',
    authorName: 'Federico Vigolo',
    avatarUrl:
      'https://ui-avatars.com/api/?name=Federico+Vigolo&background=B89028&color=1C1614&bold=true',
    badge: 'Local Guide · 146 recensioni',
    rating: 5,
    dateLabel: '4 mesi fa su Google Maps',
    text: 'Qui trovi prodotti e servizio al TOP. Le bistecche e i pronti a cuocere non deludono mai.',
    highlightTag: 'Servizio al Top',
  },
];

export const BUTCHER_RECIPES: RecipeArticle[] = [
  {
    id: 'rec-tomahawk-reverse-sear',
    slug: 'tomahawk-reverse-searing-brace',
    title: 'Il Tomahawk Perfetto: Guida al Reverse Searing su Brace o Forno',
    subtitle:
      'Come ottenere una crosta caramellata fuori e un cuore rosa uniforme da bordo a bordo sui tagli ad alto spessore.',
    category: 'Accademia BBQ',
    prepTime: '15 min + 2h temperamento',
    cookTime: '45 min',
    difficulty: 'Maestro Griller',
    recommendedProductId: 'prod-tomahawk-bbq',
    recommendedProductName: 'Tomahawk Steak Imperiale BBQ',
    image: HERO_IMAGE,
    imageWebp: HERO_IMAGE_WEBP,
    excerpt:
      'Quando una bistecca supera i 4 centimetri di spessore, la cottura diretta rischia di bruciare l’esterno lasciando il centro freddo. Ecco il metodo che consigliamo in bottega a Vigardolo.',
    ingredients: [
      '1 Tomahawk Steak Da Luca (circa 1,3 kg, frollato 45 giorni)',
      'Fiocchi di sale Maldon o sale marino integrale grosso',
      'Pepe nero Tellicherry macinato al momento',
      '2 rametti di rosmarino fresco e 2 spicchi d’aglio in camicia',
      'Olio extravergine d’oliva dei Colli Berici',
    ],
    steps: [
      {
        stepNumber: '01',
        title: 'Temperamento fuori dal frigorifero',
        detail:
          'Estrai il Tomahawk dal frigorifero almeno 2 ore prima di accendere il barbecue, asciugando bene la superficie con carta assorbente.',
      },
      {
        stepNumber: '02',
        title: 'Fase Indiretta (Low & Slow)',
        detail:
          'Stabilizza il barbecue o il forno statico a 110°C. Posiziona la carne lontano dalle braci dirette finché la sonda al cuore raggiunge esattamente 48°C (per cottura media-al sangue).',
      },
      {
        stepNumber: '03',
        title: 'Riposo intermedio e Searing su fiamma viva',
        detail:
          'Fai riposare 5 minuti, poi trasferisci il Tomahawk sulla griglia rovente sopra la brace viva per 90 secondi per lato per creare la reazione di Maillard.',
      },
      {
        stepNumber: '04',
        title: 'Taglio e servizio',
        detail:
          'Stacca il muscolo dall’osso lungo e scaloppa controfibra a fette di 1 cm, rifinendo con fiocchi di sale e un filo d’olio a crudo.',
      },
    ],
    lucaSecretTip:
      'Non salare la carne un’ora prima: o sali 24 ore prima in frigo su griglia (dry brining), oppure sali solo dopo il taglio sui singoli bocconi per non far uscire i succhi.',
  },
  {
    id: 'rec-ribs-st-louis-321',
    slug: 'costine-st-louis-metodo-3-2-1',
    title: 'Costine St. Louis succose con il Metodo 3-2-1',
    subtitle:
      'Il segreto per costine che si staccano dall’osso con una leggera pressione ma restano sode al morso.',
    category: 'Low & Slow BBQ',
    prepTime: '10 min',
    cookTime: '5h 30m',
    difficulty: 'Media',
    recommendedProductId: 'prod-costine-st-louis',
    recommendedProductName: 'Pork Ribs St. Louis Style con Rub Artigianale',
    image: IMG_BBQ,
    imageWebp: IMG_BBQ_WEBP,
    excerpt:
      'Le nostre baffe St. Louis sono già pulite dalla pleura e massaggiate con il nostro rub di spezie. Ti basta gestire temperatura e avvolgimento.',
    ingredients: [
      '1 Baffa di Pork Ribs St. Louis già speziata Da Luca (~1,2 kg)',
      'Mezzo bicchiere di succo di mela non filtrato',
      '30 g di burro di malga e 1 cucchiaio di miele di castagno',
      'Legno di melo o ciliegio per affumicatura',
    ],
    steps: [
      {
        stepNumber: '01',
        title: '3 Ore di Affumicatura a 110°C',
        detail:
          'Disponi le costine con l’osso rivolto verso il basso in cottura indiretta a 110°C con fumo leggero di legno di melo. Vaporizza con succo di mela ogni 50 minuti.',
      },
      {
        stepNumber: '02',
        title: '2 Ore nel Cartoccio (Texas Crutch)',
        detail:
          'Avvolgi strettamente la baffa in carta butcher o doppio foglio di alluminio con fiocchetti di burro, miele e due cucchiai di succo di mela.',
      },
      {
        stepNumber: '03',
        title: 'Ultimi 45 minuti di Barking',
        detail:
          'Apri il cartoccio e rimetti le costine in griglia libera per 30-45 minuti finché la superficie torna asciutta, lucida e caramellata.',
      },
    ],
    lucaSecretTip:
      'Fai il "Bend Test": solleva la baffa da un’estremità con la pinza; se la crosta in superficie si incrina leggermente senza spezzarsi a metà, sono pronte.',
  },
  {
    id: 'rec-bigoli-ragu-anatra',
    slug: 'bigoli-ragu-anatra-tradizione-vicentina',
    title: 'Bigoli con il Nostro Sugo d’Anatra: Il Pranzo della Domenica Vicentina',
    subtitle:
      'Come valorizzare il sugo d’anatra tagliato a coltello preparato nel laboratorio di Via San Floriano.',
    category: 'Tradizione Veneta',
    prepTime: '5 min',
    cookTime: '12 min',
    difficulty: 'Facile',
    recommendedProductId: 'prod-ragu-anatra',
    recommendedProductName: 'Sugo d’Anatra alla Veneta Tagliato a Coltello',
    image: IMG_RAGU_ANATRA,
    imageWebp: IMG_RAGU_ANATRA_WEBP,
    excerpt:
      'Quando il tempo stringe ma non vuoi rinunciare ai sapori veri della cucina veneta, il nostro sugo d’anatra cotto 5 ore trasforma un primo piatto in festa.',
    ingredients: [
      '1 Vasetto di Sugo d’Anatra alla Veneta Da Luca (280 g)',
      '400 g di Bigoli freschi all’uovo',
      '40 g di burro di montagna freddo',
      'Grana Padano DOP stagionato 24 mesi grattugiato',
      '1 Pagnotta Rustica a Lievitazione Naturale per la scarpetta',
    ],
    steps: [
      {
        stepNumber: '01',
        title: 'Riscaldare dolcemente il ragù',
        detail:
          'Versa il contenuto del vasetto in un tegame largo con due cucchiai di acqua calda a fiamma bassissima senza farlo friggere.',
      },
      {
        stepNumber: '02',
        title: 'Scolare i bigoli al dente nel tegame',
        detail:
          'Scola i bigoli 2 minuti prima del tempo indicato e trasferiscili direttamente nel sugo con mezza mestolata d’acqua amidacea.',
      },
      {
        stepNumber: '03',
        title: 'Mantecatura fuori dal fuoco',
        detail:
          'Spegni la fiamma, unisci una noce di burro freddo e il Grana Padano, saltando energicamente per creare un’emulsione cremosa.',
      },
    ],
    lucaSecretTip:
      'Aggiungi una grattugiata finissima di scorza d’arancia non trattata o un pizzico di cannella appena percettibile sul piatto finito, come si usava nelle corti rurali vicentine.',
  },
];

export const VICENTINO_MUNICIPALITIES = [
  'Vigardolo (Monticello Conte Otto)',
  'Cavazzale (Monticello Conte Otto)',
  'Monticello Conte Otto',
  'Bolzano Vicentino',
  'Bressanvido',
  'Vicenza Città',
  'Quinto Vicentino',
  'Dueville',
  'Sandrigo',
  'Caldogno',
  'Costabissara',
];

export function getLegalPageHtml(
  pageType: 'privacy' | 'cookie' | 'termini',
  siteConfig: ButcherSiteConfig = DEFAULT_SITE_CONFIG,
): { title: string; slug: string; htmlContent: string } {
  if (pageType === 'privacy') {
    return {
      title: 'Privacy Policy — Informativa sul Trattamento dei Dati Personali (GDPR)',
      slug: 'privacy-policy',
      htmlContent: `
<div class="space-y-6 text-sm leading-relaxed text-carbone-800">
  <p>Ai sensi dell’art. 13 del Regolamento UE 2016/679 (<strong>GDPR</strong>), <strong>Macelleria Da Luca</strong> fornisce le seguenti informazioni sul trattamento dei dati personali raccolti tramite questo sito web.</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">1. Titolare del Trattamento</h3>
  <p><strong>Macelleria Da Luca</strong><br/>Sede legale e operativa: <strong>Via S. Floriano, 26 — 36010 Vigardolo, Monticello Conte Otto (VI), Italia</strong><br/>Telefono: ${siteConfig.shopPhoneDisplay} · Email: info@macelleriadaluca.it</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">2. Finalità e Base Giuridica del Trattamento</h3>
  <ul class="list-disc list-inside space-y-1.5">
    <li><strong>Gestione ordini online, ritiro in negozio e consegna a domicilio nel Vicentino:</strong> esecuzione di misure precontrattuali e contrattuali (art. 6, par. 1, lett. b GDPR).</li>
    <li><strong>Gestione Area Clienti e Programma Tessera Fedeltà:</strong> erogazione dei punti fedeltà e storico ordini su richiesta dell’interessato.</li>
    <li><strong>Adempimenti fiscali e contabili:</strong> obbligo di legge a cui è soggetto il Titolare (art. 6, par. 1, lett. c GDPR).</li>
    <li><strong>Richieste via WhatsApp o contatto telefonico:</strong> riscontro diretto alle richieste del cliente su tagli di carne, frollature e disponibilità.</li>
  </ul>
  <h3 class="font-display text-xl font-bold text-carbone-950">3. Modalità di Trattamento e Conservazione</h3>
  <p>I dati sono trattati con strumenti elettronici e cartacei nel pieno rispetto delle misure di sicurezza previste dal GDPR. I dati relativi agli ordini sono conservati per i termini previsti dalla normativa fiscale italiana (10 anni), mentre i dati dell’Area Clienti sono conservati fino a richiesta di cancellazione.</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">4. Diritti dell’Interessato</h3>
  <p>In ogni momento l’utente può esercitare i diritti di accesso, rettifica, cancellazione (oblio), limitazione, portabilità e opposizione (artt. 15–22 GDPR) scrivendo o recandosi presso la sede di Via S. Floriano 26, Vigardolo (VI), oppure proponendo reclamo al Garante per la Protezione dei Dati Personali.</p>
</div>`,
    };
  }

  if (pageType === 'cookie') {
    return {
      title: 'Cookie Policy — Informativa sull’Uso dei Cookie',
      slug: 'cookie-policy',
      htmlContent: `
<div class="space-y-6 text-sm leading-relaxed text-carbone-800">
  <p>La presente <strong>Cookie Policy</strong> illustra le tipologie di cookie e tecnologie di archiviazione locale utilizzate dal sito ufficiale della <strong>Macelleria Da Luca</strong> (Via S. Floriano 26, Vigardolo VI).</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">1. Cookie Tecnici Strettamente Necessari (Sempre Attivi)</h3>
  <p>Questi cookie e chiavi <code>localStorage</code> sono indispensabili per il funzionamento del sito e non richiedono il consenso preventivo dell’utente:</p>
  <ul class="list-disc list-inside space-y-1.5">
    <li><code>macelleria_da_luca_cart_v2</code>: memorizza i prodotti aggiunti al carrello durante la sessione di acquisto.</li>
    <li><code>macelleria_da_luca_customer_v2</code>: mantiene i recapiti rapidi e il saldo punti della Tessera Fedeltà nell’Area Clienti.</li>
    <li><code>macelleria_da_luca_cookie_consent_v1</code>: registra le preferenze espresse dall’utente nel banner GDPR.</li>
  </ul>
  <h3 class="font-display text-xl font-bold text-carbone-950">2. Cookie Analitici (Opzionali)</h3>
  <p>Utilizzati esclusivamente previo consenso dell’utente per raccogliere informazioni statistiche aggregate sul numero dei visitatori e sulle pagine più visitate (es. catalogo tagli BBQ, ricette di cottura).</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">3. Cookie di Marketing e Terze Parti (Opzionali)</h3>
  <p>Utilizzati previo consenso per mostrare mappe interattive esterne (Google Maps) e contenuti promozionali personalizzati nel territorio di Vicenza e provincia.</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">4. Gestione o Revoca del Consenso</h3>
  <p>L’utente può modificare in qualsiasi momento le proprie scelte cliccando su “Gestisci preferenze Cookie” nel footer del sito o cancellando i dati di navigazione del proprio browser.</p>
</div>`,
    };
  }

  return {
    title: 'Termini e Condizioni di Vendita, Ritiro e Consegna',
    slug: 'termini-e-condizioni',
    htmlContent: `
<div class="space-y-6 text-sm leading-relaxed text-carbone-800">
  <p>I presenti <strong>Termini e Condizioni</strong> regolano la prenotazione e l’acquisto di carni fresche, tagli BBQ, preparazioni gastronomiche, salumi, sughi e prodotti da forno presso <strong>Macelleria Da Luca</strong>, Via S. Floriano 26, 36010 Vigardolo (VI).</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">1. Prodotti a Peso Variabile e Freschezza Artigianale</h3>
  <p>Tutti i tagli di carne e le preparazioni del banco sono lavorati artigianalmente al momento dell’ordine. Per i prodotti venduti a peso (es. Fiorentina, Costata, Tomahawk, Arrosti), il peso indicato è approssimativo e può variare leggermente del ±5–8% in base al taglio anatomico.</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">2. Ritiro in Bottega a Vigardolo e Consegna Refrigerata nel Vicentino</h3>
  <ul class="list-disc list-inside space-y-1.5">
    <li><strong>Ritiro in Negozio (Gratuito):</strong> disponibile in Via S. Floriano 26, Vigardolo (VI) nella fascia oraria selezionata, con corsia prioritaria salta-fila.</li>
    <li><strong>Consegna a Domicilio con Mezzo Refrigerato:</strong> attiva per Vigardolo, Monticello Conte Otto, Cavazzale, Vicenza, Bolzano Vicentino, Bressanvido, Sandrigo, Dueville, Quinto Vicentino, Caldogno e Costabissara. Gratuita per ordini superiori a €50,00 (contributo €4,50 sotto tale soglia).</li>
  </ul>
  <h3 class="font-display text-xl font-bold text-carbone-950">3. Modalità di Pagamento</h3>
  <p>Sono accettati pagamenti online tramite Carta di Credito/Debito, Satispay, Bonifico Istantaneo oppure pagamento diretto al ritiro in macelleria (contanti, Bancomat o carte).</p>
  <h3 class="font-display text-xl font-bold text-carbone-950">4. Prodotti Freschi Deperibili e Reclami</h3>
  <p>Trattandosi di prodotti alimentari freschi altamente deperibili (art. 59, lett. d del Codice del Consumo), il diritto di recesso standard a 14 giorni non si applica. Tuttavia, Macelleria Da Luca garantisce al 100% la qualità delle proprie carni: per qualsiasi anomalia al momento della consegna o del ritiro, il cliente può contattarci immediatamente al numero ${siteConfig.shopPhoneDisplay} per la sostituzione o il rimborso.</p>
</div>`,
  };
}

