import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Flame,
  MapPin,
  Phone,
  Clock,
  Star,
  Plus,
  Minus,
  Trash2,
  Check,
  ChefHat,
  Truck,
  Store,
  Search,
  X,
  MessageCircle,
  ArrowRight,
  Award,
  Edit3,
  BookOpen,
  Menu,
  ShieldCheck,
  Cookie,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import {
  BUTCHER_CATEGORIES,
  INITIAL_PRODUCTS,
  AUTHENTIC_REVIEWS,
  BUTCHER_RECIPES,
  VICENTINO_MUNICIPALITIES,
  DEFAULT_SITE_CONFIG,
  LOGO_TORO,
  LOGO_TORO_WEBP,
  HERO_IMAGE,
  HERO_IMAGE_WEBP,
  IMG_FIORENTINA,
  IMG_FIORENTINA_WEBP,
  IMG_BBQ,
  IMG_BBQ_WEBP,
  IMG_PRONTI,
  IMG_PRONTI_WEBP,
  IMG_SALUMI_SUGHI_PANE,
  IMG_SALUMI_SUGHI_PANE_WEBP,
  getWebpVariant,
  getLegalPageHtml,
  type ButcherCategory,
  type ButcherProduct,
  type ButcherSiteConfig,
  type CartItem,
  type FulfillmentType,
  type PaymentMethodType,
  type ButcherOrder,
  type OrderStatus,
  type RecipeArticle,
} from '@/lib/butcherCatalog';
import { showToast } from '@/lib/toast';

export type WorkspaceType =
  | 'storefront'
  | 'area-clienti'
  | 'admin'
  | 'privacy'
  | 'cookie'
  | 'termini';

interface MacelleriaStorefrontProps {
  initialSection?: 'home' | 'catalogo' | 'area-clienti' | 'admin';
  onOpenLegacyAdmin?: () => void;
}

const STORAGE_KEYS = {
  PRODUCTS: 'macelleria_da_luca_products_v4', // v4 ensures all 18 unique product images load immediately
  ORDERS: 'macelleria_da_luca_orders_v2',
  CART: 'macelleria_da_luca_cart_v2',
  CUSTOMER_PROFILE: 'macelleria_da_luca_customer_v2',
  SITE_CONFIG: 'macelleria_da_luca_site_config_v1',
  COOKIE_CONSENT: 'macelleria_da_luca_cookie_consent_v1',
};

interface CookiePreferences {
  decided: boolean;
  technical: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

interface LoyaltyPointsHistoryEntry {
  id: string;
  date: string;
  description: string;
  pointsDelta: number;
}

interface CustomerProfile {
  isLoggedIn: boolean;
  name: string;
  email: string;
  phone: string;
  address: string;
  municipality: string;
  quickOrderNotes: string;
  loyaltyPoints: number;
  pointsHistory: LoyaltyPointsHistoryEntry[];
}

const INITIAL_SAMPLE_ORDERS: ButcherOrder[] = [
  {
    id: 'ord-1041',
    orderNumber: 'MDL-1041',
    createdAt: '10/10/2026 · 09:15',
    customerName: 'Matteo Giaretta',
    customerEmail: 'matteo.giaretta@esempio.it',
    customerPhone: '+39 347 8821904',
    fulfillment: 'ritiro',
    pickupOrDeliveryDate: 'Sabato 10 Ottobre',
    pickupOrDeliveryTimeSlot: '11:30 - 12:30 (Ritiro in Bottega Vigardolo)',
    paymentMethod: 'carta-online',
    paymentStatus: 'pagato-online',
    items: [
      {
        productId: 'prod-tomahawk-bbq',
        productName: 'Tomahawk Steak Imperiale BBQ',
        unit: 'pezzo (~1.3 kg)',
        quantity: 1,
        unitPrice: 56.0,
        subtotal: 56.0,
        notes: 'Sottovuoto per grigliata domani',
      },
      {
        productId: 'prod-costine-st-louis',
        productName: 'Pork Ribs St. Louis Style con Rub Artigianale',
        unit: 'baffa (~1.2 kg)',
        quantity: 2,
        unitPrice: 22.0,
        subtotal: 44.0,
      },
      {
        productId: 'prod-pagnotta-lievito-madre',
        productName: 'Pagnotta Rustica a Lievitazione Naturale',
        unit: 'pagnotta (600g)',
        quantity: 1,
        unitPrice: 4.5,
        subtotal: 4.5,
      },
    ],
    subtotalEur: 104.5,
    deliveryFeeEur: 0,
    totalEur: 104.5,
    notes: 'Preparare rub a parte per una delle due baffe.',
    status: 'pronto',
  },
  {
    id: 'ord-1040',
    orderNumber: 'MDL-1040',
    createdAt: '09/10/2026 · 16:40',
    customerName: 'Elena Toffoletto',
    customerEmail: 'elena.toffoletto@esempio.it',
    customerPhone: '+39 340 5192831',
    fulfillment: 'consegna',
    pickupOrDeliveryDate: 'Sabato 10 Ottobre',
    pickupOrDeliveryTimeSlot: '17:00 - 19:00 (Consegna Refrigerata)',
    deliveryAddress: 'Via Roma 18',
    deliveryMunicipality: 'Cavazzale (Monticello Conte Otto)',
    paymentMethod: 'satispay',
    paymentStatus: 'pagato-online',
    items: [
      {
        productId: 'prod-involtini-pistacchio',
        productName: 'Involtini Gourmet in Crosta di Pistacchio di Bronte',
        unit: 'vassoio (500g)',
        quantity: 2,
        unitPrice: 16.5,
        subtotal: 33.0,
      },
      {
        productId: 'prod-ragu-anatra',
        productName: 'Sugo d’Anatra alla Veneta Tagliato a Coltello',
        unit: 'vasetto (280g)',
        quantity: 2,
        unitPrice: 10.5,
        subtotal: 21.0,
      },
    ],
    subtotalEur: 54.0,
    deliveryFeeEur: 0,
    totalEur: 54.0,
    status: 'confermato',
  },
  {
    id: 'ord-1039',
    orderNumber: 'MDL-1039',
    createdAt: '08/10/2026 · 18:10',
    customerName: 'Andrea Fanchin',
    customerEmail: 'andrea.fanchin@vicenza.it',
    customerPhone: '+39 348 7123456',
    fulfillment: 'ritiro',
    pickupOrDeliveryDate: 'Giovedì 8 Ottobre',
    pickupOrDeliveryTimeSlot: '18:00 - 19:15 (Ritiro in Bottega Vigardolo)',
    paymentMethod: 'pagamento-al-ritiro',
    paymentStatus: 'da-saldare-al-ritiro',
    items: [
      {
        productId: 'prod-fiorentina-scottona',
        productName: 'Bistecca alla Fiorentina di Scottona Frollata 40gg',
        unit: 'pezzo (~1.1 kg)',
        quantity: 1,
        unitPrice: 44.0,
        subtotal: 44.0,
      },
      {
        productId: 'prod-soppressa-vicentina',
        productName: 'Soppressa Vicentina Artigianale Stagionata',
        unit: 'trancio (~600g)',
        quantity: 1,
        unitPrice: 18.5,
        subtotal: 18.5,
      },
    ],
    subtotalEur: 62.5,
    deliveryFeeEur: 0,
    totalEur: 62.5,
    status: 'consegnato',
  },
];

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  'in-attesa': 'In attesa',
  confermato: 'Confermato',
  pronto: 'Pronto',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
};

