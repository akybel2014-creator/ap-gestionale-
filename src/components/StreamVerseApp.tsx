import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  Play,
  Info,
  Plus,
  Check,
  ThumbsUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Volume2,
  VolumeX,
  Pause,
  RotateCcw,
  Sun,
  Moon,
  SlidersHorizontal,
  LogOut,
  Users,
  Bookmark,
  Film,
  Share2,
  Link2,
  Copy,
  Send,
  MessageSquare,
  Radio,
  Download,
  CheckCircle2,
  Loader2,
  Clock,
  Trash2,
} from 'lucide-react';
import { SyncWatchEmojiPopover } from '@/components/SyncWatchEmojiPopover';
import {
  sanitizeUserText,
  validateSyncRoomCode,
  STREAMVERSE_GEO_FAQS,
  updateStreamVerseDocumentSeo,
} from '@/lib/streamVerseSecuritySeo';
import {
  registerStreamVerseServiceWorker,
  getOfflineDownloadedItems,
  saveItemToOfflineCache,
  removeItemFromOfflineCache,
  type OfflineDownloadedRecord,
} from '@/lib/offlineCache';
import {
  STREAMVERSE_CATALOG,
  STREAMVERSE_PROFILES,
  getHeroItems,
  getTrendingItems,
  getNewReleases,
  getTop10Italy,
  getRecommendedItems,
  getActionMovies,
  buildCinematicArtworkDataUri,
  type StreamVerseItem,
  type StreamVerseProfile,
} from '@/lib/streamVerseCatalog';
import { showToast } from '@/lib/toast';

export type NavTab = 'home' | 'serie' | 'film' | 'novita' | 'lista';
export type BrandTheme = 'netflix' | 'prime';

const STORAGE_MY_LIST_KEY = 'streamverse_my_list_v1';
const STORAGE_LIKED_KEY = 'streamverse_liked_v1';
const STORAGE_PROGRESS_KEY = 'streamverse_progress_v1';
const STORAGE_PROFILE_KEY = 'streamverse_active_profile_v1';
const STORAGE_PARTICIPANT_ID_KEY = 'streamverse_sync_participant_id_v1';
const STORAGE_SEARCH_HISTORY_KEY = 'streamverse_search_history_v1';

interface SyncWatchParticipant {
  id: string;
  name: string;
  avatarColor: string;
  avatarInitials: string;
  joinedAt: number;
  lastSeenAt: number;
}

interface SyncWatchChatMessage {
  id: string;
  senderName: string;
  senderColor: string;
  text: string;
  createdAt: number;
}

interface SyncWatchRoomState {
  roomId: string;
  itemId: string;
  episodeLabel?: string;
  hostName: string;
  isPlaying: boolean;
  currentTimeSec: number;
  progressPercent: number;
  playbackRate: number;
  updatedAt: number;
  expiresAt: number;
  participants: SyncWatchParticipant[];
  messages: SyncWatchChatMessage[];
}

// ============================================================================
// COMPONENTE IMMAGINE CON LAZY LOADING, SKELETON E ZERO-BROKEN-IMAGE FALLBACK
// ============================================================================
interface SmartMediaImageProps {
  src: string;
  alt: string;
  title: string;
  genre: string;
  year: number;
  accentColor: string;
  index?: number;
  className?: string;
  priority?: boolean;
}

