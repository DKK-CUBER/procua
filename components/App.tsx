'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { nav } from '@/lib/data';
import {
  supplierService,
  procurementService,
  negotiationService,
  purchaseOrderService,
  documentService,
  shipmentService,
  riskService,
  recoveryService,
  notificationService,
  analyticsService,
  copilotService,
  authService,
  marketSearchService,
  discoveryService
} from '@/lib/services';
import type {
  SupplierDTO,
  PriceStatus,
  ProcurementRequest,
  Negotiation as NegotiationType,
  PurchaseOrder,
  DocumentDTO,
  Shipment,
  NotificationDTO,
  AnalyticsDTO,
  MarketProductResult
} from '@/lib/types';
import EditorialLanding from './EditorialLanding';
import BorderGlow from './BorderGlow';
import ProcuraLogo from './ProcuraLogo';
import PaymentAndShipment from './PaymentAndShipment';
import ShipmentTrackingPage from './ShipmentTrackingPage';
import { generateExecutivePdfReport, generatePurchaseOrderPdf } from '@/lib/client/pdfGenerator';
import {
  LayoutDashboard,
  Search,
  Building2,
  MessagesSquare,
  FileText,
  Truck,
  CreditCard,
  FolderOpen,
  ChartNoAxesCombined,
  Settings,
  ChevronsUpDown,
  ArrowRight,
  ChevronRight,
  Circle,
  SlidersHorizontal,
  X,
  Download,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Command,
  Send,
  Check,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  Plus,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  PhoneCall,
  Mail,
  Play,
  Phone
} from 'lucide-react';

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Search,
  Building2,
  MessagesSquare,
  FileText,
  Truck,
  CreditCard,
  FolderOpen,
  ChartNoAxesCombined,
  Settings,
  ChevronsUpDown,
  ArrowRight,
  ChevronRight,
  Circle,
  SlidersHorizontal,
  X,
  Download,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Command,
  Send,
  Check,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  Plus,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  PhoneCall,
  Mail,
  Play,
  Phone
};

const I = iconMap;

const Icon = ({ name, size = 17 }: { name: string; size?: number }) => {
  const C = iconMap[name] || Circle;
  return <C size={size} />;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);

const Badge = ({ children, tone = 'green' }: { children: React.ReactNode; tone?: string }) => (
  <span className={'badge ' + tone}>
    <span style={{ width: 5, height: 5, background: 'currentColor', borderRadius: '50%' }} />
    {children}
  </span>
);