export default function MacelleriaStorefront({
  initialSection = 'home',
}: MacelleriaStorefrontProps) {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>(
    initialSection === 'admin'
      ? 'admin'
      : initialSection === 'area-clienti'
        ? 'area-clienti'
        : 'storefront',
  );
  const [activeSeoSection, setActiveSeoSection] = useState<'home' | 'bottega' | 'bbq'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Site Config State (editable in Admin: WhatsApp Number, Opening Hours, Hero Texts)
  const [siteConfig, setSiteConfig] = useState<ButcherSiteConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_SITE_CONFIG;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.SITE_CONFIG);
      if (saved) {
        return { ...DEFAULT_SITE_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SITE_CONFIG;
  });

  // Products & Stock state (persisted in localStorage, 18 unique products)
  const [products, setProducts] = useState<ButcherProduct[]>(() => {
    if (typeof window === 'undefined') return INITIAL_PRODUCTS;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 18) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_PRODUCTS;
  });

  // Orders state
  const [orders, setOrders] = useState<ButcherOrder[]>(() => {
    if (typeof window === 'undefined') return INITIAL_SAMPLE_ORDERS;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SAMPLE_ORDERS;
  });

  // Shopping Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.CART);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        product: INITIAL_PRODUCTS[0],
        quantity: 1,
        customNotes: 'Taglio alto 4 dita per griglia',
      },
    ];
  });

  // Customer Profile & Loyalty Card state (384 punti di default come richiesto)
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile>(() => {
    const defaultProfile: CustomerProfile = {
      isLoggedIn: true,
      name: 'Andrea Fanchin',
      email: 'andrea.fanchin@vicenza.it',
      phone: '+39 348 7123456',
      address: 'Via San Floriano 14',
      municipality: 'Vigardolo (Monticello Conte Otto)',
      quickOrderNotes: 'Sottovuoto diviso in porzioni da 2 persone, taglio spesso per griglia.',
      loyaltyPoints: 384,
      pointsHistory: [
        {
          id: 'pts-1',
          date: '08/10/2026',
          description: 'Ordine #MDL-1039 (Fiorentina 40gg + Soppressa Vicentina)',
          pointsDelta: 63,
        },
        {
          id: 'pts-2',
          date: '26/09/2026',
          description: 'Spesa in Bottega a Vigardolo (Tagli BBQ & Costine St. Louis)',
          pointsDelta: 141,
        },
        {
          id: 'pts-3',
          date: '12/09/2026',
          description: 'Bonus Benvenuto Tessera Fedeltà Club Amici della Brace',
          pointsDelta: 180,
        },
      ],
    };
    if (typeof window === 'undefined') return defaultProfile;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.CUSTOMER_PROFILE);
      if (saved) return { ...defaultProfile, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return defaultProfile;
  });

  const [isEditingCustomerData, setIsEditingCustomerData] = useState(false);
  const [authFormEmail, setAuthFormEmail] = useState('andrea.fanchin@vicenza.it');
  const [authFormName, setAuthFormName] = useState('Andrea Fanchin');
  const [authFormPassword, setAuthFormPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // GDPR Cookie Consent State
  const [cookieConsent, setCookieConsent] = useState<CookiePreferences>(() => {
    const fallback: CookiePreferences = {
      decided: false,
      technical: true,
      analytics: false,
      marketing: false,
      updatedAt: '',
    };
    if (typeof window === 'undefined') return fallback;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
      if (saved) return { ...fallback, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return fallback;
  });
  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const [tempAnalyticsCookie, setTempAnalyticsCookie] = useState(true);
  const [tempMarketingCookie, setTempMarketingCookie] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore
    }
  }, [products]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.CUSTOMER_PROFILE, JSON.stringify(customerProfile));
    } catch {
      // ignore
    }
  }, [customerProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.SITE_CONFIG, JSON.stringify(siteConfig));
    } catch {
      // ignore
    }
  }, [siteConfig]);

  // Dynamic Local SEO Meta Title & Meta Description synchronization
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let title = 'Macelleria Da Luca | Carne di Qualità a Vigardolo (VI) - Specialisti BBQ';
    let desc =
      'Macelleria artigianale Da Luca in Via S. Floriano 26, Vigardolo (VI). Carni fresche selezionate, specialità tagli BBQ frollati, preparazioni pronte a cuocere, salumi, sughi di casa e pane artigianale.';

    if (activeWorkspace === 'storefront' && activeSeoSection === 'bottega') {
      title =
        'La Bottega | Carni Fresche, Salumi e Preparazioni Artigianali - Macelleria Da Luca';
      desc =
        'Scopri La Bottega della Macelleria Da Luca in Via S. Floriano 26 a Vigardolo (VI): filiera corta veneta, frollature, salumi nostrani, sughi fatti in casa e pane fresco.';
    } else if (activeWorkspace === 'storefront' && activeSeoSection === 'bbq') {
      title = 'Tagli per BBQ a Vicenza | Specialità Griglia - Macelleria Da Luca';
      desc =
        'Specialisti in tagli per BBQ a Vicenza e Vigardolo: Tomahawk Dry-Aged, Beef Brisket, Costine St. Louis, Picanha e Fiorentina di Scottona.';
    } else if (activeWorkspace === 'privacy') {
      title = 'Privacy Policy GDPR | Macelleria Da Luca — Vigardolo (VI)';
    } else if (activeWorkspace === 'cookie') {
      title = 'Cookie Policy | Macelleria Da Luca — Vigardolo (VI)';
    } else if (activeWorkspace === 'termini') {
      title = 'Termini e Condizioni | Macelleria Da Luca — Vigardolo (VI)';
    } else if (activeWorkspace === 'area-clienti') {
      title = 'Area Clienti & Tessera Fedeltà | Macelleria Da Luca — Vigardolo (VI)';
    } else if (activeWorkspace === 'admin') {
      title = 'Pannello Admin — Gestione Ordini e Prodotti | Macelleria Da Luca';
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);
  }, [activeWorkspace, activeSeoSection]);

  // Catalog Filters
  const [selectedCategory, setSelectedCategory] = useState<ButcherCategory>('tutte');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyBbqFilter, setOnlyBbqFilter] = useState(false);

  // Interactive Modals / Drawers
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<ButcherProduct | null>(null);
  const [selectedRecipeModal, setSelectedRecipeModal] = useState<RecipeArticle | null>(null);
  const [confirmedOrderModal, setConfirmedOrderModal] = useState<ButcherOrder | null>(null);

  // Checkout Form States inside Cart Drawer
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('ritiro');
  const [pickupDate, setPickupDate] = useState('Sabato · Giornata Griglia');
  const [pickupSlot, setPickupSlot] = useState('10:30 - 12:30');
  const [customerName, setCustomerName] = useState(customerProfile.name);
  const [customerPhone, setCustomerPhone] = useState(customerProfile.phone);
  const [customerEmail, setCustomerEmail] = useState(customerProfile.email);
  const [deliveryAddress, setDeliveryAddress] = useState(customerProfile.address);
  const [deliveryMunicipality, setDeliveryMunicipality] = useState(customerProfile.municipality);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('carta-online');
  const [orderNotes, setOrderNotes] = useState('');
  const [cardLast4, setCardLast4] = useState('4829');
  const [cardExpiry, setCardExpiry] = useState('09/29');

  // Admin New Product Modal / Editor (Full CRUD)
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<OrderStatus | 'tutti'>('tutti');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>('');
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [editStockValue, setEditStockValue] = useState<string>('');
  const [editUnitValue, setEditUnitValue] = useState<string>('');
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState<Exclude<ButcherCategory, 'tutte'>>('tagli-bbq');
  const [newProdPrice, setNewProdPrice] = useState('28.00');
  const [newProdUnit, setNewProdUnit] = useState('pezzo (~800g)');
  const [newProdStock] = useState('10');
  const [newProdDesc, setNewProdDesc] = useState(
    'Specialità fresca preparata a mano nel banco di Via San Floriano 26 a Vigardolo.',
  );
  const [newProdCookingTip] = useState(
    'Griglia ben calda 3 minuti per lato e riposo sotto carta paglia.',
  );

  // Filtered Catalog Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'tutte' && p.category !== selectedCategory) return false;
      if (onlyBbqFilter && !p.bbqHighlight && p.category !== 'tagli-bbq') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchCat = p.categoryLabel.toLowerCase().includes(q);
        const matchTip = p.cookingTip.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat && !matchTip) return false;
      }
      return true;
    });
  }, [products, selectedCategory, onlyBbqFilter, searchQuery]);

  // Cart Calculations
  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart],
  );

  const subtotalEur = useMemo(
    () => cart.reduce((acc, item) => acc + item.product.pricePerUnit * item.quantity, 0),
    [cart],
  );

  const deliveryFeeEur = useMemo(() => {
    if (fulfillment === 'ritiro') return 0;
    return subtotalEur >= 50 ? 0 : 4.5;
  }, [fulfillment, subtotalEur]);

  const totalEur = subtotalEur + deliveryFeeEur;

  // Cart Handlers
  const handleAddToCart = (product: ButcherProduct, qty = 1, notes?: string) => {
    if (product.stockQty <= 0) {
      showToast(
        'error',
        'Prodotto esaurito in banco oggi. Contatta Luca su WhatsApp per prenotarlo.',
      );
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const updated = [...prev];
        const nextQty = Math.min(product.stockQty, updated[idx].quantity + qty);
        updated[idx] = {
          ...updated[idx],
          quantity: nextQty,
          customNotes: notes || updated[idx].customNotes,
        };
        return updated;
      }
      return [...prev, { product, quantity: qty, customNotes: notes }];
    });
    showToast('success', `Aggiunto al carrello: ${product.name}`);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.product.stockQty) {
            showToast('info', `Disponibilità massima attuale: ${item.product.stockQty} unità.`);
            return item;
          }
          return { ...item, quantity: nextQty };
        })
        .filter((i): i is CartItem => i !== null),
    );
  };

  const handleUpdateCartItemNotes = (productId: string, customNotes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, customNotes } : item)),
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('error', 'Il tuo carrello è vuoto.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('error', 'Inserisci nome e recapito telefonico per la conferma ordine.');
      return;
    }
    if (fulfillment === 'consegna' && !deliveryAddress.trim()) {
      showToast('error', 'Inserisci l’indirizzo di consegna nel Vicentino.');
      return;
    }

    const orderNum = `MDL-${1042 + orders.length}`;
    const nowStr = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newOrder: ButcherOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      createdAt: `${nowStr} · ${timeStr}`,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || 'cliente@macelleriadaluca.it',
      customerPhone: customerPhone.trim(),
      fulfillment,
      pickupOrDeliveryDate: pickupDate,
      pickupOrDeliveryTimeSlot: pickupSlot,
      ...(fulfillment === 'consegna'
        ? {
            deliveryAddress: deliveryAddress.trim(),
            deliveryMunicipality,
          }
        : {}),
      paymentMethod,
      paymentStatus:
        paymentMethod === 'pagamento-al-ritiro' ? 'da-saldare-al-ritiro' : 'pagato-online',
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        unit: c.product.unit,
        quantity: c.quantity,
        unitPrice: c.product.pricePerUnit,
        subtotal: Number((c.product.pricePerUnit * c.quantity).toFixed(2)),
        notes: c.customNotes,
      })),
      subtotalEur: Number(subtotalEur.toFixed(2)),
      deliveryFeeEur: Number(deliveryFeeEur.toFixed(2)),
      totalEur: Number(totalEur.toFixed(2)),
      notes: orderNotes.trim() || undefined,
      status: 'in-attesa',
    };

    // Decrement stock in inventory
    setProducts((prev) =>
      prev.map((prod) => {
        const cartMatch = cart.find((c) => c.product.id === prod.id);
        if (!cartMatch) return prod;
        return {
          ...prod,
          stockQty: Math.max(0, prod.stockQty - cartMatch.quantity),
        };
      }),
    );

    // Update customer profile & loyalty points
    const earnedPoints = Math.floor(totalEur);
    setCustomerProfile((prev) => ({
      ...prev,
      name: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerEmail.trim() || prev.email,
      address: deliveryAddress.trim() || prev.address,
      municipality: deliveryMunicipality || prev.municipality,
      loyaltyPoints: prev.loyaltyPoints + earnedPoints,
      pointsHistory: [
        {
          id: `pts-${Date.now()}`,
          date: nowStr,
          description: `Ordine #${orderNum} (${cart.length} referenze)`,
          pointsDelta: earnedPoints,
        },
        ...prev.pointsHistory,
      ],
    }));

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setOrderNotes('');
    setCartDrawerOpen(false);
    setConfirmedOrderModal(newOrder);
    showToast('success', `Ordine ${orderNum} confermato! +${earnedPoints} punti Fedeltà aggiunti.`);
  };

  // Admin Handlers (Full CRUD)
  const handleAdminUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
    );
    showToast('success', `Stato ordine aggiornato a: ${ORDER_STATUS_LABELS[nextStatus]}`);
  };

  const handleStartEditProduct = (prod: ButcherProduct) => {
    setEditingProductId(prod.id);
    setEditNameValue(prod.name);
    setEditPriceValue(prod.pricePerUnit.toFixed(2));
    setEditStockValue(String(prod.stockQty));
    setEditUnitValue(prod.unit);
  };

  const handleSaveEditProduct = (prodId: string) => {
    const parsedPrice = parseFloat(editPriceValue.replace(',', '.'));
    const parsedStock = parseInt(editStockValue, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showToast('error', 'Inserisci un prezzo valido.');
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === prodId
          ? {
              ...p,
              name: editNameValue.trim() || p.name,
              unit: editUnitValue.trim() || p.unit,
              pricePerUnit: Number(parsedPrice.toFixed(2)),
              stockQty: isNaN(parsedStock) ? p.stockQty : Math.max(0, parsedStock),
            }
          : p,
      ),
    );
    setEditingProductId(null);
    showToast('success', 'Prodotto, prezzo e giacenza aggiornati.');
  };

  const handleDeleteProduct = (prodId: string, prodName: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== prodId));
    showToast('info', `Prodotto "${prodName}" rimosso dal catalogo.`);
  };

  const handleQuickAdjustStock = (prodId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === prodId ? { ...p, stockQty: Math.max(0, p.stockQty + delta) } : p,
      ),
    );
  };

  const handleCreateNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    const price = parseFloat(newProdPrice.replace(',', '.')) || 20.0;
    const stock = parseInt(newProdStock, 10) || 10;

    const categoryMeta = BUTCHER_CATEGORIES.find((c) => c.id === newProdCat);
    const defaultImg =
      newProdCat === 'tagli-bbq'
        ? IMG_BBQ
        : newProdCat === 'carni-fresche'
          ? IMG_FIORENTINA
          : newProdCat === 'preparazioni-pronte'
            ? IMG_PRONTI
            : IMG_SALUMI_SUGHI_PANE;

    const created: ButcherProduct = {
      id: `prod-custom-${Date.now()}`,
      name: newProdName.trim(),
      category: newProdCat,
      categoryLabel: categoryMeta?.wpCategoryName || 'Specialità',
      pricePerUnit: Number(price.toFixed(2)),
      unit: newProdUnit.trim() || 'kg',
      defaultWeightLabel: newProdUnit.trim() || 'Preparato fresco al banco',
      origin: 'Selezione Artigianale Macelleria Da Luca · Vigardolo',
      agingOrPrep: 'Lavorazione artigianale giornaliera',
      cookingTip: newProdCookingTip.trim(),
      description:
        newProdDesc.trim() ||
        'Specialità fresca aggiunta dal banco di Via San Floriano 26 a Vigardolo.',
      image: defaultImg,
      imageWebp: getWebpVariant(defaultImg),
      imageAlt: `${newProdName.trim()} - Macelleria Da Luca Vigardolo`,
      stockQty: Math.max(0, stock),
      bbqHighlight: newProdCat === 'tagli-bbq',
      badgeText: 'Novità Banco',
    };

    setProducts((prev) => [created, ...prev]);
    setNewProdName('');
    setNewProductOpen(false);
    showToast('success', `Nuovo prodotto "${created.name}" aggiunto al banco online.`);
  };

  const scrollToSection = (sectionId: string, seoHint?: 'home' | 'bottega' | 'bbq') => {
    if (seoHint) setActiveSeoSection(seoHint);
    setMobileMenuOpen(false);
    if (activeWorkspace !== 'storefront') {
      setActiveWorkspace('storefront');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // WhatsApp Floating & Direct URL Builder (uses configurable placeholder INSERISCI_NUMERO_WHATSAPP)
  const buildWhatsAppUrl = (customText?: string) => {
    const text =
      customText || 'Ciao Luca, vorrei info o un ordine dalla Macelleria Da Luca';
    const rawNum = (siteConfig.whatsappNumber || 'INSERISCI_NUMERO_WHATSAPP').trim();
    const normalizedNum = rawNum.startsWith('39') ? rawNum : `39${rawNum}`;
    return `https://wa.me/${normalizedNum}?text=${encodeURIComponent(text)}`;
  };

  // Cookie Consent Handlers
  const handleSaveCookieChoice = (mode: 'all' | 'necessary' | 'custom') => {
    const next: CookiePreferences = {
      decided: true,
      technical: true,
      analytics: mode === 'all' ? true : mode === 'necessary' ? false : tempAnalyticsCookie,
      marketing: mode === 'all' ? true : mode === 'necessary' ? false : tempMarketingCookie,
      updatedAt: new Date().toISOString(),
    };
    setCookieConsent(next);
    setCookieModalOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, JSON.stringify(next));
    } catch {
      // ignore
    }
    showToast('success', 'Preferenze cookie GDPR salvate correttamente.');
  };

  const legalPageData = useMemo(() => {
    if (activeWorkspace === 'privacy') return getLegalPageHtml('privacy', siteConfig);
    if (activeWorkspace === 'cookie') return getLegalPageHtml('cookie', siteConfig);
    if (activeWorkspace === 'termini') return getLegalPageHtml('termini', siteConfig);
    return null;
  }, [activeWorkspace, siteConfig]);

  return (
    <div className="min-h-screen flex flex-col bg-crema-50 text-carbone-900">
      {/* =====================================================================
          TOP NAVIGATION BAR (Responsive Desktop + Working Mobile Hamburger Menu < 768px)
      ===================================================================== */}
      <header className="sticky top-0 z-40 bg-crema-50/95 backdrop-blur-md border-b border-crema-300/80 px-4 sm:px-6 lg:px-12 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo + Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSeoSection('home');
              setActiveWorkspace('storefront');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-bordeaux-800 whitespace-nowrap shrink-0 group"
          >
            <picture className="shrink-0">
              <source srcSet={LOGO_TORO_WEBP} type="image/webp" />
              <img
                src={LOGO_TORO}
                alt="Logo Macelleria Da Luca — Carne Fresca di Qualità"
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-full object-contain bg-white border border-crema-300 shadow-xs transition-transform duration-200 group-hover:scale-105"
              />
            </picture>
            <span>Macelleria Da Luca</span>
          </a>

          {/* Desktop Navigation Links (>= 768px) */}
          <nav
            aria-label="Menu principale"
            className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-carbone-800"
          >
            <a
              href="#catalogo"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('catalogo', 'bbq');
              }}
              className="hover:text-bordeaux-600 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
            >
              Il Banco &amp; BBQ
            </a>
            <a
              href="#chi-siamo"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('chi-siamo', 'bottega');
              }}
              className="hover:text-bordeaux-600 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
            >
              La Bottega
            </a>
            <a
              href="#ricette"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('ricette', 'home');
              }}
              className="hover:text-bordeaux-600 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
            >
              Ricette &amp; Cotture
            </a>
            <a
              href="#recensioni"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('recensioni', 'home');
              }}
              className="hover:text-bordeaux-600 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
            >
              Recensioni
            </a>
            <a
              href="#contatti"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('contatti', 'home');
              }}
              className="hover:text-bordeaux-600 hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
            >
              Contatti &amp; Orari
            </a>
          </nav>

          {/* Right Actions: Cart Sidebar Trigger (with Item Count Badge) + Mobile Hamburger Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              aria-label={`Apri carrello con ${cartCount} articoli`}
              className="relative inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-crema-50 bg-bordeaux-600 hover:bg-bordeaux-700 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 tabular-nums"
            >
              <ShoppingBag className="w-4 h-4 text-oro-300" />
              <span className="hidden sm:inline">Carrello</span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-oro-400 text-carbone-950 font-mono text-xs font-bold">
                {cartCount}
              </span>
              <span className="hidden sm:inline">· €{totalEur.toFixed(2)}</span>
            </button>

            {/* Mobile Hamburger Toggle (< 768px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Chiudi menu di navigazione' : 'Apri menu di navigazione'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2.5 rounded-lg border border-crema-300 bg-white text-carbone-900 hover:bg-crema-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Dropdown Menu (< 768px) */}
        {mobileMenuOpen && (
          <nav
            aria-label="Menu mobile"
            className="md:hidden mt-3 pt-3 border-t border-crema-300 flex flex-col gap-1 pb-2 animate-fade-in"
          >
            <button
              type="button"
              onClick={() => scrollToSection('catalogo', 'bbq')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-carbone-900 hover:bg-crema-200"
            >
              Il Banco &amp; BBQ (18 Prodotti)
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('chi-siamo', 'bottega')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-carbone-900 hover:bg-crema-200"
            >
              Chi Siamo &amp; La Bottega
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('ricette', 'home')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-carbone-900 hover:bg-crema-200"
            >
              Ricette &amp; Cotture
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('recensioni', 'home')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-carbone-900 hover:bg-crema-200"
            >
              Recensioni Google Maps (4.9 ★)
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contatti', 'home')}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-carbone-900 hover:bg-crema-200"
            >
              Contatti, Mappa &amp; Orari
            </button>
            <div className="pt-2 mt-1 border-t border-crema-300 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveWorkspace('area-clienti');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-bordeaux-900 text-crema-50 text-center"
              >
                Area Clienti
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveWorkspace('admin');
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-carbone-900 text-crema-50 text-center"
              >
                Pannello Admin
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* =====================================================================
          WORKSPACE SUB-BAR (Clickable Google Maps Address + Workspace Switcher)
      ===================================================================== */}
      <div className="bg-bordeaux-950 text-crema-100 border-b border-bordeaux-800 px-4 sm:px-6 lg:px-12 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-crema-200">
            <MapPin className="w-3.5 h-3.5 text-oro-400 shrink-0" />
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Via+S.+Floriano+26,+36010+Vigardolo+VI"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-oro-300 underline underline-offset-4 transition-colors"
              title="Apri Via S. Floriano 26, Vigardolo su Google Maps"
            >
              Via S. Floriano, 26 · 36010 Vigardolo (VI)
            </a>
            <span aria-hidden="true" className="text-oro-400 hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline">
              Ritiro gratuito in negozio o Consegna refrigerata nel Vicentino
            </span>
          </div>

          <div className="flex items-center gap-1 bg-bordeaux-900/90 p-1 rounded-lg border border-bordeaux-800 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveWorkspace('storefront')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeWorkspace === 'storefront'
                  ? 'bg-oro-400 text-carbone-950 font-semibold'
                  : 'text-crema-200 hover:text-white'
              }`}
            >
              Negozio &amp; Catalogo
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspace('area-clienti')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeWorkspace === 'area-clienti'
                  ? 'bg-oro-400 text-carbone-950 font-semibold'
                  : 'text-crema-200 hover:text-white'
              }`}
            >
              Area Clienti &amp; Fedeltà ({customerProfile.loyaltyPoints} pt)
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspace('admin')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeWorkspace === 'admin'
                  ? 'bg-oro-400 text-carbone-950 font-semibold'
                  : 'text-crema-200 hover:text-white'
              }`}
            >
              Pannello Admin
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          VIEW 1: MAIN STOREFRONT (Homepage, Catalogo 18 Prodotti con 18 Foto Uniche, Chi Siamo, Ricette, Recensioni, Contatti)
      ===================================================================== */}
      {activeWorkspace === 'storefront' && (
        <main className="flex-1">
          {/* 1. HERO SECTION */}
          <section
            id="top"
            className="bg-bordeaux-950 text-crema-50 border-b border-bordeaux-800 relative overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                {/* Left Column: Editable Hero Copy from Admin */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-oro-300 font-semibold">
                      <span>{siteConfig.heroEyebrow}</span>
                    </div>

                    <h1
                      className="font-display font-bold text-crema-50 leading-[1.08] tracking-tight"
                      style={{ fontSize: 'clamp(2.35rem, 4.4vw, 4.1rem)' }}
                    >
                      {siteConfig.heroTitle}
                    </h1>

                    <p className="text-base sm:text-lg text-crema-200 leading-relaxed max-w-2xl">
                      {siteConfig.heroSubtitle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection('catalogo', 'bbq')}
                      className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-carbone-950 bg-oro-400 hover:bg-oro-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Esplora il Banco e Ordina</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('tagli-bbq');
                        scrollToSection('catalogo', 'bbq');
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-crema-100 bg-bordeaux-900/80 hover:bg-bordeaux-800 border border-oro-400/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Flame className="w-4 h-4 text-oro-400" />
                      <span>Specialità BBQ</span>
                    </button>

                    <a
                      href={buildWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-crema-200 hover:text-oro-300 transition-colors whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 text-oro-400" />
                      <span>Chiedi a Luca su WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Right Column: Preloaded WebP Hero Image with JPG Fallback */}
                <div className="lg:col-span-5 flex">
                  <div className="relative w-full rounded-xl overflow-hidden border border-oro-400/30 bg-bordeaux-900 shadow-xl flex flex-col justify-end min-h-[340px] lg:min-h-full">
                    <picture>
                      <source srcSet={HERO_IMAGE_WEBP} type="image/webp" />
                      <img
                        src={HERO_IMAGE}
                        alt="Tomahawk di manzo taglio spesso sulla ceppaia - Macelleria Da Luca Vigardolo"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </picture>
                    <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-6 pt-20 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-oro-300 uppercase tracking-wider font-semibold">
                          Taglio Iconico della Settimana
                        </p>
                        <p className="font-display text-2xl font-bold text-crema-50">
                          Tomahawk Imperiale Dry-Aged 45gg
                        </p>
                        <p className="text-xs text-crema-200 mt-0.5 tabular-nums">
                          Circa 1,3 kg · €56,00 al pezzo
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddToCart(
                            products.find((p) => p.id === 'prod-tomahawk-bbq') ||
                              INITIAL_PRODUCTS[4],
                            1,
                          )
                        }
                        className="px-4 py-2 text-xs font-semibold bg-oro-400 text-carbone-950 rounded-lg hover:bg-oro-300 transition-colors whitespace-nowrap shrink-0"
                      >
                        Aggiungi
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Column Proof & Service Strip */}
              <div className="mt-12 pt-8 border-t border-bordeaux-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="font-mono text-2xl font-semibold text-oro-400 tabular-nums">
                    4.9 / 5.0 ★
                  </p>
                  <p className="text-sm font-medium text-crema-100 mt-1">
                    148+ Recensioni Verificate Google
                  </p>
                  <p className="text-xs text-crema-300 mt-0.5">
                    Riconosciuta tra le macellerie più apprezzate del Vicentino
                  </p>
                </div>

                <div>
                  <p className="font-mono text-2xl font-semibold text-oro-400 tabular-nums">
                    30–45 Giorni
                  </p>
                  <p className="text-sm font-medium text-crema-100 mt-1">
                    Frollatura Controllata &amp; Tagli BBQ
                  </p>
                  <p className="text-xs text-crema-300 mt-0.5">
                    Tomahawk, Fiorentina, Brisket, Picanha e Costine St. Louis
                  </p>
                </div>

                <div>
                  <p className="font-mono text-2xl font-semibold text-oro-400 tabular-nums">
                    18 Specialità Fresche
                  </p>
                  <p className="text-sm font-medium text-crema-100 mt-1">
                    6 Reparti Artigianali Completi
                  </p>
                  <p className="text-xs text-crema-300 mt-0.5">
                    Carni Fresche, Specialità BBQ, Pronti, Salumi, Sughi e Pane Artigianale
                  </p>
                </div>

                <div>
                  <p className="font-mono text-2xl font-semibold text-oro-400 tabular-nums">
                    Ritiro o Domicilio
                  </p>
                  <p className="text-sm font-medium text-crema-100 mt-1">
                    Zero Attesa in Bottega a Vigardolo
                  </p>
                  <p className="text-xs text-crema-300 mt-0.5">
                    Prenota fascia oraria o ricevi a casa con furgone refrigerato
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. CATALOGO 18 PRODOTTI CON 18 IMMAGINI DIVERSE (WebP + JPG Fallback + Lazy Loading) */}
          <section id="catalogo" className="py-16 lg:py-24 px-6 lg:px-12 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div>
                <p className="text-xs uppercase tracking-widest text-bordeaux-600 font-semibold mb-2">
                  01. Il Banco &amp; BBQ di Via San Floriano 26 — Vigardolo (VI)
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-carbone-950">
                  Catalogo Carni Fresche, Specialità BBQ e Gastronomia
                </h2>
                <p className="text-sm sm:text-base text-carbone-700 mt-2 max-w-2xl">
                  Ogni prodotto ha la sua lavorazione dedicata e viene confezionato sottovuoto o in
                  carta alimentare pochi minuti prima del tuo ritiro o della consegna nel Vicentino.
                </p>
              </div>

              {/* Search & BBQ Quick Toggle */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-carbone-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca fiorentina, soppressa, ragù, pane..."
                    className="pl-10 pr-4 py-2 text-sm bg-white border border-crema-300 rounded-lg text-carbone-900 placeholder:text-carbone-700/60 focus:outline-none focus:border-bordeaux-600 w-64 sm:w-72"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setOnlyBbqFilter((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    onlyBbqFilter
                      ? 'bg-bordeaux-600 text-crema-50 border-bordeaux-600'
                      : 'bg-white text-carbone-800 border-crema-300 hover:border-bordeaux-500'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-oro-500" />
                  <span>Solo Specialità Griglia &amp; BBQ</span>
                </button>
              </div>
            </div>

            {/* Interactive Category Filter Bar */}
            <div
              role="tablist"
              aria-label="Categorie prodotti Macelleria Da Luca"
              className="flex items-center gap-1.5 p-1.5 bg-crema-200/70 rounded-xl border border-crema-300 overflow-x-auto scrollbar-thin mb-10"
            >
              {BUTCHER_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                const count =
                  cat.id === 'tutte'
                    ? products.length
                    : products.filter((p) => p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (cat.id === 'tagli-bbq') setActiveSeoSection('bbq');
                    }}
                    className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      active
                        ? 'bg-bordeaux-700 text-crema-50 font-semibold shadow-sm'
                        : 'text-carbone-800 hover:text-bordeaux-700 hover:bg-crema-100'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-crema-300 rounded-xl p-12 text-center space-y-4">
                <p className="font-display text-2xl font-semibold text-carbone-900">
                  Nessun prodotto trovato con questi filtri
                </p>
                <p className="text-sm text-carbone-700 max-w-md mx-auto">
                  Prova a selezionare &ldquo;Tutto il Banco&rdquo; oppure scrivici direttamente su
                  WhatsApp per richiedere un taglio personalizzato a Luca.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('tutte');
                    setSearchQuery('');
                    setOnlyBbqFilter(false);
                  }}
                  className="px-5 py-2.5 text-xs font-semibold bg-bordeaux-600 text-crema-50 rounded-lg hover:bg-bordeaux-700 transition-colors"
                >
                  Mostra Tutti i Prodotti
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => {
                  const webpSrc = product.imageWebp || getWebpVariant(product.image);
                  const descriptiveAlt =
                    product.imageAlt || `${product.name} - Macelleria Da Luca Vigardolo`;
                  return (
                    <article
                      key={product.id}
                      className="group bg-white border border-crema-300 rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div>
                        {/* Image Container (4:3 aspect ratio, WebP + JPG fallback + lazy loading) */}
                        <div
                          onClick={() => setSelectedProductModal(product)}
                          className="relative aspect-[4/3] bg-crema-200 overflow-hidden cursor-pointer"
                        >
                          <picture>
                            {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
                            <img
                              src={product.image}
                              alt={descriptiveAlt}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          </picture>
                          {product.badgeText && (
                            <div className="absolute top-3 left-3 bg-bordeaux-900/90 text-oro-300 px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide">
                              {product.badgeText}
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="p-6 space-y-3">
                          <div className="flex items-center justify-between gap-2 text-xs text-carbone-700">
                            <span className="uppercase tracking-wider font-semibold text-bordeaux-600">
                              {product.categoryLabel}
                            </span>
                            <span className="tabular-nums">
                              {product.stockQty > 0
                                ? `Disponibili: ${product.stockQty} u.`
                                : 'Esaurito oggi'}
                            </span>
                          </div>

                          <h3
                            onClick={() => setSelectedProductModal(product)}
                            className="font-display text-2xl font-bold text-carbone-950 group-hover:text-bordeaux-700 transition-colors cursor-pointer"
                          >
                            {product.name}
                          </h3>

                          <p className="text-xs text-carbone-700">
                            <span>{product.defaultWeightLabel}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{product.agingOrPrep}</span>
                          </p>

                          <p className="text-sm text-carbone-800 leading-relaxed line-clamp-2">
                            {product.description}
                          </p>
                        </div>
                      </div>

                      {/* Price & Add to Cart Footer */}
                      <div className="px-6 pb-6 pt-3 border-t border-crema-200 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-mono text-lg font-bold text-bordeaux-800 tabular-nums">
                            €{product.pricePerUnit.toFixed(2)}
                          </p>
                          <p className="text-[11px] text-carbone-700">per {product.unit}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProductModal(product)}
                            className="px-3 py-2 text-xs font-medium text-carbone-800 hover:text-bordeaux-700 border border-crema-300 rounded-lg hover:bg-crema-100 transition-colors whitespace-nowrap shrink-0"
                          >
                            Consigli Cottura
                          </button>
                          <button
                            type="button"
                            disabled={product.stockQty <= 0}
                            onClick={() => handleAddToCart(product, 1)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-crema-50 bg-bordeaux-600 hover:bg-bordeaux-700 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 text-oro-300" />
                            <span>Aggiungi</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. CHI SIAMO & LA BOTTEGA A VIGARDOLO */}
          <section
            id="chi-siamo"
            className="bg-crema-100 border-y border-crema-300 py-16 lg:py-24 px-6 lg:px-12"
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <p className="text-xs uppercase tracking-widest text-bordeaux-600 font-semibold">
                  02. Chi Siamo &amp; La Bottega · Vigardolo (VI)
                </p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-carbone-950 leading-tight">
                  Luca e il Suo Team: Non Solo Macelleria, ma Consulenti del Gusto.
                </h2>
                <p className="text-base text-carbone-800 leading-relaxed">
                  In{' '}
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Via+S.+Floriano+26,+36010+Vigardolo+VI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-bordeaux-700 underline underline-offset-4"
                  >
                    Via S. Floriano 26 a Vigardolo (Monticello Conte Otto)
                  </a>
                  , la Macelleria Da Luca è diventata negli anni il punto di riferimento per le
                  famiglie del Vicentino e per gli appassionati di griglia e barbecue che cercano
                  tagli introvabili nella grande distribuzione.
                </p>
                <p className="text-base text-carbone-800 leading-relaxed">
                  Dalla selezione dei capi in allevamenti di fiducia del Veneto alla frollatura
                  calibrata, fino ai famosi <strong>pronti a cuocere</strong>, alla{' '}
                  <strong>Soppressa Vicentina artigianale</strong>, ai{' '}
                  <strong>sughi cotti lentamente come una volta</strong> e al{' '}
                  <strong>pane fresco quotidiano</strong>: ogni cliente viene accolto con il
                  consiglio giusto su tempi, temperature e segreti di cottura.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-crema-300">
                  <div>
                    <p className="font-display text-2xl font-bold text-bordeaux-700">
                      Filiera Corta
                    </p>
                    <p className="text-xs text-carbone-700 mt-1">
                      Allevamenti selezionati del Veneto e benessere animale garantito.
                    </p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-bordeaux-700">
                      Cultura BBQ
                    </p>
                    <p className="text-xs text-carbone-700 mt-1">
                      Unica bottega in zona con veri tagli American &amp; Italian BBQ su misura.
                    </p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-bordeaux-700">
                      Spesa Completa
                    </p>
                    <p className="text-xs text-carbone-700 mt-1">
                      Carni, salumi, ragù artigianali in vasetto e pane fresco ogni mattina.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
                <div className="rounded-xl overflow-hidden border border-crema-300 shadow-sm bg-white flex flex-col h-full">
                  <picture className="block w-full aspect-[4/3] overflow-hidden bg-crema-200">
                    <source srcSet={IMG_FIORENTINA_WEBP} type="image/webp" />
                    <img
                      src={IMG_FIORENTINA}
                      alt="Bistecca di manzo taglio spesso Fiorentina frollata - Macelleria Da Luca"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </picture>
                  <div className="p-4 flex-1 flex flex-col justify-center">
                    <p className="font-display text-lg font-bold text-carbone-950">
                      Frollature Selezionate
                    </p>
                    <p className="text-xs text-carbone-700 mt-0.5">
                      Tenerezza e marezzatura superiore
                    </p>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-crema-300 shadow-sm bg-white flex flex-col h-full">
                  <picture className="block w-full aspect-[4/3] overflow-hidden bg-crema-200">
                    <source srcSet={IMG_BBQ_WEBP} type="image/webp" />
                    <img
                      src={IMG_BBQ}
                      alt="Tagli BBQ Brisket e Costine St. Louis - Macelleria Da Luca"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </picture>
                  <div className="p-4 flex-1 flex flex-col justify-center">
                    <p className="font-display text-lg font-bold text-carbone-950">
                      Specialisti del BBQ
                    </p>
                    <p className="text-xs text-carbone-700 mt-0.5">
                      Rub artigianali e tagli per affumicatore
                    </p>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-crema-300 shadow-sm bg-white flex flex-col h-full">
                  <picture className="block w-full aspect-[4/3] overflow-hidden bg-crema-200">
                    <source srcSet={IMG_SALUMI_SUGHI_PANE_WEBP} type="image/webp" />
                    <img
                      src={IMG_SALUMI_SUGHI_PANE}
                      alt="Sughi fatti in casa, salumi veneti e pane artigianale - Macelleria Da Luca"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </picture>
                  <div className="p-4 flex-1 flex flex-col justify-center">
                    <p className="font-display text-lg font-bold text-carbone-950">
                      Sughi, Salumi &amp; Pane
                    </p>
                    <p className="text-xs text-carbone-700 mt-0.5">
                      Ragù lenti e pagnotta a lievito madre
                    </p>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-crema-300 shadow-sm bg-white flex flex-col h-full">
                  <picture className="block w-full aspect-[4/3] overflow-hidden bg-crema-200">
                    <source srcSet={IMG_PRONTI_WEBP} type="image/webp" />
                    <img
                      src={IMG_PRONTI}
                      alt="Preparazioni pronte a cuocere fatte a mano - Macelleria Da Luca"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </picture>
                  <div className="p-4 flex-1 flex flex-col justify-center">
                    <p className="font-display text-lg font-bold text-carbone-950">
                      Preparazioni Pronte
                    </p>
                    <p className="text-xs text-carbone-700 mt-0.5">
                      Idee sfiziose preparate ogni mattina
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. BLOG RICETTE & SEGRETI DI COTTURA DI LUCA */}
          <section id="ricette" className="py-16 lg:py-24 px-6 lg:px-12 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="text-xs uppercase tracking-widest text-bordeaux-600 font-semibold mb-2">
                  03. Il Diario del Macellaio · Blog Ricette &amp; BBQ
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-carbone-950">
                  Ricette, Temperature al Cuore e Consigli di Cottura
                </h2>
                <p className="text-sm sm:text-base text-carbone-700 mt-2 max-w-2xl">
                  Come valorizzare a casa i tagli della Macelleria Da Luca: guide passo-passo
                  testate al banco e sulla griglia.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {BUTCHER_RECIPES.map((recipe) => {
                const matchedProduct = products.find((p) => p.id === recipe.recommendedProductId);
                const recWebp = recipe.imageWebp || getWebpVariant(recipe.image);
                return (
                  <article
                    key={recipe.id}
                    className="bg-white border border-crema-300 rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div
                        onClick={() => setSelectedRecipeModal(recipe)}
                        className="relative aspect-[16/10] bg-crema-200 overflow-hidden cursor-pointer"
                      >
                        <picture>
                          {recWebp && <source srcSet={recWebp} type="image/webp" />}
                          <img
                            src={recipe.image}
                            alt={`${recipe.title} - Macelleria Da Luca`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          />
                        </picture>
                        <div className="absolute top-3 left-3 bg-carbone-950/85 text-oro-300 px-2.5 py-1 rounded text-[11px] font-semibold">
                          {recipe.category}
                        </div>
                      </div>

                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-carbone-700 tabular-nums">
                          <span>Prep: {recipe.prepTime}</span>
                          <span aria-hidden="true">·</span>
                          <span>Cottura: {recipe.cookTime}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-bordeaux-700">
                            {recipe.difficulty}
                          </span>
                        </div>

                        <h3
                          onClick={() => setSelectedRecipeModal(recipe)}
                          className="font-display text-2xl font-bold text-carbone-950 hover:text-bordeaux-700 cursor-pointer leading-snug"
                        >
                          {recipe.title}
                        </h3>

                        <p className="text-sm text-carbone-800 leading-relaxed line-clamp-3">
                          {recipe.excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-4 border-t border-crema-200 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRecipeModal(recipe)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-bordeaux-700 hover:text-bordeaux-900"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Leggi Ricetta e Segreto di Luca</span>
                        </button>

                        {matchedProduct && (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(matchedProduct, 1)}
                            className="px-3 py-1.5 text-xs font-semibold bg-crema-200 hover:bg-bordeaux-600 hover:text-crema-50 text-carbone-900 rounded-lg transition-colors"
                          >
                            + Aggiungi Taglio
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* 5. RECENSIONI REALI IMPORTATE DA GOOGLE MAPS (con Foto Profilo, Stelle, Testo, Data e Link "Lascia una recensione su Google") */}
          <section
            id="recensioni"
            className="bg-bordeaux-950 text-crema-50 py-16 lg:py-24 px-6 lg:px-12 border-y border-bordeaux-800"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <p className="text-xs uppercase tracking-widest text-oro-400 font-semibold mb-2">
                    04. La Voce dei Nostri Clienti · Google Maps Local Guides
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-crema-50">
                    Perché il Vicentino Sceglie Macelleria Da Luca
                  </h2>
                  <p className="text-sm sm:text-base text-crema-200 mt-2 max-w-2xl">
                    Testimonianze autentiche importate da Google Maps di chi ogni settimana passa in
                    Via San Floriano a Vigardolo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-bordeaux-900 border border-oro-400/30 rounded-xl px-5 py-3.5 flex items-center gap-4 shrink-0">
                    <div>
                      <div className="flex items-center gap-1 text-oro-400">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                      <p className="text-xs text-crema-200 mt-1">
                        Valutazione media <strong className="text-white tabular-nums">4.9/5</strong>{' '}
                        su Google
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Macelleria+Da+Luca+Via+S.+Floriano+26+36010+Vigardolo+VI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold bg-oro-400 text-carbone-950 hover:bg-oro-300 rounded-xl shadow-sm transition-colors whitespace-nowrap"
                  >
                    <Star className="w-4 h-4 fill-current" />
                    <span>Lascia una recensione su Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {AUTHENTIC_REVIEWS.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-bordeaux-900/70 border border-bordeaux-800 rounded-xl p-6 flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-4">
                      {/* Reviewer Profile Header with Avatar, Name, Badge & Stars */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={rev.avatarUrl}
                            alt={`Foto profilo di ${rev.authorName}`}
                            loading="lazy"
                            className="w-11 h-11 rounded-full border border-oro-400/50 object-cover shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-sm text-crema-50">{rev.authorName}</p>
                            <p className="text-crema-300 text-[11px]">{rev.badge}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 text-oro-400 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>

                      <p className="text-sm text-crema-100 leading-relaxed italic">
                        &ldquo;{rev.text}&rdquo;
                      </p>

                      {rev.ownerReply && (
                        <div className="pt-3 border-t border-bordeaux-800/80 text-xs text-crema-300">
                          <span className="font-semibold text-oro-300">Risposta di Luca: </span>
                          <span>&ldquo;{rev.ownerReply}&rdquo;</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-bordeaux-800/60 flex items-center justify-between text-xs">
                      <span className="text-oro-300 font-medium">{rev.highlightTag}</span>
                      <span className="text-crema-300 text-[11px]">{rev.dateLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 6. CONTATTI, ORARI, MAPPA GOOGLE INTERATTIVA E PULSANTE "OTTIENI INDICAZIONI" */}
          <section id="contatti" className="py-16 lg:py-24 px-6 lg:px-12 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
              {/* Contact & Opening Hours Card */}
              <div className="lg:col-span-5 bg-white border border-crema-300 rounded-xl p-8 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-bordeaux-600 font-semibold mb-2">
                      05. Vieni a Trovarci o Scrivici
                    </p>
                    <h2 className="font-display text-3xl font-bold text-carbone-950">
                      Macelleria Da Luca — Vigardolo (VI)
                    </h2>
                  </div>

                  <div className="space-y-4 text-sm text-carbone-800">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-bordeaux-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-carbone-950">
                          Indirizzo Bottega (Cliccabile)
                        </p>
                        <a
                          href="https://www.google.com/maps/dir/?api=1&destination=Via+S.+Floriano+26,+36010+Vigardolo+VI"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-bordeaux-700 font-medium underline underline-offset-4 hover:text-bordeaux-900"
                        >
                          Via S. Floriano, 26 — 36010 Vigardolo, Monticello Conte Otto (VI)
                        </a>
                        <p className="text-xs text-carbone-700 mt-1">
                          Comodo parcheggio gratuito di fronte alla macelleria. A pochi minuti da
                          Vicenza, Cavazzale, Bolzano Vicentino e Bressanvido.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-bordeaux-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-carbone-950">Telefono &amp; WhatsApp</p>
                        <p className="font-mono tabular-nums">
                          {siteConfig.shopPhoneDisplay} · WhatsApp:{' '}
                          <span className="text-bordeaux-700 font-semibold">
                            {siteConfig.whatsappNumber}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-bordeaux-600 shrink-0 mt-0.5" />
                      <div className="w-full">
                        <p className="font-semibold text-carbone-950 mb-1">Orari di Apertura</p>
                        <p className="text-xs text-carbone-800 leading-relaxed bg-crema-50 p-3 rounded-lg border border-crema-200">
                          {siteConfig.openingHoursText}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-crema-200">
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Via+S.+Floriano+26,+36010+Vigardolo+VI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-crema-50 bg-carbone-900 hover:bg-carbone-800 rounded-lg transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-oro-400" />
                    <span>Ottieni indicazioni</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-crema-50 bg-bordeaux-600 hover:bg-bordeaux-700 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-oro-300" />
                    <span>Scrivi su WhatsApp per Prenotare un Taglio</span>
                  </a>
                </div>
              </div>

              {/* Interactive Google Map Embed & Local SEO Vicentino Coverage */}
              <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-crema-300 rounded-xl overflow-hidden">
                <div className="relative flex-1 min-h-[360px] bg-crema-200">
                  <iframe
                    title="Mappa Google Interattiva Macelleria Da Luca Via S. Floriano 26 Vigardolo VI"
                    src="https://maps.google.com/maps?q=Macelleria+Da+Luca+Via+S.+Floriano+26+36010+Vigardolo+VI&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    className="w-full h-full min-h-[360px] border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="p-6 bg-crema-100 border-t border-crema-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-bordeaux-700 mb-1">
                      Comuni Serviti con Consegna Refrigerata o Ritiro Rapido
                    </p>
                    <p className="text-xs text-carbone-700 leading-relaxed">
                      {VICENTINO_MUNICIPALITIES.join(' · ')}
                    </p>
                  </div>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Via+S.+Floriano+26,+36010+Vigardolo+VI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white border border-crema-300 rounded-lg text-bordeaux-700 hover:bg-crema-200 whitespace-nowrap shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Ottieni indicazioni</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* =====================================================================
          VIEW 2: AREA CLIENTI & TESSERA FEDELTÀ (Login/Registrazione, 384 Punti in Oro, Storico Punti, Premi, Recapiti Rapidi, Modifica Dati e Logout)
      ===================================================================== */}
      {activeWorkspace === 'area-clienti' && (
        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto w-full space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-crema-300 pb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-bordeaux-600 font-semibold">
                Area Clienti Personale · Club Amici della Brace
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-carbone-950 mt-1">
                {customerProfile.isLoggedIn
                  ? `Bentornato, ${customerProfile.name}`
                  : 'Accedi o Registrati all’Area Clienti'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {customerProfile.isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerProfile((prev) => ({ ...prev, isLoggedIn: false }));
                    showToast('info', 'Hai effettuato il logout dall’Area Clienti.');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-crema-200 text-carbone-900 rounded-lg hover:bg-crema-300 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveWorkspace('storefront')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-bordeaux-600 text-crema-50 rounded-lg hover:bg-bordeaux-700 transition-colors"
              >
                <span>Torna al Banco Prodotti</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!customerProfile.isLoggedIn ? (
            /* Login / Registration Card */
            <div className="max-w-md mx-auto bg-white border border-crema-300 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2 p-1 bg-crema-100 rounded-lg border border-crema-300">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                    authMode === 'login'
                      ? 'bg-bordeaux-600 text-crema-50'
                      : 'text-carbone-800 hover:bg-crema-200'
                  }`}
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                    authMode === 'register'
                      ? 'bg-bordeaux-600 text-crema-50'
                      : 'text-carbone-800 hover:bg-crema-200'
                  }`}
                >
                  Registrati (Tessera Fedeltà)
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCustomerProfile((prev) => ({
                    ...prev,
                    isLoggedIn: true,
                    name: authFormName.trim() || prev.name,
                    email: authFormEmail.trim() || prev.email,
                  }));
                  showToast('success', 'Accesso effettuato all’Area Clienti Macelleria Da Luca!');
                }}
                className="space-y-4 text-xs"
              >
                {authMode === 'register' && (
                  <div>
                    <label className="block font-semibold text-carbone-800 mb-1">
                      Nome e Cognome
                    </label>
                    <input
                      type="text"
                      required
                      value={authFormName}
                      onChange={(e) => setAuthFormName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-crema-300 rounded-lg bg-crema-50"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-carbone-800 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={authFormEmail}
                    onChange={(e) => setAuthFormEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-crema-300 rounded-lg bg-crema-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-carbone-800 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={authFormPassword}
                    onChange={(e) => setAuthFormPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 border border-crema-300 rounded-lg bg-crema-50"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-bordeaux-600 hover:bg-bordeaux-700 text-crema-50 font-semibold rounded-lg transition-colors"
                >
                  {authMode === 'login'
                    ? 'Entra nell’Area Clienti'
                    : 'Crea Account e Attiva Tessera'}
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Tessera Fedeltà (Mobile Optimized with Large Gold Points) + I Tuoi Recapiti per Ordini Rapidi */}
              <div className="lg:col-span-5 space-y-6">
                {/* Tessera Fedeltà Card */}
                <div className="bg-bordeaux-950 text-crema-50 rounded-2xl p-6 sm:p-7 border-2 border-oro-400/50 shadow-xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-oro-300 font-semibold block">
                        Tessera Fedeltà Ufficiale
                      </span>
                      <span className="font-display text-xl font-bold text-crema-50">
                        Macelleria Da Luca — Vigardolo
                      </span>
                    </div>
                    <Award className="w-8 h-8 text-oro-400 shrink-0" />
                  </div>

                  {/* Mobile-Optimized Large Gold Points Display */}
                  <div className="bg-bordeaux-900/90 border border-oro-400/30 rounded-xl p-5 text-center sm:text-left flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-crema-200">
                        Saldo Punti Accumulati
                      </p>
                      <p className="font-mono text-5xl sm:text-6xl font-bold text-oro-400 tabular-nums tracking-tight mt-1">
                        {customerProfile.loyaltyPoints}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-oro-300 uppercase tracking-wider">
                      Punti Brace
                    </span>
                  </div>

                  {/* Progress bar towards 500 points reward */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-crema-200">Prossimo Premio (Soglia 500 punti)</span>
                      <span className="font-mono font-bold text-oro-300 tabular-nums">
                        {Math.min(500, customerProfile.loyaltyPoints)} / 500 pt
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-bordeaux-900 rounded-full overflow-hidden border border-bordeaux-800">
                      <div
                        className="h-full bg-oro-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((customerProfile.loyaltyPoints / 500) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Premi Disponibili */}
                  <div className="pt-3 border-t border-bordeaux-800 space-y-2 text-xs">
                    <p className="font-semibold uppercase tracking-wider text-oro-300">
                      Premi Disponibili in Bottega:
                    </p>
                    <div className="bg-bordeaux-900/70 border border-oro-400/30 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-crema-50">
                          500 Punti = Vasetto Ragù + Rub BBQ
                        </p>
                        <p className="text-[11px] text-crema-300">
                          1 Vasetto di Ragù Antica Ricetta (280g) + 1 Rub Artigianale di Luca
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-oro-400 text-carbone-950 font-mono font-bold text-[11px] shrink-0">
                        {customerProfile.loyaltyPoints >= 500
                          ? 'Riscattabile!'
                          : `-${500 - customerProfile.loyaltyPoints} pt`}
                      </span>
                    </div>
                  </div>

                  {/* Storico Punti */}
                  <div className="pt-3 border-t border-bordeaux-800 space-y-2 text-xs">
                    <p className="font-semibold uppercase tracking-wider text-oro-300">
                      Storico Punti Recenti:
                    </p>
                    <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {customerProfile.pointsHistory.map((h) => (
                        <li
                          key={h.id}
                          className="flex items-center justify-between gap-2 text-crema-200 border-b border-bordeaux-900 pb-1.5"
                        >
                          <span className="truncate">
                            <strong className="text-crema-100">{h.date}:</strong> {h.description}
                          </span>
                          <span className="font-mono font-bold text-oro-400 shrink-0 tabular-nums">
                            +{h.pointsDelta} pt
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Sezione "I Tuoi Recapiti per Ordini Rapidi" con Indirizzo, Telefono, Note + Pulsanti "Modifica dati" e "Logout" */}
                <div className="bg-white border border-crema-300 rounded-2xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-2xl font-bold text-carbone-950">
                      I Tuoi Recapiti per Ordini Rapidi
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsEditingCustomerData((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-bordeaux-700 bg-bordeaux-50 hover:bg-bordeaux-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditingCustomerData ? 'Annulla' : 'Modifica dati'}</span>
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-carbone-800 mb-1">
                        Nome e Cognome
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingCustomerData}
                        value={customerProfile.name}
                        onChange={(e) =>
                          setCustomerProfile((p) => ({ ...p, name: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-crema-50 disabled:opacity-75"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-carbone-800 mb-1">Telefono</label>
                      <input
                        type="text"
                        disabled={!isEditingCustomerData}
                        value={customerProfile.phone}
                        onChange={(e) =>
                          setCustomerProfile((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-crema-50 disabled:opacity-75"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-carbone-800 mb-1">
                        Indirizzo di Consegna (Vicentino)
                      </label>
                      <input
                        type="text"
                        disabled={!isEditingCustomerData}
                        value={customerProfile.address}
                        onChange={(e) =>
                          setCustomerProfile((p) => ({ ...p, address: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-crema-50 disabled:opacity-75"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-carbone-800 mb-1">
                        Note Preferenze Taglio e Consegna
                      </label>
                      <textarea
                        rows={2}
                        disabled={!isEditingCustomerData}
                        value={customerProfile.quickOrderNotes}
                        onChange={(e) =>
                          setCustomerProfile((p) => ({ ...p, quickOrderNotes: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-crema-50 disabled:opacity-75"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCustomerData(false);
                          setCustomerName(customerProfile.name);
                          setCustomerPhone(customerProfile.phone);
                          setDeliveryAddress(customerProfile.address);
                          showToast('success', 'Recapiti per ordini rapidi aggiornati!');
                        }}
                        className="flex-1 py-2.5 bg-bordeaux-600 text-crema-50 font-semibold rounded-lg hover:bg-bordeaux-700 transition-colors"
                      >
                        Salva Modifiche
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerProfile((prev) => ({ ...prev, isLoggedIn: false }));
                          showToast('info', 'Logout effettuato.');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-crema-200 text-carbone-900 font-semibold rounded-lg hover:bg-crema-300 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Customer Orders History */}
              <div className="lg:col-span-7 space-y-6">
                <h2 className="font-display text-2xl font-bold text-carbone-950">
                  I Tuoi Ordini e Prenotazioni in Macelleria ({orders.length})
                </h2>

                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white border border-crema-300 rounded-xl p-6 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-crema-200 pb-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-carbone-700">
                            <span className="font-mono font-bold text-bordeaux-700">
                              #{ord.orderNumber}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{ord.createdAt}</span>
                            <span aria-hidden="true">·</span>
                            <span className="px-2 py-0.5 rounded bg-bordeaux-50 text-bordeaux-800 font-semibold uppercase">
                              {ORDER_STATUS_LABELS[ord.status] || ord.status}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-carbone-950 mt-1">
                            {ord.fulfillment === 'ritiro'
                              ? `Ritiro in Bottega (Via S. Floriano 26) — ${ord.pickupOrDeliveryDate}, ${ord.pickupOrDeliveryTimeSlot}`
                              : `Consegna a Domicilio (${ord.deliveryMunicipality}) — ${ord.pickupOrDeliveryDate}`}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-mono text-lg font-bold text-bordeaux-800 tabular-nums">
                            €{ord.totalEur.toFixed(2)}
                          </p>
                          <p className="text-[11px] text-carbone-700">
                            {ord.paymentStatus === 'pagato-online'
                              ? 'Pagato Online'
                              : 'Saldo al Ritiro'}
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-1.5 text-xs text-carbone-800">
                        {ord.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between tabular-nums">
                            <span>
                              {item.quantity}x {item.productName} ({item.unit})
                              {item.notes ? ` — Nota: ${item.notes}` : ''}
                            </span>
                            <span className="font-mono font-medium">
                              €{item.subtotal.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                        <a
                          href={buildWhatsAppUrl(
                            `Ciao Luca, ti scrivo per l'ordine ${ord.orderNumber} a nome ${ord.customerName}.`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-bordeaux-700 hover:underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Contatta il banco su WhatsApp per questo ordine</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            ord.items.forEach((it) => {
                              const found = products.find((p) => p.id === it.productId);
                              if (found) handleAddToCart(found, it.quantity, it.notes);
                            });
                            setCartDrawerOpen(true);
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-crema-100 hover:bg-bordeaux-600 hover:text-crema-50 text-carbone-900 border border-crema-300 rounded-lg transition-colors"
                        >
                          Riordina gli stessi tagli
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* =====================================================================
          VIEW 3: PANNELLO ADMIN (Impostazioni WhatsApp/Orari/Hero, Log Ordini e CRUD Completo Prodotti)
      ===================================================================== */}
      {activeWorkspace === 'admin' && (
        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto w-full space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-crema-300 pb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-bordeaux-600 font-semibold">
                Gestione Interna Bottega · Via S. Floriano 26, Vigardolo (VI)
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-carbone-950 mt-1">
                Pannello Admin — Configurazione, Ordini &amp; Prodotti
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setActiveWorkspace('storefront')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-bordeaux-600 text-crema-50 rounded-lg hover:bg-bordeaux-700 transition-colors self-start"
            >
              <span>Torna al Negozio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. CAMPI MODIFICABILI SITO: NUMERO WHATSAPP, ORARI DI APERTURA, TESTO HERO HOMEPAGE */}
          <section className="bg-white border border-crema-300 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-crema-200 pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-carbone-950">
                  1. Impostazioni Rapide Sito (WhatsApp, Orari di Apertura &amp; Hero Homepage)
                </h2>
                <p className="text-xs text-carbone-700">
                  Modifica qui il numero WhatsApp (sostituendo il placeholder{' '}
                  <code>INSERISCI_NUMERO_WHATSAPP</code>), gli orari e il titolo principale.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  showToast('success', 'Impostazioni del sito salvate con successo!')
                }
                className="px-4 py-2 text-xs font-semibold bg-bordeaux-600 text-crema-50 rounded-lg hover:bg-bordeaux-700 self-start"
              >
                Salva Impostazioni Sito
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block font-semibold text-carbone-900 mb-1">
                  Numero WhatsApp (senza +39, es. 3471234567 — Default: INSERISCI_NUMERO_WHATSAPP)
                </label>
                <input
                  type="text"
                  value={siteConfig.whatsappNumber}
                  onChange={(e) =>
                    setSiteConfig((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                  }
                  placeholder="INSERISCI_NUMERO_WHATSAPP"
                  className="w-full px-3.5 py-2.5 border-2 border-oro-400 rounded-lg bg-oro-100/40 font-mono font-bold text-bordeaux-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-carbone-900 mb-1">
                  Orari di Apertura della Bottega
                </label>
                <input
                  type="text"
                  value={siteConfig.openingHoursText}
                  onChange={(e) =>
                    setSiteConfig((prev) => ({ ...prev, openingHoursText: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-crema-300 rounded-lg bg-crema-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-carbone-900 mb-1">
                  Titolo Hero Homepage
                </label>
                <input
                  type="text"
                  value={siteConfig.heroTitle}
                  onChange={(e) =>
                    setSiteConfig((prev) => ({ ...prev, heroTitle: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-crema-300 rounded-lg bg-crema-50 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-carbone-900 mb-1">
                  Sottotitolo Hero Homepage
                </label>
                <input
                  type="text"
                  value={siteConfig.heroSubtitle}
                  onChange={(e) =>
                    setSiteConfig((prev) => ({ ...prev, heroSubtitle: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 border border-crema-300 rounded-lg bg-crema-50"
                />
              </div>
            </div>
          </section>

          {/* 2. LOG ORDINI E GESTIONE MAGAZZINO / CRUD PRODOTTI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 5 Cols: Order Log (In attesa, Confermato, Pronto, Consegnato) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-2xl font-bold text-carbone-950">
                  2. Log Ordini ({orders.length})
                </h2>
                <select
                  value={adminStatusFilter}
                  onChange={(e) => setAdminStatusFilter(e.target.value as OrderStatus | 'tutti')}
                  className="text-xs border border-crema-300 rounded-lg px-3 py-1.5 bg-white"
                >
                  <option value="tutti">Tutti gli stati</option>
                  <option value="in-attesa">In attesa</option>
                  <option value="confermato">Confermato</option>
                  <option value="pronto">Pronto</option>
                  <option value="consegnato">Consegnato</option>
                </select>
              </div>

              <div className="space-y-4">
                {orders
                  .filter((o) => adminStatusFilter === 'tutti' || o.status === adminStatusFilter)
                  .map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-crema-300 rounded-xl p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-bordeaux-700">
                              #{order.orderNumber}
                            </span>
                            <span className="text-xs font-semibold text-carbone-950">
                              {order.customerName}
                            </span>
                          </div>
                          <p className="text-xs text-carbone-700 mt-0.5">
                            Tel: {order.customerPhone} · {order.createdAt}
                          </p>
                        </div>

                        <span className="font-mono text-base font-bold text-bordeaux-800 tabular-nums">
                          €{order.totalEur.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-xs bg-crema-50 p-3 rounded-lg border border-crema-200 space-y-1">
                        <p className="font-semibold text-carbone-900">
                          {order.fulfillment === 'ritiro'
                            ? `RITIRO IN NEGOZIO: ${order.pickupOrDeliveryDate} (${order.pickupOrDeliveryTimeSlot})`
                            : `CONSEGNA DOMICILIO: ${order.deliveryAddress}, ${order.deliveryMunicipality}`}
                        </p>
                        {order.items.map((it, idx) => (
                          <p key={idx} className="text-carbone-800">
                            • {it.quantity}x {it.productName} (€{it.subtotal.toFixed(2)})
                          </p>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <span className="font-semibold text-carbone-700">Stato Ordine:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            ['in-attesa', 'confermato', 'pronto', 'consegnato'] as OrderStatus[]
                          ).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleAdminUpdateOrderStatus(order.id, st)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                                order.status === st
                                  ? 'bg-bordeaux-700 text-crema-50'
                                  : 'bg-crema-100 text-carbone-800 hover:bg-crema-200'
                              }`}
                            >
                              {ORDER_STATUS_LABELS[st]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right 7 Cols: CRUD Completo 18 Prodotti con Miniatura Immagine Unica */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-2xl font-bold text-carbone-950">
                  3. Prodotti del Banco — CRUD Completo ({products.length})
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    placeholder="Filtra prodotto..."
                    className="text-xs border border-crema-300 rounded-lg px-3 py-1.5 bg-white w-40"
                  />
                  <button
                    type="button"
                    onClick={() => setNewProductOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-bordeaux-600 text-crema-50 rounded-lg hover:bg-bordeaux-700"
                  >
                    <Plus className="w-3.5 h-3.5 text-oro-300" />
                    <span>Nuovo Prodotto</span>
                  </button>
                </div>
              </div>

              {newProductOpen && (
                <form
                  onSubmit={handleCreateNewProduct}
                  className="bg-crema-100 border border-bordeaux-600/40 rounded-xl p-5 space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold text-carbone-950">
                      Aggiungi Nuovo Prodotto al Catalogo
                    </h3>
                    <button
                      type="button"
                      onClick={() => setNewProductOpen(false)}
                      className="text-carbone-700 hover:text-carbone-950"
                    >
                      Chiudi
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Titolo Prodotto *</label>
                      <input
                        type="text"
                        required
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        placeholder="Es. Salamella Veneta da Griglia"
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Categoria Reparto</label>
                      <select
                        value={newProdCat}
                        onChange={(e) =>
                          setNewProdCat(e.target.value as Exclude<ButcherCategory, 'tutte'>)
                        }
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-white"
                      >
                        {BUTCHER_CATEGORIES.filter((c) => c.id !== 'tutte').map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.wpCategoryName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Prezzo (€)</label>
                      <input
                        type="text"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Unità di Misura</label>
                      <input
                        type="text"
                        value={newProdUnit}
                        onChange={(e) => setNewProdUnit(e.target.value)}
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold mb-1">Descrizione Breve</label>
                      <input
                        type="text"
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        className="w-full px-3 py-2 border border-crema-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-bordeaux-600 text-crema-50 font-semibold rounded-lg hover:bg-bordeaux-700"
                    >
                      Salva e Pubblica nel Banco
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white border border-crema-300 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-crema-100 border-b border-crema-300 text-carbone-800">
                      <th className="py-3 px-4 font-semibold">Foto &amp; Prodotto</th>
                      <th className="py-3 px-3 font-semibold text-right">Prezzo</th>
                      <th className="py-3 px-3 font-semibold text-center">Giacenza</th>
                      <th className="py-3 px-4 font-semibold text-right">Azioni CRUD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-crema-200">
                    {products
                      .filter(
                        (p) =>
                          !adminSearch.trim() ||
                          p.name.toLowerCase().includes(adminSearch.toLowerCase()),
                      )
                      .map((prod) => {
                        const isEditing = editingProductId === prod.id;
                        return (
                          <tr key={prod.id} className="hover:bg-crema-50/70">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <picture className="shrink-0">
                                  {(prod.imageWebp || getWebpVariant(prod.image)) && (
                                    <source
                                      srcSet={prod.imageWebp || getWebpVariant(prod.image)}
                                      type="image/webp"
                                    />
                                  )}
                                  <img
                                    src={prod.image}
                                    alt={prod.imageAlt || prod.name}
                                    loading="lazy"
                                    className="w-12 h-9 rounded object-cover border border-crema-300 shrink-0"
                                  />
                                </picture>
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={editNameValue}
                                      onChange={(e) => setEditNameValue(e.target.value)}
                                      className="px-2 py-1 border border-bordeaux-600 rounded w-48 font-semibold"
                                    />
                                    <input
                                      type="text"
                                      value={editUnitValue}
                                      onChange={(e) => setEditUnitValue(e.target.value)}
                                      className="px-2 py-0.5 border border-crema-300 rounded w-36 text-[11px] block"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <p className="font-semibold text-carbone-950">{prod.name}</p>
                                    <p className="text-[11px] text-carbone-700">
                                      {prod.categoryLabel} · {prod.unit}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editPriceValue}
                                  onChange={(e) => setEditPriceValue(e.target.value)}
                                  className="w-16 px-1.5 py-1 border border-bordeaux-600 rounded text-right"
                                />
                              ) : (
                                <span className="font-semibold text-bordeaux-800">
                                  €{prod.pricePerUnit.toFixed(2)}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center font-mono tabular-nums">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editStockValue}
                                  onChange={(e) => setEditStockValue(e.target.value)}
                                  className="w-14 px-1.5 py-1 border border-bordeaux-600 rounded text-center"
                                />
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustStock(prod.id, -1)}
                                    className="w-5 h-5 rounded bg-crema-200 hover:bg-crema-300 text-carbone-900 font-bold"
                                  >
                                    -
                                  </button>
                                  <span
                                    className={`w-7 text-center font-bold ${
                                      prod.stockQty <= 5 ? 'text-bordeaux-600' : 'text-carbone-950'
                                    }`}
                                  >
                                    {prod.stockQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustStock(prod.id, 1)}
                                    className="w-5 h-5 rounded bg-crema-200 hover:bg-crema-300 text-carbone-900 font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              {isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditProduct(prod.id)}
                                  className="px-2.5 py-1 bg-bordeaux-600 text-crema-50 rounded font-semibold"
                                >
                                  Salva
                                </button>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditProduct(prod)}
                                    className="inline-flex items-center gap-1 text-bordeaux-700 hover:text-bordeaux-900 font-medium"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Modifica</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                    className="text-carbone-700 hover:text-bordeaux-700 p-1"
                                    title="Elimina prodotto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          VIEW 4: PAGINE LEGALI OBBLIGATORIE (Privacy Policy GDPR, Cookie Policy, Termini e Condizioni)
      ===================================================================== */}
      {legalPageData && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 lg:px-12 py-12 space-y-8">
          <div className="border-b border-crema-300 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-bordeaux-600 font-semibold">
                Documentazione Legale &amp; Trasparenza GDPR · Macelleria Da Luca
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-carbone-950 mt-1">
                {legalPageData.title}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setActiveWorkspace('storefront')}
              className="px-4 py-2 text-xs font-semibold bg-bordeaux-600 text-crema-50 rounded-lg hover:bg-bordeaux-700 self-start shrink-0"
            >
              ← Torna alla Homepage
            </button>
          </div>

          <div
            className="bg-white border border-crema-300 rounded-2xl p-6 sm:p-10 shadow-xs"
            dangerouslySetInnerHTML={{ __html: legalPageData.htmlContent }}
          />

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setActiveWorkspace('privacy')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeWorkspace === 'privacy'
                  ? 'bg-bordeaux-700 text-crema-50'
                  : 'bg-crema-200 text-carbone-900'
              }`}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspace('cookie')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeWorkspace === 'cookie'
                  ? 'bg-bordeaux-700 text-crema-50'
                  : 'bg-crema-200 text-carbone-900'
              }`}
            >
              Cookie Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspace('termini')}
              className={`px-4 py-2 rounded-lg font-semibold ${
                activeWorkspace === 'termini'
                  ? 'bg-bordeaux-700 text-crema-50'
                  : 'bg-crema-200 text-carbone-900'
              }`}
            >
              Termini e Condizioni
            </button>
          </div>
        </main>
      )}

      {/* =====================================================================
          SLIDE-OVER CART & CHECKOUT SIDEBAR (Non cambia pagina, si apre lateralmente)
      ===================================================================== */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-crema-50 w-full max-w-xl h-full flex flex-col justify-between shadow-2xl border-l border-crema-300 overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-bordeaux-950 text-crema-50 flex items-center justify-between border-b border-bordeaux-800">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-oro-400" />
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    Il Tuo Carrello ({cartCount} articoli)
                  </h2>
                  <p className="text-xs text-crema-200">
                    Ritiro in Via S. Floriano 26 (Vigardolo) o Consegna nel Vicentino
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCartDrawerOpen(false)}
                className="p-2 rounded-lg text-crema-200 hover:text-white hover:bg-bordeaux-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <p className="font-display text-2xl font-semibold text-carbone-900">
                    Il tuo carrello è vuoto
                  </p>
                  <p className="text-sm text-carbone-700">
                    Aggiungi le nostre bistecche frollate, i tagli BBQ, la Soppressa Vicentina o i
                    sughi fatti in casa.
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. Cart Line Items */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-bordeaux-700">
                      1. Tagli e Specialità Selezionate ({cartCount})
                    </h3>
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="bg-white border border-crema-300 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <picture className="shrink-0">
                              {(item.product.imageWebp || getWebpVariant(item.product.image)) && (
                                <source
                                  srcSet={
                                    item.product.imageWebp || getWebpVariant(item.product.image)
                                  }
                                  type="image/webp"
                                />
                              )}
                              <img
                                src={item.product.image}
                                alt={item.product.imageAlt || item.product.name}
                                loading="lazy"
                                className="w-14 h-11 rounded-lg object-cover border border-crema-300 shrink-0"
                              />
                            </picture>
                            <div>
                              <p className="font-display text-lg font-bold text-carbone-950 leading-snug">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-carbone-700 tabular-nums">
                                €{item.product.pricePerUnit.toFixed(2)} / {item.product.unit}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQuantity(item.product.id, -1)}
                              className="w-7 h-7 rounded-lg border border-crema-300 flex items-center justify-center hover:bg-crema-100"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono text-sm font-bold w-6 text-center tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQuantity(item.product.id, 1)}
                              className="w-7 h-7 rounded-lg border border-crema-300 flex items-center justify-center hover:bg-crema-100"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(item.product.id)}
                              className="p-1.5 text-carbone-700 hover:text-bordeaux-600 ml-1"
                              title="Rimuovi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <input
                            type="text"
                            value={item.customNotes || ''}
                            onChange={(e) =>
                              handleUpdateCartItemNotes(item.product.id, e.target.value)
                            }
                            placeholder="Preferenze taglio (es. sottovuoto, spessore...)"
                            className="flex-1 text-xs px-3 py-1.5 bg-crema-50 border border-crema-300 rounded-lg"
                          />
                          <span className="font-mono text-sm font-bold text-bordeaux-800 tabular-nums">
                            €{(item.product.pricePerUnit * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 2. Scelta Ritiro in Negozio o Consegna a Domicilio */}
                  <form
                    id="butcher-checkout-form"
                    onSubmit={handleCompleteOrder}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-bordeaux-700">
                        2. Modalità di Ritiro o Consegna nel Vicentino
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFulfillment('ritiro')}
                          className={`p-3.5 rounded-xl border text-left transition-colors ${
                            fulfillment === 'ritiro'
                              ? 'bg-bordeaux-700 text-crema-50 border-bordeaux-700'
                              : 'bg-white text-carbone-900 border-crema-300 hover:bg-crema-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold text-xs">
                            <Store className="w-4 h-4 text-oro-400" />
                            <span>Ritiro in Macelleria</span>
                          </div>
                          <p className="text-[11px] opacity-85 mt-1">
                            Via S. Floriano 26, Vigardolo · Gratuito
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFulfillment('consegna')}
                          className={`p-3.5 rounded-xl border text-left transition-colors ${
                            fulfillment === 'consegna'
                              ? 'bg-bordeaux-700 text-crema-50 border-bordeaux-700'
                              : 'bg-white text-carbone-900 border-crema-300 hover:bg-crema-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold text-xs">
                            <Truck className="w-4 h-4 text-oro-400" />
                            <span>Consegna Refrigerata</span>
                          </div>
                          <p className="text-[11px] opacity-85 mt-1">
                            Gratuita da €50 (altrimenti €4,50)
                          </p>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                        <div>
                          <label className="block font-semibold text-carbone-800 mb-1">
                            Giorno Preferito
                          </label>
                          <select
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-crema-300 rounded-lg"
                          >
                            <option value="Oggi · Nel pomeriggio">Oggi · Nel pomeriggio</option>
                            <option value="Domani · Mattina o Pomeriggio">
                              Domani · Mattina o Pomeriggio
                            </option>
                            <option value="Venerdì · Preparazione Weekend">
                              Venerdì · Preparazione Weekend
                            </option>
                            <option value="Sabato · Giornata Griglia">
                              Sabato · Giornata Griglia
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-carbone-800 mb-1">
                            Fascia Oraria
                          </label>
                          <select
                            value={pickupSlot}
                            onChange={(e) => setPickupSlot(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-crema-300 rounded-lg"
                          >
                            <option value="08:30 - 10:30">08:30 - 10:30</option>
                            <option value="10:30 - 12:30">10:30 - 12:30</option>
                            <option value="16:00 - 18:00">16:00 - 18:00</option>
                            <option value="18:00 - 19:15">18:00 - 19:15</option>
                          </select>
                        </div>
                      </div>

                      {fulfillment === 'consegna' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                          <div>
                            <label className="block font-semibold text-carbone-800 mb-1">
                              Comune nel Vicentino
                            </label>
                            <select
                              value={deliveryMunicipality}
                              onChange={(e) => setDeliveryMunicipality(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-crema-300 rounded-lg"
                            >
                              {VICENTINO_MUNICIPALITIES.map((mun) => (
                                <option key={mun} value={mun}>
                                  {mun}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block font-semibold text-carbone-800 mb-1">
                              Via e Numero Civico
                            </label>
                            <input
                              type="text"
                              required
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder="Es. Via San Floriano 14"
                              className="w-full px-3 py-2 bg-white border border-crema-300 rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Dati Cliente */}
                    <div className="space-y-3 text-xs">
                      <h3 className="font-semibold uppercase tracking-wider text-bordeaux-700">
                        3. I Tuoi Recapiti
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-carbone-800 mb-1">
                            Nome e Cognome *
                          </label>
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-crema-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-carbone-800 mb-1">
                            Telefono Cellulare *
                          </label>
                          <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-crema-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-carbone-800 mb-1">
                          Email per Ricevuta Ordine
                        </label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="nome@esempio.it"
                          className="w-full px-3 py-2 bg-white border border-crema-300 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* 4. Metodo di Pagamento */}
                    <div className="space-y-3 text-xs">
                      <h3 className="font-semibold uppercase tracking-wider text-bordeaux-700">
                        4. Pagamento Sicuro
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: 'carta-online', label: 'Carta Online (Immediato)' },
                          { id: 'satispay', label: 'Satispay' },
                          { id: 'pagamento-al-ritiro', label: 'Paga al Ritiro in Bottega' },
                          { id: 'bonifico-istantaneo', label: 'Bonifico Istantaneo' },
                        ].map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id as PaymentMethodType)}
                            className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${
                              paymentMethod === pm.id
                                ? 'bg-carbone-900 text-crema-50 border-carbone-900'
                                : 'bg-white text-carbone-800 border-crema-300 hover:bg-crema-100'
                            }`}
                          >
                            {pm.label}
                          </button>
                        ))}
                      </div>

                      {paymentMethod === 'carta-online' && (
                        <div className="p-3.5 bg-white border border-crema-300 rounded-xl grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-carbone-700 mb-1">
                              Ultime 4 cifre carta
                            </label>
                            <input
                              type="text"
                              maxLength={4}
                              value={cardLast4}
                              onChange={(e) => setCardLast4(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-crema-300 rounded font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-carbone-700 mb-1">
                              Scadenza (MM/AA)
                            </label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-crema-300 rounded font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Drawer Footer Summary & Submit */}
            {cart.length > 0 && (
              <div className="p-6 bg-white border-t border-crema-300 space-y-4">
                <div className="space-y-1 text-xs tabular-nums">
                  <div className="flex justify-between text-carbone-700">
                    <span>Subtotale carni e specialità</span>
                    <span className="font-mono">€{subtotalEur.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-carbone-700">
                    <span>
                      {fulfillment === 'ritiro'
                        ? 'Ritiro in negozio (Vigardolo)'
                        : 'Consegna refrigerata'}
                    </span>
                    <span className="font-mono">
                      {deliveryFeeEur === 0 ? 'GRATUITA' : `€${deliveryFeeEur.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-carbone-950 pt-2 border-t border-crema-200">
                    <span>Totale Ordine</span>
                    <span className="font-mono text-bordeaux-800">€{totalEur.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  form="butcher-checkout-form"
                  className="w-full py-3.5 px-6 bg-bordeaux-600 hover:bg-bordeaux-700 text-crema-50 font-semibold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 text-oro-300" />
                  <span>Conferma Ordine (€{totalEur.toFixed(2)})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: DETTAGLIO PRODOTTO & CONSIGLI DI COTTURA DI LUCA
      ===================================================================== */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="bg-crema-50 border border-crema-300 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="relative aspect-[16/9] bg-crema-200">
              <picture>
                {(selectedProductModal.imageWebp ||
                  getWebpVariant(selectedProductModal.image)) && (
                  <source
                    srcSet={
                      selectedProductModal.imageWebp || getWebpVariant(selectedProductModal.image)
                    }
                    type="image/webp"
                  />
                )}
                <img
                  src={selectedProductModal.image}
                  alt={selectedProductModal.imageAlt || selectedProductModal.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </picture>
              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="uppercase tracking-wider font-semibold text-bordeaux-700">
                  {selectedProductModal.categoryLabel} · {selectedProductModal.origin}
                </span>
                <span className="font-mono font-bold text-lg text-bordeaux-800 tabular-nums">
                  €{selectedProductModal.pricePerUnit.toFixed(2)} / {selectedProductModal.unit}
                </span>
              </div>

              <h2 className="font-display text-3xl font-bold text-carbone-950">
                {selectedProductModal.name}
              </h2>

              <p className="text-sm text-carbone-800 leading-relaxed">
                {selectedProductModal.description}
              </p>

              <div className="bg-crema-100 border border-crema-300 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-bordeaux-800 uppercase tracking-wider">
                  <ChefHat className="w-4 h-4 text-bordeaux-600" />
                  <span>Il Consiglio di Cottura di Luca</span>
                </div>
                <p className="text-xs text-carbone-800 leading-relaxed">
                  {selectedProductModal.cookingTip}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductModal(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-carbone-800 hover:bg-crema-200 rounded-lg"
                >
                  Chiudi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart(selectedProductModal, 1);
                    setSelectedProductModal(null);
                  }}
                  className="px-6 py-2.5 text-xs font-semibold bg-bordeaux-600 hover:bg-bordeaux-700 text-crema-50 rounded-lg"
                >
                  + Aggiungi al Carrello (€{selectedProductModal.pricePerUnit.toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ARTICOLO COMPLETO RICETTA & SEGRETO DEL MACELLAIO
      ===================================================================== */}
      {selectedRecipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="bg-crema-50 border border-crema-300 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-bordeaux-600">
                  {selectedRecipeModal.category} · Difficoltà: {selectedRecipeModal.difficulty}
                </span>
                <h2 className="font-display text-3xl font-bold text-carbone-950 mt-1">
                  {selectedRecipeModal.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecipeModal(null)}
                className="p-2 rounded-lg bg-crema-200 text-carbone-900 hover:bg-crema-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-carbone-800 leading-relaxed">
              {selectedRecipeModal.subtitle}
            </p>

            <div className="bg-white border border-crema-300 rounded-xl p-5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-bordeaux-700">
                Ingredienti Consigliati
              </h3>
              <ul className="list-disc list-inside text-xs text-carbone-800 space-y-1">
                {selectedRecipeModal.ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-bordeaux-700">
                Procedimento Passo-Passo
              </h3>
              {selectedRecipeModal.steps.map((st) => (
                <div key={st.stepNumber} className="flex gap-3.5">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-bordeaux-800 text-oro-300 h-fit">
                    {st.stepNumber}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-carbone-950">{st.title}</p>
                    <p className="text-xs text-carbone-700 leading-relaxed mt-0.5">{st.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-bordeaux-950 text-crema-50 rounded-xl p-5 border border-oro-400/30 space-y-1">
              <p className="text-xs uppercase tracking-wider text-oro-400 font-semibold">
                Il Segreto di Luca in Bottega
              </p>
              <p className="text-xs text-crema-100 leading-relaxed">
                &ldquo;{selectedRecipeModal.lucaSecretTip}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: CONFERMA ORDINE COMPLETATO
      ===================================================================== */}
      {confirmedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="bg-crema-50 border border-crema-300 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-bordeaux-700 font-bold">
                Ricevuta Ordine #{confirmedOrderModal.orderNumber}
              </span>
              <button
                type="button"
                onClick={() => setConfirmedOrderModal(null)}
                className="text-xs text-carbone-700 hover:text-carbone-950"
              >
                Chiudi
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-3xl font-bold text-carbone-950">
                Grazie {confirmedOrderModal.customerName}, il tuo ordine è confermato!
              </h2>
              <p className="text-xs text-carbone-700 leading-relaxed">
                Luca e lo staff di Via San Floriano 26 a Vigardolo prepareranno i tuoi tagli
                freschi per <strong>{confirmedOrderModal.pickupOrDeliveryDate}</strong> nella fascia{' '}
                <strong>{confirmedOrderModal.pickupOrDeliveryTimeSlot}</strong>.
              </p>
            </div>

            <div className="bg-white border border-crema-300 rounded-xl p-4 space-y-2 text-xs tabular-nums">
              {confirmedOrderModal.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {it.quantity}x {it.productName}
                  </span>
                  <span className="font-mono font-semibold">€{it.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-crema-200 pt-2 flex justify-between font-bold text-sm text-bordeaux-800">
                <span>Totale ({confirmedOrderModal.paymentStatus.replace(/-/g, ' ')})</span>
                <span className="font-mono">€{confirmedOrderModal.totalEur.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={buildWhatsAppUrl(
                  `Ciao Luca! Ho appena confermato l'ordine ${confirmedOrderModal.orderNumber} (€${confirmedOrderModal.totalEur.toFixed(2)}) a nome ${confirmedOrderModal.customerName} per ${confirmedOrderModal.pickupOrDeliveryDate}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-bordeaux-600 text-crema-50 rounded-lg hover:bg-bordeaux-700"
              >
                <MessageCircle className="w-4 h-4 text-oro-300" />
                <span>Invia Riepilogo su WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrderModal(null);
                  setActiveWorkspace('area-clienti');
                }}
                className="px-4 py-2.5 text-xs font-semibold bg-crema-200 text-carbone-900 rounded-lg hover:bg-crema-300"
              >
                Vai all’Area Clienti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          COOKIE BANNER GDPR (Mostrato al primo accesso, salvato in localStorage + Modale Preferenze)
      ===================================================================== */}
      {!cookieConsent.decided && (
        <div
          role="region"
          aria-label="Informativa Cookie GDPR"
          className="fixed bottom-0 inset-x-0 z-40 bg-bordeaux-950/98 text-crema-50 border-t-2 border-oro-400/60 px-4 sm:px-6 lg:px-12 py-4 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
            <div className="space-y-1.5 max-w-3xl pr-14 sm:pr-0">
              <div className="flex items-center gap-2 text-oro-300 font-semibold">
                <Cookie className="w-4 h-4" />
                <span>Informativa Privacy &amp; Cookie GDPR — Macelleria Da Luca</span>
              </div>
              <p className="text-crema-100 leading-relaxed">
                Questo sito utilizza cookie tecnici e di terze parti per migliorare l&apos;esperienza
                di navigazione. Puoi accettare tutti i cookie o gestire le preferenze. Consulta la{' '}
                <button
                  type="button"
                  onClick={() => setActiveWorkspace('cookie')}
                  className="text-oro-300 underline hover:text-white font-medium"
                >
                  Cookie Policy
                </button>{' '}
                e la{' '}
                <button
                  type="button"
                  onClick={() => setActiveWorkspace('privacy')}
                  className="text-oro-300 underline hover:text-white font-medium"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSaveCookieChoice('all')}
                className="px-4 py-2 rounded-lg font-semibold bg-oro-400 text-carbone-950 hover:bg-oro-300 transition-colors"
              >
                Accetta tutti
              </button>
              <button
                type="button"
                onClick={() => handleSaveCookieChoice('necessary')}
                className="px-4 py-2 rounded-lg font-semibold bg-bordeaux-800 text-crema-50 hover:bg-bordeaux-700 border border-bordeaux-600 transition-colors"
              >
                Solo necessari
              </button>
              <button
                type="button"
                onClick={() => setCookieModalOpen(true)}
                className="px-4 py-2 rounded-lg font-medium text-crema-200 hover:text-oro-300 underline underline-offset-4"
              >
                Gestisci preferenze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Gestione Preferenze Cookie GDPR */}
      {cookieModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
          <div className="bg-crema-50 border border-crema-300 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-crema-300 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-bordeaux-700" />
                <h2 className="font-display text-2xl font-bold text-carbone-950">
                  Preferenze Cookie GDPR
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCookieModalOpen(false)}
                className="p-1.5 rounded-lg bg-crema-200 text-carbone-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-crema-300 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-carbone-950">Cookie Tecnici (Obbligatori)</p>
                  <p className="text-carbone-700 mt-0.5">
                    Indispensabili per il funzionamento del carrello, dell&apos;Area Clienti e per
                    memorizzare questa scelta.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="w-4 h-4 accent-bordeaux-600"
                />
              </div>

              <label className="bg-white border border-crema-300 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <p className="font-bold text-carbone-950">Cookie Analitici</p>
                  <p className="text-carbone-700 mt-0.5">
                    Ci aiutano a capire in forma anonima quali tagli e ricette sono più visitati nel
                    Vicentino.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={tempAnalyticsCookie}
                  onChange={(e) => setTempAnalyticsCookie(e.target.checked)}
                  className="w-4 h-4 accent-bordeaux-600"
                />
              </label>

              <label className="bg-white border border-crema-300 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer">
                <div>
                  <p className="font-bold text-carbone-950">Cookie Marketing &amp; Terze Parti</p>
                  <p className="text-carbone-700 mt-0.5">
                    Utilizzati per mappe esterne interattive e promozioni stagionali della bottega.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={tempMarketingCookie}
                  onChange={(e) => setTempMarketingCookie(e.target.checked)}
                  className="w-4 h-4 accent-bordeaux-600"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleSaveCookieChoice('necessary')}
                className="px-4 py-2.5 rounded-lg font-semibold bg-crema-200 text-carbone-900 hover:bg-crema-300"
              >
                Solo necessari
              </button>
              <button
                type="button"
                onClick={() => handleSaveCookieChoice('custom')}
                className="px-4 py-2.5 rounded-lg font-semibold bg-bordeaux-600 text-crema-50 hover:bg-bordeaux-700"
              >
                Salva preferenze
              </button>
              <button
                type="button"
                onClick={() => handleSaveCookieChoice('all')}
                className="px-4 py-2.5 rounded-lg font-semibold bg-oro-400 text-carbone-950 hover:bg-oro-300"
              >
                Accetta tutti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PULSANTE WHATSAPP FLOTTANTE (Verde #25D366, in basso a destra, non copre il Carrello in alto)
      ===================================================================== */}
      <a
        href={buildWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contattaci su WhatsApp"
        title="Contattaci su WhatsApp"
        className={`fixed right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 ${
          !cookieConsent.decided ? 'bottom-28 sm:bottom-24' : 'bottom-6'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7 fill-current"
          aria-hidden="true"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.625.846 5.059 2.284 7.033l-1.492 5.449 5.601-1.469c1.908 1.044 4.094 1.639 6.418 1.639 6.627 0 12-5.373 12-12s-5.384-12.652-12.811-12.652z" />
        </svg>
      </a>

      {/* =====================================================================
          CLEAN ARTISANAL FOOTER (Local SEO + Pagine Legali Obbligatorie + Reset Cookie)
      ===================================================================== */}
      <footer className="bg-carbone-950 text-crema-200 border-t border-bordeaux-900 py-14 px-6 lg:px-12 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <picture className="shrink-0">
                <source srcSet={LOGO_TORO_WEBP} type="image/webp" />
                <img
                  src={LOGO_TORO}
                  alt="Logo Macelleria Da Luca — Carne Fresca di Qualità"
                  loading="lazy"
                  className="w-11 h-11 rounded-full object-contain bg-white border border-oro-400/50 shadow-xs"
                />
              </picture>
              <p className="font-display text-2xl font-bold text-oro-400">Macelleria Da Luca</p>
            </div>
            <p className="text-crema-300 leading-relaxed">
              Bottega storica di carni selezionate, frollature per barbecue, preparazioni pronte a
              cuocere, salumi veneti, sughi di casa e pane fresco artigianale.
            </p>
            <p>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Via+S.+Floriano+26,+36010+Vigardolo+VI"
                target="_blank"
                rel="noopener noreferrer"
                className="text-oro-300 hover:underline"
              >
                Via S. Floriano, 26 — 36010 Vigardolo, Monticello Conte Otto (VI)
              </a>
            </p>
          </div>

          <div className="space-y-2.5">
            <p className="font-semibold uppercase tracking-wider text-oro-300">Reparti del Banco</p>
            <ul className="space-y-1.5 text-crema-300">
              {BUTCHER_CATEGORIES.slice(1).map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      scrollToSection('catalogo', cat.id === 'tagli-bbq' ? 'bbq' : 'home');
                    }}
                    className="hover:text-oro-300 transition-colors"
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="font-semibold uppercase tracking-wider text-oro-300">
              Servizi Clienti
            </p>
            <ul className="space-y-1.5 text-crema-300">
              <li>
                <button
                  type="button"
                  onClick={() => setCartDrawerOpen(true)}
                  className="hover:text-oro-300 transition-colors"
                >
                  Carrello Laterale ({cartCount} articoli)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveWorkspace('area-clienti')}
                  className="hover:text-oro-300 transition-colors"
                >
                  Area Clienti &amp; Tessera Fedeltà ({customerProfile.loyaltyPoints} pt)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveWorkspace('admin')}
                  className="hover:text-oro-300 transition-colors"
                >
                  Pannello Admin (Ordini, WhatsApp &amp; Magazzino)
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="font-semibold uppercase tracking-wider text-oro-300">
              Pagine Legali &amp; GDPR
            </p>
            <ul className="space-y-1.5 text-crema-300">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspace('privacy');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-oro-300 transition-colors"
                >
                  Privacy Policy (GDPR)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspace('cookie');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-oro-300 transition-colors"
                >
                  Cookie Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspace('termini');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-oro-300 transition-colors"
                >
                  Termini e Condizioni di Vendita
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCookieModalOpen(true)}
                  className="text-crema-400 hover:text-oro-300 underline transition-colors"
                >
                  Gestisci preferenze Cookie GDPR
                </button>
              </li>
            </ul>
            <p className="text-crema-400 pt-2">
              © {new Date().getFullYear()} Macelleria Da Luca · Via S. Floriano 26, Vigardolo (VI)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
