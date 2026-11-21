import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  ChartNoAxesCombined,
  Wallet,
  PiggyBank,
  Target,
} from "lucide-react";

const Sidebar = () => {
  const links = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", path: "/transactions", icon: Receipt },
    { name: "Analytics", path: "/analytics", icon: ChartNoAxesCombined },
    { name: "Accounts", path: "/accounts", icon: Wallet },
    { name: "Budgets", path: "/budgets", icon: PiggyBank },
    { name: "Savings Goals", path: "/savings-goals", icon: Target },
  ];

  return (
    <aside className="sidebar">
      <h2 className="brand">
        Expense<span>Flow</span>
      </h2>

      <nav>
        {links.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        Personal Finance Manager
      </div>
    </aside>
  );
};

export default Sidebar;