import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ToastContainer from "./components/ToastContainer";

// Halaman Publik
import LoginPage from "./pages/loginPage";

// Halaman Customer
import MenuCatalogPage from "./pages/customer/MenuCatalogPage";
// import OrderStatusPage from "./pages/customer/OrderStatusPage";
// import OrderHistoryPage from "./pages/customer/OrderHistoryPage";

// // Halaman Pegawai
// import EmployeeDashboardPage from "./pages/employee/EmployeeDashboardPage";
// import IncomingOrdersPage from "./pages/employee/IncomingOrdersPage";
// import StockManagementPage from "./pages/employee/StockManagementPage";
// import AddMenuPage from "./pages/employee/AddMenuPage";

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <Navbar />
      <ToastContainer />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          {/* Default & Autentikasi */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Path Halaman Customer */}
          <Route
            path="/menu"
            element={
              <ProtectedRoute allowedRole="customer">
                <MenuCatalogPage />
              </ProtectedRoute>
            }
          />
          {/* <Route
            path="/status-pesanan"
            element={
              <ProtectedRoute allowedRole="customer">
                <OrderStatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/riwayat-pesanan"
            element={
              <ProtectedRoute allowedRole="customer">
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          /> */}

          

          {/* Jika URL tidak ditemukan */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}