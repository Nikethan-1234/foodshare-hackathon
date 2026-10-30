import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AppLayout } from "./components/layout/AppLayout";
import { PageLoading } from "./components/ui/LoadingState";

// Auth pages
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));

// Donor pages
const DonorDashboard = lazy(() => import("./pages/donor/DashboardPage"));
const DonorListings = lazy(() => import("./pages/donor/ListingsPage"));
const DonorRequestsPage = lazy(() => import("./pages/donor/RequestsPage"));
const DonorRecurringPage = lazy(() => import("./pages/donor/RecurringPage"));
const NewListing = lazy(() => import("./pages/donor/NewListingPage"));
const EditListingPage = lazy(() => import("./pages/donor/EditListingPage"));
const DonorProfilePage = lazy(() => import("./pages/donor/ProfilePage"));

// Recipient pages
const RecipientDashboard = lazy(() => import("./pages/recipient/DashboardPage"));
const BrowsePage = lazy(() => import("./pages/recipient/BrowsePage"));
const RequestsPage = lazy(() => import("./pages/recipient/RequestsPage"));
const RecipientProfilePage = lazy(() => import("./pages/recipient/ProfilePage"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/DashboardPage"));
const AdminListings = lazy(() => import("./pages/admin/ListingsPage"));
const AdminUsers = lazy(() => import("./pages/admin/UsersPage"));
const AdminReports = lazy(() => import("./pages/admin/ReportsPage"));

// Error pages
const UnauthorizedPage = lazy(() => import("./pages/UnauthorizedPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Auth */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Donor */}
              <Route element={<AppLayout roles={["donor"]} />}>
                <Route path="/donor/dashboard" element={<DonorDashboard />} />
                <Route path="/donor/listings" element={<DonorListings />} />
                <Route path="/donor/recurring" element={<DonorRecurringPage />} />
                <Route path="/donor/requests" element={<DonorRequestsPage />} />
                <Route path="/donor/listings/new" element={<NewListing />} />
                <Route path="/donor/listings/:id/edit" element={<EditListingPage />} />
                <Route path="/donor/profile" element={<DonorProfilePage />} />
              </Route>

              {/* Recipient */}
              <Route element={<AppLayout roles={["recipient"]} />}>
                <Route path="/recipient/dashboard" element={<RecipientDashboard />} />
                <Route path="/recipient/browse" element={<BrowsePage />} />
                <Route path="/recipient/requests" element={<RequestsPage />} />
                <Route path="/recipient/profile" element={<RecipientProfilePage />} />
              </Route>

              {/* Admin */}
              <Route element={<AppLayout roles={["admin"]} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/listings" element={<AdminListings />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/reports" element={<AdminReports />} />
              </Route>

              {/* Errors */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
  );
}