const SmartMediaImage: React.FC<SmartMediaImageProps> = ({
  src,
  alt,
  title,
  genre,
  year,
  accentColor,
  index = 1,
  className = '',
  priority = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const fallbackSvg = useMemo(
    () =>
      buildCinematicArtworkDataUri(
        title,
        genre,
        year,
        '#14141d',
        accentColor || '#E50914',
        index,
      ),
    [title, genre, year, accentColor, index],
  );

  const activeSrc = errored ? fallbackSvg : src;

  return (
    <div className={`relative overflow-hidden bg-[#16161d] ${className}`}>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#16161f] via-[#222230] to-[#16161f] animate-pulse"
        />
      )}
      <img
        src={activeSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!errored) {
            setErrored(true);
            setLoaded(true);
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

// ============================================================================
// RIGA ORIZZONTALE (CAROUSEL) CON FRECCE SINISTRA/DESTRA E HOVER CARD
// ============================================================================
interface ContentRowProps {
  title: string;
  subtitle?: string;
  items: StreamVerseItem[];
  myListIds: string[];
  likedIds: string[];
  downloadedIds: string[];
  downloadingIds: string[];
  progressMap: Record<string, number>;
  isTop10Row?: boolean;
  isContinueWatchingRow?: boolean;
  accentHex: string;
  lightMode: boolean;
  onPlayItem: (item: StreamVerseItem) => void;
  onOpenDetails: (item: StreamVerseItem) => void;
  onToggleMyList: (item: StreamVerseItem, e?: React.MouseEvent) => void;
  onToggleLike: (item: StreamVerseItem, e?: React.MouseEvent) => void;
  onToggleDownload: (item: StreamVerseItem, e?: React.MouseEvent) => void;
}

const ContentRow: React.FC<ContentRowProps> = ({
  title,
  subtitle,
  items,
  myListIds,
  likedIds,
  downloadedIds,
  downloadingIds,
  progressMap,
  isTop10Row = false,
  isContinueWatchingRow = false,
  accentHex,
  lightMode,
  onPlayItem,
  onOpenDetails,
  onToggleMyList,
  onToggleLike,
  onToggleDownload,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Stato per "Auto-Play Preview": riproduce automaticamente il trailer muto dopo >1.5s di hover
  const [previewingItemId, setPreviewingItemId] = useState<string | null>(null);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [previewVideoReady, setPreviewVideoReady] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);

  const handleCardMouseEnter = useCallback((itemId: string) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = window.setTimeout(() => {
      setPreviewVideoReady(false);
      setPreviewMuted(true);
      setPreviewingItemId(itemId);
    }, 1500);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setPreviewingItemId(null);
    setPreviewVideoReady(false);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const updateScrollButtons = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 12);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 12);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [items, updateScrollButtons]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = rowRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.78, 320);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="relative py-3 sm:py-4 select-none group/row">
      {/* Intestazione della riga */}
      <div className="px-4 sm:px-8 lg:px-12 mb-2.5 flex items-baseline justify-between gap-4">
        <div>
          <h2
            className={`text-lg sm:text-xl lg:text-2xl font-bold tracking-tight ${
              lightMode ? 'text-slate-900' : 'text-white'
            }`}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className={`text-xs mt-0.5 ${
                lightMode ? 'text-slate-600' : 'text-zinc-400'
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label={`Scorri ${title} a sinistra`}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 border ${
              canScrollLeft
                ? lightMode
                  ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100'
                  : 'border-white/15 bg-white/5 text-white hover:bg-white/15'
                : 'opacity-30 cursor-not-allowed border-transparent text-zinc-500'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label={`Scorri ${title} a destra`}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 border ${
              canScrollRight
                ? lightMode
                  ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100'
                  : 'border-white/15 bg-white/5 text-white hover:bg-white/15'
                : 'opacity-30 cursor-not-allowed border-transparent text-zinc-500'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenitore carousel con frecce laterali sovrapposte */}
      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Scorri a sinistra"
            className="hidden md:flex absolute left-0 top-0 bottom-4 z-20 w-12 items-center justify-center bg-gradient-to-r from-black/85 via-black/50 to-transparent text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-150"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Scorri a destra"
            className="hidden md:flex absolute right-0 top-0 bottom-4 z-20 w-12 items-center justify-center bg-gradient-to-l from-black/85 via-black/50 to-transparent text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-150"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}

        <div
          ref={rowRef}
          onScroll={updateScrollButtons}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scrollbar-none px-4 sm:px-8 lg:px-12 pb-4 pt-1 scroll-smooth"
        >
          {items.map((item, idx) => {
            const inList = myListIds.includes(item.id);
            const isLiked = likedIds.includes(item.id);
            const isDownloaded = downloadedIds.includes(item.id);
            const isDownloading = downloadingIds.includes(item.id);
            const isPreviewing = previewingItemId === item.id;
            const progress =
              progressMap[item.id] ?? item.continueWatchingProgress ?? 0;

            return (
              <div
                key={item.id}
                onClick={() => onOpenDetails(item)}
                onMouseEnter={() => handleCardMouseEnter(item.id)}
                onMouseLeave={handleCardMouseLeave}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenDetails(item);
                  }
                }}
                className={`group/card relative shrink-0 cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.04] hover:z-10 focus:outline-none ${
                  isTop10Row
                    ? 'w-[260px] sm:w-[300px] lg:w-[320px] flex items-center'
                    : 'w-[220px] sm:w-[260px] lg:w-[290px]'
                }`}
              >
                {/* Numero gigante stile Top 10 in Italia oggi */}
                {isTop10Row && (
                  <div
                    aria-hidden="true"
                    className="w-16 sm:w-20 shrink-0 flex items-center justify-center select-none pointer-events-none -mr-4 z-0"
                  >
                    <span
                      className="font-display font-black text-[88px] sm:text-[108px] leading-none tracking-tighter tabular-nums"
                      style={{
                        WebkitTextStroke: lightMode
                          ? '2px #334155'
                          : '2.5px rgba(255,255,255,0.55)',
                        color: lightMode ? '#e2e8f0' : '#0b0b0f',
                      }}
                    >
                      {item.top10Rank ?? idx + 1}
                    </span>
                  </div>
                )}

                {/* Card 16:9 */}
                <div
                  className={`relative flex-1 aspect-video rounded-lg overflow-hidden shadow-lg transition-shadow duration-200 group-hover/card:shadow-2xl ${
                    lightMode
                      ? 'border border-slate-200 bg-slate-900'
                      : 'border border-white/10 bg-[#14141c]'
                  }`}
                >
                  <SmartMediaImage
                    src={item.immagine}
                    alt={item.titolo}
                    title={item.titolo}
                    genre={item.genere}
                    year={item.anno}
                    accentColor={item.accentColor}
                    index={idx + 1}
                    className="w-full h-full"
                  />

                  {/* Auto-Play Preview video dopo 1.5s di cursore fermo sulla card */}
                  {isPreviewing && item.trailer && (
                    <video
                      key={`preview-${item.id}`}
                      src={item.trailer}
                      poster={item.immagine}
                      autoPlay
                      muted={previewMuted}
                      loop
                      playsInline
                      onLoadedData={() => setPreviewVideoReady(true)}
                      onError={() => {
                        setPreviewingItemId(null);
                        setPreviewVideoReady(false);
                      }}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                        previewVideoReady ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  )}

                  {/* Scrim permanente leggero per leggibilità titolo base */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

                  {/* Indicatore tipo contenuto in alto a sinistra + stato preview/audio */}
                  <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-medium tracking-wide text-zinc-200/90 drop-shadow">
                    <div className="flex items-center gap-1.5">
                      {isPreviewing ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          <span
                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: accentHex }}
                          />
                          ANTEPRIMA
                        </span>
                      ) : (
                        <span>
                          {item.tipo === 'serie' ? 'SERIE' : 'FILM'} · {item.qualita}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPreviewing ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewMuted((prev) => !prev);
                          }}
                          aria-label={
                            previewMuted
                              ? 'Attiva audio anteprima'
                              : 'Disattiva audio anteprima'
                          }
                          title={
                            previewMuted
                              ? 'Attiva audio anteprima'
                              : 'Disattiva audio anteprima'
                          }
                          className="w-6 h-6 rounded-full bg-black/65 border border-white/35 text-white hover:border-white flex items-center justify-center transition-colors"
                        >
                          {previewMuted ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </button>
                      ) : isDownloaded ? (
                        <span className="text-[11px] font-semibold text-emerald-400">
                          OFFLINE
                        </span>
                      ) : (
                        inList && (
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: accentHex }}
                          >
                            NELLA LISTA
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Titolo visibile anche senza hover + dettagli espansi in hover */}
                  <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end">
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-1 drop-shadow">
                      {item.titolo}
                    </h3>

                    {/* Metadata puliti con separatori tipografici */}
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-300 tabular-nums">
                      <span className="font-semibold text-emerald-400">
                        {item.rating}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.anno}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.durata}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.etaConsigliata}</span>
                    </div>

                    {/* Episodio se in "Continua a guardare" */}
                    {isContinueWatchingRow && item.continueWatchingEpisode && (
                      <p className="text-[11px] text-zinc-300 mt-0.5 truncate">
                        {item.continueWatchingEpisode}
                      </p>
                    )}

                    {/* Azioni rapide all'hover (Play, + Lista, Like, Download Offline, Dettagli) */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 opacity-0 translate-y-1 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-150">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayItem(item);
                          }}
                          aria-label={`Riproduci ${item.titolo}`}
                          className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-colors shadow"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onToggleMyList(item, e)}
                          aria-label={
                            inList
                              ? `Rimuovi ${item.titolo} dalla Mia Lista`
                              : `Aggiungi ${item.titolo} alla Mia Lista`
                          }
                          title={
                            inList ? 'Rimuovi dalla Mia Lista' : 'Aggiungi alla Mia Lista'
                          }
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            inList
                              ? 'bg-white/20 border-white text-white'
                              : 'bg-black/60 border-white/40 text-white hover:border-white'
                          }`}
                        >
                          {inList ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onToggleLike(item, e)}
                          aria-label={`Mi piace ${item.titolo}`}
                          title="Mi piace"
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            isLiked
                              ? 'border-white text-white bg-white/20'
                              : 'bg-black/60 border-white/40 text-white hover:border-white'
                          }`}
                          style={
                            isLiked ? { backgroundColor: accentHex, borderColor: accentHex } : undefined
                          }
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onToggleDownload(item, e)}
                          disabled={isDownloading}
                          aria-label={
                            isDownloaded
                              ? `Rimuovi download offline di ${item.titolo}`
                              : `Scarica ${item.titolo} per visione offline`
                          }
                          title={
                            isDownloaded
                              ? 'Salvato per visione offline (clicca per rimuovere)'
                              : 'Scarica per visione offline (Cache API)'
                          }
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            isDownloaded
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                              : 'bg-black/60 border-white/40 text-white hover:border-white'
                          }`}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isDownloaded ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(item);
                        }}
                        aria-label={`Altre informazioni su ${item.titolo}`}
                        title="Altre info"
                        className="w-8 h-8 rounded-full bg-black/60 border border-white/40 text-white hover:border-white flex items-center justify-center transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Barra di progresso per "Continua a guardare" */}
                  {(isContinueWatchingRow || progress > 0) && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(8, progress))}%`,
                          backgroundColor: accentHex,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// COMPONENTE PRINCIPALE STREAMVERSE (SPA COMPLETA)
// ============================================================================
export default function StreamVerseApp() {
  // Navigazione principale e tema
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [brandTheme, setBrandTheme] = useState<BrandTheme>('netflix');
  const [lightMode, setLightMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Ricerca, cronologia (ultimi 5 termini in localStorage) e filtri
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(STORAGE_SEARCH_HISTORY_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .slice(0, 5)
        : [];
    } catch {
      return [];
    }
  });
  const [selectedGenre, setSelectedGenre] = useState<string>('Tutti');
  const [visibleCatalogCount, setVisibleCatalogCount] = useState<number>(12);
  const [isInitialSkeletonLoading, setIsInitialSkeletonLoading] = useState(false);

  // Hero auto-rotation (ogni 8 secondi tra 4 contenuti in evidenza)
  const heroItems = useMemo(() => getHeroItems(), []);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  // Stato persistito in localStorage: La Mia Lista, Mi Piace, Progresso visione, Profilo
  const [myListIds, setMyListIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['sv-01', 'sv-02', 'sv-05'];
    try {
      const saved = window.localStorage.getItem(STORAGE_MY_LIST_KEY);
      return saved ? (JSON.parse(saved) as string[]) : ['sv-01', 'sv-02', 'sv-05'];
    } catch {
      return ['sv-01', 'sv-02', 'sv-05'];
    }
  });

  const [likedIds, setLikedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['sv-01', 'sv-04'];
    try {
      const saved = window.localStorage.getItem(STORAGE_LIKED_KEY);
      return saved ? (JSON.parse(saved) as string[]) : ['sv-01', 'sv-04'];
    } catch {
      return ['sv-01', 'sv-04'];
    }
  });

  const [progressMap, setProgressMap] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem(STORAGE_PROGRESS_KEY);
      return saved ? (JSON.parse(saved) as Record<string, number>) : {};
    } catch {
      return {};
    }
  });

  const [activeProfile, setActiveProfile] = useState<StreamVerseProfile>(() => {
    if (typeof window === 'undefined') return STREAMVERSE_PROFILES[0];
    try {
      const savedId = window.localStorage.getItem(STORAGE_PROFILE_KEY);
      return (
        STREAMVERSE_PROFILES.find((p) => p.id === savedId) ||
        STREAMVERSE_PROFILES[0]
      );
    } catch {
      return STREAMVERSE_PROFILES[0];
    }
  });

  // Modali e dropdown
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const [selectedModalItem, setSelectedModalItem] =
    useState<StreamVerseItem | null>(null);
  const [activePlayerItem, setActivePlayerItem] =
    useState<StreamVerseItem | null>(null);
  const [footerInfoSection, setFooterInfoSection] = useState<string | null>(null);

  // Stato del Video Player Mock interattivo
  const [playerPlaying, setPlayerPlaying] = useState(true);
  const [playerMuted, setPlayerMuted] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(24);
  const [playerSpeed, setPlayerSpeed] = useState<'1x' | '1.25x' | '1.5x'>('1x');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stato "Sync Watch" (Watch Party sincronizzato in tempo reale)
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [syncRoom, setSyncRoom] = useState<SyncWatchRoomState | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncLinkCopied, setSyncLinkCopied] = useState(false);
  const [syncJoinCodeInput, setSyncJoinCodeInput] = useState('');
  const [syncChatInput, setSyncChatInput] = useState('');
  const [syncEmojiPickerOpen, setSyncEmojiPickerOpen] = useState(false);
  const syncChatInputRef = useRef<HTMLInputElement>(null);
  const isApplyingRemoteSyncRef = useRef(false);
  const syncParticipantId = useMemo(() => {
    if (typeof window === 'undefined') return 'sv-anon';
    try {
      const existing = window.sessionStorage.getItem(STORAGE_PARTICIPANT_ID_KEY);
      if (existing) return existing;
      const created = `user-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(STORAGE_PARTICIPANT_ID_KEY, created);
      return created;
    } catch {
      return `user-${Math.random().toString(36).slice(2, 10)}`;
    }
  }, []);

  // Stato e ref del Trailer Video incorporato nella Modale "Altre info"
  const [modalTrailerMuted, setModalTrailerMuted] = useState(true);
  const [modalTrailerPlaying, setModalTrailerPlaying] = useState(true);
  const [modalTrailerError, setModalTrailerError] = useState(false);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  // Stato Download Offline (Service Worker + Cache API)
  const [offlineRecords, setOfflineRecords] = useState<
    Record<string, OfflineDownloadedRecord>
  >({});
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const accentHex = brandTheme === 'netflix' ? '#E50914' : '#00A8E1';

  // Registra il Service Worker e carica i contenuti già salvati nella Cache API all'avvio
  useEffect(() => {
    void registerStreamVerseServiceWorker();
    void getOfflineDownloadedItems().then((records) => {
      setOfflineRecords(records);
    });
  }, []);

  const downloadedIds = useMemo(
    () => Object.keys(offlineRecords),
    [offlineRecords],
  );

  // Avvio automatico del trailer quando si apre o cambia il titolo nella modale "Altre info"
  useEffect(() => {
    if (!selectedModalItem) return;
    setModalTrailerError(false);
    setModalTrailerPlaying(true);
    const v = modalVideoRef.current;
    if (v) {
      v.currentTime = 0;
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Se il browser blocca l'autoplay con audio attivo, forza il mute e riprova
          v.muted = true;
          setModalTrailerMuted(true);
          v.play().catch(() => {
            setModalTrailerPlaying(false);
          });
        });
      }
    }
  }, [selectedModalItem]);

  // Sincronizzazione scroll per Header Fisso (trasparente -> solido)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotazione Hero Banner ogni 8 secondi
  useEffect(() => {
    if (
      heroPaused ||
      selectedModalItem ||
      activePlayerItem ||
      profileGateOpen ||
      activeTab !== 'home'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroItems.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [
    heroPaused,
    selectedModalItem,
    activePlayerItem,
    profileGateOpen,
    activeTab,
    heroItems.length,
  ]);

  // Chiudi dropdown profilo e cronologia ricerca cliccando fuori
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Salva un termine nella cronologia di ricerca (massimo 5 termini recenti, sanitizzati e senza duplicati)
  const recordSearchTerm = useCallback((rawTerm: string) => {
    const cleaned = sanitizeUserText(rawTerm, 60);
    if (cleaned.length < 2) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter(
        (t) => t.toLowerCase() !== cleaned.toLowerCase(),
      );
      return [cleaned, ...filtered].slice(0, 5);
    });
  }, []);

  const handleRemoveSearchHistoryTerm = useCallback(
    (termToRemove: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchHistory((prev) => prev.filter((t) => t !== termToRemove));
    },
    [],
  );

  const handleClearSearchHistory = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
  }, []);

  // Registra automaticamente nella cronologia il termine cercato dopo una breve pausa di digitazione
  useEffect(() => {
    const trimmed = sanitizeUserText(searchQuery, 60);
    if (trimmed.length < 2) return;
    const timer = window.setTimeout(() => {
      recordSearchTerm(trimmed);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [searchQuery, recordSearchTerm]);

  // Aggiorna dinamicamente <title>, meta description, OpenGraph, Canonical e JSON-LD Schema.org (SEO + GEO)
  useEffect(() => {
    updateStreamVerseDocumentSeo({
      activeTab,
      selectedGenre,
      searchQuery,
      activeItem: selectedModalItem || activePlayerItem,
    });
  }, [
    activeTab,
    selectedGenre,
    searchQuery,
    selectedModalItem,
    activePlayerItem,
  ]);

  // Persistenza localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_SEARCH_HISTORY_KEY,
        JSON.stringify(searchHistory.slice(0, 5)),
      );
    } catch {
      // ignore storage quota errors
    }
  }, [searchHistory]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_MY_LIST_KEY, JSON.stringify(myListIds));
    } catch {
      // ignore storage quota errors
    }
  }, [myListIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_LIKED_KEY, JSON.stringify(likedIds));
    } catch {
      // ignore
    }
  }, [likedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_PROGRESS_KEY,
        JSON.stringify(progressMap),
      );
    } catch {
      // ignore
    }
  }, [progressMap]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PROFILE_KEY, activeProfile.id);
    } catch {
      // ignore
    }
  }, [activeProfile]);

  // Gestione scorciatoia ESC per chiudere modali e player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePlayerItem) setActivePlayerItem(null);
        else if (selectedModalItem) setSelectedModalItem(null);
        else if (profileGateOpen) setProfileGateOpen(false);
        else if (footerInfoSection) setFooterInfoSection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePlayerItem, selectedModalItem, profileGateOpen, footerInfoSection]);

  // Azioni utente: Aggiungi/rimuovi da "La Mia Lista"
  const handleToggleMyList = useCallback(
    (item: StreamVerseItem, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setMyListIds((prev) => {
        const exists = prev.includes(item.id);
        const updated = exists
          ? prev.filter((id) => id !== item.id)
          : [item.id, ...prev];
        showToast(
          exists
            ? `"${item.titolo}" rimosso dalla Mia Lista`
            : `"${item.titolo}" aggiunto alla Mia Lista`,
          exists ? 'info' : 'success',
        );
        return updated;
      });
    },
    [],
  );

  // Azione Like
  const handleToggleLike = useCallback(
    (item: StreamVerseItem, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setLikedIds((prev) => {
        const exists = prev.includes(item.id);
        const updated = exists
          ? prev.filter((id) => id !== item.id)
          : [...prev, item.id];
        showToast(
          exists
            ? `Valutazione rimossa da "${item.titolo}"`
            : `Hai messo Mi Piace a "${item.titolo}"`,
          'info',
        );
        return updated;
      });
    },
    [],
  );

  // Azione Download Offline tramite Service Worker e Cache API
  const handleToggleDownload = useCallback(
    async (item: StreamVerseItem, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const alreadyDownloaded = Boolean(offlineRecords[item.id]);

      if (alreadyDownloaded) {
        await removeItemFromOfflineCache(item.id);
        setOfflineRecords((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        showToast(
          `Metadati offline di "${item.titolo}" rimossi dalla cache locale`,
          'info',
        );
        return;
      }

      setDownloadingIds((prev) =>
        prev.includes(item.id) ? prev : [...prev, item.id],
      );
      try {
        const record = await saveItemToOfflineCache(item);
        setOfflineRecords((prev) => ({
          ...prev,
          [item.id]: record,
        }));
        showToast(
          `"${item.titolo}" salvato nella Cache API (${record.sizeKb} KB) per la visione offline`,
          'success',
        );
      } catch {
        showToast(
          `Impossibile salvare "${item.titolo}" nella cache offline`,
          'error',
        );
      } finally {
        setDownloadingIds((prev) => prev.filter((id) => id !== item.id));
      }
    },
    [offlineRecords],
  );

  // Avvia riproduzione nel Player Video Mock
  const handlePlayItem = useCallback((item: StreamVerseItem) => {
    setSelectedModalItem(null);
    setActivePlayerItem(item);
    setPlayerPlaying(true);
    setProgressMap((prev) => ({
      ...prev,
      [item.id]: prev[item.id] ? Math.min(95, prev[item.id] + 10) : 25,
    }));
  }, []);

  // ============================================================================
  // LOGICA "SYNC WATCH" (LINK TEMPORANEO + SINCRONIZZAZIONE SERVER-SIDE SSE)
  // ============================================================================
  const applyRoomPlaybackToVideo = useCallback((room: SyncWatchRoomState) => {
    isApplyingRemoteSyncRef.current = true;
    setPlayerPlaying(room.isPlaying);
    setPlayerProgress(room.progressPercent);
    const rateLabel =
      room.playbackRate === 1.25
        ? '1.25x'
        : room.playbackRate === 1.5
          ? '1.5x'
          : '1x';
    setPlayerSpeed(rateLabel);

    const v = videoRef.current;
    if (v) {
      if (
        Number.isFinite(room.currentTimeSec) &&
        Math.abs(v.currentTime - room.currentTimeSec) > 1.8
      ) {
        try {
          v.currentTime = room.currentTimeSec;
        } catch {
          // ignore if video metadata not ready yet
        }
      }
      v.playbackRate = room.playbackRate || 1;
      if (room.isPlaying && v.paused) {
        void v.play().catch(() => {});
      } else if (!room.isPlaying && !v.paused) {
        v.pause();
      }
    }

    window.setTimeout(() => {
      isApplyingRemoteSyncRef.current = false;
    }, 150);
  }, []);

  // Genera una nuova sessione Sync Watch e un link temporaneo condivisibile
  const handleCreateSyncWatchSession = useCallback(async () => {
    if (!activePlayerItem) return;
    setSyncLoading(true);
    try {
      const currentTimeSec = videoRef.current?.currentTime || 0;
      const res = await fetch('/api/sync-watch/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: activePlayerItem.id,
          episodeLabel: activePlayerItem.continueWatchingEpisode,
          hostName: activeProfile.name,
          avatarColor: activeProfile.avatarColor,
          avatarInitials: activeProfile.avatarInitials,
          participantId: syncParticipantId,
          currentTimeSec,
          progressPercent: playerProgress,
          isPlaying: playerPlaying,
          playbackRate: parseFloat(playerSpeed),
        }),
      });
      if (!res.ok) {
        throw new Error('Impossibile creare la stanza Sync Watch');
      }
      const data = (await res.json()) as { room: SyncWatchRoomState };
      setSyncRoom(data.room);
      setSyncPanelOpen(true);

      // Aggiorna l'URL con ?syncRoom=<roomId> così che sia subito condivisibile
      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('syncRoom', data.room.roomId);
        window.history.replaceState({}, '', nextUrl.toString());
      }
      showToast(
        `Link Sync Watch generato (${data.room.roomId}). Condividilo con i tuoi amici!`,
        'success',
      );
    } catch {
      showToast('Errore durante la creazione della stanza Sync Watch.', 'error');
    } finally {
      setSyncLoading(false);
    }
  }, [
    activePlayerItem,
    activeProfile,
    syncParticipantId,
    playerProgress,
    playerPlaying,
    playerSpeed,
  ]);

  // Partecipa a una stanza Sync Watch esistente tramite codice o link temporaneo (con validazione formato)
  const handleJoinSyncWatchRoom = useCallback(
    async (rawCode: string) => {
      const code = validateSyncRoomCode(rawCode);
      if (!code) {
        showToast(
          'Formato codice stanza non valido. Usa il formato SV-XXXXXX.',
          'error',
        );
        return;
      }
      setSyncLoading(true);
      try {
        const res = await fetch(
          `/api/sync-watch/rooms/${encodeURIComponent(code)}/events`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'join',
              participantId: syncParticipantId,
              userName: activeProfile.name,
              avatarColor: activeProfile.avatarColor,
              avatarInitials: activeProfile.avatarInitials,
            }),
          },
        );
        if (!res.ok) {
          showToast(
            'Codice o link Sync Watch scaduto o non trovato.',
            'error',
          );
          return;
        }
        const data = (await res.json()) as { room: SyncWatchRoomState };
        const targetItem =
          STREAMVERSE_CATALOG.find((i) => i.id === data.room.itemId) ||
          STREAMVERSE_CATALOG[0];

        setSelectedModalItem(null);
        setActivePlayerItem(targetItem);
        setSyncRoom(data.room);
        setSyncPanelOpen(true);
        setSyncJoinCodeInput('');
        applyRoomPlaybackToVideo(data.room);

        if (typeof window !== 'undefined') {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set('syncRoom', data.room.roomId);
          window.history.replaceState({}, '', nextUrl.toString());
        }
        showToast(
          `Connesso alla visione sincronizzata di "${targetItem.titolo}" con ${data.room.hostName}!`,
          'success',
        );
      } catch {
        showToast('Impossibile connettersi alla sessione Sync Watch.', 'error');
      } finally {
        setSyncLoading(false);
      }
    },
    [activeProfile, syncParticipantId, applyRoomPlaybackToVideo],
  );

  // Controlla all'avvio se l'URL contiene un link temporaneo ?syncRoom=SV-XXXXXX
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('syncRoom');
    if (roomParam && roomParam.trim()) {
      void handleJoinSyncWatchRoom(roomParam);
    }
  }, [handleJoinSyncWatchRoom]);

  // Sottoscrizione SSE in tempo reale agli aggiornamenti della stanza Sync Watch attiva
  useEffect(() => {
    if (!syncRoom?.roomId) return;
    const es = new EventSource(
      `/api/sync-watch/rooms/${encodeURIComponent(syncRoom.roomId)}/stream`,
    );

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type?: string;
          room?: SyncWatchRoomState;
        };
        if (parsed.type === 'room:state' && parsed.room) {
          setSyncRoom(parsed.room);
          applyRoomPlaybackToVideo(parsed.room);
        }
      } catch {
        // ignore malformed event
      }
    };

    return () => {
      es.close();
    };
  }, [syncRoom?.roomId, applyRoomPlaybackToVideo]);

  // Emette aggiornamenti di stato playback (play/pause, seek, velocità) agli altri spettatori
  const emitSyncPlaybackUpdate = useCallback(
    async (patch: {
      isPlaying?: boolean;
      currentTimeSec?: number;
      progressPercent?: number;
      playbackRate?: number;
    }) => {
      if (!syncRoom || isApplyingRemoteSyncRef.current) return;
      try {
        await fetch(
          `/api/sync-watch/rooms/${encodeURIComponent(syncRoom.roomId)}/events`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'playback',
              participantId: syncParticipantId,
              userName: activeProfile.name,
              avatarColor: activeProfile.avatarColor,
              avatarInitials: activeProfile.avatarInitials,
              isPlaying: patch.isPlaying ?? playerPlaying,
              currentTimeSec:
                patch.currentTimeSec ?? (videoRef.current?.currentTime || 0),
              progressPercent: patch.progressPercent ?? playerProgress,
              playbackRate: patch.playbackRate ?? parseFloat(playerSpeed),
            }),
          },
        );
      } catch {
        // ignore network hiccup
      }
    },
    [
      syncRoom,
      syncParticipantId,
      activeProfile,
      playerPlaying,
      playerProgress,
      playerSpeed,
    ],
  );

  // Invia un messaggio nella chat in tempo reale della stanza Sync Watch (sanitizzato contro XSS)
  const handleSendSyncChatMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const messageText = sanitizeUserText(syncChatInput, 280);
      if (!syncRoom || !messageText) return;
      setSyncChatInput('');
      try {
        await fetch(
          `/api/sync-watch/rooms/${encodeURIComponent(syncRoom.roomId)}/events`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'chat',
              participantId: syncParticipantId,
              userName: activeProfile.name,
              avatarColor: activeProfile.avatarColor,
              avatarInitials: activeProfile.avatarInitials,
              text: messageText,
            }),
          },
        );
      } catch {
        // ignore
      }
    },
    [syncRoom, syncChatInput, syncParticipantId, activeProfile],
  );

  // Lascia la stanza Sync Watch
  const handleLeaveSyncWatch = useCallback(async () => {
    if (!syncRoom) return;
    const leavingId = syncRoom.roomId;
    setSyncRoom(null);
    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('syncRoom');
      window.history.replaceState({}, '', nextUrl.toString());
    }
    try {
      await fetch(
        `/api/sync-watch/rooms/${encodeURIComponent(leavingId)}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave',
            participantId: syncParticipantId,
            userName: activeProfile.name,
          }),
        },
      );
    } catch {
      // ignore
    }
    showToast('Hai lasciato la sessione Sync Watch.', 'info');
  }, [syncRoom, syncParticipantId, activeProfile.name]);

  // Copia il link temporaneo negli appunti
  const handleCopySyncLink = useCallback(async () => {
    if (!syncRoom || typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/?syncRoom=${encodeURIComponent(
      syncRoom.roomId,
    )}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSyncLinkCopied(true);
      showToast('Link temporaneo Sync Watch copiato negli appunti!', 'success');
      window.setTimeout(() => setSyncLinkCopied(false), 2500);
    } catch {
      showToast(`Link Sync Watch: ${shareUrl}`, 'info');
    }
  }, [syncRoom]);

  // Condivide il link temporaneo tramite le API di condivisione native del dispositivo (Web Share API)
  const canUseNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShareSyncLink = useCallback(async () => {
    if (!syncRoom || typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/?syncRoom=${encodeURIComponent(
      syncRoom.roomId,
    )}`;
    const shareTitle = activePlayerItem
      ? `StreamVerse Sync Watch — ${activePlayerItem.titolo}`
      : 'StreamVerse Sync Watch Party';
    const shareText = activePlayerItem
      ? `Unisciti alla mia sessione Sync Watch per guardare "${activePlayerItem.titolo}" in contemporanea (codice stanza: ${syncRoom.roomId}):`
      : `Unisciti alla mia sessione Sync Watch su StreamVerse (codice stanza: ${syncRoom.roomId}):`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        showToast('Sessione Sync Watch condivisa tramite il dispositivo!', 'success');
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Fallback agli appunti se la condivisione nativa viene bloccata dall'ambiente
      }
    }

    await handleCopySyncLink();
  }, [syncRoom, activePlayerItem, handleCopySyncLink]);

  // Cambio tab con breve skeleton feedback fluido
  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedGenre('Tutti');
    setVisibleCatalogCount(12);
    setIsInitialSkeletonLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => {
      setIsInitialSkeletonLoading(false);
    }, 180);
  };

  // Lista generi disponibili
  const allGenres = useMemo(() => {
    const set = new Set<string>(['Tutti']);
    STREAMVERSE_CATALOG.forEach((item) => set.add(item.genere));
    return Array.from(set);
  }, []);

  // Filtro catalogo per profilo Bambini, ricerca in tempo reale, tab e genere
  const baseCatalogForProfile = useMemo(() => {
    if (!activeProfile.isKids) return STREAMVERSE_CATALOG;
    return STREAMVERSE_CATALOG.filter(
      (i) => i.etaConsigliata === 'T' || i.etaConsigliata === '12+',
    );
  }, [activeProfile.isKids]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseCatalogForProfile.filter((item) => {
      if (activeTab === 'serie' && item.tipo !== 'serie') return false;
      if (activeTab === 'film' && item.tipo !== 'film') return false;
      if (activeTab === 'novita' && !item.isNewRelease && item.anno < 2026)
        return false;
      if (activeTab === 'lista' && !myListIds.includes(item.id)) return false;
      if (selectedGenre !== 'Tutti' && item.genere !== selectedGenre)
        return false;
      if (!q) return true;
      return (
        item.titolo.toLowerCase().includes(q) ||
        item.descrizione.toLowerCase().includes(q) ||
        item.genere.toLowerCase().includes(q) ||
        item.regista.toLowerCase().includes(q) ||
        item.cast.some((actor) => actor.toLowerCase().includes(q))
      );
    });
  }, [baseCatalogForProfile, activeTab, myListIds, selectedGenre, searchQuery]);

  // Righe per la Home
  const trendingRow = useMemo(() => getTrendingItems(), []);
  const newReleasesRow = useMemo(() => getNewReleases(), []);
  const top10Row = useMemo(() => getTop10Italy(), []);
  const continueWatchingRow = useMemo(() => {
    return STREAMVERSE_CATALOG.filter(
      (item) =>
        typeof progressMap[item.id] === 'number' ||
        typeof item.continueWatchingProgress === 'number',
    );
  }, [progressMap]);
  const recommendedRow = useMemo(() => getRecommendedItems(), []);
  const actionMoviesRow = useMemo(() => getActionMovies(), []);

  // Titoli simili per la Modale Dettagli
  const similarItems = useMemo(() => {
    if (!selectedModalItem) return [];
    return STREAMVERSE_CATALOG.filter(
      (i) =>
        i.id !== selectedModalItem.id &&
        (i.genere === selectedModalItem.genere ||
          i.tipo === selectedModalItem.tipo),
    ).slice(0, 6);
  }, [selectedModalItem]);

  const currentHero = heroItems[heroIndex] || heroItems[0];
  const heroInList = myListIds.includes(currentHero.id);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        lightMode
          ? 'bg-[#f5f6f8] text-slate-900'
          : 'bg-[#0b0b0f] text-[#f5f5f7]'
      }`}
    >
      {/* ====================================================================
          1. HEADER FISSO (STICKY) — 3-Zone Top Bar Contract
         ==================================================================== */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-200 ${
          isScrolled || searchOpen || activeTab !== 'home'
            ? lightMode
              ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm'
              : 'bg-[#0b0b0f]/95 backdrop-blur-md border-b border-white/10 shadow-lg'
            : 'bg-gradient-to-b from-black/85 via-black/45 to-transparent'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between gap-8">
          {/* Zona 1: Brand Title (Singolo elemento testuale) */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleSelectTab('home');
            }}
            className="font-display font-black text-2xl sm:text-3xl tracking-wider uppercase whitespace-nowrap shrink-0 focus:outline-none"
            style={{ color: accentHex }}
          >
            STREAMVERSE
          </a>

          {/* Zona 2: 5 Link di Navigazione (Home, Serie TV, Film, Novità, La Mia Lista) */}
          <nav
            aria-label="Navigazione principale"
            className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium"
          >
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'serie', label: 'Serie TV' },
                { id: 'film', label: 'Film' },
                { id: 'novita', label: 'Novità' },
                { id: 'lista', label: 'La Mia Lista' },
              ] as { id: NavTab; label: string }[]
            ).map((nav) => {
              const isActive = activeTab === nav.id && !searchQuery;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => handleSelectTab(nav.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? lightMode && isScrolled
                        ? 'text-slate-950 font-semibold'
                        : 'text-white font-semibold'
                      : lightMode && isScrolled
                        ? 'text-slate-600 hover:text-slate-950'
                        : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {nav.label}
                  {nav.id === 'lista' && myListIds.length > 0 && (
                    <span className="ml-1.5 text-xs opacity-75 tabular-nums">
                      ({myListIds.length})
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="absolute bottom-0 inset-x-0 h-0.5 rounded-full"
                      style={{ backgroundColor: accentHex }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zona 3: Ricerca espandibile + Profilo Utente con Dropdown */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Barra di ricerca espandibile + Dropdown Cronologia Ricerche */}
            <div ref={searchContainerRef} className="relative">
              <div
                className={`flex items-center rounded-full transition-all duration-200 ${
                  searchOpen || searchQuery
                    ? lightMode && isScrolled
                      ? 'bg-slate-100 border border-slate-300 px-3 py-1.5 w-48 sm:w-64 lg:w-72'
                      : 'bg-black/80 border border-white/30 px-3 py-1.5 w-48 sm:w-64 lg:w-72'
                    : ''
                }`}
              >
                <button
                  type="button"
                  aria-label="Cerca titoli, generi o attori"
                  onClick={() => {
                    setSearchOpen((prev) => {
                      const next = !prev;
                      if (next) {
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                      } else {
                        setSearchFocused(false);
                      }
                      return next;
                    });
                  }}
                  className={`p-1.5 rounded-full transition-colors ${
                    lightMode && isScrolled
                      ? 'text-slate-700 hover:text-slate-950'
                      : 'text-zinc-200 hover:text-white'
                  }`}
                >
                  <Search className="w-5 h-5" />
                </button>
                {(searchOpen || searchQuery) && (
                  <>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onFocus={() => setSearchFocused(true)}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          recordSearchTerm(searchQuery);
                          setSearchFocused(false);
                        } else if (e.key === 'Escape') {
                          setSearchFocused(false);
                        }
                      }}
                      placeholder="Titoli, attori, generi..."
                      aria-label="Cerca nel catalogo StreamVerse"
                      className={`w-full bg-transparent text-xs sm:text-sm focus:outline-none px-2 ${
                        lightMode && isScrolled
                          ? 'text-slate-900 placeholder:text-slate-400'
                          : 'text-white placeholder:text-zinc-400'
                      }`}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          recordSearchTerm(searchQuery);
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        aria-label="Cancella ricerca"
                        className="text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Dropdown Cronologia Ricerche (ultimi 5 termini salvati in localStorage) */}
              {(searchOpen || searchQuery) &&
                searchFocused &&
                searchHistory.length > 0 && (
                  <div
                    className={`absolute right-0 left-0 mt-2 rounded-xl shadow-2xl border py-2 z-50 animate-fade-in ${
                      lightMode
                        ? 'bg-white border-slate-200 text-slate-900'
                        : 'bg-[#14141c]/95 backdrop-blur-xl border-white/15 text-zinc-100'
                    }`}
                  >
                    <div className="px-3.5 py-1.5 flex items-center justify-between border-b border-white/10">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Ricerche recenti
                      </span>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleClearSearchHistory}
                        className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Cancella</span>
                      </button>
                    </div>
                    <ul className="py-1" role="listbox" aria-label="Cronologia ricerche recenti">
                      {searchHistory.slice(0, 5).map((term) => (
                        <li key={term}>
                          <div
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSearchQuery(term);
                              recordSearchTerm(term);
                              setSearchFocused(false);
                            }}
                            className={`px-3.5 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                              lightMode
                                ? 'hover:bg-slate-100 text-slate-800'
                                : 'hover:bg-white/10 text-zinc-200'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate font-medium">{term}</span>
                            </span>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => handleRemoveSearchHistoryTerm(term, e)}
                              aria-label={`Rimuovi "${term}" dalla cronologia`}
                              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* Menu Profilo con Dropdown */}
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                aria-expanded={profileDropdownOpen}
                aria-label="Menu profilo e impostazioni"
                className="flex items-center gap-2 focus:outline-none group"
              >
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform group-hover:scale-105"
                  style={{ backgroundColor: activeProfile.avatarColor }}
                >
                  {activeProfile.avatarInitials}
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-150 ${
                    profileDropdownOpen ? 'rotate-180' : ''
                  } ${
                    lightMode && isScrolled ? 'text-slate-700' : 'text-zinc-300'
                  }`}
                />
              </button>

              {profileDropdownOpen && (
                <div
                  className={`absolute right-0 mt-3 w-64 rounded-xl shadow-2xl border py-2 z-50 animate-fade-in ${
                    lightMode
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-[#14141c] border-white/15 text-zinc-100'
                  }`}
                >
                  <div className="px-4 py-2.5 border-b border-white/10">
                    <p className="text-xs font-semibold">{activeProfile.name}</p>
                    <p className="text-[11px] text-zinc-400">
                      {activeProfile.maturityLevel}
                    </p>
                  </div>

                  {/* Cambio rapido profili */}
                  <div className="py-1.5 border-b border-white/10">
                    <p className="px-4 py-1 text-[11px] font-medium text-zinc-400">
                      Cambia profilo
                    </p>
                    {STREAMVERSE_PROFILES.map((prof) => (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => {
                          setActiveProfile(prof);
                          setProfileDropdownOpen(false);
                          showToast(`Profilo attivo: ${prof.name}`, 'info');
                        }}
                        className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                          lightMode ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: prof.avatarColor }}
                          >
                            {prof.avatarInitials}
                          </span>
                          <span
                            className={
                              prof.id === activeProfile.id ? 'font-bold' : ''
                            }
                          >
                            {prof.name}
                          </span>
                        </span>
                        {prof.id === activeProfile.id && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Opzioni Tema / Accento Colore (Rosso Netflix / Blu Prime & Dark/Light) */}
                  <div className="py-1.5 border-b border-white/10 px-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Accento Brand</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBrandTheme('netflix')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            brandTheme === 'netflix'
                              ? 'bg-[#E50914] text-white'
                              : 'bg-white/10 text-zinc-300'
                          }`}
                        >
                          Rosso
                        </button>
                        <button
                          type="button"
                          onClick={() => setBrandTheme('prime')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            brandTheme === 'prime'
                              ? 'bg-[#00A8E1] text-white'
                              : 'bg-white/10 text-zinc-300'
                          }`}
                        >
                          Blu Prime
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLightMode((prev) => !prev)}
                      className="w-full py-1.5 flex items-center justify-between text-xs hover:opacity-80"
                    >
                      <span className="flex items-center gap-2">
                        {lightMode ? (
                          <Moon className="w-3.5 h-3.5" />
                        ) : (
                          <Sun className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {lightMode ? 'Modalità Cinema Scura' : 'Modalità Chiara'}
                        </span>
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {lightMode ? 'Off' : 'On'}
                      </span>
                    </button>
                  </div>

                  {/* Azioni Account */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setProfileGateOpen(true);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center gap-2.5 ${
                        lightMode ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                      }`}
                    >
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span>Chi sta guardando? (Profili)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleSelectTab('lista');
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center gap-2.5 ${
                        lightMode ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 text-zinc-400" />
                      <span>La Mia Lista ({myListIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setProfileGateOpen(true);
                        showToast('Sessione chiusa. Seleziona un profilo per continuare.', 'info');
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center gap-2.5 text-rose-400 ${
                        lightMode ? 'hover:bg-slate-100' : 'hover:bg-white/10'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Esci da StreamVerse</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra di navigazione compatta per dispositivi Mobile */}
        <div className="flex md:hidden items-center justify-around border-t border-white/10 bg-black/75 backdrop-blur-md px-2 py-2 text-xs">
          {(
            [
              { id: 'home', label: 'Home' },
              { id: 'serie', label: 'Serie TV' },
              { id: 'film', label: 'Film' },
              { id: 'novita', label: 'Novità' },
              { id: 'lista', label: 'La Mia Lista' },
            ] as { id: NavTab; label: string }[]
          ).map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => handleSelectTab(nav.id)}
              className={`px-2 py-1 rounded whitespace-nowrap ${
                activeTab === nav.id
                  ? 'text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              style={
                activeTab === nav.id ? { color: accentHex } : undefined
              }
            >
              {nav.label}
            </button>
          ))}
        </div>
      </header>

      {/* ====================================================================
          2. HERO BANNER A SCHERMO INTERO (Auto-rotazione ogni 8s)
         ==================================================================== */}
      {activeTab === 'home' && !searchQuery && (
        <section
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          className="relative w-full min-h-[560px] h-[82vh] max-h-[860px] flex items-end pb-14 sm:pb-20 lg:pb-24 overflow-hidden select-none"
        >
          {/* Immagini Hero con cross-fade fluido */}
          {heroItems.map((item, idx) => (
            <div
              key={item.id}
              aria-hidden={idx !== heroIndex}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === heroIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'
              }`}
            >
              <SmartMediaImage
                src={item.backdropImage || item.immagine}
                alt={item.titolo}
                title={item.titolo}
                genre={item.genere}
                year={item.anno}
                accentColor={item.accentColor}
                priority={idx === 0}
                className="w-full h-full scale-105 transition-transform duration-[8000ms] ease-out"
              />
            </div>
          ))}

          {/* Scrims cinematografici misurati per contrasto WCAG AA */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0f] via-[#0b0b0f]/70 to-transparent z-10" />
          <div
            className={`absolute inset-0 bg-gradient-to-t ${
              lightMode
                ? 'from-[#f5f6f8] via-black/40 to-transparent'
                : 'from-[#0b0b0f] via-[#0b0b0f]/35 to-transparent'
            } z-10`}
          />

          {/* Contenuto Hero in evidenza */}
          <div className="relative z-20 max-w-[1600px] w-full mx-auto px-4 sm:px-8 lg:px-12 pt-24">
            <div className="max-w-2xl space-y-4">
              {/* Kicker pulito */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wider uppercase text-zinc-200">
                <span style={{ color: accentHex }}>STREAMVERSE ORIGINAL</span>
                <span aria-hidden="true">·</span>
                <span>
                  {currentHero.top10Rank
                    ? `N. ${currentHero.top10Rank} in Italia oggi`
                    : 'In Evidenza'}
                </span>
              </div>

              {/* Titolo grande del contenuto in evidenza */}
              <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-[1.03] drop-shadow-md">
                {currentHero.titolo}
              </h1>

              {/* Metadata: anno, durata, età consigliata, genere (senza pillole) */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-medium text-zinc-200 tabular-nums">
                <span className="font-bold text-emerald-400">
                  {currentHero.rating}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentHero.anno}</span>
                <span aria-hidden="true">·</span>
                <span>{currentHero.durata}</span>
                <span aria-hidden="true">·</span>
                <span>Età {currentHero.etaConsigliata}</span>
                <span aria-hidden="true">·</span>
                <span>{currentHero.genere}</span>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-300">{currentHero.qualita}</span>
              </div>

              {/* Descrizione breve (max 2 righe) */}
              <p className="text-sm sm:text-base lg:text-lg text-zinc-200 leading-relaxed line-clamp-2 max-w-xl drop-shadow">
                {currentHero.descrizione}
              </p>

              {/* Pulsanti: "▶ Riproduci" (bianco pieno) e "ⓘ Altre info" (trasparente) + "+ La Mia Lista" */}
              <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => handlePlayItem(currentHero)}
                  className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg bg-white text-black font-bold text-sm sm:text-base hover:bg-zinc-200 transition-colors shadow-lg whitespace-nowrap shrink-0"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Riproduci</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModalItem(currentHero)}
                  className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-semibold text-sm sm:text-base border border-white/25 transition-colors whitespace-nowrap shrink-0"
                >
                  <Info className="w-5 h-5" />
                  <span>Altre info</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleToggleMyList(currentHero, e)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 rounded-lg bg-black/50 hover:bg-black/75 text-white text-sm font-medium border border-white/25 transition-colors whitespace-nowrap shrink-0"
                >
                  {heroInList ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Nella Mia Lista</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>La Mia Lista</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Indicatori di auto-rotazione per i 4 contenuti Hero */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {heroItems.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHeroIndex(idx)}
                    aria-label={`Mostra in evidenza: ${item.titolo}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === heroIndex
                        ? 'w-10 bg-white'
                        : 'w-4 bg-white/35 hover:bg-white/60'
                    }`}
                    style={
                      idx === heroIndex
                        ? { backgroundColor: accentHex }
                        : undefined
                    }
                  />
                ))}
              </div>

              <span className="hidden sm:inline-block text-xs text-zinc-300/80 font-medium">
                Regia di {currentHero.regista}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================
          3. CONTENUTO PRINCIPALE: 6 RIGHE CAROUSEL O VISTA FILTRATA / LA MIA LISTA
         ==================================================================== */}
      <main className="relative z-20 max-w-[1600px] mx-auto pb-20">
        {/* Skeleton Loader durante la transizione tra viste */}
        {isInitialSkeletonLoading ? (
          <div className="pt-28 px-4 sm:px-8 lg:px-12 space-y-8">
            <div className="h-8 w-56 rounded bg-white/10 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-lg bg-white/5 border border-white/10 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : activeTab === 'home' && !searchQuery && selectedGenre === 'Tutti' ? (
          <div className="-mt-6 sm:-mt-10 space-y-2 sm:space-y-4">
            {/* Barra Filtri Rapidi per Genere sotto l'Hero */}
            <div className="px-4 sm:px-8 lg:px-12 pt-4 pb-2 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                <span className="text-xs font-medium text-zinc-400 mr-1 flex items-center gap-1.5 shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Esplora per genere:</span>
                </span>
                {allGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selectedGenre === genre
                        ? 'text-white shadow-sm'
                        : lightMode
                          ? 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/15'
                    }`}
                    style={
                      selectedGenre === genre
                        ? { backgroundColor: accentHex }
                        : undefined
                    }
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* RIGA 1: Tendenze del momento */}
            <ContentRow
              title="Tendenze del momento"
              subtitle="I titoli più visti questa settimana su StreamVerse"
              items={trendingRow}
              myListIds={myListIds}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
              progressMap={progressMap}
              accentHex={accentHex}
              lightMode={lightMode}
              onPlayItem={handlePlayItem}
              onOpenDetails={setSelectedModalItem}
              onToggleMyList={handleToggleMyList}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
            />

            {/* RIGA 2: Top 10 in Italia oggi (con numeri grandi stile Netflix) */}
            <ContentRow
              title="Top 10 in Italia oggi"
              subtitle="Classifica aggiornata quotidianamente"
              items={top10Row}
              myListIds={myListIds}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
              progressMap={progressMap}
              isTop10Row={true}
              accentHex={accentHex}
              lightMode={lightMode}
              onPlayItem={handlePlayItem}
              onOpenDetails={setSelectedModalItem}
              onToggleMyList={handleToggleMyList}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
            />

            {/* RIGA 3: Continua a guardare (con barra di progresso) */}
            <ContentRow
              title={`Continua a guardare per ${activeProfile.name}`}
              subtitle="Riprendi esattamente da dove avevi interrotto"
              items={continueWatchingRow}
              myListIds={myListIds}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
              progressMap={progressMap}
              isContinueWatchingRow={true}
              accentHex={accentHex}
              lightMode={lightMode}
              onPlayItem={handlePlayItem}
              onOpenDetails={setSelectedModalItem}
              onToggleMyList={handleToggleMyList}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
            />

            {/* RIGA 4: Nuove uscite */}
            <ContentRow
              title="Nuove uscite"
              subtitle="Produzioni originali e prime visioni appena aggiunte"
              items={newReleasesRow}
              myListIds={myListIds}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
              progressMap={progressMap}
              accentHex={accentHex}
              lightMode={lightMode}
              onPlayItem={handlePlayItem}
              onOpenDetails={setSelectedModalItem}
              onToggleMyList={handleToggleMyList}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
            />

            {/* RIGA 5: Consigliati per te */}
            <ContentRow
              title="Consigliati per te"
              subtitle="Selezionati in base alle tue visioni in 4K HDR"
              items={recommendedRow}
              myListIds={myListIds}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
              progressMap={progressMap}
              accentHex={accentHex}
              lightMode={lightMode}
              onPlayItem={handlePlayItem}
              onOpenDetails={setSelectedModalItem}
              onToggleMyList={handleToggleMyList}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
            />

            {/* RIGA 6: Film d'azione */}
            <ContentRow
              title="Film d'azione e adrenalina"
              subtitle="Inseguimenti, operazioni speciali e thriller ad alta tensione"
              items={actionMoviesRow}
              myListIds={myListIds}
              likedIds={likedIds}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
              progressMap={progressMap}
              accentHex={accentHex}
              lightMode={lightMode}
              onPlayItem={handlePlayItem}
              onOpenDetails={setSelectedModalItem}
              onToggleMyList={handleToggleMyList}
              onToggleLike={handleToggleLike}
              onToggleDownload={handleToggleDownload}
            />
          </div>
        ) : (
          /* ==================================================================
             5. PAGINA "LA MIA LISTA", RICERCA IN TEMPO REALE O VISTE CATEGORIA
             ================================================================== */
          <section className="pt-28 sm:pt-32 px-4 sm:px-8 lg:px-12 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  {searchQuery
                    ? `Risultati di ricerca per "${searchQuery}"`
                    : activeTab === 'lista'
                      ? 'La Mia Lista'
                      : activeTab === 'serie'
                        ? 'Serie TV Originali e Internazionali'
                        : activeTab === 'film'
                          ? 'Film in Streaming 4K'
                          : activeTab === 'novita'
                            ? 'Novità e Prime Visioni 2026'
                            : `Catalogo: ${selectedGenre}`}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 tabular-nums">
                  {filteredCatalog.length}{' '}
                  {filteredCatalog.length === 1
                    ? 'titolo disponibile'
                    : 'titoli disponibili'}{' '}
                  · Profilo {activeProfile.name}
                </p>
              </div>

              {/* Selettore Genere ed eventuale reset filtri */}
              <div className="flex items-center flex-wrap gap-2">
                {allGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selectedGenre === genre
                        ? 'text-white'
                        : lightMode
                          ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/15'
                    }`}
                    style={
                      selectedGenre === genre
                        ? { backgroundColor: accentHex }
                        : undefined
                    }
                  >
                    {genre}
                  </button>
                ))}
                {(selectedGenre !== 'Tutti' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGenre('Tutti');
                      setSearchQuery('');
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-300 bg-white/10 hover:bg-white/20 whitespace-nowrap shrink-0"
                  >
                    Reimposta filtri
                  </button>
                )}
              </div>
            </div>

            {/* Stato vuoto per "La Mia Lista" o ricerca senza risultati */}
            {filteredCatalog.length === 0 ? (
              <div
                className={`rounded-2xl border p-12 text-center max-w-lg mx-auto my-12 space-y-4 ${
                  lightMode
                    ? 'bg-white border-slate-200'
                    : 'bg-[#14141c] border-white/10'
                }`}
              >
                <div
                  className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white"
                  style={{ backgroundColor: `${accentHex}25`, color: accentHex }}
                >
                  <Bookmark className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold">
                  {activeTab === 'lista' && !searchQuery
                    ? 'Aggiungi titoli alla tua lista'
                    : 'Nessun titolo trovato'}
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {activeTab === 'lista' && !searchQuery
                    ? 'Non hai ancora salvato film o serie TV nella tua lista personale. Premi il pulsante "+" su qualsiasi locandina per ritrovarla qui.'
                    : 'Prova a cercare un altro titolo, regista, attore oppure seleziona "Tutti" i generi.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('home')}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accentHex }}
                  >
                    Esplora il Catalogo
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Griglia responsiva dei contenuti */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {filteredCatalog
                    .slice(0, visibleCatalogCount)
                    .map((item, idx) => {
                      const inList = myListIds.includes(item.id);
                      const isLiked = likedIds.includes(item.id);
                      const isDownloaded = downloadedIds.includes(item.id);
                      const isDownloading = downloadingIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedModalItem(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedModalItem(item);
                            }
                          }}
                          className={`group rounded-xl overflow-hidden border transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl cursor-pointer flex flex-col ${
                            lightMode
                              ? 'bg-white border-slate-200'
                              : 'bg-[#14141c] border-white/10'
                          }`}
                        >
                          <div className="relative aspect-video overflow-hidden">
                            <SmartMediaImage
                              src={item.immagine}
                              alt={item.titolo}
                              title={item.titolo}
                              genre={item.genere}
                              year={item.anno}
                              accentColor={item.accentColor}
                              index={idx + 1}
                              className="w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            {isDownloaded && (
                              <div className="absolute top-2.5 right-3 text-[11px] font-semibold text-emerald-400 drop-shadow">
                                OFFLINE
                              </div>
                            )}
                            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-emerald-400">
                                {item.rating}
                              </span>
                              <span className="text-[11px] text-zinc-200 tabular-nums">
                                {item.anno} · {item.durata}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400 mb-1">
                                <span>
                                  {item.tipo === 'serie' ? 'Serie TV' : 'Film'} ·{' '}
                                  {item.genere}
                                </span>
                                <span>{item.etaConsigliata}</span>
                              </div>
                              <h3 className="font-bold text-base leading-snug line-clamp-1">
                                {item.titolo}
                              </h3>
                              <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                {item.descrizione}
                              </p>
                            </div>

                            <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayItem(item);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md bg-white text-black hover:bg-zinc-200 transition-colors"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Riproduci</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleMyList(item, e)}
                                  aria-label={
                                    inList
                                      ? 'Rimuovi dalla Mia Lista'
                                      : 'Aggiungi alla Mia Lista'
                                  }
                                  title={
                                    inList
                                      ? 'Rimuovi dalla Mia Lista'
                                      : 'Aggiungi alla Mia Lista'
                                  }
                                  className={`p-1.5 rounded-md border transition-colors ${
                                    inList
                                      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                                      : 'border-white/15 text-zinc-300 hover:border-white/40'
                                  }`}
                                >
                                  {inList ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleLike(item, e)}
                                  aria-label="Mi piace"
                                  title="Mi piace"
                                  className={`p-1.5 rounded-md border transition-colors ${
                                    isLiked
                                      ? 'text-white border-transparent'
                                      : 'border-white/15 text-zinc-300 hover:border-white/40'
                                  }`}
                                  style={
                                    isLiked
                                      ? { backgroundColor: accentHex }
                                      : undefined
                                  }
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    void handleToggleDownload(item, e)
                                  }
                                  disabled={isDownloading}
                                  aria-label={
                                    isDownloaded
                                      ? `Rimuovi download offline di ${item.titolo}`
                                      : `Scarica ${item.titolo} per visione offline`
                                  }
                                  title={
                                    isDownloaded
                                      ? 'Salvato per visione offline (clicca per rimuovere)'
                                      : 'Scarica per visione offline (Cache API)'
                                  }
                                  className={`p-1.5 rounded-md border transition-colors ${
                                    isDownloaded
                                      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/15'
                                      : 'border-white/15 text-zinc-300 hover:border-white/40'
                                  }`}
                                >
                                  {isDownloading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : isDownloaded ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Paginazione / Carica altri titoli */}
                {visibleCatalogCount < filteredCatalog.length && (
                  <div className="pt-8 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleCatalogCount((prev) => prev + 12)
                      }
                      className="px-6 py-3 rounded-lg text-sm font-semibold border border-white/20 hover:bg-white/10 transition-colors tabular-nums"
                    >
                      Mostra altri titoli (
                      {filteredCatalog.length - visibleCatalogCount} rimanenti)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      {/* ====================================================================
          4. MODALE DETTAGLI CONTENUTO (Hero, Cast, Regista, Titoli Simili)
         ==================================================================== */}
      {selectedModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-movie-title"
          onClick={() => setSelectedModalItem(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto flex items-start justify-center p-4 sm:p-6 lg:p-10 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border my-auto ${
              lightMode
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#14141c] border-white/15 text-white'
            }`}
          >
            {/* Pulsante Chiudi */}
            <button
              type="button"
              onClick={() => setSelectedModalItem(null)}
              aria-label="Chiudi finestra dettagli"
              className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center border border-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Player Video Trailer Incorporato (Autoplay all'apertura della modale) */}
            <div className="relative aspect-video w-full bg-black overflow-hidden">
              {/* Fallback/Poster sottostante sempre pronto */}
              <SmartMediaImage
                src={
                  selectedModalItem.backdropImage || selectedModalItem.immagine
                }
                alt={selectedModalItem.titolo}
                title={selectedModalItem.titolo}
                genre={selectedModalItem.genere}
                year={selectedModalItem.anno}
                accentColor={selectedModalItem.accentColor}
                priority={true}
                className="w-full h-full"
              />

              {/* Video Trailer incorporato con riproduzione automatica */}
              {selectedModalItem.trailer && !modalTrailerError && (
                <video
                  key={selectedModalItem.id}
                  ref={modalVideoRef}
                  src={selectedModalItem.trailer}
                  poster={
                    selectedModalItem.backdropImage ||
                    selectedModalItem.immagine
                  }
                  autoPlay
                  loop
                  muted={modalTrailerMuted}
                  playsInline
                  onPlay={() => setModalTrailerPlaying(true)}
                  onPause={() => setModalTrailerPlaying(false)}
                  onError={() => setModalTrailerError(true)}
                  className="absolute inset-0 w-full h-full object-cover z-10"
                />
              )}

              {/* Scrim cinematografico per garantire contrasto del titolo e dei pulsanti */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#14141c] via-[#14141c]/45 to-black/25 z-20 pointer-events-none" />

              {/* Indicatore Trailer in alto a sinistra */}
              <div className="absolute top-4 left-6 z-30 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-200 bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/15">
                <Film className="w-3.5 h-3.5" style={{ color: accentHex }} />
                <span>
                  {modalTrailerPlaying
                    ? 'Trailer Ufficiale in riproduzione'
                    : 'Trailer in pausa'}
                </span>
              </div>

              <div className="absolute bottom-6 left-6 right-6 z-30 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-zinc-300">
                    <span style={{ color: accentHex }}>
                      {selectedModalItem.tipo === 'serie'
                        ? 'SERIE TV STREAMVERSE'
                        : 'FILM STREAMVERSE'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedModalItem.qualita}</span>
                  </div>
                  <h2
                    id="modal-movie-title"
                    className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight drop-shadow"
                  >
                    {selectedModalItem.titolo}
                  </h2>

                  {/* Azioni principali nella modale: Play, + Lista, Like */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handlePlayItem(selectedModalItem)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Riproduci ora</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleMyList(selectedModalItem, e)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white font-semibold text-sm border border-white/25 transition-colors"
                    >
                      {myListIds.includes(selectedModalItem.id) ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Nella Mia Lista</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Aggiungi alla Lista</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(selectedModalItem, e)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border transition-colors ${
                        likedIds.includes(selectedModalItem.id)
                          ? 'text-white border-transparent'
                          : 'bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border-white/25'
                      }`}
                      style={
                        likedIds.includes(selectedModalItem.id)
                          ? { backgroundColor: accentHex }
                          : undefined
                      }
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>
                        {likedIds.includes(selectedModalItem.id)
                          ? 'Ti piace'
                          : 'Mi piace'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) =>
                        void handleToggleDownload(selectedModalItem, e)
                      }
                      disabled={downloadingIds.includes(selectedModalItem.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border transition-colors ${
                        downloadedIds.includes(selectedModalItem.id)
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border-white/25'
                      }`}
                    >
                      {downloadingIds.includes(selectedModalItem.id) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Salvataggio...</span>
                        </>
                      ) : downloadedIds.includes(selectedModalItem.id) ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Salvato Offline</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Scarica Offline</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Controlli rapidi del Trailer Incorporato (Play/Pausa e Audio Mute/Unmute) */}
                {selectedModalItem.trailer && !modalTrailerError && (
                  <div className="flex items-center gap-2 self-end shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const v = modalVideoRef.current;
                        if (!v) return;
                        if (v.paused) {
                          void v.play().catch(() => {});
                          setModalTrailerPlaying(true);
                        } else {
                          v.pause();
                          setModalTrailerPlaying(false);
                        }
                      }}
                      aria-label={
                        modalTrailerPlaying
                          ? 'Metti in pausa il trailer'
                          : 'Riproduci il trailer'
                      }
                      title={
                        modalTrailerPlaying
                          ? 'Pausa trailer'
                          : 'Riproduci trailer'
                      }
                      className="w-10 h-10 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/30 flex items-center justify-center transition-colors backdrop-blur-md"
                    >
                      {modalTrailerPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalTrailerMuted((prev) => {
                          const next = !prev;
                          if (modalVideoRef.current) {
                            modalVideoRef.current.muted = next;
                          }
                          return next;
                        });
                      }}
                      aria-label={
                        modalTrailerMuted
                          ? 'Attiva audio del trailer'
                          : 'Disattiva audio del trailer'
                      }
                      title={
                        modalTrailerMuted
                          ? 'Attiva audio trailer'
                          : 'Disattiva audio trailer'
                      }
                      className="w-10 h-10 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/30 flex items-center justify-center transition-colors backdrop-blur-md"
                    >
                      {modalTrailerMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Corpo Dettagli: Sinossi, Metadata, Cast e Regista */}
            <div className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-zinc-300 tabular-nums">
                    <span className="font-bold text-emerald-400">
                      {selectedModalItem.rating}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedModalItem.anno}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedModalItem.durata}</span>
                    <span aria-hidden="true">·</span>
                    <span>Età {selectedModalItem.etaConsigliata}</span>
                    {selectedModalItem.episodiTotali && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{selectedModalItem.episodiTotali} Episodi</span>
                      </>
                    )}
                  </div>

                  {selectedModalItem.sottotitolo && (
                    <p className="text-sm font-semibold italic text-zinc-300">
                      “{selectedModalItem.sottotitolo}”
                    </p>
                  )}

                  <p
                    className={`text-sm sm:text-base leading-relaxed ${
                      lightMode ? 'text-slate-700' : 'text-zinc-200'
                    }`}
                  >
                    {selectedModalItem.descrizione}
                  </p>
                </div>

                {/* Colonna destra: Cast, Regia, Generi */}
                <div className="space-y-2.5 text-xs sm:text-sm border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6">
                  <div>
                    <span className="text-zinc-400">Cast: </span>
                    <span className="font-medium">
                      {selectedModalItem.cast.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Regia: </span>
                    <span className="font-medium">
                      {selectedModalItem.regista}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Generi: </span>
                    <span className="font-medium">
                      {[
                        selectedModalItem.genere,
                        ...selectedModalItem.generiSecondari,
                      ].join(' · ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Audio e Sottotitoli: </span>
                    <span className="font-medium">
                      Italiano (Dolby Atmos), Inglese, Francese
                    </span>
                  </div>
                </div>
              </div>

              {/* Suggerimenti "Titoli simili" */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-lg font-bold">Titoli simili</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {similarItems.map((sim, idx) => {
                    const simInList = myListIds.includes(sim.id);
                    const simDownloaded = downloadedIds.includes(sim.id);
                    return (
                      <div
                        key={sim.id}
                        onClick={() => setSelectedModalItem(sim)}
                        className={`rounded-xl overflow-hidden border cursor-pointer transition-transform hover:scale-[1.02] ${
                          lightMode
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-[#1b1b26] border-white/10'
                        }`}
                      >
                        <div className="relative aspect-video">
                          <SmartMediaImage
                            src={sim.immagine}
                            alt={sim.titolo}
                            title={sim.titolo}
                            genre={sim.genere}
                            year={sim.anno}
                            accentColor={sim.accentColor}
                            index={idx + 10}
                            className="w-full h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-2 left-2.5 text-[11px] font-semibold text-zinc-200 tabular-nums">
                            {sim.anno} · {sim.durata}
                          </span>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-sm truncate">
                              {sim.titolo}
                            </h4>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleToggleMyList(sim, e)}
                                aria-label="Aggiungi o rimuovi dalla lista"
                                className="w-7 h-7 rounded-full border border-white/25 flex items-center justify-center hover:border-white"
                              >
                                {simInList ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  void handleToggleDownload(sim, e)
                                }
                                aria-label={
                                  simDownloaded
                                    ? `Rimuovi download offline di ${sim.titolo}`
                                    : `Scarica ${sim.titolo} per visione offline`
                                }
                                className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                                  simDownloaded
                                    ? 'border-emerald-400 text-emerald-400 bg-emerald-500/15'
                                    : 'border-white/25 hover:border-white'
                                }`}
                              >
                                {simDownloaded ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {sim.descrizione}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          EXTRA 1: PLAYER VIDEO CON CONTROLLI CUSTOM + SYNC WATCH (WATCH PARTY)
         ==================================================================== */}
      {activePlayerItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Riproduzione di ${activePlayerItem.titolo}`}
          className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-fade-in"
        >
          {/* Barra superiore del player */}
          <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-gradient-to-b from-black/90 to-transparent">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-wider text-zinc-400">
                  Stai guardando in {activePlayerItem.qualita}
                </p>
                {syncRoom && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 tabular-nums">
                    <Radio className="w-3.5 h-3.5" />
                    <span>
                      Sync Watch attivo ({syncRoom.participants.length} online)
                    </span>
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {activePlayerItem.titolo}
                {activePlayerItem.continueWatchingEpisode
                  ? ` — ${activePlayerItem.continueWatchingEpisode}`
                  : ''}
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Pulsante Sync Watch per generare il link temporaneo o aprire la stanza */}
              <button
                type="button"
                onClick={() => setSyncPanelOpen((prev) => !prev)}
                aria-label="Apri pannello Sync Watch per guardare insieme"
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors border ${
                  syncRoom
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30'
                    : syncPanelOpen
                      ? 'bg-white text-black border-white'
                      : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>
                  {syncRoom
                    ? `Sync Watch · ${syncRoom.roomId}`
                    : 'Sync Watch (Guarda Insieme)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSyncPanelOpen(false);
                  setActivePlayerItem(null);
                }}
                aria-label="Chiudi player video"
                className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Chiudi Player</span>
              </button>
            </div>
          </div>

          {/* Area Centrale Video + Pannello laterale Sync Watch */}
          <div className="relative flex-1 flex overflow-hidden">
            {/* Viewport Video */}
            <div
              onClick={() => {
                setPlayerPlaying((prev) => {
                  const next = !prev;
                  if (videoRef.current) {
                    if (next) void videoRef.current.play().catch(() => {});
                    else videoRef.current.pause();
                  }
                  void emitSyncPlaybackUpdate({ isPlaying: next });
                  return next;
                });
              }}
              className="relative flex-1 flex items-center justify-center overflow-hidden cursor-pointer"
            >
              <video
                ref={videoRef}
                src={activePlayerItem.trailer}
                poster={
                  activePlayerItem.backdropImage || activePlayerItem.immagine
                }
                autoPlay
                loop
                muted={playerMuted}
                playsInline
                onTimeUpdate={() => {
                  if (videoRef.current && videoRef.current.duration) {
                    const pct = Math.round(
                      (videoRef.current.currentTime /
                        videoRef.current.duration) *
                        100,
                    );
                    setPlayerProgress(pct);
                  }
                }}
                className="w-full h-full object-cover opacity-90"
              />

              {!playerPlaying && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white/90 text-black flex items-center justify-center shadow-2xl">
                    <Play className="w-9 h-9 fill-current ml-1" />
                  </div>
                </div>
              )}
            </div>

            {/* Pannello Laterale Sync Watch (Generazione Link Temporaneo, Spettatori e Chat Live) */}
            {syncPanelOpen && (
              <aside
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:w-96 bg-[#111118]/95 backdrop-blur-xl border-l border-white/15 z-30 flex flex-col justify-between p-5 text-white animate-slide-in-right"
              >
                <div className="space-y-5 overflow-y-auto pr-1">
                  {/* Intestazione Sync Watch */}
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Radio
                          className="w-4 h-4"
                          style={{ color: accentHex }}
                        />
                        <h3 className="text-base font-bold">
                          Sync Watch Party
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Guarda questo titolo in perfetta sincronia con altri
                        utenti tramite un link temporaneo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSyncPanelOpen(false)}
                      aria-label="Chiudi pannello Sync Watch"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!syncRoom ? (
                    /* Stato 1: Nessuna stanza attiva -> Genera Link Temporaneo oppure Unisciti */
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Crea una nuova stanza sincronizzata
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Genera un link temporaneo (valido per 2 ore) per{' '}
                          <strong className="text-white">
                            {activePlayerItem.titolo}
                          </strong>
                          . Chiunque apra il link verrà sincronizzato
                          automaticamente al tuo secondo esatto di riproduzione.
                        </p>
                        <button
                          type="button"
                          disabled={syncLoading}
                          onClick={() => void handleCreateSyncWatchSession()}
                          className="w-full py-2.5 px-4 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-opacity hover:opacity-95 disabled:opacity-50"
                          style={{ backgroundColor: accentHex }}
                        >
                          <Link2 className="w-4 h-4" />
                          <span>
                            {syncLoading
                              ? 'Generazione link in corso...'
                              : 'Genera Link Temporaneo Sync Watch'}
                          </span>
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Hai già un codice invito?
                        </h4>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={syncJoinCodeInput}
                            onChange={(e) =>
                              setSyncJoinCodeInput(e.target.value.toUpperCase())
                            }
                            placeholder="Es. SV-8F4A2C"
                            aria-label="Inserisci codice stanza Sync Watch"
                            className="flex-1 bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-white"
                          />
                          <button
                            type="button"
                            disabled={syncLoading || !syncJoinCodeInput.trim()}
                            onClick={() =>
                              void handleJoinSyncWatchRoom(syncJoinCodeInput)
                            }
                            className="px-3.5 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 disabled:opacity-40 transition-colors shrink-0"
                          >
                            Unisciti
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Stato 2: Stanza Sync Watch Attiva -> Link Temporaneo, Lista Partecipanti, Chat Live */
                    <div className="space-y-4">
                      {/* Box Link Temporaneo Generato */}
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/15 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-400">
                            Link Temporaneo Attivo
                          </span>
                          <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                            Codice: {syncRoom.roomId}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-black/70 border border-white/15 rounded-lg p-1.5">
                          <input
                            type="text"
                            readOnly
                            value={
                              typeof window !== 'undefined'
                                ? `${window.location.origin}/?syncRoom=${syncRoom.roomId}`
                                : `https://streamverse.app/?syncRoom=${syncRoom.roomId}`
                            }
                            aria-label="Link temporaneo Sync Watch"
                            className="w-full bg-transparent text-[11px] font-mono text-zinc-200 px-2 focus:outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => void handleCopySyncLink()}
                            className="px-3 py-1.5 rounded-md bg-white text-black text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-200 transition-colors shrink-0"
                          >
                            {syncLinkCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copiato</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copia</span>
                              </>
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleNativeShareSyncLink()}
                          aria-label="Condividi link sessione Sync Watch tramite dispositivo"
                          className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 border border-white/20 hover:bg-white/15 transition-colors shadow"
                          style={{
                            backgroundColor: canUseNativeShare
                              ? accentHex
                              : 'rgba(255,255,255,0.08)',
                          }}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>
                            {canUseNativeShare
                              ? 'Condividi Link tramite Dispositivo'
                              : 'Condividi Link Sessione'}
                          </span>
                        </button>

                        <p className="text-[11px] text-zinc-400">
                          Ogni play, pausa o cambio di minuto viene sincronizzato
                          in tempo reale per tutti i partecipanti.
                        </p>
                      </div>

                      {/* Spettatori Connessi */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-300">
                            Spettatori connessi ({syncRoom.participants.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleLeaveSyncWatch()}
                            className="text-[11px] text-rose-400 hover:underline"
                          >
                            Termina / Esci
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {syncRoom.participants.map((part) => (
                            <div
                              key={part.id}
                              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs"
                            >
                              <span
                                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ backgroundColor: part.avatarColor }}
                              >
                                {part.avatarInitials}
                              </span>
                              <span className="font-medium text-zinc-200">
                                {part.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Chat sincronizzata della stanza */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat in tempo reale</span>
                        </div>
                        <div className="h-44 overflow-y-auto space-y-2 bg-black/50 rounded-xl p-3 border border-white/10 scrollbar-thin">
                          {syncRoom.messages.map((msg) => (
                            <div key={msg.id} className="text-xs leading-snug">
                              <span
                                className="font-bold mr-1.5"
                                style={{ color: msg.senderColor }}
                              >
                                {msg.senderName}:
                              </span>
                              <span className="text-zinc-200">{msg.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form di invio messaggio se la stanza è attiva */}
                {syncRoom && (
                  <form
                    onSubmit={(e) => {
                      setSyncEmojiPickerOpen(false);
                      void handleSendSyncChatMessage(e);
                    }}
                    className="relative pt-3 border-t border-white/10 flex items-center gap-2"
                  >
                    <SyncWatchEmojiPopover
                      isOpen={syncEmojiPickerOpen}
                      onOpenChange={setSyncEmojiPickerOpen}
                      inputValue={syncChatInput}
                      onInputValueChange={setSyncChatInput}
                      inputRef={syncChatInputRef}
                    />

                    <input
                      ref={syncChatInputRef}
                      type="text"
                      value={syncChatInput}
                      onChange={(e) => setSyncChatInput(e.target.value)}
                      placeholder="Scrivi un commento in diretta..."
                      aria-label="Messaggio chat Sync Watch"
                      className="flex-1 bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white"
                    />
                    <button
                      type="submit"
                      disabled={!syncChatInput.trim()}
                      aria-label="Invia messaggio"
                      className="p-2 rounded-lg text-white disabled:opacity-40 transition-opacity"
                      style={{ backgroundColor: accentHex }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </aside>
            )}
          </div>

          {/* Controlli Custom del Player */}
          <div className="relative z-20 px-6 py-5 bg-gradient-to-t from-black/95 via-black/80 to-transparent space-y-3">
            {/* Timeline interattiva */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={playerProgress}
                aria-label="Avanzamento riproduzione"
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPlayerProgress(val);
                  setProgressMap((prev) => ({
                    ...prev,
                    [activePlayerItem.id]: val,
                  }));
                  let targetTimeSec = 0;
                  if (videoRef.current && videoRef.current.duration) {
                    targetTimeSec = (val / 100) * videoRef.current.duration;
                    videoRef.current.currentTime = targetTimeSec;
                  }
                  void emitSyncPlaybackUpdate({
                    progressPercent: val,
                    currentTimeSec: targetTimeSec,
                  });
                }}
                className="w-full accent-red-600 cursor-pointer h-1.5 bg-white/30 rounded-lg"
              />
              <span className="text-xs text-zinc-300 font-mono tabular-nums w-12 text-right">
                {playerProgress}%
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPlaying((prev) => {
                      const next = !prev;
                      if (videoRef.current) {
                        if (next) void videoRef.current.play().catch(() => {});
                        else videoRef.current.pause();
                      }
                      void emitSyncPlaybackUpdate({ isPlaying: next });
                      return next;
                    });
                  }}
                  className="p-2 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors"
                  aria-label={playerPlaying ? 'Pausa' : 'Riproduci'}
                >
                  {playerPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPlayerProgress(0);
                    if (videoRef.current) videoRef.current.currentTime = 0;
                    void emitSyncPlaybackUpdate({
                      progressPercent: 0,
                      currentTimeSec: 0,
                    });
                  }}
                  aria-label="Ricomincia dall'inizio"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setPlayerMuted((m) => !m)}
                  aria-label={playerMuted ? 'Attiva audio' : 'Disattiva audio'}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {playerMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <span className="hidden sm:inline-block text-xs text-zinc-300">
                  Audio: Italiano (Dolby Atmos) · Sottotitoli: IT
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSyncPanelOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    syncRoom
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>
                    {syncRoom ? `Stanza ${syncRoom.roomId}` : 'Sync Watch'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextSpeed =
                      playerSpeed === '1x'
                        ? '1.25x'
                        : playerSpeed === '1.25x'
                          ? '1.5x'
                          : '1x';
                    setPlayerSpeed(nextSpeed);
                    const numericRate = parseFloat(nextSpeed);
                    if (videoRef.current) {
                      videoRef.current.playbackRate = numericRate;
                    }
                    void emitSyncPlaybackUpdate({ playbackRate: numericRate });
                  }}
                  className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-mono text-white tabular-nums"
                >
                  Velocità {playerSpeed}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          EXTRA 2: SEZIONE PROFILI MULTIPLI ("Chi sta guardando?")
         ==================================================================== */}
      {profileGateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chi sta guardando StreamVerse?"
          className="fixed inset-0 z-50 bg-[#0b0b0f]/98 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in"
        >
          <div className="max-w-3xl w-full text-center space-y-8">
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
              Chi sta guardando?
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {STREAMVERSE_PROFILES.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => {
                    setActiveProfile(prof);
                    setProfileGateOpen(false);
                    showToast(`Bentornato su StreamVerse, ${prof.name}`, 'success');
                  }}
                  className="group flex flex-col items-center gap-3 focus:outline-none"
                >
                  <div
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl flex items-center justify-center text-2xl sm:text-4xl font-display font-black text-white shadow-xl border-2 border-transparent group-hover:border-white group-hover:scale-105 transition-all"
                    style={{ backgroundColor: prof.avatarColor }}
                  >
                    {prof.avatarInitials}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm sm:text-base font-semibold text-zinc-200 group-hover:text-white">
                      {prof.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {prof.maturityLevel}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => setProfileGateOpen(false)}
                className="px-6 py-2.5 rounded-lg border border-white/25 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white hover:border-white transition-colors"
              >
                Continua come {activeProfile.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          5B. SEZIONE SEMANTICA SEO, GEO (AI SEARCH) & SICUREZZA (FAQ + DATI STRUTTURATI)
         ==================================================================== */}
      <section
        aria-labelledby="streamverse-seo-geo-heading"
        className={`border-t transition-colors ${
          lightMode
            ? 'bg-slate-50 border-slate-200 text-slate-800'
            : 'bg-[#0d0d14] border-white/10 text-zinc-200'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-12 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-6">
            <div className="space-y-2 max-w-3xl">
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: accentHex }}
              >
                Architettura Sicura · SEO Schema.org · GEO Ready
              </p>
              <h2
                id="streamverse-seo-geo-heading"
                className="font-display font-bold text-2xl sm:text-3xl tracking-tight"
              >
                Streaming 4K Sicuro, Visione Sincronizzata e Risposte Rapide
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                StreamVerse integra protezione anti-XSS, Content-Security-Policy
                (CSP), caching offline tramite Service Worker e metadati
                strutturati JSON-LD per motori di ricerca tradizionali e motori
                generativi (<code className="font-mono text-zinc-300">/llms.txt</code>).
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left shrink-0">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-zinc-400">Catalogo 4K HDR</p>
                <p className="text-base font-bold tabular-nums mt-0.5">
                  36 Titoli Originali
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-zinc-400">Sicurezza HTTP</p>
                <p className="text-base font-bold mt-0.5">CSP + Anti-XSS</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-zinc-400">Watch Party</p>
                <p className="text-base font-bold mt-0.5">Sync Watch SSE</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-zinc-400">Offline PWA</p>
                <p className="text-base font-bold mt-0.5">Cache API v1</p>
              </div>
            </div>
          </div>

          {/* Griglia FAQ strutturate per SEO (FAQPage Schema.org) e GEO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {STREAMVERSE_GEO_FAQS.map((faq) => (
              <article
                key={faq.question}
                className={`p-5 rounded-xl border space-y-2 ${
                  lightMode
                    ? 'bg-white border-slate-200'
                    : 'bg-[#13131c] border-white/10'
                }`}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: accentHex }}
                >
                  {faq.category}
                </span>
                <h3 className="text-sm font-bold leading-snug">
                  {faq.question}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. FOOTER COMPLETO (Link Informativi, Social, Copyright)
         ==================================================================== */}
      <footer
        className={`border-t transition-colors ${
          lightMode
            ? 'bg-slate-100 border-slate-200 text-slate-600'
            : 'bg-[#08080c] border-white/10 text-zinc-400'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-12 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span
                className="font-display font-black text-2xl tracking-wider uppercase"
                style={{ color: accentHex }}
              >
                STREAMVERSE
              </span>
              <p className="text-xs text-zinc-500 mt-1">
                Piattaforma cinema e serie TV on-demand in 4K HDR Dolby Vision.
              </p>
            </div>

            {/* Social links funzionali */}
            <div className="flex items-center gap-3">
              {[
                { label: 'Instagram', href: '#instagram' },
                { label: 'YouTube', href: '#youtube' },
                { label: 'X / Twitter', href: '#twitter' },
              ].map((soc) => (
                <button
                  key={soc.label}
                  type="button"
                  onClick={() =>
                    showToast(
                      `Canale ufficiale ${soc.label} @StreamVerseItalia`,
                      'info',
                    )
                  }
                  className="px-3 py-1.5 rounded-md text-xs font-medium border border-white/10 hover:border-white/30 hover:text-white transition-colors"
                >
                  {soc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Link obbligatori: Chi siamo, Lavora con noi, Privacy, Termini, Assistenza */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs">
            {[
              {
                key: 'chi-siamo',
                label: 'Chi siamo',
                content:
                  'StreamVerse è la piattaforma europea di streaming cinematografico ad alta fedeltà visiva e sonora, con produzioni originali in 4K HDR10+ e Dolby Atmos.',
              },
              {
                key: 'lavora-con-noi',
                label: 'Lavora con noi',
                content:
                  'Posizioni aperte nei team di Ingegneria Video, Produzione Originale a Milano e Roma, e Sound Design Cinematografico.',
              },
              {
                key: 'privacy',
                label: 'Privacy',
                content:
                  'Le tue preferenze di visione e La Mia Lista sono salvate localmente nel tuo browser in totale conformità GDPR.',
              },
              {
                key: 'termini',
                label: 'Termini di utilizzo',
                content:
                  'Abbonamento flessibile senza vincoli, streaming simultaneo fino a 4 profili in Ultra HD e download offline.',
              },
              {
                key: 'assistenza',
                label: 'Centro Assistenza',
                content:
                  'Supporto attivo 24/7 per configurazione Smart TV, calibrazione HDR, gestione profili familiari e controllo parentale.',
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setFooterInfoSection(
                    footerInfoSection === item.key ? null : item.key,
                  )
                }
                className="text-left hover:underline font-medium py-1"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Pannello informativo espandibile al click sui link del footer */}
          {footerInfoSection && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start justify-between gap-4 ${
                lightMode
                  ? 'bg-white border-slate-200 text-slate-700'
                  : 'bg-white/5 border-white/10 text-zinc-300'
              }`}
            >
              <div>
                <p className="font-bold uppercase tracking-wider mb-1 text-white">
                  {footerInfoSection.replace(/-/g, ' ')}
                </p>
                <p>
                  {footerInfoSection === 'chi-siamo' &&
                    'StreamVerse distribuisce cinema d’autore, grandi produzioni sci-fi e serie thriller originali in tutta Europa con streaming adattivo a bassa latenza.'}
                  {footerInfoSection === 'lavora-con-noi' &&
                    'Cerchiamo Senior Frontend Engineers, Colorist HDR e Creative Producers nelle sedi di Milano, Roma e Zurigo.'}
                  {footerInfoSection === 'privacy' &&
                    'Informativa sulla Privacy: StreamVerse tutela i tuoi dati personali e utilizza archiviazione locale cifrata per memorizzare La Mia Lista e i progressi di visione.'}
                  {footerInfoSection === 'termini' &&
                    'Termini di Servizio StreamVerse 2026: visione illimitata su tutti i dispositivi compatibili senza interruzioni pubblicitarie.'}
                  {footerInfoSection === 'assistenza' &&
                    'Centro Assistenza StreamVerse: premi "?" o utilizza la barra di ricerca in alto per filtrare istantaneamente i 36 titoli del catalogo.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFooterInfoSection(null)}
                aria-label="Chiudi informativa"
                className="p-1 hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
            <p>© 2026 StreamVerse Entertainment S.r.l. Tutti i diritti riservati.</p>
            <p className="tabular-nums">
              Catalogo attivo: 36 titoli · Qualità 4K Ultra HD · Dolby Atmos
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
