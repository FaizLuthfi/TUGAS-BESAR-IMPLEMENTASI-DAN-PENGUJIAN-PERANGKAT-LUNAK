// src/pages/customer/MenuCatalogPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  WifiOff,
} from "lucide-react";
import { menuService } from "../../services/menuService";
import { orderService } from "../../services/orderService";
import { LOW_STOCK_THRESHOLD } from "../../models/constant";
import { ORDER_STATUS } from "../../models/constant";
import { PAYMENT_METHOD } from "../../models/constant";
import { STORAGE_KEYS } from "../../models/constant";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import Modal from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import { formatRupiah } from "../../utils/format";

const ALL = "Semua";

function StockBadge({ stock }) {
  if (stock <= 0) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Habis</span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      Tersedia{stock <= LOW_STOCK_THRESHOLD ? ` · sisa ${stock}` : ""}
    </span>
  );
}

function MenuCard({ menu, inCartQty, onAdd, recommended = false }) {
  const soldOut = menu.stock <= 0;
  const reachedMax = inCartQty >= menu.stock;
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        soldOut ? "border-stone-200 opacity-70" : recommended ? "border-amber-300" : "border-stone-200"
      }`}
    >
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-6xl">
        <span aria-hidden="true" className={soldOut ? "grayscale" : ""}>
          {menu.emoji}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-stone-900">{menu.name}</h3>
          <StockBadge stock={menu.stock} />
        </div>
        <p className="mt-1 flex-1 text-sm text-stone-500">{menu.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-base font-extrabold text-amber-800">{formatRupiah(menu.price)}</span>
          <button
            type="button"
            disabled={soldOut || reachedMax}
            onClick={() => onAdd(menu)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <Plus className="h-4 w-4" />
            {soldOut ? "Habis" : "Tambah"}
          </button>
        </div>
        {inCartQty > 0 && (
          <p className="mt-2 text-xs font-medium text-amber-700">Di keranjang: {inCartQty}</p>
        )}
      </div>
    </article>
  );
}

export default function MenuCatalogPage() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const menus = useAsync(() => menuService.getAll(), [], { refreshOn: [STORAGE_KEYS.menus] });
  const orders = useAsync(
    () => orderService.getByCustomer(user.customerId),
    [user.customerId],
    { refreshOn: [STORAGE_KEYS.orders] }
  );
  useLiveRefresh(menus.reload, 5000);
  useLiveRefresh(orders.reload, 10000);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [notice, setNotice] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState(PAYMENT_METHOD.QRIS);
  const [cartError, setCartError] = useState("");
  const [orderResult, setOrderResult] = useState(null);

  const menuList = menus.data || [];

  useEffect(() => {
    if (location.state?.openCart) {
      setCartOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (address || !orders.data || orders.data.length === 0) return;
    const latest = [...orders.data].sort((a, b) => b.orderDate.localeCompare(a.orderDate))[0];
    if (latest?.deliveryAddress) setAddress(latest.deliveryAddress);
  }, [orders.data, address]);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(menuList.map((m) => m.category).filter(Boolean)))],
    [menuList]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuList.filter((m) => {
      if (category !== ALL && m.category !== category) return false;
      if (onlyAvailable && m.stock <= 0) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    });
  }, [menuList, query, category, onlyAvailable]);

  const recommended = useMemo(() => {
    const count = {};
    (orders.data || []).forEach((o) => {
      const last = o.statusHistory[o.statusHistory.length - 1]?.status;
      if (last === ORDER_STATUS.DIBATALKAN) return;
      o.items.forEach((it) => {
        count[it.menuId] = (count[it.menuId] || 0) + it.quantity;
      });
    });
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .map(([id, qty]) => ({ menu: menuList.find((m) => m.menuId === id), qty }))
      .filter((x) => x.menu && x.menu.stock > 0)
      .slice(0, 3);
  }, [orders.data, menuList]);

  const qtyInCart = (id) => cart.items.find((i) => i.menuId === id)?.quantity || 0;
  const stockOf = (id) => menuList.find((m) => m.menuId === id)?.stock ?? 0;

  const handleAdd = (menu) => {
    const res = cart.addToCart(menu, 1);
    setNotice(
      res.ok
        ? { type: "success", text: `${menu.name} ditambahkan ke keranjang` }
        : { type: "error", text: res.message }
    );
  };

  const changeQty = (item, next) => {
    setCartError("");
    const res = cart.updateQuantity(item.menuId, next, stockOf(item.menuId));
    if (!res.ok) setCartError(res.message);
  };

  const closeCart = () => {
    setCartOpen(false);
    setOrderResult(null);
    setCartError("");
  };

  const checkout = async () => {
    setCartError("");
    if (!address.trim()) {
      setCartError("Alamat pengiriman wajib diisi");
      return;
    }
    const res = await cart.placeOrder({ deliveryAddress: address, paymentMethod: payment });
    if (res.ok) {
      setOrderResult(res.order);
      menus.reload(true);
      orders.reload(true);
    } else {
      setCartError(res.message);
    }
  };

  const offlineWithData = menus.error && menus.data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-amber-50">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-28">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-stone-900">Menu Warkop99</h1>
          <p className="text-sm text-stone-500">
            Ketersediaan stok diperbarui otomatis. Pilih menu favoritmu dan pesan sekarang.
          </p>
        </div>

        {offlineWithData && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <WifiOff className="h-4 w-4" />
            Koneksi terputus. Menampilkan data terakhir yang berhasil dimuat.
          </div>
        )}

        {notice && (
          <div
            className={`fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg ${
              notice.type === "success" ? "bg-stone-900 text-white" : "bg-red-600 text-white"
            }`}
            role="status"
          >
            {notice.text}
          </div>
        )}

        {menus.loading && !menus.data && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-stone-200" />
            ))}
          </div>
        )}

        {menus.error && !menus.data && (
          <EmptyState
            icon={WifiOff}
            title="Gagal memuat menu"
            message={menus.error.message}
            action={
              <button
                type="button"
                onClick={() => menus.reload()}
                className="flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </button>
            }
          />
        )}

        {menus.data && (
          <>
            {recommended.length > 0 && (
              <section className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <h2 className="text-lg font-bold text-stone-900">Rekomendasi Untukmu</h2>
                </div>
                <p className="mb-3 text-sm text-stone-500">
                  Berdasarkan menu yang paling sering kamu pesan.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recommended.map(({ menu, qty }) => (
                    <div key={menu.menuId} className="relative">
                      <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-bold text-white shadow">
                        Dipesan {qty}×
                      </span>
                      <MenuCard
                        menu={menu}
                        recommended
                        inCartQty={qtyInCart(menu.menuId)}
                        onAdd={handleAdd}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari menu..."
                    className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                        category === c
                          ? "bg-amber-700 text-white"
                          : "bg-white text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                  <label className="flex cursor-pointer items-center gap-2 pl-1 text-sm text-stone-600">
                    <input
                      type="checkbox"
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-500"
                    />
                    Hanya tersedia
                  </label>
                </div>
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="Menu tidak ditemukan"
                  message="Coba ubah kata kunci pencarian atau filter yang dipilih."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((m) => (
                    <MenuCard
                      key={m.menuId}
                      menu={m}
                      inCartQty={qtyInCart(m.menuId)}
                      onAdd={handleAdd}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-amber-700 px-5 py-3.5 font-bold text-white shadow-xl transition hover:bg-amber-800"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="hidden sm:inline">Keranjang</span>
        {cart.totalItems > 0 && (
          <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white px-1.5 text-xs font-extrabold text-amber-800">
            {cart.totalItems}
          </span>
        )}
      </button>

      <Modal
        open={cartOpen}
        onClose={closeCart}
        title={orderResult ? "Pesanan Dibuat" : "Keranjang & Checkout"}
        footer={
          !orderResult && cart.items.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">Total Pembayaran</span>
                <span className="text-xl font-extrabold text-amber-800">
                  {formatRupiah(cart.totalPrice)}
                </span>
              </div>
              <button
                type="button"
                onClick={checkout}
                disabled={cart.placing}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-3 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-60"
              >
                {cart.placing && <Loader2 className="h-4 w-4 animate-spin" />}
                {cart.placing ? "Memproses..." : "Pesan Sekarang"}
              </button>
            </div>
          ) : null
        }
      >
        {orderResult ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
            <h3 className="mt-3 text-lg font-extrabold text-stone-900">Pesanan Berhasil Dibuat</h3>
            <p className="mt-1 text-sm text-stone-600">
              Nomor pesanan <b>{orderResult.orderId}</b> ({formatRupiah(orderResult.totalPrice)}) telah
              dikirim ke pegawai dan menunggu konfirmasi.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  navigate("/status");
                }}
                className="rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-800"
              >
                Lihat Status Pesanan
              </button>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Pesan Lagi
              </button>
            </div>
          </div>
        ) : cart.items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Keranjang masih kosong"
            message="Tambahkan menu favoritmu dari daftar menu."
          />
        ) : (
          <div className="space-y-5">
            <ul className="divide-y divide-stone-100">
              {cart.items.map((item) => {
                const stock = stockOf(item.menuId);
                const over = item.quantity > stock;
                return (
                  <li key={item.menuId} className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-2xl">
                        {item.emoji || "🍽️"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-stone-900">{item.menuName}</p>
                        <p className="text-xs text-stone-500">{formatRupiah(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => changeQty(item, item.quantity - 1)}
                          className="rounded-md border border-stone-300 p-1.5 hover:bg-stone-50"
                          aria-label="Kurangi"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(item, item.quantity + 1)}
                          className="rounded-md border border-stone-300 p-1.5 hover:bg-stone-50"
                          aria-label="Tambah"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="w-20 text-right text-sm font-bold text-stone-900">
                        {formatRupiah(item.subTotal)}
                      </p>
                      <button
                        type="button"
                        onClick={() => cart.removeFromCart(item.menuId)}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                        aria-label="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {over && (
                      <p className="mt-1 flex items-center gap-1 pl-15 text-xs font-medium text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Stok tersisa {stock}. Kurangi jumlah pesanan.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700" htmlFor="address">
                Alamat Pengiriman
              </label>
              <textarea
                id="address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Telekomunikasi No. 1, Bandung"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-stone-700">Metode Pembayaran</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  [PAYMENT_METHOD.QRIS, QrCode],
                  [PAYMENT_METHOD.TUNAI, Banknote],
                ].map(([m, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayment(m)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                      payment === m
                        ? "border-amber-600 bg-amber-50 text-amber-800"
                        : "border-stone-300 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {m}
                  </button>
                ))}
              </div>
              {payment === PAYMENT_METHOD.QRIS ? (
                <div className="mt-3 flex items-center gap-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
                  <QrCode className="h-20 w-20 shrink-0 text-stone-800" />
                  <p className="text-xs text-stone-500">
                    Simulasi QRIS: pindai kode ini lalu bayar sebesar{" "}
                    <b className="text-stone-800">{formatRupiah(cart.totalPrice)}</b>. Pembayaran otomatis
                    dianggap berhasil setelah pesanan dibuat.
                  </p>
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs text-stone-500">
                  Bayar tunai langsung kepada kurir saat pesanan tiba.
                </p>
              )}
            </div>

            {cartError && (
              <div
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{cartError}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}