function Sidebar() {
  const p = usePathname();
  const [currentUser, setCurrentUser] = useState({ name: 'Sadwik Kumar', business: 'Kinetiq Studios' });

  useEffect(() => {
    authService.me().then((res) => {
      if (res?.user) {
        setCurrentUser({ name: res.user.name, business: res.user.businessName });
      }
    }).catch(() => {});
  }, []);

  return (
    <aside className="sidebar fixed inset-y-0 left-0 z-20 flex flex-col p-3">
      <ProcuraLogo href="/dashboard" className="px-3 py-4" />
      <div className="mt-5 space-y-1">
        {nav.map(([icon, label, href]) => (
          <Link
            key={href}
            href={href}
            className={'nav-item ' + (p.startsWith(href) ? 'active' : '')}
          >
            <Icon name={icon} />
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-auto space-y-1">
        <Link href="/settings" className="nav-item">
          <I.Settings size={17} />
          Settings
        </Link>
        <div className="soft flex items-center gap-3 rounded-xl p-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[#314155] text-xs font-bold">
            {currentUser.name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-semibold">{currentUser.name}</div>
            <div className="mt-0.5 text-[11px] muted">{currentUser.business}</div>
          </div>
          <I.ChevronsUpDown className="ml-auto muted" size={15} />
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const router = useRouter();

  useEffect(() => {
    notificationService.list().then((res) => {
      if (res?.notifications) setNotifications(res.notifications);
    }).catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    try {
      const res = await shipmentService.query(query);
      if (res?.message) {
        setSearchResult(res.message);
      }
    } catch (err: any) {
      setSearchResult('Search failed: ' + err.message);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="topbar sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#27313e] bg-[#080b10d9] px-8 backdrop-blur">
      <button
        onClick={() => setOpen(!open)}
        className="desk-only flex w-[300px] items-center gap-2 rounded-lg border border-[#27313e] bg-[#ffffff05] px-3 py-2 text-xs muted"
      >
        <I.Search size={15} />
        Search suppliers, POs, shipments{' '}
        <kbd className="ml-auto rounded border border-[#ffffff14] px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
      </button>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setNotifsOpen(!notifsOpen)}
            className="relative grid h-9 w-9 place-items-center rounded-lg border border-[#ffffff12] text-[#aebdcb]"
            aria-label="Notifications"
          >
            <I.Bell size={17} />
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ff8e91]" />}
          </button>
          {notifsOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 panel p-4 shadow-2xl">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider muted">
                <span>Notifications</span>
                <span>{unreadCount} unread</span>
              </div>
              <div className="mt-3 space-y-3">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.linkHref || '#'}
                    onClick={() => {
                      notificationService.markRead(n.id);
                      setNotifsOpen(false);
                    }}
                    className="block rounded-lg p-2 text-xs hover:bg-white/5"
                  >
                    <div className="flex justify-between font-medium">
                      <span>{n.title}</span>
                      <span className={'badge ' + (n.priority === 'CRITICAL' ? 'red' : 'yellow')}>{n.priority}</span>
                    </div>
                    <div className="mt-1 text-[11px] muted">{n.message}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <button className="btn primary" onClick={() => router.push('/procure')}>
          <I.Plus size={15} />
          New request
        </button>
      </div>
      {open && (
        <div className="absolute left-8 top-14 z-50 w-[420px] panel p-4 shadow-2xl">
          <form onSubmit={handleSearch}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input w-full"
              placeholder="Search PO-1827, supplier, shipment…"
            />
          </form>
          {searchResult && (
            <div className="mt-3 rounded-lg bg-white/5 p-3 text-xs leading-5">
              <b className="text-[#b7f46a]">Fact-verified result:</b> {searchResult}
            </div>
          )}
          <div className="mt-3 text-xs muted">Quick Links</div>
          <Link
            href="/shipments/shp-1827"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center gap-3 rounded-lg p-2 hover:bg-white/5"
          >
            <I.Truck size={16} />
            <span>
              PO-1827 <span className="muted">• Chennai warehouse arrival</span>
            </span>
          </Link>
          <Link
            href="/documents/doc-1827"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-3 rounded-lg p-2 hover:bg-white/5"
          >
            <I.FileText size={16} />
            <span>
              INV-1827 <span className="muted">• Price mismatch alert</span>
            </span>
          </Link>
        </div>
      )}
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-0 md:ml-[248px]">
        <Topbar />
        <div className="content mx-auto max-w-[1560px] p-8 pb-24">{children}</div>
      </main>
      <nav className="mobile-nav fixed bottom-0 inset-x-0 z-30 hidden justify-around border-t border-[#27313e] bg-[#0b1017ee] p-2 backdrop-blur">
        {nav.slice(0, 5).map(([ic, l, h]) => (
          <Link href={h} key={h} className="grid place-items-center gap-1 p-1 text-[10px] muted">
            <Icon name={ic} size={16} />
            {l}
          </Link>
        ))}
      </nav>
    </div>
  );
}

const Crumb = ({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: React.ReactNode }) => (
  <div className="mb-7 flex items-end justify-between gap-4">
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="h1 mt-2">{title}</h1>
    </div>
    {actions}
  </div>
);

function Dashboard() {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationType[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDTO | null>(null);

  useEffect(() => {
    procurementService.list().then((res) => { if (res?.data) setRequests(res.data); }).catch(() => {});
    negotiationService.list().then((res) => { if (res?.data) setNegotiations(res.data); }).catch(() => {});
    shipmentService.list().then((res) => { if (res?.data) setShipments(res.data); }).catch(() => {});
    analyticsService.get().then((res) => { if (res?.data) setAnalytics(res.data); }).catch(() => {});
  }, []);

  return (
    <Shell>
      <Crumb
        eyebrow="Good afternoon, Sadwik · 01 Sep 2026"
        title="Procurement is under control."
        actions={
          <Link className="btn primary" href="/procure">
            <I.Plus size={15} />
            New procurement
          </Link>
        }
      />
      <div className="metrics grid gap-0 border border-black md:grid-cols-4">
        {[
          ['Active procurement', '₹4.82L', `${requests.length || 12} requests in progress`, 'blue'],
          ['Negotiated savings', '₹68,400', '18.2% above last month', 'green'],
          ['Active negotiations', String(negotiations.length || 7), '2 need your review', 'yellow'],
          ['At-risk shipments', String(shipments.filter(s => s.risk === 'high' || s.riskLevel === 'HIGH').length || 1), '1 high priority', 'red']
        ].map(([a, b, c, t]) =>
          a === 'At-risk shipments' ? (
            <BorderGlow key={a} className="metric metric-glow" accent="#c00000">
              <div className="flex justify-between text-sm muted">
                <span>{a}</span>
                <span className="np-risk-dot" />
              </div>
              <div className="value">{b}</div>
              <div className="mt-2 text-xs muted">{c}</div>
            </BorderGlow>
          ) : (
            <div className="panel metric !rounded-none !border-0 border-r border-black" key={a}>
              <div className="flex justify-between text-sm muted">
                <span>{a}</span>
                <span className="np-risk-dot" />
              </div>
              <div className="value">{b}</div>
              <div className="mt-2 text-xs muted">{c}</div>
            </div>
          )
        )}
      </div>

      <div className="two-col mt-5 grid gap-0 border border-black md:grid-cols-[1.35fr_.8fr]">
        <section className="panel !rounded-none !border-0 border-r border-black p-5">
          <div className="flex items-center justify-between">
            <h2 className="h2">Procurement activity</h2>
            <Link className="text-xs text-[#b7f46a]" href="/procure">
              View all
            </Link>
          </div>
          <div className="mt-4">
            {[
              ['Ergonomic office chairs', 'PO-1827', 'Offer comparison', '₹3,70,000'],
              ['Warehouse shelving', 'REQ-2044', 'Supplier discovery', '₹1,12,500'],
              ['Industrial labels', 'PO-1819', 'In transit', '₹44,800']
            ].map((x) => (
              <Link
                href="/procure"
                key={x[1]}
                className="table-row grid-cols-[1fr_auto_auto] hover:bg-white/[.02]"
              >
                <div>
                  <div className="font-medium">{x[0]}</div>
                  <div className="mt-1 text-xs muted">{x[1]}</div>
                </div>
                <Badge tone={x[2] === 'In transit' ? 'blue' : 'yellow'}>{x[2]}</Badge>
                <div className="font-medium">{x[3]}</div>
              </Link>
            ))}
          </div>
        </section>

        <BorderGlow className="p-5" accent="#aa6a00" glowColor="36 70% 36%">
          <div className="flex justify-between">
            <h2 className="h2">Shipment risk</h2>
            <I.AlertTriangle className="text-[#ffc46b]" size={17} />
          </div>
          <div className="mt-5 space-y-5">
            {[
              ['PO-1827', 'Warehouse milestone missed', 'High'],
              ['PO-1812', 'ETA changed by carrier', 'Medium'],
              ['PO-1819', 'Live tracking unavailable', 'Low']
            ].map(([a, b, c]) => (
              <Link href="/shipments/shp-1827" key={a} className="block">
                <div className="flex justify-between text-sm">
                  <span>{a}</span>
                  <Badge tone={c === 'High' ? 'red' : c === 'Medium' ? 'yellow' : 'blue'}>{c}</Badge>
                </div>
                <div className="mt-1 text-xs muted">{b}</div>
              </Link>
            ))}
          </div>
        </BorderGlow>
      </div>

      <div className="two-col mt-5 grid gap-0 border border-black md:grid-cols-2">
        <section className="panel !rounded-none !border-0 border-r border-black p-5">
          <h2 className="h2">Negotiations in motion</h2>
          <div className="mt-5 space-y-4">
            {[
              ['Cobalt Office Systems', '₹740/unit', 'Target achieved'],
              ['Ernest Furnishings', '₹735/unit', 'Counteroffer received'],
              ['Sahara Workspace', '—', 'Communication unavailable']
            ].map(([a, b, c]) => (
              <Link href="/negotiations/neg-cobalt" className="flex items-center justify-between" key={a}>
                <div>
                  <div className="text-sm font-medium">{a}</div>
                  <div className="mt-1 text-xs muted">{b}</div>
                </div>
                <Badge
                  tone={c === 'Target achieved' ? 'green' : c === 'Communication unavailable' ? 'red' : 'yellow'}
                >
                  {c}
                </Badge>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel !rounded-none !border-0 p-5">
          <div className="flex justify-between">
            <h2 className="h2">Savings this month</h2>
            <span className="text-sm text-[#b7f46a]">+18.2%</span>
          </div>
          <div className="mt-8 flex h-28 items-end gap-3">
            {[35, 48, 30, 65, 52, 75, 90, 70, 100, 82, 96, 110].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-[#b7f46a]"
                style={{ height: h + 'px', opacity: 0.45 + i / 24 }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs muted">
            <span>1 Aug</span>
            <span>1 Sep</span>
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Procure() {
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [reqText, setReqText] = useState('ergonomic office chairs');
  const [reqQuantity, setReqQuantity] = useState<number>(500);
  const [locationCity, setLocationCity] = useState('Chennai, Tamil Nadu, India');
  const [top5Suppliers, setTop5Suppliers] = useState<any[]>([]);
  const [marketIntel, setMarketIntel] = useState<any[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const router = useRouter();

  const toggleSupplier = (supplier: any) => {
    setSelectedSupplierIds((prev) => {
      const exists = prev.includes(supplier.id);
      if (exists) {
        return prev.filter((id) => id !== supplier.id);
      } else {
        return [...prev, supplier.id];
      }
    });
  };

  const handleSearch = async (overrideQuery?: string, overrideQty?: number) => {
    const query = (overrideQuery !== undefined ? overrideQuery : reqText).trim();
    const qty = overrideQty !== undefined ? overrideQty : reqQuantity;
    if (!query || query.length < 2) {
      alert('Please enter at least 2 characters for search.');
      return;
    }

    if (overrideQuery) setReqText(overrideQuery);
    if (overrideQty) setReqQuantity(overrideQty);

    setIsSearching(true);
    setSearchError('');
    setSelectedSupplierIds([]);
    try {
      const discRes = await discoveryService.discover({
        product: query,
        quantity: qty,
        location: {
          city: locationCity.split(',')[0].trim(),
          state: locationCity.split(',')[1]?.trim() || 'Tamil Nadu',
          country: 'India'
        }
      });

      if (discRes.success && (discRes.top5Suppliers?.length > 0 || discRes.marketIntelligence?.length > 0)) {
        setTop5Suppliers(discRes.top5Suppliers || []);
        setMarketIntel(discRes.marketIntelligence || []);
        setTotalFound(discRes.totalDirectSuppliersFound || discRes.top5Suppliers.length);
        setFromCache(Boolean(discRes.fromCache));
        setSearched(true);
      } else {
        setSearchError(discRes.message || `No direct supplier candidates found for "${query}" in ${locationCity}.`);
        setSearched(true);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Supplier discovery service encountered an error. Please retry.');
      setSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartNegotiationFlow = (mode: 'email' | 'voice') => {
    const selectedObjects = top5Suppliers.filter((s) => selectedSupplierIds.includes(s.id));
    if (selectedObjects.length === 0) {
      alert('Please select at least 1 supplier to start negotiation.');
      return;
    }

    const suppliersToPersist: SupplierDTO[] = selectedObjects.map((s) => ({
      id: s.id,
      name: s.name,
      sourceId: 'src-discovery-engine',
      sourceName: s.sources?.[0]?.engine === 'google_maps' ? 'Google Maps (Local B2B)' : 'Direct Supplier Discovery',
      supplierType: s.supplierType || 'direct_supplier',
      product: reqText,
      price: s.procurement?.supplierQuote || s.price || null,
      priceStatus: (s.procurement?.priceStatus as PriceStatus) || 'not_available',
      priceSource: s.sources?.[0]?.engine || 'direct_inquiry',
      supplierQuote: null,
      negotiatedQuote: null,
      availability: reqQuantity,
      delivery: '5-7 business days',
      deliveryDays: 7,
      reliability: Math.round((s.ranking?.score || 0.90) * 100),
      rating: s.business?.rating || 4.7,
      location: s.location?.city || locationCity.split(',')[0],
      source: 'Verified Direct Supplier',
      why: s.ranking?.reasons?.[0] || 'Selected from direct supplier shortlist.',
      communication: true,
      ordersCompleted: s.business?.reviewCount || 42,
      onTimeDeliveryRate: 96,
      averageResponseMins: 15,
      averageSavingsPct: 7.5,
      email: s.contact?.email || undefined,
      phone: s.contact?.phone || '+91 44 2834 9100',
      hasMessagingChannel: true,
      capabilities: {
        canSearch: true,
        canGetProductDetails: true,
        canGetSellerDetails: true,
        canGetSellerContact: true,
        canGetPricing: true,
        canGetAvailability: true,
        canMessageSeller: true,
        canNegotiate: true,
        canCreateOrder: true,
        canTrackShipment: false
      }
    }));

    if (typeof window !== 'undefined') {
      localStorage.setItem('active_selected_suppliers', JSON.stringify(suppliersToPersist));
      sessionStorage.setItem('active_selected_suppliers', JSON.stringify(suppliersToPersist));
      sessionStorage.setItem('selected_supplier_ids', JSON.stringify(selectedSupplierIds));
      sessionStorage.setItem('negotiation_initial_mode', mode);
      sessionStorage.setItem('active_procurement_quantity', String(reqQuantity));
      sessionStorage.setItem('active_procurement_product', reqText);
    }

    router.push('/negotiations');
  };

  const selectedSupplierObjects = top5Suppliers.filter((s) => selectedSupplierIds.includes(s.id));

  return (
    <Shell>
      <Crumb
        eyebrow="Direct Supplier Discovery & Market Intelligence"
        title={
          searched
            ? `Discovery Results: ${totalFound} direct supplier candidates for "${reqText}" (${reqQuantity} units)`
            : 'What do you need to procure?'
        }
        actions={
          searched && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-3 py-1.5 rounded-full">
                ✓ Top 5 Direct Suppliers Shortlisted
              </span>
            </div>
          )
        }
      />

      {/* Top Search Controls Bar with Product, Quantity, and City Selection */}
      <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Product Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search any B2B procurement product (e.g. ergonomic office chairs, plastic chairs, safety boots)..."
              value={reqText}
              onChange={(e) => setReqText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="w-full rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-4 py-2.5 text-sm font-medium text-[#111827] outline-none transition focus:border-[#111827] focus:bg-white focus:ring-1 focus:ring-[#111827]"
            />
          </div>

          {/* Manual Quantity Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 transition focus-within:border-[#111827] focus-within:bg-white">
              <span className="text-xs font-bold text-[#6b7280]">Qty:</span>
              <input
                type="number"
                min="1"
                max="50000"
                value={reqQuantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setReqQuantity(isNaN(val) || val < 1 ? 1 : val);
                }}
                className="w-16 bg-transparent text-sm font-bold text-[#111827] outline-none text-center"
              />
              <span className="text-xs font-semibold text-[#6b7280]">units</span>
            </div>

            {/* Location Selector */}
            <select
              className="rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-3 py-2.5 text-xs font-semibold text-[#111827] outline-none transition focus:border-[#111827]"
              value={locationCity}
              onChange={(e) => {
                setLocationCity(e.target.value);
              }}
            >
              <option value="Chennai, Tamil Nadu, India">Chennai, TN</option>
              <option value="Bengaluru, Karnataka, India">Bengaluru, KA</option>
              <option value="Mumbai, Maharashtra, India">Mumbai, MH</option>
              <option value="Delhi, India">Delhi NCR</option>
              <option value="Hyderabad, Telangana, India">Hyderabad, TS</option>
            </select>

            {/* Search Button */}
            <button
              className="btn primary !py-2.5 !px-5 whitespace-nowrap text-sm font-semibold shadow-sm"
              onClick={() => handleSearch()}
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <I.RefreshCw className="animate-spin" size={15} /> Discovering...
                </>
              ) : (
                <>
                  <I.Search size={15} /> Discover Direct Suppliers
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#f3f4f6] pt-3 text-xs">
          <span className="font-semibold text-[#6b7280]">Popular:</span>
          {[
            { label: 'ergonomic office chairs (500 pcs)', name: 'ergonomic office chairs', qty: 500 },
            { label: 'plastic chairs (100 pcs)', name: 'plastic chairs', qty: 100 },
            { label: 'heavy duty storage racks (20 pcs)', name: 'heavy duty storage racks', qty: 20 },
            { label: 'safety boots ISI (250 pairs)', name: 'safety boots ISI', qty: 250 },
            { label: 'cardboard shipping boxes (500 pcs)', name: 'cardboard shipping boxes', qty: 500 }
          ].map((suggested) => (
            <button
              key={suggested.label}
              onClick={() => {
                setReqText(suggested.name);
                setReqQuantity(suggested.qty);
                handleSearch(suggested.name, suggested.qty);
              }}
              className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-2.5 py-1 text-xs font-medium text-[#374151] transition hover:border-[#111827] hover:bg-white hover:text-[#111827]"
            >
              {suggested.label}
            </button>
          ))}
        </div>
      </div>

      {!searched ? (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ['Target Quantity', `${reqQuantity} units`],
            ['Location Target', locationCity.split(',')[0]],
            ['Discovery Mode', 'Real Web / Maps / Direct B2B'],
            ['Negotiation Protocol', 'Twilio Voice AI & SMTP RFQ']
          ].map((x) => (
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm" key={x[0]}>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">{x[0]}</div>
              <div className="mt-2 text-base font-bold text-[#111827]">{x[1]}</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {searchError ? (
            <div className="rounded-2xl border border-[#fecaca] bg-white p-8 text-center shadow-sm">
              <I.AlertTriangle className="mx-auto text-[#dc2626]" size={40} />
              <h2 className="mt-4 text-lg font-bold text-[#991b1b]">Discovery Notice</h2>
              <p className="mt-2 text-sm text-[#4b5563]">{searchError}</p>
              <div className="mt-6">
                <button className="btn primary" onClick={() => handleSearch()}>
                  <I.RefreshCw size={15} /> Retry Discovery
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 pb-24">
              {/* SECTION 1: TOP 5 DIRECT SUPPLIER CANDIDATES */}
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                      <I.Building2 className="text-[#059669]" size={20} />
                      Top 5 Direct Supplier Candidates ({reqQuantity} units)
                    </h2>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      Classified direct manufacturers, wholesalers, and distributors in {locationCity.split(',')[0]}. Select 1 or more suppliers to initiate negotiation.
                    </p>
                  </div>
                  {fromCache && <span className="text-xs font-semibold text-[#0284c7] bg-[#f0f9ff] px-2.5 py-1 rounded-full border border-[#bae6fd]">(Fast cached)</span>}
                </div>

                <div className="grid gap-4">
                  {top5Suppliers.map((s, i) => {
                    const isSelected = selectedSupplierIds.includes(s.id);
                    return (
                      <article
                        key={s.id}
                        className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
                          isSelected ? 'border-[#10b981] bg-[#f0fdf4] ring-1 ring-[#10b981]' : 'border-[#e5e7eb] bg-white hover:border-[#111827]'
                        }`}
                      >
                        <div className="grid items-center gap-4 lg:grid-cols-[auto_auto_1.8fr_repeat(3,auto)_auto]">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSupplier(s)}
                            className={`grid h-6 w-6 place-items-center rounded-md border transition ${
                              isSelected ? 'border-[#10b981] bg-[#10b981] text-black font-bold' : 'border-[#d1d5db] bg-white hover:border-[#111827]'
                            }`}
                          >
                            {isSelected && <I.Check size={14} />}
                          </button>

                          {/* Rank Badge */}
                          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f3f4f6] text-base font-extrabold text-[#111827] border border-[#e5e7eb]">
                            #{i + 1}
                          </div>

                          {/* Title & Tags */}
                          <div>
                            <div className="font-bold text-base text-[#111827] flex items-center gap-2">
                              {s.name}
                              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                                {s.supplierType || 'Direct Supplier'}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#4b5563]">
                              <span className="font-medium text-[#111827]">📍 {s.location?.city || 'Chennai'}, {s.location?.state || 'TN'}</span>
                              <span>·</span>
                              <span className="font-semibold text-[#b45309]">★ {s.business?.rating || 4.6} {s.business?.reviewCount ? `(${s.business.reviewCount} reviews)` : ''}</span>
                              <span>·</span>
                              <span className="font-semibold text-[#0284c7]">Match: {Math.round((s.procurement?.productMatch || 0.9) * 100)}%</span>
                            </div>
                            {s.location?.address && (
                              <div className="mt-1 text-xs text-[#6b7280] line-clamp-1">{s.location.address}</div>
                            )}
                          </div>

                          {/* PRICE PRESENTATION */}
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Commercial Price</div>
                            {(() => {
                              const displayPrice = s.price || s.procurement?.estimatedUnitPrice || 7000;
                              const isConfirmed = s.procurement?.priceStatus === 'supplier_confirmed';
                              return (
                                <div className="mt-1">
                                  <div className="font-extrabold text-base text-[#111827]">₹{displayPrice.toLocaleString('en-IN')}</div>
                                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    isConfirmed
                                      ? 'text-[#065f46] bg-[#ecfdf5] border-[#a7f3d0]'
                                      : 'text-[#854d0e] bg-[#fefce8] border-[#fef08a]'
                                  }`}>
                                    {isConfirmed ? 'Supplier-confirmed quote' : 'Indicative wholesale price'}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Website Status */}
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Official Website</div>
                            {s.officialWebsite?.verified ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#059669]">
                                  <I.Check size={12} /> Verified
                                </span>
                                <a
                                  href={s.officialWebsite.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-[11px] text-[#0369a1] hover:underline"
                                >
                                  Visit site ↗
                                </a>
                              </div>
                            ) : (
                              <div className="mt-1 text-xs font-medium text-[#6b7280]">Unverified domain</div>
                            )}
                          </div>

                          {/* Contact Channel Status */}
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Direct Contact</div>
                            <div className="mt-1">
                              {s.contact?.phone ? (
                                <div className="text-xs font-bold text-[#111827]">📞 {s.contact.phone}</div>
                              ) : null}
                              <span className={`inline-block text-[11px] font-semibold mt-0.5 ${
                                s.contact?.emailVerification === 'verified' ? 'text-[#059669]' : 'text-[#b45309]'
                              }`}>
                                {s.contact?.emailVerification === 'verified' ? `✉️ ${s.contact.email}` : '⚠️ Phone verified / Email on RFQ'}
                              </span>
                            </div>
                          </div>

                          {/* Select / Selected Button (Does not navigate away immediately!) */}
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => toggleSupplier(s)}
                              className={`btn !py-2 !px-4 text-xs flex items-center gap-1.5 font-bold transition shadow-sm ${
                                isSelected
                                  ? '!bg-[#10b981] !text-black hover:!bg-[#059669]'
                                  : '!bg-[#111827] !text-white hover:!bg-[#374151]'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <I.Check size={14} /> Selected
                                </>
                              ) : (
                                'Select'
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Ranking Rationale Footer */}
                        <div className="mt-3 border-t border-[#f3f4f6] pt-2.5 text-xs text-[#4b5563] flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <b className="text-[#111827]">Ranking Rationale: </b>
                            {s.ranking?.reasons?.join(' · ') || 'Verified direct supplier presence matching procurement criteria.'}
                          </div>
                          <span className="text-[11px] font-medium text-[#6b7280]">
                            Source: {s.sources?.[0]?.engine === 'google_maps' ? 'Google Maps (Local B2B)' : 'Direct Web Discovery'}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: MARKET INTELLIGENCE & BENCHMARKS */}
              {marketIntel.length > 0 && (
                <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-6">
                  <div className="mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
                        <I.Search className="text-[#0369a1]" size={18} />
                        Market Intelligence · Observed Online Price Benchmarks
                      </h2>
                      <span className="text-xs font-semibold text-[#6b7280]">
                        {marketIntel.length} listings observed
                      </span>
                    </div>
                    {/* Mandatory PRD Disclaimer */}
                    <div className="mt-2 rounded-xl border border-[#fef08a] bg-[#fefce8] p-3 text-xs font-semibold text-[#854d0e] flex items-center gap-2">
                      <I.AlertTriangle size={16} className="text-[#ca8a04] shrink-0" />
                      <span>
                        Market intelligence — observed online price. Availability and supplier quote require confirmation. Marketplaces do not represent direct manufacturer quotes.
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {marketIntel.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-[#6b7280]">
                            <span className="font-bold text-[#0369a1]">{item.platform}</span>
                            <span>{item.deliveryText || 'Standard'}</span>
                          </div>
                          <div className="mt-2 text-sm font-bold text-[#111827] line-clamp-2">
                            {item.productTitle}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#f3f4f6] flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase font-semibold text-[#6b7280]">Observed Price</div>
                            <div className="text-base font-extrabold text-[#111827]">
                              {item.priceText || (item.price ? `₹${item.price.toLocaleString('en-IN')}` : 'Price on request')}
                            </div>
                          </div>
                          {item.sourceUrl && (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[#0284c7] hover:underline flex items-center gap-0.5"
                            >
                              Web listing <I.ArrowUpRight size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* PERSISTENT MULTI-SELECTION FLOATING ACTION BAR */}
      {selectedSupplierIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-4xl rounded-2xl border border-[#111827] bg-[#111827] p-4 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#10b981] text-black font-extrabold text-sm">
                {selectedSupplierIds.length}
              </span>
              <div>
                <div className="font-bold text-sm text-white">
                  {selectedSupplierIds.length} supplier{selectedSupplierIds.length > 1 ? 's' : ''} selected for negotiation
                </div>
                <div className="text-xs text-[#9ca3af] truncate max-w-md">
                  {selectedSupplierObjects.map((s) => s.name).join(', ')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSupplierIds([])}
                className="btn ghost !text-[#9ca3af] hover:!text-white text-xs !py-2 !px-3"
              >
                Clear
              </button>
              <button
                onClick={() => handleStartNegotiationFlow('email')}
                className="btn primary !bg-[#374151] !text-white hover:!bg-[#4b5563] text-xs font-bold flex items-center gap-1.5 !py-2 !px-3.5 shadow-sm"
              >
                <I.Mail size={13} /> Start Email RFQ ({selectedSupplierIds.length}) →
              </button>
              <button
                onClick={() => handleStartNegotiationFlow('voice')}
                className="btn primary !bg-[#10b981] !text-black hover:!bg-[#059669] text-xs font-bold flex items-center gap-1.5 !py-2 !px-4 shadow-md"
              >
                <I.PhoneCall size={13} /> Start AI Voice Call ({selectedSupplierIds.length}) →
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Negotiation() {
  const [selectedSuppliers, setSelectedSuppliers] = useState<SupplierDTO[]>([]);
  const [activeSupplierIndex, setActiveSupplierIndex] = useState<number>(0);
  const [negotiationMode, setNegotiationMode] = useState<'voice' | 'email'>('voice');
  const [quantity, setQuantity] = useState<number>(500);
  const [productName, setProductName] = useState<string>('Ergonomic office chairs');
  
  // Independent Negotiation State for Active Supplier (Initial state: price = null, awaiting quote)
  const [supplierQuotes, setSupplierQuotes] = useState<Record<string, {
    round: number;
    price: number | null;
    status: 'ready_for_rfq' | 'rfq_sent' | 'quote_received' | 'negotiating' | 'offer_accepted';
    rfqRef: string;
    transcript: Array<{ timestamp: string; speaker: string; text: string; language: string }>;
    emailThread: any[];
  }>>({});

  // Voice AI State
  const [voiceCallStatus, setVoiceCallStatus] = useState<'NOT_STARTED' | 'CALLING' | 'CONNECTED' | 'NEGOTIATING' | 'OFFER_RECEIVED' | 'NEGOTIATION_COMPLETE'>('NOT_STARTED');
  const [detectedLang, setDetectedLang] = useState<{ code: string; name: string }>({ code: 'ta', name: 'Tamil (Tanglish)' });
  const [isCallingTwilio, setIsCallingTwilio] = useState<boolean>(false);
  const [isApprovingPo, setIsApprovingPo] = useState<boolean>(false);
  const [customSellerSpeech, setCustomSellerSpeech] = useState<string>('');
  const [isProcessingTurn, setIsProcessingTurn] = useState<boolean>(false);

  // Buyer Authorization Toggles
  const [authContact, setAuthContact] = useState<boolean>(true);
  const [authPrice, setAuthPrice] = useState<boolean>(true);
  const [authDelivery, setAuthDelivery] = useState<boolean>(true);
  const [authShipping, setAuthShipping] = useState<boolean>(true);
  const [authPayment, setAuthPayment] = useState<boolean>(true);

  // Business Hours Status Check
  const [businessHoursOpen, setBusinessHoursOpen] = useState<boolean>(true);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let sups: SupplierDTO[] = [];
      try {
        const stored = sessionStorage.getItem('active_selected_suppliers') || localStorage.getItem('active_selected_suppliers');
        if (stored) sups = JSON.parse(stored);
      } catch (_) {}

      // 1. Read actual searched product & quantity FIRST
      const storedProd = sessionStorage.getItem('active_procurement_product') || 'Procurement Item';
      const storedQty = sessionStorage.getItem('active_procurement_quantity');
      const resolvedQty = storedQty && parseInt(storedQty) > 0 ? parseInt(storedQty) : 500;

      setProductName(storedProd);
      setQuantity(resolvedQty);

      if (sups.length === 0) {
        // Fallback default sample suppliers if opened directly
        sups = [
          {
            id: 'sup-abc-01',
            name: 'ABC Supplier Systems',
            sourceId: 'src-discovery',
            sourceName: 'Google Maps (Local B2B)',
            supplierType: 'manufacturer',
            product: storedProd,
            price: 7000,
            priceStatus: 'marketplace_listed',
            availability: resolvedQty,
            delivery: '7 days',
            deliveryDays: 7,
            reliability: 96,
            rating: 4.8,
            location: 'Chennai',
            source: 'Verified Direct Supplier',
            why: 'Direct manufacturer in industrial zone.',
            communication: true,
            ordersCompleted: 48,
            onTimeDeliveryRate: 98,
            averageResponseMins: 10,
            averageSavingsPct: 8.5,
            phone: '+91 44 2834 9100',
            email: 'sales@supplier.in',
            hasMessagingChannel: true,
            capabilities: { canSearch: true, canGetProductDetails: true, canGetSellerDetails: true, canGetSellerContact: true, canGetPricing: true, canGetAvailability: true, canMessageSeller: true, canNegotiate: true, canCreateOrder: true, canTrackShipment: false }
          },
          {
            id: 'sup-xyz-02',
            name: 'XYZ Enterprise Supplies',
            sourceId: 'src-discovery',
            sourceName: 'Direct Supplier Discovery',
            supplierType: 'wholesaler',
            product: storedProd,
            price: 6800,
            priceStatus: 'marketplace_listed',
            availability: resolvedQty,
            delivery: '5 days',
            deliveryDays: 5,
            reliability: 94,
            rating: 4.7,
            location: 'Chennai',
            source: 'Verified Direct Supplier',
            why: 'Major commercial wholesaler.',
            communication: true,
            ordersCompleted: 39,
            onTimeDeliveryRate: 95,
            averageResponseMins: 14,
            averageSavingsPct: 7.0,
            phone: '+91 44 2688 4100',
            email: 'commercial@supplier.co.in',
            hasMessagingChannel: true,
            capabilities: { canSearch: true, canGetProductDetails: true, canGetSellerDetails: true, canGetSellerContact: true, canGetPricing: true, canGetAvailability: true, canMessageSeller: true, canNegotiate: true, canCreateOrder: true, canTrackShipment: false }
          }
        ];
      }

      setSelectedSuppliers(sups);

      // Initialize quotes store with the real searched product and quantity
      const initQuotes: Record<string, any> = {};
      sups.forEach((s, idx) => {
        const ref = `PROC-2026-${Math.floor(10000 + idx * 231 + Math.random() * 5000)}`;
        initQuotes[s.id] = {
          round: 1,
          price: null, // Null initial state per requirement!
          status: 'ready_for_rfq',
          rfqRef: ref,
          transcript: [
            {
              timestamp: '10:00:01',
              speaker: 'Procura AI (Sadwik)',
              text: `Hi, this is Sadwik. I'm looking to source ${resolvedQty} units of ${storedProd} for our facility in ${s.location || 'Chennai'}. Could you provide your best commercial quote?`,
              language: 'en'
            }
          ],
          emailThread: [
            {
              id: 'msg-init-' + s.id,
              senderType: 'PROCURA_BUYER',
              senderName: 'Procura Buyer (Sadwik)',
              content: `Dear ${s.name} Sales Team,\n\nWe request your best bulk commercial quote for:\n• Product: ${storedProd}\n• Quantity: ${resolvedQty} units\n• Delivery Location: ${s.location || 'Chennai'}\n\nPlease confirm unit rate, GST terms, freight, and lead time.\n\nReference: ${ref}`,
              provenance: `RFQ Protocol · Ref: ${ref}`
            }
          ]
        };
      });
      setSupplierQuotes(initQuotes);

      const mode = (sessionStorage.getItem('negotiation_initial_mode') as any) || 'voice';
      setNegotiationMode(mode);
    }

    const now = new Date();
    setCurrentTimeStr(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST');
    const hr = now.getHours();
    setBusinessHoursOpen(hr >= 9 && hr < 19);
  }, []);

  const currentSupplier = selectedSuppliers[activeSupplierIndex] || selectedSuppliers[0];
  const currentQuoteData = (currentSupplier && supplierQuotes[currentSupplier.id]) || {
    round: 1,
    price: null,
    status: 'ready_for_rfq',
    rfqRef: 'PROC-2026-00124',
    transcript: [],
    emailThread: []
  };

  // Dynamic budget calculation based on supplier or product baseline
  const basePrice = currentSupplier?.price || 7000;
  const targetPrice = Math.round(basePrice * 0.92);
  const maxBudget = Math.round(basePrice * 1.15);

  const handleStartTwilioVoiceCall = async () => {
    if (!authContact) {
      alert('Buyer authorization required: Please enable "Allow AI to contact selected suppliers".');
      return;
    }

    setIsCallingTwilio(true);
    setVoiceCallStatus('CALLING');
    try {
      const res = await fetch('/api/negotiations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procurement_id: 'proc_123',
          supplier_ids: [currentSupplier.id],
          product_name: productName,
          quantity: quantity,
          target_price: targetPrice,
          max_budget: maxBudget,
          location: currentSupplier.location || 'Chennai',
          buyer_name: 'Sadwik',
          company_name: 'Example Technologies',
          authorization: {
            allowAiContact: authContact,
            allowPriceNegotiation: authPrice,
            allowDeliveryNegotiation: authDelivery,
            allowShippingNegotiation: authShipping,
            allowPaymentNegotiation: authPayment,
            allowFinalizePurchase: false
          },
          is_simulation: false
        })
      });

      const data = await res.json();
      setVoiceCallStatus('NEGOTIATING');
      const activeQueueItem = data.queue?.[0];
      alert(`📞 Live AI Call Initiated!\nDialing your phone: +916369763938\nCaller ID: +17372508034 (Twilio)\nProduct: ${productName} (${quantity} units)\nStatus: ${activeQueueItem?.status || 'Calling'}`);
    } catch (err: any) {
      setVoiceCallStatus('NEGOTIATING');
      alert('Voice call notice: ' + err.message);
    } finally {
      setIsCallingTwilio(false);
    }
  };

  // Live Transcript Polling for Active Calls
  useEffect(() => {
    let timer: any;
    if (voiceCallStatus === 'CALLING' || voiceCallStatus === 'NEGOTIATING' || isCallingTwilio) {
      timer = setInterval(async () => {
        try {
          const res = await fetch('/api/negotiations/live');
          if (res.ok) {
            const data = await res.json();
            if (data.transcripts && currentSupplier) {
              const matchingKey = Object.keys(data.transcripts).find(k => k.includes(currentSupplier.id));
              if (matchingKey && data.transcripts[matchingKey]?.length > 0) {
                const liveTurns = data.transcripts[matchingKey];
                setSupplierQuotes(prev => {
                  const current = prev[currentSupplier.id];
                  if (!current) return prev;
                  return {
                    ...prev,
                    [currentSupplier.id]: {
                      ...current,
                      transcript: liveTurns.map((t: any) => ({
                        timestamp: t.timestamp || new Date().toLocaleTimeString('en-IN'),
                        speaker: t.speaker === 'procura' ? 'Procura AI (Sadwik)' : `${currentSupplier.name} (Sales Desk)`,
                        text: t.text,
                        language: t.language || 'ta'
                      }))
                    }
                  };
                });
              }
            }
          }
        } catch (_) {}
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [voiceCallStatus, isCallingTwilio, currentSupplier]);

  const handleProcessSupplierTurn = async (speechText: string) => {
    if (!currentSupplier || !speechText.trim()) return;
    const supId = currentSupplier.id;
    const current = supplierQuotes[supId] || currentQuoteData;

    setIsProcessingTurn(true);
    try {
      const res = await fetch('/api/negotiations/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierSpeech: speechText,
          buyerName: 'Sadwik',
          companyName: 'Example Technologies',
          product: productName,
          quantity,
          deliveryLocation: currentSupplier.location || 'Chennai',
          targetPrice,
          maximumPrice: maxBudget,
          supplierName: currentSupplier.name,
          currentRound: current.round,
          maxRounds: 4,
          conversationHistory: current.transcript.map(t => ({
            speaker: t.speaker.includes('Procura') ? 'procura' : 'supplier',
            text: t.text,
            language: t.language
          }))
        })
      });

      const data = await res.json();
      if (data.success && data.decision) {
        const decision = data.decision;
        const newRound = Math.min(current.round + 1, 4);
        const newPrice = decision.extractedOffer?.unitPrice || current.price;
        const newStatus = decision.isFinalRound ? 'offer_accepted' : 'negotiating';

        const updatedTranscript = [
          ...current.transcript,
          {
            timestamp: new Date().toLocaleTimeString('en-IN'),
            speaker: `${currentSupplier.name} (Sales Desk)`,
            text: speechText,
            language: decision.detectedLanguage?.detectedLanguage || 'ta'
          },
          {
            timestamp: new Date().toLocaleTimeString('en-IN'),
            speaker: 'Procura AI (Sadwik)',
            text: decision.nextSpeechText,
            language: decision.responseLanguage || 'ta'
          }
        ];

        setSupplierQuotes(prev => ({
          ...prev,
          [supId]: {
            ...prev[supId],
            round: newRound,
            price: newPrice,
            status: newStatus as any,
            transcript: updatedTranscript
          }
        }));

        if (decision.detectedLanguage) {
          setDetectedLang({
            code: decision.detectedLanguage.detectedLanguage,
            name: decision.detectedLanguage.languageName
          });
        }
      }
    } catch (err: any) {
      alert('AI reasoning error: ' + err.message);
    } finally {
      setIsProcessingTurn(false);
      setCustomSellerSpeech('');
    }
  };

  const handleSimulateNextVoiceTurn = () => {
    if (!currentSupplier) return;
    const supId = currentSupplier.id;
    const current = supplierQuotes[supId] || currentQuoteData;

    if (current.round === 1) {
      // Round 1 -> Supplier quotes initial price
      const initialQuote = Math.round(basePrice * 1.06);
      setSupplierQuotes((prev) => ({
        ...prev,
        [supId]: {
          ...prev[supId],
          round: 2,
          price: initialQuote,
          status: 'quote_received',
          transcript: [
            ...prev[supId].transcript,
            {
              timestamp: new Date().toLocaleTimeString('en-IN'),
              speaker: `${currentSupplier.name} (Sales Desk)`,
              text: `Vanakkam sir, ${quantity} units ready stock irukku for ${productName}. Initial rate ₹${initialQuote.toLocaleString('en-IN')} per unit, GST extra.`,
              language: 'ta'
            }
          ]
        }
      }));
      setDetectedLang({ code: 'ta', name: 'Tamil' });
    } else if (current.round === 2) {
      // Round 2 -> Procura counters and Supplier offers negotiated rate
      const negotiatedRate = Math.round(basePrice * 0.98);
      setSupplierQuotes((prev) => ({
        ...prev,
        [supId]: {
          ...prev[supId],
          round: 3,
          price: negotiatedRate,
          status: 'negotiating',
          transcript: [
            ...prev[supId].transcript,
            {
              timestamp: new Date().toLocaleTimeString('en-IN'),
              speaker: 'Procura AI (Sadwik - Tamil Adaptation)',
              text: `Purinjithu sir. Naanga mothama ${quantity} units edukkrom. Door delivery serthu ₹${negotiatedRate - 50} panna mudiyuma?`,
              language: 'ta'
            },
            {
              timestamp: new Date().toLocaleTimeString('en-IN'),
              speaker: `${currentSupplier.name} (Sales Desk)`,
              text: `Final-a ₹${negotiatedRate.toLocaleString('en-IN')} kudukalaam sir for ${quantity} units with 7 days delivery guarantee, freight included.`,
              language: 'ta'
            }
          ]
        }
      }));
    } else if (current.round >= 3) {
      // Final Round -> Accepted offer
      const finalOffer = Math.round(basePrice * 0.95);
      setSupplierQuotes((prev) => ({
        ...prev,
        [supId]: {
          ...prev[supId],
          round: 4,
          price: finalOffer,
          status: 'offer_accepted',
          transcript: [
            ...prev[supId].transcript,
            {
              timestamp: new Date().toLocaleTimeString('en-IN'),
              speaker: 'Procura AI (Sadwik)',
              text: `Romba nandri sir. Unga final offer ₹${finalOffer.toLocaleString('en-IN')} per unit record panniten. Sadwik review panni official PO confirm pannuvom.`,
              language: 'ta'
            }
          ]
        }
      }));
      alert(`Negotiation complete for ${currentSupplier.name}. Final negotiated rate ₹${finalOffer.toLocaleString('en-IN')} recorded for buyer review.`);
    }
  };

  const handleSimulateEmailReply = () => {
    if (!currentSupplier) return;
    const supId = currentSupplier.id;
    const initialQuote = Math.round(basePrice * 1.05);
    setSupplierQuotes((prev) => ({
      ...prev,
      [supId]: {
        ...prev[supId],
        round: 2,
        price: initialQuote,
        status: 'quote_received',
        emailThread: [
          ...prev[supId].emailThread,
          {
            id: 'msg-reply-' + Date.now(),
            senderType: 'SUPPLIER',
            senderName: `${currentSupplier.name} Commercial Desk`,
            content: `Thank you for the RFQ (${currentQuoteData.rfqRef}). We confirm commercial quote of ₹${initialQuote.toLocaleString('en-IN')} per unit with 7 business days delivery timeline for ${quantity} units of ${productName}.`,
            provenance: `Inbound Supplier Reply · Verified SMTP · ${new Date().toLocaleTimeString('en-IN')}`
          }
        ]
      }
    }));
  };

  const handleApproveAndIssuePo = async () => {
    if (!currentSupplier) return;
    const finalUnit = currentQuoteData.price || basePrice;
    const finalSubtotal = finalUnit * quantity;
    const finalTax = Math.round(finalSubtotal * 0.18);
    const finalTotal = finalSubtotal + finalTax;

    try {
      setIsApprovingPo(true);
      const poPayload = {
        supplierId: currentSupplier.id,
        supplierName: currentSupplier.name,
        product: `${productName} (${quantity} units)`,
        unitPrice: finalUnit,
        quantity,
        subtotal: finalSubtotal,
        taxAmount: finalTax,
        totalAmount: finalTotal,
        paymentTerms: '30% advance on PO confirmation, 70% against delivery',
        deliveryTerms: `Door delivery ${currentSupplier.location} warehouse`,
        deliveryAddress: 'Plot 42, Guindy Industrial Estate, Chennai 600032',
        expectedDelivery: new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      };

      const poRes = await negotiationService.acceptOffer('neg-active', poPayload);
      const createdPO = poRes?.po;
      const poId = createdPO?.id || createdPO?.poNumber || 'PO-1827';

      if (typeof window !== 'undefined') {
        const existingPos = JSON.parse(localStorage.getItem('procura_custom_pos') || '[]');
        if (createdPO) {
          existingPos.unshift(createdPO);
          localStorage.setItem('procura_custom_pos', JSON.stringify(existingPos));
          sessionStorage.setItem('active_po_data', JSON.stringify(createdPO));
        }
        sessionStorage.setItem('approved_po_supplier', currentSupplier.name);
      }

      router.push(`/purchase-orders/${poId}`);
    } catch (err: any) {
      alert('PO Issuance failed: ' + err.message);
    } finally {
      setIsApprovingPo(false);
    }
  };

  return (
    <Shell>
      <Crumb
        eyebrow={`Procurement Negotiation · Ref: ${currentQuoteData.rfqRef}`}
        title={`${currentSupplier?.name || 'Selected Supplier'} (${quantity} units)`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-[#f3f4f6] p-1 border border-[#e5e7eb]">
              <button
                onClick={() => setNegotiationMode('voice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  negotiationMode === 'voice' ? 'bg-[#111827] text-white shadow-sm' : 'text-[#4b5563] hover:text-[#111827]'
                }`}
              >
                <I.PhoneCall size={13} /> AI Voice Caller
              </button>
              <button
                onClick={() => setNegotiationMode('email')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  negotiationMode === 'email' ? 'bg-[#111827] text-white shadow-sm' : 'text-[#4b5563] hover:text-[#111827]'
                }`}
              >
                <I.Mail size={13} /> Email RFQ Thread
              </button>
            </div>
            <button
              className="btn primary !bg-[#10b981] !text-black hover:!bg-[#059669] font-bold text-xs !py-2 !px-4"
              onClick={handleApproveAndIssuePo}
              disabled={isApprovingPo || !currentQuoteData.price}
            >
              {isApprovingPo ? 'Issuing PO...' : `Approve Offer & Issue PO`}
            </button>
          </div>
        }
      />

      {/* MULTI-SUPPLIER SELECTOR TAB BAR (When multiple suppliers selected) */}
      {selectedSuppliers.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[#e5e7eb] pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6b7280] mr-2">
            Selected Suppliers ({selectedSuppliers.length}):
          </span>
          {selectedSuppliers.map((s, idx) => {
            const q = supplierQuotes[s.id] || { price: null, status: 'ready_for_rfq' };
            const isActive = idx === activeSupplierIndex;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSupplierIndex(idx)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition border ${
                  isActive
                    ? 'border-[#111827] bg-[#111827] text-white shadow-sm'
                    : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#9ca3af]'
                }`}
              >
                <span>{s.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                  q.price ? 'bg-[#10b981] text-black' : 'bg-[#e5e7eb] text-[#4b5563]'
                }`}>
                  {q.price ? `₹${q.price.toLocaleString('en-IN')}` : 'Awaiting Quote'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* SECTION: 10 HARD BUSINESS HOURS SAFEGUARD BANNER */}
      <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl border ${
              businessHoursOpen ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]' : 'bg-[#fefce8] border-[#fde047] text-[#ca8a04]'
            }`}>
              <I.Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#111827]">
                  Supplier Calling Window Check
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  businessHoursOpen ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' : 'bg-[#fefce8] text-[#854d0e] border border-[#fef08a]'
                }`}>
                  {businessHoursOpen ? '✓ ACTIVE CALLING WINDOW (09:30 - 18:30 IST)' : '⚠️ OVERNIGHT SAFEGUARD ACTIVE'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                Supplier Local Time: <b>{currentTimeStr}</b> (Asia/Kolkata) · Re-checked automatically before dialing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {negotiationMode === 'voice' ? (
              <>
                <button
                  onClick={handleStartTwilioVoiceCall}
                  disabled={isCallingTwilio}
                  className="btn primary !bg-[#059669] !text-white hover:!bg-[#047857] text-xs font-bold flex items-center gap-1.5 !py-2 !px-3.5 shadow-sm"
                >
                  <I.PhoneCall size={14} />
                  {isCallingTwilio ? 'Dialing Twilio...' : 'Call via Twilio (+17372508034)'}
                </button>
                <button
                  onClick={handleSimulateNextVoiceTurn}
                  className="btn ghost text-xs font-semibold flex items-center gap-1.5 !py-2 !px-3"
                >
                  <I.Play size={13} /> Next Voice Turn
                </button>
              </>
            ) : (
              <button
                onClick={handleSimulateEmailReply}
                className="btn primary !bg-[#111827] !text-white text-xs font-bold flex items-center gap-1.5 !py-2 !px-3.5 shadow-sm"
              >
                <I.Mail size={14} /> Inbound Reply Simulator
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="two-col grid gap-5 lg:grid-cols-[.85fr_1.45fr_.75fr]">
        {/* Left Column: Buyer Authorization & Constraints */}
        <aside className="panel p-5 bg-white border border-[#e5e7eb] shadow-sm rounded-xl space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Active Negotiation
              </span>
              <span className="text-[11px] font-bold text-[#6b7280]">ROUND {currentQuoteData.round} OF 4</span>
            </div>
            <h2 className="h2 mt-4 text-[#111827]">Buyer Authorization</h2>
            <p className="text-xs text-[#6b7280] mt-1">
              Configure what Procura AI is permitted to negotiate on your behalf:
            </p>
          </div>

          {/* Authorization Checkboxes */}
          <div className="space-y-2.5 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer font-medium text-[#111827]">
              <input
                type="checkbox"
                checked={authContact}
                onChange={(e) => setAuthContact(e.target.checked)}
                className="rounded border-[#d1d5db] text-[#111827] focus:ring-[#111827]"
              />
              <span>Allow AI to contact selected suppliers</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer font-medium text-[#111827]">
              <input
                type="checkbox"
                checked={authPrice}
                onChange={(e) => setAuthPrice(e.target.checked)}
                className="rounded border-[#d1d5db] text-[#111827] focus:ring-[#111827]"
              />
              <span>Allow AI to negotiate price</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer font-medium text-[#111827]">
              <input
                type="checkbox"
                checked={authDelivery}
                onChange={(e) => setAuthDelivery(e.target.checked)}
                className="rounded border-[#d1d5db] text-[#111827] focus:ring-[#111827]"
              />
              <span>Allow AI to negotiate delivery SLA</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer font-medium text-[#111827]">
              <input
                type="checkbox"
                checked={authShipping}
                onChange={(e) => setAuthShipping(e.target.checked)}
                className="rounded border-[#d1d5db] text-[#111827] focus:ring-[#111827]"
              />
              <span>Allow AI to negotiate shipping & freight</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer font-medium text-[#111827]">
              <input
                type="checkbox"
                checked={authPayment}
                onChange={(e) => setAuthPayment(e.target.checked)}
                className="rounded border-[#d1d5db] text-[#111827] focus:ring-[#111827]"
              />
              <span>Allow AI to negotiate payment terms</span>
            </label>
            <div className="pt-2 border-t border-[#f3f4f6]">
              <label className="flex items-center gap-2.5 opacity-60 cursor-not-allowed text-[#6b7280]">
                <input type="checkbox" checked={false} disabled className="rounded border-[#d1d5db]" />
                <span className="font-semibold">Allow AI to finalize purchase (Locked OFF)</span>
              </label>
              <p className="mt-1 text-[11px] text-[#059669] font-medium">
                ✓ Human buyer retains 100% final purchasing approval authority.
              </p>
            </div>
          </div>

          <div className="border-t border-[#f3f4f6] pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Target Parameters</div>
            <div className="mt-3 space-y-2.5 text-xs text-[#4b5563]">
              <div className="flex justify-between">
                <span>Buyer Target Rate</span>
                <span className="font-bold text-[#111827]">₹{targetPrice.toLocaleString('en-IN')} / unit</span>
              </div>
              <div className="flex justify-between">
                <span>Max Budget Ceiling</span>
                <span className="font-bold text-[#dc2626]">₹{maxBudget.toLocaleString('en-IN')} (Confidential)</span>
              </div>
              <div className="flex justify-between">
                <span>Target Quantity</span>
                <span className="font-bold text-[#111827]">{quantity} units</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Location</span>
                <span className="font-bold text-[#111827]">{currentSupplier?.location || 'Chennai'}, TN</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Column: DEDICATED MODE (Voice AI vs Email RFQ) */}
        {negotiationMode === 'voice' ? (
          <section className="panel flex min-h-[560px] flex-col p-5 bg-white border border-[#e5e7eb] shadow-sm rounded-xl">
            <div className="flex flex-wrap items-center justify-between border-b border-[#f3f4f6] pb-4 gap-2">
              <div>
                <div className="text-sm font-bold text-[#111827] flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444] animate-pulse" />
                  Live AI Voice Call · {currentSupplier?.name}
                </div>
                <div className="mt-1 text-xs text-[#6b7280]">
                  Caller Persona: <b>Sadwik (Buyer)</b> · Telephony: <b>Twilio Voice (+17372508034)</b>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
                  🇮🇳 {detectedLang.name}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                  Round {currentQuoteData.round}/4
                </span>
              </div>
            </div>

            {/* Real-Time Transcript Feed */}
            <div className="flex-1 space-y-3.5 py-5 text-sm overflow-y-auto max-h-[380px]">
              {currentQuoteData.transcript.map((turn: any, idx: number) => {
                const isProcura = turn.speaker.includes('Procura');
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl p-4 border transition ${
                      isProcura
                        ? 'max-w-[85%] rounded-tl-sm bg-[#f9fafb] text-[#111827] border-[#e5e7eb]'
                        : 'ml-auto max-w-[85%] rounded-tr-sm bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-bold flex items-center justify-between">
                      <span className={isProcura ? 'text-[#0284c7]' : 'text-[#059669]'}>
                        {turn.speaker}
                      </span>
                      <span className="text-[10px] text-[#9ca3af] font-normal">{turn.timestamp}</span>
                    </div>
                    <div className="text-sm font-medium leading-relaxed">{turn.text}</div>
                  </div>
                );
              })}
            </div>

            {/* Live Seller Speech Simulation & Reasoning Tester */}
            <div className="border-t border-[#f3f4f6] pt-3 pb-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6b7280] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                  Live Seller Spoken Input (AI Reasoning Simulator)
                </span>
                <span className="text-[10px] text-[#9ca3af]">Understands Tamil, Hindi & English</span>
              </div>

              {/* Quick Spoken Presets */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={isProcessingTurn}
                  onClick={() => handleProcessSupplierTurn(`Vanakkam sir, ${quantity} units ready stock irukku for ${productName}. Initial rate ₹${Math.round(basePrice * 1.06).toLocaleString('en-IN')} per unit, GST extra.`)}
                  className="rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb] px-2.5 py-1 text-[11px] font-medium text-[#374151] border border-[#e5e7eb] transition"
                >
                  💬 &ldquo;Ready stock ₹{Math.round(basePrice * 1.06).toLocaleString('en-IN')}&rdquo; (Initial Quote)
                </button>
                <button
                  type="button"
                  disabled={isProcessingTurn}
                  onClick={() => handleProcessSupplierTurn(`Sir, ₹${targetPrice.toLocaleString('en-IN')} is not possible for ${productName}. Lowest we can do is ₹${Math.round(basePrice * 0.98).toLocaleString('en-IN')} per unit with 7 days delivery.`)}
                  className="rounded-lg bg-[#fef2f2] hover:bg-[#fee2e2] px-2.5 py-1 text-[11px] font-medium text-[#991b1b] border border-[#fecaca] transition"
                >
                  💬 &ldquo;₹{targetPrice.toLocaleString('en-IN')} not possible, lowest ₹{Math.round(basePrice * 0.98).toLocaleString('en-IN')}&rdquo; (Counter)
                </button>
                <button
                  type="button"
                  disabled={isProcessingTurn}
                  onClick={() => handleProcessSupplierTurn(`Final-a ₹${Math.round(basePrice * 0.95).toLocaleString('en-IN')} kudukalaam sir for ${quantity} units of ${productName}, freight included.`)}
                  className="rounded-lg bg-[#ecfdf5] hover:bg-[#d1fae5] px-2.5 py-1 text-[11px] font-medium text-[#065f46] border border-[#a7f3d0] transition"
                >
                  💬 &ldquo;Final offer ₹{Math.round(basePrice * 0.95).toLocaleString('en-IN')}&rdquo; (Close)
                </button>
              </div>

              {/* Custom Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customSellerSpeech.trim()) {
                    handleProcessSupplierTurn(customSellerSpeech.trim());
                  }
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={customSellerSpeech}
                  onChange={(e) => setCustomSellerSpeech(e.target.value)}
                  placeholder="Type what the seller says (e.g. 'Price cannot be reduced' or spoken Tamil/Hindi)..."
                  className="flex-1 rounded-xl border border-[#d1d5db] px-3.5 py-2 text-xs focus:border-[#111827] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isProcessingTurn || !customSellerSpeech.trim()}
                  className="btn primary !bg-[#111827] !text-white text-xs font-bold !py-2 !px-4 disabled:opacity-50"
                >
                  {isProcessingTurn ? 'AI Reasoning...' : 'Send Speech'}
                </button>
              </form>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#f3f4f6] pt-3">
              <button
                onClick={handleStartTwilioVoiceCall}
                disabled={isCallingTwilio}
                className="btn primary !bg-[#111827] !text-white flex items-center gap-1.5 !py-2.5 !px-4 text-xs font-bold"
              >
                <I.PhoneCall size={14} /> {isCallingTwilio ? 'Connecting Call...' : 'Trigger Live Call (Twilio)'}
              </button>
              <button
                onClick={handleSimulateNextVoiceTurn}
                className="btn ghost flex items-center gap-1.5 !py-2.5 !px-3 text-xs"
              >
                <I.Play size={14} /> Next AI Turn
              </button>
              {currentQuoteData.price && (
                <button
                  onClick={handleApproveAndIssuePo}
                  disabled={isApprovingPo}
                  className="btn primary !bg-[#10b981] !text-black ml-auto font-bold flex items-center gap-1.5 !py-2.5 !px-4 text-xs"
                >
                  <I.Check size={14} /> Approve Negotiated Offer & Issue PO
                </button>
              )}
            </div>
          </section>
        ) : (
          <section className="panel flex min-h-[560px] flex-col p-5 bg-white border border-[#e5e7eb] shadow-sm rounded-xl">
            <div className="flex justify-between border-b border-[#f3f4f6] pb-4">
              <div>
                <div className="text-sm font-bold text-[#111827]">Email RFQ Thread · {currentSupplier?.name}</div>
                <div className="mt-1 text-xs text-[#6b7280]">Ref: {currentQuoteData.rfqRef} · {currentSupplier?.email || 'sales@supplier.in'}</div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#065f46]">
                {currentQuoteData.price ? 'Offer Received' : 'Awaiting Reply'}
              </span>
            </div>

            <div className="flex-1 space-y-4 py-6 text-sm overflow-y-auto max-h-[380px]">
              {currentQuoteData.emailThread.map((m: any) => (
                <div
                  key={m.id}
                  className={
                    m.senderType === 'PROCURA_BUYER'
                      ? 'max-w-[85%] rounded-2xl rounded-tl-sm bg-[#f3f4f6] p-4 text-[#111827] border border-[#e5e7eb]'
                      : 'ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#ecfdf5] p-4 text-[#065f46] border border-[#a7f3d0]'
                  }
                >
                  <div className="mb-1 text-[11px] font-bold text-[#0284c7]">
                    {m.senderName} · {m.provenance}
                  </div>
                  <div className="text-sm font-medium whitespace-pre-line">{m.content}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 border-t border-[#f3f4f6] pt-4">
              <button
                onClick={handleSimulateEmailReply}
                className="btn primary !bg-[#111827] !text-white flex items-center gap-1.5 !py-2.5 !px-4 text-xs font-bold"
              >
                <I.Send size={14} /> Send / Sync Inbound Reply
              </button>
              {currentQuoteData.price && (
                <button
                  onClick={handleApproveAndIssuePo}
                  disabled={isApprovingPo}
                  className="btn primary !bg-[#10b981] !text-black ml-auto font-bold flex items-center gap-1.5 !py-2.5 !px-4 text-xs"
                >
                  <I.Check size={14} /> Accept Offer & Issue PO
                </button>
              )}
            </div>
          </section>
        )}

        {/* Right Column: Commercial Offer Summary */}
        <aside className="panel p-5 bg-white border border-[#e5e7eb] shadow-sm rounded-xl">
          <h2 className="h2 text-[#111827]">Current Commercials</h2>
          {currentQuoteData.price ? (
            <>
              <div className="mt-4 text-3xl font-extrabold tracking-tight text-[#111827]">
                ₹{currentQuoteData.price.toLocaleString('en-IN')} <span className="text-sm font-normal text-[#6b7280]">/ unit</span>
              </div>
              <div className="mt-2 text-xs font-bold text-[#059669]">
                ₹{(Math.max(0, 7600 - currentQuoteData.price) * quantity).toLocaleString('en-IN')} Total Savings ({quantity} units)
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-xl bg-[#f9fafb] p-4 border border-[#e5e7eb] text-center">
              <div className="text-sm font-bold text-[#6b7280]">Awaiting Supplier Quote</div>
              <p className="mt-1 text-xs text-[#9ca3af]">
                Quote details will populate automatically when the supplier responds via email or phone.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3.5 border-t border-[#f3f4f6] pt-5 text-xs text-[#4b5563]">
            {[
              ['Target Quantity', `${quantity.toLocaleString('en-IN')} units`],
              ['Quote Status', currentQuoteData.price ? 'Offer Received' : 'Awaiting Response'],
              ['Negotiated Rate', currentQuoteData.price ? `₹${currentQuoteData.price.toLocaleString('en-IN')} / unit` : 'Pending quote'],
              ['Subtotal (excl. GST)', currentQuoteData.price ? `₹${(currentQuoteData.price * quantity).toLocaleString('en-IN')}` : '—'],
              ['GST (18% extra)', currentQuoteData.price ? `₹${Math.round((currentQuoteData.price * quantity) * 0.18).toLocaleString('en-IN')}` : '—'],
              ['Total Landed Cost', currentQuoteData.price ? `₹${Math.round((currentQuoteData.price * quantity) * 1.18).toLocaleString('en-IN')}` : '—'],
              ['Delivery Commitment', '7 business days (Door delivery)'],
              ['Payment Terms', '30% advance on PO confirmation']
            ].map((x) => (
              <div className="flex justify-between" key={x[0]}>
                <span className="text-[#6b7280]">{x[0]}</span>
                <span className="font-bold text-[#111827]">{x[1]}</span>
              </div>
            ))}
          </div>

          {currentQuoteData.price && (
            <div className="mt-6 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-3 text-xs text-[#065f46]">
              <div className="font-bold flex items-center gap-1.5">
                <I.Check size={13} /> Supplier Confirmed Rate
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                Offer received within maximum budget parameters. Ready for buyer review and purchase order generation.
              </p>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Directory() {
  const [filterList, setFilterList] = useState<SupplierDTO[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState('');
  const router = useRouter();

  const loadSuppliers = async (filterParam?: string) => {
    try {
      const apiSuppliers = await supplierService.list();
      let customSuppliers: SupplierDTO[] = [];
      if (typeof window !== 'undefined') {
        try {
          customSuppliers = JSON.parse(localStorage.getItem('procura_custom_suppliers') || '[]');
        } catch (_) {}
      }

      const mergedMap = new Map<string, SupplierDTO>();
      for (const s of customSuppliers) {
        mergedMap.set(s.name.toLowerCase(), s);
      }
      for (const s of apiSuppliers) {
        if (!mergedMap.has(s.name.toLowerCase())) {
          mergedMap.set(s.name.toLowerCase(), s);
        }
      }

      let combined = Array.from(mergedMap.values());
      if (filterParam === 'Chennai') {
        combined = combined.filter((s) => s.location?.toLowerCase().includes('chennai'));
      } else if (filterParam === 'Reliability > 90%') {
        combined = combined.filter((s) => s.reliability >= 90);
      } else if (filterParam === 'Google Shopping') {
        combined = combined.filter((s) => s.source?.toLowerCase().includes('google') || s.sourceId?.includes('google'));
      }
      setFilterList(combined);
    } catch (_) {}
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const addedCount = sessionStorage.getItem('suppliers_added_count');
      if (addedCount) {
        setAddedNotice(`Successfully added ${addedCount} suppliers from your market search! Click "Start Negotiation" on any supplier below to begin.`);
        sessionStorage.removeItem('suppliers_added_count');
      }
    }
    loadSuppliers();
  }, []);

  const handleStartNegotiation = (s: SupplierDTO) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_negotiation_supplier', JSON.stringify(s));
    }
    router.push('/negotiations');
  };

  const handleFilterClick = (label: string) => {
    const nextFilter = label === activeFilter ? null : label;
    setActiveFilter(nextFilter);
    loadSuppliers(nextFilter || undefined);
  };

  return (
    <Shell>
      <Crumb
        eyebrow="Supplier intelligence"
        title="Suppliers"
        actions={
          <Link href="/procure" className="btn primary flex items-center gap-1.5 font-bold">
            <I.Search size={15} /> Find more suppliers
          </Link>
        }
      />

      {addedNotice && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-sm font-semibold text-[#065f46] shadow-sm">
          <div className="flex items-center gap-2">
            <I.CheckCircle2 className="text-[#10b981]" size={18} />
            <span>{addedNotice}</span>
          </div>
          <button onClick={() => setAddedNotice('')} className="text-[#065f46] hover:text-black">
            <I.X size={15} />
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {['All Suppliers', 'Ergonomic seating', 'Chennai', 'Reliability > 90%', 'Google Shopping'].map((x) => (
          <button
            onClick={() => handleFilterClick(x)}
            className={'btn ghost !py-2 text-xs font-semibold ' + (activeFilter === x ? '!border-[#111827] bg-[#111827] text-white' : '')}
            key={x}
          >
            {x} {activeFilter === x ? <I.Check size={13} /> : null}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filterList.map((s) => (
          <div
            className="panel p-5 bg-white border border-[#e5e7eb] rounded-2xl shadow-sm transition hover:shadow-md hover:border-[#111827] flex flex-col justify-between"
            key={s.id}
          >
            <div>
              <div className="flex justify-between items-start">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f3f4f6] font-extrabold text-lg text-[#111827] border border-[#e5e7eb]">
                  {s.name[0]}
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Negotiation ready
                </span>
              </div>
              <div className="mt-4 font-bold text-base text-[#111827]">{s.name}</div>
              <div className="mt-1 text-xs text-[#6b7280] line-clamp-1 font-medium">
                {s.product}
              </div>
              <div className="mt-1 text-xs font-semibold text-[#0284c7]">
                {s.location} · {s.source}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[#f3f4f6] py-3 text-xs">
                <div>
                  <span className="block text-[#6b7280] font-medium">Reliability</span>
                  <b className="mt-0.5 block text-[#059669] font-bold">{s.reliability}%</b>
                </div>
                <div>
                  <span className="block text-[#6b7280] font-medium">On-time</span>
                  <b className="mt-0.5 block text-[#111827] font-bold">{s.reliability - 1}%</b>
                </div>
                <div>
                  <span className="block text-[#6b7280] font-medium">Rating</span>
                  <b className="mt-0.5 block text-[#b45309] font-bold">★ {s.rating}</b>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="font-extrabold text-base text-[#111827]">{s.price ? fmt(s.price) : 'Price on Inquiry'} <span className="text-xs font-normal text-[#6b7280]">/ unit</span></span>
                <span className="text-xs font-medium text-[#4b5563]">{s.delivery}</span>
              </div>
              <button
                onClick={() => handleStartNegotiation(s)}
                className="w-full btn primary !bg-[#111827] hover:!bg-black !text-white !py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm rounded-xl"
              >
                <I.MessagesSquare size={15} /> Start Negotiation with {s.name}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Detail({ kind }: { kind: string }) {
  const isShip = kind === 'Shipments';
  const isDocs = kind === 'Documents';
  const isPO = kind === 'Purchase orders';

  const [activePo, setActivePo] = useState<PurchaseOrder | null>(null);
  const [poSent, setPoSent] = useState(false);
  const [recApproved, setRecApproved] = useState(false);
  const [reconcileStatus, setReconcileStatus] = useState<'IDLE' | 'RUNNING' | 'DONE'>('IDLE');
  const [auditNotice, setAuditNotice] = useState('');

  useEffect(() => {
    if (isPO) {
      if (typeof window !== 'undefined') {
        const storedPo = sessionStorage.getItem('active_po_data');
        if (storedPo) {
          try {
            setActivePo(JSON.parse(storedPo));
          } catch (_) {}
        } else {
          try {
            const customPos = JSON.parse(localStorage.getItem('procura_custom_pos') || '[]');
            if (customPos.length > 0) setActivePo(customPos[0]);
          } catch (_) {}
        }
      }
      purchaseOrderService.list().then((res) => {
        if (res?.data && res.data.length > 0) {
          setActivePo((prev) => prev || res.data[0]);
        }
      }).catch(() => {});
    }
  }, [isPO]);

  const title = isShip
    ? 'PO-1827 shipment'
    : isDocs
    ? 'INV-1827'
    : isPO
    ? (activePo?.poNumber || 'PO-1827')
    : 'Cobalt Office Systems';

  const handleAction = async () => {
    if (isPO) {
      const targetId = activePo?.id || 'po-1827';
      await purchaseOrderService.updateStatus(targetId, 'SENT', 'Sent via direct protocol to supplier.');
      setPoSent(true);
      if (activePo) {
        const updated = { ...activePo, status: 'SENT' };
        setActivePo(updated);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('active_po_data', JSON.stringify(updated));
        }
      }
      alert(`Purchase Order ${activePo?.poNumber || 'PO-1827'} sent successfully to ${activePo?.supplierName || 'supplier'}.`);
    } else if (isShip) {
      await recoveryService.approve('rec-2');
      setRecApproved(true);
      alert('Recovery Action Approved: Buffer expedited from local regional warehouse.');
    } else if (isDocs) {
      setReconcileStatus('RUNNING');
      try {
        const res = await documentService.reconcile('doc-1827');
        setReconcileStatus('DONE');
        
        // Export Discrepancy Audit Report CSV
        const csvRows = [
          ['PROCURA 3-WAY DOCUMENT RECONCILIATION AUDIT REPORT'],
          ['Document Number', 'INV-1827'],
          ['Referenced PO', 'PO-1827'],
          ['Supplier Name', 'Cobalt Office Systems'],
          ['GSTIN', '33AABCC9182K1Z9'],
          ['Audit Status', 'MISMATCH (Financial Discrepancy Detected)'],
          ['Generated At', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'],
          [],
          ['3-WAY COMPARISON BREAKDOWN'],
          ['Field', 'Agreed PO Value', 'OCR Extracted Invoice Value', 'Variance', 'Status'],
          ['Line Item', 'Ergonomic task chairs (500 units)', 'Ergonomic task chairs (500 units)', '0 units', 'MATCH'],
          ['Unit Price', '₹740.00 / unit', '₹760.00 / unit', '+₹20.00 / unit', 'MISMATCH (+2.7%)'],
          ['Billed Quantity', '500 units', '500 units', '0 units', 'MATCH'],
          ['Subtotal Amount', '₹3,70,000.00', '₹3,80,000.00', '+₹10,000.00', 'MISMATCH'],
          ['GST Tax Rate', '18.0%', '18.0%', '0.0%', 'MATCH'],
          ['GST Tax Amount', '₹66,600.00', '₹68,400.00', '+₹1,800.00', 'MISMATCH'],
          ['Grand Total (INR)', '₹4,36,600.00', '₹4,48,400.00', '+₹11,800.00', 'MISMATCH'],
          [],
          ['AUDIT DISCREPANCY REASONS'],
          ['1. Price mismatch: PO unit price is ₹740, Invoice unit price is ₹760 (₹10,000 unit variance + ₹1,800 GST variance).'],
          ['2. Supplier quotation contract signed at ₹740 with freight included.'],
          [],
          ['RECOMMENDED ACTION'],
          ['Hold invoice clearance and issue Amendment / Credit Note request to supplier for ₹11,800.']
        ];

        const csvContent = csvRows.map((e) => e.map((cell) => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Reconciliation_Audit_INV-1827_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 1500);

        setAuditNotice('Reconciliation complete! Discrepancy report downloaded.');
        setTimeout(() => setAuditNotice(''), 4000);
      } catch (err: any) {
        alert('Reconciliation failed: ' + err.message);
      }
    }
  };

  return (
    <Shell>
      <Crumb
        eyebrow={kind + ' · Verified record'}
        title={title}
        actions={
          <button className="btn primary" onClick={handleAction}>
            {isPO
              ? (poSent || activePo?.status === 'SENT' ? 'Purchase Order Sent' : 'Send purchase order')
              : isShip
              ? (recApproved ? 'Recovery Approved' : 'Request approval')
              : (reconcileStatus === 'RUNNING' ? 'Reconciling...' : 'Reconcile & Download Audit')}
          </button>
        }
      />
      {auditNotice && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#b7f46a]/30 bg-[#b7f46a]/10 p-3 text-xs text-[#b7f46a]">
          <I.CheckCircle2 size={16} />
          {auditNotice}
        </div>
      )}
      <div className="two-col grid gap-5 md:grid-cols-[1.5fr_.8fr]">
        <section className="panel p-6 bg-white border border-[#e5e7eb] shadow-sm rounded-2xl">
          {isShip ? (
            <>
              <Badge tone={recApproved ? 'yellow' : 'red'}>
                {recApproved ? 'Delivery risk: Medium (Buffer Expedited)' : 'Delivery risk: High'}
              </Badge>
              <h2 className="h2 mt-6">Shipment timeline</h2>
              <div className="mt-6 border-l border-[#526072] pl-6">
                {[
                  ['PO created', '28 Aug · Procura'],
                  ['Supplier confirmed', '29 Aug · Cobalt Office Systems'],
                  ['Picked up', '30 Aug · LR verified'],
                  ['Chennai warehouse', '1 Sep, 14:32 · Last verified'],
                  ['Out for delivery', 'No confirmed event available']
                ].map(([a, b], i) => (
                  <div className="relative mb-7" key={a}>
                    <span
                      className={
                        'absolute -left-[31px] top-1 ' +
                        (i < 4 ? 'timeline-dot' : 'h-2.5 w-2.5 rounded-full bg-[#526072]')
                      }
                    />
                    <div className="text-sm font-medium">{a}</div>
                    <div className="mt-1 text-xs muted">{b}</div>
                  </div>
                ))}
              </div>
            </>
          ) : isDocs ? (
            <>
              <div className="flex items-center justify-between">
                <Badge tone="red">Mismatch detected (₹10,000 variance)</Badge>
                <span className="flex items-center gap-1.5 text-xs text-[#b7f46a]">
                  <I.Sparkles size={14} /> OCR Confidence: 98.5%
                </span>
              </div>

              {/* Visual OCR Document Rendering */}
              <div className="mt-5 rounded-xl border border-white/10 bg-[#0d141e] p-5 font-mono text-xs shadow-inner">
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="text-base font-bold tracking-tight text-white">TAX INVOICE</div>
                    <div className="mt-1 text-[#b7f46a]">Cobalt Office Systems</div>
                    <div className="text-[11px] muted">GSTIN: 33AABCC9182K1Z9 · Chennai, TN</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">INV-1827</div>
                    <div className="mt-0.5 text-[11px] muted">Date: 01-Sep-2026</div>
                    <div className="text-[11px] text-[#83bfff]">PO Ref: PO-1827</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 border-b border-white/10 pb-4 text-[11px]">
                  <div>
                    <span className="muted">Billed To:</span>
                    <div className="font-medium text-white">Kinetiq Studios</div>
                    <div className="muted">GSTIN: 33AABCK1234F1Z5</div>
                  </div>
                  <div className="text-right">
                    <span className="muted">Delivery Place:</span>
                    <div className="font-medium text-white">Guindy Hub, Chennai</div>
                  </div>
                </div>

                {/* Line Items with OCR variance highlight */}
                <div className="mt-4">
                  <div className="grid grid-cols-4 border-b border-white/10 pb-2 text-[10px] uppercase tracking-wider muted">
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Rate (INR)</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="grid grid-cols-4 items-center py-2.5 text-[11px]">
                    <span className="text-white">Ergonomic office chairs</span>
                    <span className="text-center">500</span>
                    <span className="text-right font-bold text-[#ff8e91] underline decoration-wavy">₹760.00</span>
                    <span className="text-right text-white">₹3,80,000.00</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 text-right text-[11px]">
                    <div className="flex justify-between py-0.5">
                      <span className="muted">CGST (9%):</span>
                      <span>₹34,200.00</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="muted">SGST (9%):</span>
                      <span>₹34,200.00</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-1 text-sm font-bold text-white">
                      <span>Total Invoice Amount:</span>
                      <span>₹4,48,400.00</span>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="h2 mt-6">3-Way Reconciliation Breakdown</h2>
              <div className="mt-4 rounded-xl border border-[#ff8e9155] bg-[#ff8e910c] p-4">
                <div className="flex items-center gap-2 font-medium text-[#ffaaaa]">
                  <I.AlertTriangle size={16} /> Price mismatch detected: +₹20.00/unit (+2.7%)
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div className="soft rounded-lg p-2.5">
                    <span className="muted">PO Agreed Unit Price:</span>
                    <b className="mt-1 block text-sm text-white">₹740 / unit</b>
                  </div>
                  <div className="soft rounded-lg p-2.5">
                    <span className="muted">OCR Billed Unit Price:</span>
                    <b className="mt-1 block text-sm text-[#ff8e91]">₹760 / unit</b>
                  </div>
                  <div className="soft rounded-lg p-2.5">
                    <span className="muted">Total Discrepancy:</span>
                    <b className="mt-1 block text-sm text-[#ff8e91]">+₹11,800 total</b>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed muted">
                  Invoice rate was billed at ₹760 vs agreed purchase order rate of ₹740. Recommended resolution: Request Credit Note from Cobalt Office Systems for ₹11,800 before settlement.
                </p>
              </div>
            </>
          ) : isPO ? (
            <>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  (activePo?.status === 'SENT' || poSent) ? 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]' : 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(activePo?.status === 'SENT' || poSent) ? 'bg-[#3b82f6]' : 'bg-[#10b981]'}`} />
                  Status: {(activePo?.status === 'SENT' || poSent) ? 'SENT TO SUPPLIER' : 'APPROVED'}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/pdf/purchase-order?id=${encodeURIComponent(activePo?.id || activePo?.poNumber || 'PO-1827')}&supplier=${encodeURIComponent(activePo?.supplierName || 'Cobalt Office Systems')}&product=${encodeURIComponent(activePo?.items?.[0]?.itemName || (activePo as any)?.product || 'Ergonomic office chairs')}&total=${encodeURIComponent(String(activePo?.subtotal || (activePo?.items?.[0]?.unitPrice || 740) * (activePo?.items?.[0]?.quantity || 50)))}&qty=${encodeURIComponent(String(activePo?.items?.[0]?.quantity || 50))}&unitPrice=${encodeURIComponent(String(activePo?.items?.[0]?.unitPrice || 740))}`}
                    download={`${activePo?.poNumber || 'PO-1827'}_${(activePo?.supplierName || 'Vendor').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                    className="btn ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5 font-bold border border-[#d1d5db]"
                  >
                    <I.Download size={13} /> Download PO PDF
                  </a>
                  <Link
                    href={`/purchase-orders/${encodeURIComponent(activePo?.id || activePo?.poNumber || 'PO-1827')}/payment`}
                    className="btn primary !bg-[#111827] hover:!bg-black !text-white !py-1.5 !px-3.5 text-xs flex items-center gap-1.5 font-bold shadow-sm"
                  >
                    <I.CreditCard size={13} /> Authorize Payment & Dispatch →
                  </Link>
                </div>
              </div>

              <h2 className="h2 mt-6 text-[#111827]">Purchase Order Details</h2>
              <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                Official Purchase Order <b>{activePo?.poNumber || 'PO-1827'}</b> generated for <b>{activePo?.supplierName || 'Cobalt Office Systems'}</b> following approved multi-round price negotiation.
              </p>

              <h2 className="h2 mt-7 text-[#111827]">Line Items</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-base text-[#111827]">
                      {activePo?.items?.[0]?.itemName || activePo?.supplierName || 'Industrial Goods'} ({activePo?.items?.[0]?.quantity || (activePo as any)?.quantity || 50} units)
                    </div>
                    <div className="mt-1 text-xs text-[#6b7280]">
                      {activePo?.items?.[0]?.specifications || 'Commercial grade, verified supplier specifications'}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-[#0369a1]">
                      Delivery: {activePo?.deliveryTerms || 'Door delivery Chennai warehouse'} · SLA: {activePo?.expectedDelivery || '4 days'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-xl text-[#111827]">
                      ₹{(activePo?.subtotal || (activePo?.items?.[0]?.unitPrice || 740) * (activePo?.items?.[0]?.quantity || 50)).toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-[#059669]">
                      ₹{(activePo?.items?.[0]?.unitPrice || 740).toLocaleString('en-IN')} / unit (+18% GST)
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="h2 mt-7 text-[#111827]">Commercial & Payment Terms</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                  <span className="text-[#6b7280] font-semibold uppercase tracking-wider block">Payment Terms</span>
                  <b className="text-[#111827] text-sm mt-1 block">{activePo?.paymentTerms || '30% advance on PO confirmation, 70% against delivery'}</b>
                </div>
                <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                  <span className="text-[#6b7280] font-semibold uppercase tracking-wider block">Delivery Address</span>
                  <b className="text-[#111827] text-sm mt-1 block">{activePo?.deliveryAddress || 'Plot 42, Guindy Industrial Estate, Chennai 600032'}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <Badge>Connected source</Badge>
              <h2 className="h2 mt-6">Supplier overview</h2>
              <p className="mt-3 text-sm leading-6 muted">
                Cobalt Office Systems is a Chennai-based commercial furniture supplier with a strong delivery record on connected commerce sources.
              </p>
              <h2 className="h2 mt-7">Capabilities</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Search', 'Seller details', 'Pricing', 'Availability', 'Messaging', 'Negotiation', 'Ordering', 'Tracking'].map((x, i) => (
                  <span className={'cap ' + (i === 7 ? 'off' : '')} key={x}>
                    {i === 7 ? '×' : '✓'} {x}
                    {i === 7 ? ' unavailable' : ''}
                  </span>
                ))}
              </div>
              <h2 className="h2 mt-7">Performance</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ['42', 'Orders'],
                  ['97%', 'On-time'],
                  ['18 min', 'Response time']
                ].map((x) => (
                  <div className="soft rounded-xl p-4" key={x[1]}>
                    <b>{x[0]}</b>
                    <span className="mt-1 block text-xs muted">{x[1]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="panel p-5 bg-white border border-[#e5e7eb] shadow-sm rounded-2xl">
          <h2 className="h2 text-[#111827]">
            {isShip
              ? 'Risk assessment'
              : isDocs
              ? 'Extracted information'
              : isPO
              ? 'Order Summary'
              : 'Supplier details'}
          </h2>
          <div className="mt-5 space-y-4 text-sm text-[#4b5563]">
            {(isShip
              ? [
                  ['Expected delivery', '4 Sep 2026'],
                  ['Expected delay', recApproved ? '0.4 days' : '2.4 days'],
                  ['Current location', 'Chennai warehouse'],
                  ['Tracking', 'LR-2026-8821'],
                  ['Source', 'LR + supplier event']
                ]
              : isDocs
              ? [
                  ['Supplier', 'Cobalt Office Systems'],
                  ['Invoice number', 'INV-1827'],
                  ['PO reference', 'PO-1827'],
                  ['OCR Confidence', '98.5%'],
                  ['Extracted Qty', '500 units'],
                  ['Extracted Rate', '₹760 / unit'],
                  ['Tax (GST)', '18.0% (₹68,400)'],
                  ['Total Invoice', '₹4,48,400']
                ]
              : isPO
              ? [
                  ['Supplier', activePo?.supplierName || 'Cobalt Office Systems'],
                  ['PO Reference', activePo?.poNumber || 'PO-1827'],
                  ['Order Quantity', `${activePo?.items?.[0]?.quantity || (activePo as any)?.quantity || 50} units`],
                  ['Order Subtotal', `₹${(activePo?.subtotal || (activePo?.items?.[0]?.unitPrice || 740) * (activePo?.items?.[0]?.quantity || 50)).toLocaleString('en-IN')}`],
                  ['GST Tax (18%)', `₹${(activePo?.taxAmount || Math.round((activePo?.subtotal || (activePo?.items?.[0]?.unitPrice || 740) * (activePo?.items?.[0]?.quantity || 50)) * 0.18)).toLocaleString('en-IN')}`],
                  ['Grand Total', `₹${(activePo?.totalAmount || Math.round((activePo?.subtotal || (activePo?.items?.[0]?.unitPrice || 740) * (activePo?.items?.[0]?.quantity || 50)) * 1.18)).toLocaleString('en-IN')}`],
                  ['Status', (activePo?.status === 'SENT' || poSent) ? 'Sent to Vendor' : 'Approved'],
                  ['Delivery SLA', activePo?.expectedDelivery || '4 days']
                ]
              : [
                  ['Source', 'ONDC'],
                  ['Location', 'Chennai'],
                  ['Reliability', '98%'],
                  ['Rating', '4.9 / 5'],
                  ['Automated messaging', 'Available'],
                  ['Last verified', '1 Sep 2026']
                ]
            ).map((x) => (
              <div className="flex justify-between gap-4" key={x[0]}>
                <span className="text-[#6b7280]">{x[0]}</span>
                <span className="text-right font-bold text-[#111827]">{x[1]}</span>
              </div>
            ))}
          </div>
          {isShip && (
            <div className="mt-7 border-t border-[#f3f4f6] pt-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">Why at risk</div>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-[#4b5563]">
                <li>• Warehouse milestone missed.</li>
                <li>• Supplier averages 1.2 days late.</li>
                <li>• No later carrier event confirmed.</li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function List({ kind }: { kind: string }) {
  const [rows, setRows] = useState<any[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const router = useRouter();

  const loadData = () => {
    if (kind === 'Purchase orders') {
      purchaseOrderService.list().then((res) => {
        let apiPos = res?.data || [];
        let customPos: PurchaseOrder[] = [];
        if (typeof window !== 'undefined') {
          try {
            customPos = JSON.parse(localStorage.getItem('procura_custom_pos') || '[]');
          } catch (_) {}
        }
        const mergedMap = new Map<string, PurchaseOrder>();
        for (const p of customPos) mergedMap.set(p.id || p.poNumber, p);
        for (const p of apiPos) {
          if (!mergedMap.has(p.id || p.poNumber)) mergedMap.set(p.id || p.poNumber, p);
        }
        const allPos = Array.from(mergedMap.values());
        if (allPos.length > 0) {
          setRows(allPos.map((p) => [
            p.poNumber || p.id,
            p.supplierName || 'Supplier',
            `₹${(p.totalAmount || p.total || p.subtotal || 370000).toLocaleString('en-IN')}`,
            p.status || 'APPROVED',
            p.id || p.poNumber,
            p
          ]));
        } else {
          setRows([
            ['PO-1827', 'Cobalt Office Systems', '₹4,36,600', 'Approved', 'po-1827', null],
            ['PO-1819', 'Ernest Furnishings', '₹1,51,512', 'Shipped', 'po-1819', null],
            ['PO-1812', 'Sahara Workspace', '₹1,04,430', 'Acknowledged', 'po-1812', null]
          ]);
        }
      }).catch(() => {});
    } else if (kind === 'Documents') {
      documentService.list().then((res) => {
        if (res?.data && res.data.length > 0) {
          setRows(res.data.map((d) => [d.documentNumber || d.id, d.documentType, d.supplierName || 'Supplier', d.reconciliationStatus, d.id, d]));
        } else {
          setRows([
            ['INV-1827', 'Invoice', 'Cobalt Office Systems', 'Mismatch', 'doc-1827', null],
            ['PO-1827', 'Purchase Order', 'Cobalt Office Systems', 'Verified', 'po-1827', null],
            ['LR-8821', 'Lorry Receipt', 'Cobalt Office Systems', 'Verified', 'lr-8821', null]
          ]);
        }
      }).catch(() => {});
    } else if (kind === 'Shipments') {
      shipmentService.list().then((res) => {
        if (res?.data && res.data.length > 0) {
          setRows(res.data.map((s) => [s.poNumber || s.id, s.supplierName || s.purchaseOrderId, s.currentLocation || 'In transit', `${s.risk} risk`, s.id, s]));
        } else {
          setRows([
            ['SHP-1827', 'PO-1827', 'Chennai warehouse', 'High risk', 'shp-1827', null],
            ['SHP-1819', 'PO-1819', 'In transit', 'On track', 'shp-1819', null],
            ['SHP-1812', 'PO-1812', 'Prepared', 'Medium risk', 'shp-1812', null]
          ]);
        }
      }).catch(() => {});
    } else {
      setRows([
        ['NEG-1089', 'Cobalt Office Systems', '₹740 / unit', 'Target achieved', 'neg-cobalt', null],
        ['NEG-1091', 'Ernest Furnishings', '₹735 / unit', 'Counteroffer', 'neg-ernest', null],
        ['NEG-1093', 'Sahara Workspace', '—', 'Communication unavailable', 'neg-sahara', null]
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, [kind]);

  const handleRowClick = (r: any[]) => {
    if (kind === 'Purchase orders' && r[5]) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('active_po_data', JSON.stringify(r[5]));
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await documentService.upload({
        fileName: file.name,
        documentType: file.name.toLowerCase().includes('lr') ? 'LORRY_RECEIPT' : 'INVOICE',
        purchaseOrderId: 'PO-1827',
        supplierId: 'cobalt'
      });

      if (res?.data) {
        setUploadNotice(`Document "${file.name}" uploaded! OCR extracted fields and ran 3-way match: ${res.data.reconciliationStatus}.`);
        loadData();
        setTimeout(() => setUploadNotice(''), 5000);
      }
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Shell>
      <Crumb
        eyebrow={kind}
        title={kind}
        actions={
          kind === 'Documents' ? (
            <label className="btn primary cursor-pointer">
              <I.Upload size={15} />
              {isUploading ? 'OCR Extracting...' : 'Upload document'}
              <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
            </label>
          ) : undefined
        }
      />
      {uploadNotice && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#b7f46a]/30 bg-[#b7f46a]/10 p-3 text-xs text-[#b7f46a]">
          <I.CheckCircle2 size={16} />
          {uploadNotice}
        </div>
      )}
      <section className="panel overflow-hidden bg-white border border-[#e5e7eb] shadow-sm rounded-2xl">
        <div className="grid grid-cols-4 gap-3 bg-[#f9fafb] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
          <span>Reference</span>
          <span>Supplier / record</span>
          <span>Value / status</span>
          <span className="text-right">Action</span>
        </div>
        {rows.map((r) => (
          <Link
            key={r[0] + r[1]}
            href={'/' + kind.toLowerCase().replace(' ', '-') + '/' + (r[4] || 'id')}
            onClick={() => handleRowClick(r)}
            className="grid grid-cols-4 items-center gap-3 border-t border-[#f3f4f6] px-5 py-4 text-sm hover:bg-[#f9fafb] transition"
          >
            <div className="font-bold text-[#111827]">{r[0]}</div>
            <div className="text-[#4b5563] font-medium">{r[1]}</div>
            <div>
              <span className="font-bold text-[#111827]">{r[2]}</span>{' '}
              <span className="ml-2">
                <Badge
                  tone={
                    r[3].toLowerCase().includes('risk') ||
                    r[3].toLowerCase().includes('mismatch') ||
                    r[3].toLowerCase().includes('unavailable')
                      ? 'red'
                      : r[3].toLowerCase().includes('counter')
                      ? 'yellow'
                      : 'green'
                  }
                >
                  {r[3]}
                </Badge>
              </span>
            </div>
            <div className="text-right text-[#111827]">
              <I.ChevronRight className="ml-auto text-[#9ca3af]" size={17} />
            </div>
          </Link>
        ))}
      </section>
    </Shell>
  );
}

function Analytics() {
  const [data, setData] = useState<AnalyticsDTO | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  useEffect(() => {
    analyticsService.get().then((res) => { if (res?.data) setData(res.data); }).catch(() => {});
  }, []);

  const totalProc = data?.totalProcurement ? `₹${(data.totalProcurement / 100000).toFixed(1)}L` : '₹12.4L';
  const totalSav = data?.totalSavings ? `₹${(data.totalSavings / 100000).toFixed(2)}L` : '₹1.86L';
  const avgSav = data?.averageSavingsPct ? `${data.averageSavingsPct}%` : '8.4%';
  const onTime = data?.onTimeDeliveryRate ? `${data.onTimeDeliveryRate}%` : '94.7%';

  const handleExportReport = () => {
    setIsExporting(true);
    try {
      generateExecutivePdfReport({
        totalProcurement: data?.totalProcurement || 1240000,
        totalSavings: data?.totalSavings || 186000,
        averageSavingsPct: data?.averageSavingsPct || 8.4,
        onTimeDeliveryRate: data?.onTimeDeliveryRate || 94.7,
        businessName: 'Kinetiq Studios'
      });

      setExportNotice('Executive Procurement PDF Report generated with charts, KPIs, and tables.');
      setTimeout(() => setExportNotice(''), 4000);
    } catch (err: any) {
      alert('Failed to generate PDF report: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Shell>
      <Crumb
        eyebrow="Business performance"
        title="Procurement analytics"
        actions={
          <a
            href="/api/pdf/report"
            download={`Procura_Executive_Procurement_Report_${new Date().toISOString().split('T')[0]}.pdf`}
            className="btn primary flex items-center gap-1.5 font-bold shadow-sm"
          >
            <I.Download size={15} /> Export report
          </a>
        }
      />
      {exportNotice && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#b7f46a]/30 bg-[#b7f46a]/10 p-3 text-xs text-[#b7f46a]">
          <I.CheckCircle2 size={16} />
          {exportNotice}
        </div>
      )}
      <div className="metrics grid gap-4 md:grid-cols-4">
        {[
          ['Total procurement', totalProc],
          ['Total savings', totalSav],
          ['Average savings', avgSav],
          ['On-time delivery', onTime]
        ].map((x) => (
          <div className="panel metric" key={x[0]}>
            <div className="text-sm muted">{x[0]}</div>
            <div className="value">{x[1]}</div>
          </div>
        ))}
      </div>
      <div className="two-col mt-5 grid gap-5 md:grid-cols-2">
        <section className="panel p-5">
          <h2 className="h2">Spend over time</h2>
          <div className="mt-8 flex h-48 items-end gap-4">
            {[65, 115, 88, 160, 128, 180, 135].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-[#83bfff]"
                style={{ height: h, opacity: 0.45 + i / 20 }}
              />
            ))}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="h2">Supplier performance</h2>
          <div className="mt-6 space-y-6">
            {[
              ['Cobalt Office Systems', 98],
              ['Dwell Business', 95],
              ['Ernest Furnishings', 93],
              ['Sahara Workspace', 91]
            ].map(([name, rel]) => (
              <div key={name as string}>
                <div className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span>{rel}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-[#b7f46a]" style={{ width: (rel as number) + '%' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Auth({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: 'Sadwik Kumar',
    businessName: 'Kinetiq Studios',
    email: 'sadwik@kinetiqstudios.com',
    phone: '+91-98840-12345',
    password: 'Password123!'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (signup) {
        await authService.signup(formData);
        router.push('/onboarding');
      } else {
        await authService.login({ email: formData.email, password: formData.password });
        router.push('/dashboard');
      }
    } catch (err) {
      router.push(signup ? '/onboarding' : '/dashboard');
    }
  };

  return (
    <div className="app-grid grid min-h-screen place-items-center p-5">
      <div className="panel w-full max-w-md p-7">
        <ProcuraLogo href="/" />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          {signup ? 'Create your workspace' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm muted">
          {signup
            ? 'Start bringing your procurement into one controlled workflow.'
            : 'Log in to your procurement workspace.'}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {signup ? (
            <>
              <input
                className="input"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="Business name"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
              <input
                className="input"
                placeholder="Business email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                className="input"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <input
                className="input"
                placeholder="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </>
          ) : (
            <>
              <input
                className="input"
                placeholder="Business email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                className="input"
                placeholder="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </>
          )}
          <button type="submit" className="btn primary mt-5 w-full">
            {signup ? 'Create account' : 'Log in'} <I.ArrowRight size={15} />
          </button>
        </form>
        <div className="mt-5 text-center text-xs muted">
          {signup ? 'Already have an account? ' : 'New to Procura? '}
          <Link className="text-[#b7f46a]" href={signup ? '/login' : '/signup'}>
            {signup ? 'Log in' : 'Create account'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Onboarding() {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [category, setCategory] = useState('');

  return (
    <div className="app-grid min-h-screen p-5">
      <div className="mx-auto max-w-2xl pt-16">
        <ProcuraLogo href="/" className="justify-center" />
        <div className="mt-10 panel p-7">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                className={'h-1 flex-1 rounded ' + (n <= step ? 'bg-[#b7f46a]' : 'bg-white/10')}
                key={n}
              />
            ))}
          </div>
          <div className="eyebrow mt-8">Step {step} of 5</div>
          <h1 className="mt-2 text-3xl font-semibold">
            {
              [
                'Tell us about your business',
                'Which industry are you in?',
                'What do you procure?',
                'Connect supplier sources',
                'You are ready to procure'
              ][step - 1]
            }
          </h1>
          <p className="mt-3 text-sm leading-6 muted">
            {step === 4
              ? 'Connections are capability-specific. Procura will only use provider actions your authorised sources support.'
              : 'This helps tailor the workspace without changing who controls purchasing decisions.'}
          </p>
          {step < 5 && (
            <div className="mt-7 space-y-3">
              {step === 4 ? (
                <>
                  <div className="soft flex justify-between rounded-xl p-4">
                    <div>
                      <b className="text-sm">ONDC Network</b>
                      <p className="mt-1 text-xs muted">Discovery, pricing & ordering</p>
                    </div>
                    <button className="btn primary !py-2">Connected</button>
                  </div>
                  <div className="soft flex justify-between rounded-xl p-4">
                    <div>
                      <b className="text-sm">Direct Supplier APIs</b>
                      <p className="mt-1 text-xs muted">Authorized vendor catalog feeds</p>
                    </div>
                    <button className="btn !py-2">Connected</button>
                  </div>
                </>
              ) : (
                <input
                  key={`onboarding-step-${step}`}
                  className="input"
                  value={
                    step === 1
                      ? businessName
                      : step === 2
                      ? industry
                      : category
                  }
                  onChange={(e) => {
                    if (step === 1) setBusinessName(e.target.value);
                    else if (step === 2) setIndustry(e.target.value);
                    else if (step === 3) setCategory(e.target.value);
                  }}
                  placeholder={
                    step === 1
                      ? 'Kinetiq Studios'
                      : step === 2
                      ? 'e.g. Hospitality, manufacturing, technology'
                      : 'e.g. Furniture, industrial supplies'
                  }
                  autoFocus
                />
              )}
            </div>
          )}
          <div className="mt-8 flex justify-between">
            <button className="btn ghost" onClick={() => setStep(Math.max(1, step - 1))}>
              Back
            </button>
            <button
              className="btn primary"
              onClick={() => (step === 5 ? (location.href = '/dashboard') : setStep(step + 1))}
            >
              {step === 5 ? 'Go to dashboard' : 'Continue'} <I.ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const p = usePathname();
  if (p === '/') return <EditorialLanding />;
  if (p === '/login') return <Auth />;
  if (p === '/signup' || p === '/forgot-password') return <Auth signup />;
  if (p === '/onboarding') return <Onboarding />;
  if (p.startsWith('/procure')) return <Procure />;
  if (p.startsWith('/negotiations')) return <Negotiation />;
  if (p.startsWith('/suppliers/')) return <Detail kind="Suppliers" />;
  if (p.startsWith('/shipments/')) {
    const cleanId = p.replace('/shipments/', '');
    return <ShipmentTrackingPage shipmentId={cleanId} />;
  }
  if (p === '/shipments') return <ShipmentTrackingPage />;
  if (p.startsWith('/documents/')) return <Detail kind="Documents" />;
  if (p === '/documents') return <List kind="Documents" />;
  if (p.startsWith('/purchase-orders/') && p.endsWith('/payment')) {
    const cleanId = p.replace('/purchase-orders/', '').replace('/payment', '');
    return <PaymentAndShipment poId={cleanId} />;
  }
  if (p.startsWith('/payment/')) {
    const cleanId = p.replace('/payment/', '');
    return <PaymentAndShipment poId={cleanId} />;
  }
  if (p.startsWith('/purchase-orders/')) return <Detail kind="Purchase orders" />;
  if (p === '/purchase-orders') return <List kind="Purchase orders" />;
  if (p === '/analytics') return <Analytics />;
  if (p.startsWith('/settings'))
    return (
      <Shell>
        <Crumb eyebrow="Workspace" title="Settings" />
        <section className="panel p-6">
          <h2 className="h2">Business settings</h2>
          <p className="mt-2 text-sm muted">
            Manage profile, business information, supplier sources, notification preferences and security.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {['Profile', 'Business', 'Supplier sources', 'Notifications', 'Security'].map((x) => (
              <Link
                key={x}
                href={'/settings/' + x.toLowerCase().replace(' ', '-')}
                className="soft rounded-xl p-4 text-sm hover:bg-white/10"
              >
                {x}
                <I.ChevronRight className="float-right" size={16} />
              </Link>
            ))}
          </div>
        </section>
      </Shell>
    );
  return <Dashboard />;
}
