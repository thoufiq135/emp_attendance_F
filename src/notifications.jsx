// Notification.jsx

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
function Notification() {
    const[mydata,setdata]=useState("")
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
 useEffect(()=>{
 const loginToken = localStorage.getItem("LoginToken");
    const data_my = jwtDecode(loginToken);
   
setdata(data_my)
 },[])
async function handleAction(item, action) {
  try {
    const token = localStorage.getItem("LoginToken");
    const head = jwtDecode(token);
   
setdata(head)
    const response = await fetch(
      "https://emp-backend.stackenzo.com/api/fill/approveOutside",
      {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
          
        },
        body: JSON.stringify({
          attendanceId: item.attendance_id,
          employeeId: item.from_user_id,
          type: item.type,
          action,
          headId: head.id,
          NotificationId:item.id
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert(data.message);

    setNotifications((prev) =>
      prev.filter((n) => n.id !== item.id)
    );
  } catch (err) {
    console.log(err);
    alert("Failed");
  }
}

  async function getUnreadCount() {
    try {
      const response = await fetch(
        "https://emp-backend.stackenzo.com/api/notifications/unreadCount"
      );

      const data = await response.json();

      if (data.success) {
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function getNotifications() {
    try {
      setLoading(true);
const token=localStorage.get("LoginToken")
      const response = await fetch(
        "https://emp-backend.stackenzo.com/api/notifications/getNotifications",{
            method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
          
        },
        }
      );

      const data = await response.json();
console.log(data)
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(0);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getUnreadCount();
    getNotifications();

    const interval = setInterval(() => {
      getUnreadCount();
      getNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-700">
            🔔 Notifications
          </h1>

          <div className="relative">
            <span className="text-3xl">🔔</span>

            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {unreadCount}
              </div>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-3xl p-6 shadow text-center">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 shadow text-center text-gray-500">
              No notifications found
            </div>
          ) : (
            notifications.map((item, index) => (
              <div
                key={item.id || index}
                className="bg-white rounded-3xl shadow-lg p-5 hover:shadow-xl duration-300"
              >
               <h2 className="font-bold text-lg text-slate-700">
  {item.from_name}
</h2>



<p className="text-gray-600 break-words">
  Requested approval for <b>{item.type}</b>
</p>

<p className="text-gray-500 text-sm mt-1">
  Reason: {item.reason||item.message}
</p>

<p className="text-gray-500 text-sm">
  Department: {item.department||mydata.departments}
</p>

               <div className="mt-3 text-sm text-gray-400">
  {new Date(item.timestamp).toLocaleString()}
</div>

{item.reason && (
  <div className="flex gap-3 mt-4">
    <button
      onClick={() => handleAction(item, "approve")}
      className="bg-green-500 text-white px-4 py-2 rounded-xl font-semibold"
    >
      ✓ Approve
    </button>

    <button
      onClick={() => handleAction(item, "reject")}
      className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold"
    >
      ✕ Reject
    </button>
  </div>
)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Notification;