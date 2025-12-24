import { DashboardCard } from "@/components/DashboardCard";

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Users"
          value="1,234"
          description="+20.1% from last month"
        />
        <DashboardCard
          title="Total Orders"
          value="456"
          description="+15.3% from last month"
        />
        <DashboardCard
          title="Revenue"
          value="$12,345"
          description="+7.2% from last month"
        />
        <DashboardCard
          title="Active Sessions"
          value="89"
          description="Currently online"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>New user registered</span>
              <span className="text-sm text-gray-500">2 hours ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Order #1234 completed</span>
              <span className="text-sm text-gray-500">4 hours ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Product updated</span>
              <span className="text-sm text-gray-500">1 day ago</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
              Add New User
            </button>
            <button className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
              Create Product
            </button>
            <button className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600">
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
