import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/authContext";

/**
 * The client-side half of access control.
 *
 * Worth being precise about what this does and does not do: it decides what is
 * *rendered*, nothing more. It is not the security boundary — every
 * /api/admin/* route is behind `requireAuth` on the server, so a visitor who
 * skips this component by calling the API directly still gets a 401. This
 * exists so a signed-out admin sees the login screen instead of a dashboard
 * frame full of failed requests.
 *
 * While `status` is "checking" it renders a quiet hold rather than redirecting.
 * Redirecting on unknown is the bug that logs you out every time you refresh.
 */
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <div className="ts-dash-boot" role="status" aria-live="polite">
        <span className="ts-label">CHECKING SESSION</span>
      </div>
    );
  }

  if (status !== "authenticated") {
    // `state.from` lets the login screen send them back where they were going.
    return <Navigate to="/dashboard/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
