import { LogOut, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Navbar = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>Manage your finances in one place.</p>
      </div>

      <div className="user-section">
        <div className="user-info">
          <UserCircle size={22} />
          <span>{user?.name}</span>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;