import { Button, Icon } from "@repo/ui";

const menuItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Products", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Settings", href: "/admin/settings" },
];

export function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
      </div>
      <nav className="px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.label}>
              <Button variant="ghost" className="w-full justify-start">
                <a href={item.href}>{item.label}</a>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
