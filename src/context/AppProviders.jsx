// src/context/AppProviders.jsx
import { NetworkProvider } from "./NetworkContext";
import { AuthProvider } from "./AuthContext";
import { CartProvider } from "./CartContext";
import { NotificationProvider } from "./NotificationContext";

export default function AppProviders({ children }) {
  return (
    <NetworkProvider>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>{children}</CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}