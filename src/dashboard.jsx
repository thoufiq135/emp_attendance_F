import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const DAILY_TARGET_MINUTES = 9 * 60;

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [Tstatus, setTstatus] = useState("");
  const [Data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    inTime: null,
    outTime: null,
  });
  const [approvalLoading, setApprovalLoading] = useState({
    inTime: false,
    outTime: false,
  });

  const [weekSummary, setWeekSummary] = useState(null);
  const [monthSummary, setMonthSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSummary(userId, filter) {
    try {
      const response = await fetch(
        "https://emp-backend.stackenzo.com/api/fill/getAttendance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, filter }),
        }
      );
      if (response.status === 404) {
        return { total_days: 0, total_hours: "0h 0m", avg_per_day: "0h 0m", attendance: [] };
      }
      const result = await response.json();
      if (!response.ok || !result.success) return null;
      return result;
    } catch (err) {
      console.error(`getAttendance (${filter}) request failed:`, err);
      return null;
    }
  }
useEffect(() => {
  console.log("status changed =", status);
}, [status]);
  async function loadSummaries(userId) {
    setSummaryLoading(true);
    try {
      const [week, month] = await Promise.all([
        fetchSummary(userId, "week"),
        fetchSummary(userId, "month"),
      ]);
      setWeekSummary(week);
      setMonthSummary(month);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadApprovalStatus(userId) {
    try {
      const statusResponse = await fetch(
        `https://emp-backend.stackenzo.com/api/notifications/outsideApprovalStatus/${userId}`
      );
      const statusData = await statusResponse.json();
      console.log("status",status)
      if (statusData.success) {
        setStatus({
          inTime: statusData.inTime,
          outTime: statusData.outTime,
        });
      }
    } catch (err) {
      console.error("outsideApprovalStatus error:", err);
    }
  }

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("LoginToken");
      if (!token) return;
      const tokenData = jwtDecode(token);
      setUser(tokenData);
      const userId = tokenData.id;

      const response = await fetch(
        `https://emp-backend.stackenzo.com/api/fill/get_emp_status?userId=${userId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        console.error("get_emp_status error:", data);
      } else {
        setTstatus(data.message || "");
        setData(data.data || {});
      }

      await loadApprovalStatus(userId);
      
      loadSummaries(userId);
    }
    fetchData();
  }, []);

  // ── Send approval request ──────────────────────────────────────
  async function requestApproval(type) {
    const token = localStorage.getItem("LoginToken");
    if (!token) return;
    const tokenData = jwtDecode(token);
    const userId = tokenData.id;

    setApprovalLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const response = await fetch(
        "https://emp-backend.stackenzo.com/api/fill/requestOutsideApproval",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, type }), // type: "inTime" | "outTime"
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        alert(result.message || "Failed to send approval request.");
        return;
      }
      alert(result.message || "Approval request sent successfully.");
      await loadApprovalStatus(userId);
    } catch (err) {
      console.error("requestOutsideApproval error:", err);
      alert("Failed to send approval request. Please try again.");
    } finally {
      setApprovalLoading((prev) => ({ ...prev, [type]: false }));
    }
  }

  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!window.navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
      window.navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
async function sendApproval(type) {
  const reason = prompt(`Enter reason for ${type}:`);

  if (!reason) return;

  try {
    const token = localStorage.getItem("LoginToken");
    const tokenData = jwtDecode(token);

    const response = await fetch(
      "https://emp-backend.stackenzo.com/api/fill/sendOutsideReason",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: tokenData.id,
          type,
          reason,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message);
      return;
    }

    alert(data.message);

    setStatus((prev) => ({
      ...prev,
      [type === "In_Time" ? "inTime" : "outTime"]: "pending",
    }));
  } catch (err) {
    console.log(err);
    alert("Failed to send approval request");
  }
}
  function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }

  function parseTimeString(timeStr) {
    if (!timeStr) return null;
    const [time, modifier] = timeStr.split(" ");
    if (!time || !modifier) return null;
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  function formatMinutes(totalMinutes) {
    const mins = Math.max(0, Math.round(totalMinutes));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  async function takeAttendance() {
    const token = localStorage.getItem("LoginToken");
    if (!token) return;
    setLoading(true);
    try {
      const tokenData = jwtDecode(token);
      const userId = tokenData.id;
      const { lat, lng } = await getLocation();
      const time = formatTime(new Date());
      const isCheckingOut = Boolean(Data?.In_Time);

      let body = { lat, lng, time, userId };
      let endpoint;

      if (!isCheckingOut) {
        let delay_in_reason = "";
        const hour = new Date().getHours();
        if (hour >= 10) {
          delay_in_reason =
            window.prompt("You're marking in late. Please provide a reason:") || "";
        }
        body.delay_in_reason = delay_in_reason;
        endpoint = "https://emp-backend.stackenzo.com/api/fill/in-time";
      } else {
        const task = window.prompt("What task did you work on today?");
        if (!task) {
          alert("Task is required to mark out time.");
          setLoading(false);
          return;
        }
        const T_reason = window.prompt("Reason for task delay (leave blank if none):") || "";
        const remarks = window.prompt("Any remarks? (leave blank if none):") || "";
        body.task = task;
        body.T_reason = T_reason;
        body.remarks = remarks;
        endpoint = "https://emp-backend.stackenzo.com/api/fill/out-time";
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Something went wrong");
        return;
      }

      setTstatus(result.message);
      setData(result.attendance);
      if (result.isOutside) alert(result.message);

      await loadApprovalStatus(userId);
      loadSummaries(userId);
    } catch (err) {
      console.error("Attendance error:", err);
      if (err.code === 1) {
        alert("Please allow location access to mark attendance.");
      } else {
        alert("Failed to mark attendance. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const outTimeValue = Data?.Out_time || Data?.Out_Time;
  const isComplete = Boolean(Data?.In_Time && outTimeValue);
  const isInProgress = Boolean(Data?.In_Time && !outTimeValue);

  const inTimeDate = parseTimeString(Data?.In_Time);
  const elapsedMinutes = inTimeDate ? (now - inTimeDate) / 60000 : 0;
  const remainingMinutes = DAILY_TARGET_MINUTES - elapsedMinutes;
  const targetMet = remainingMinutes <= 0;

  // ── Approval banner helper ─────────────────────────────────────
  function ApprovalBanner({ type, statusObj }) {
    if (!statusObj?.isOutside) return null;

    const isApproved = statusObj.approved;
    const isRequested = statusObj.requested; // true if already sent but not yet approved
    const label = type === "inTime" ? "In-time" : "Out-time";

    if (isApproved) {
      return (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-900 rounded-2xl px-5 py-4">
          <span className="text-xl mt-0.5">✅</span>
          <div>
            <p className="font-semibold text-sm">
              Outside {label.toLowerCase()} approved
            </p>
            <p className="text-xs mt-0.5 text-green-700">
              Your {label.toLowerCase()} was marked from outside the office and has been approved by your manager.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-start justify-between gap-3 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-2xl px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold text-sm">
              Outside {label.toLowerCase()} — approval required
            </p>
            <p className="text-xs mt-0.5 text-yellow-700">
              {isRequested
                ? "Approval request already sent. Waiting for manager response."
                : `Your ${label.toLowerCase()} was marked from outside the office. Request approval from your manager.`}
            </p>
          </div>
        </div>
        {!isRequested && (
          <button
            onClick={() => requestApproval(type)}
            disabled={approvalLoading[type]}
            className="shrink-0 bg-yellow-600 text-white text-xs font-semibold px-4 py-2 rounded-xl active:scale-95 hover:bg-yellow-700 duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {approvalLoading[type] ? "Sending..." : "Request approval"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Notification button */}
        <div className="flex justify-end">
          <button
            onClick={() => navigate("/notifications")}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm hover:bg-slate-50 active:scale-95 duration-200"
          >
            🔔 Notifications
          </button>
        </div>

        {/* Welcome card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl p-5 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">
              Hello, {user?.Name} 👋
            </h1>
            <p className="text-indigo-100 mt-2 text-sm md:text-base">{Tstatus}</p>
          </div>
          {!isComplete && (
            <button
              onClick={takeAttendance}
              disabled={loading}
              className="w-full md:w-auto bg-white text-indigo-700 px-6 py-3 rounded-2xl font-semibold shadow-lg active:scale-95 md:hover:scale-105 duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : Data?.In_Time ? "Take Out Time" : "Take In Time"}
            </button>
          )}
        </div>

        {/* Outside approval banners */}
        <ApprovalBanner type="inTime" statusObj={status.inTime} />
        <ApprovalBanner type="outTime" statusObj={status.outTime} />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow">
            <p className="text-gray-500 text-sm">Present Days</p>
            <h1 className="text-3xl font-bold text-indigo-600">
              {monthSummary?.total_days || 0}
            </h1>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow">
            <p className="text-gray-500 text-sm">Hours Worked</p>
            <h1 className="text-2xl font-bold text-green-600">
              {monthSummary?.total_hours || "0h"}
            </h1>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow">
            <p className="text-gray-500 text-sm">Average</p>
            <h1 className="text-2xl font-bold text-cyan-600">
              {monthSummary?.avg_per_day || "0h"}
            </h1>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow">
            <p className="text-gray-500 text-sm">Status</p>
            <h1 className="text-lg font-bold text-orange-500">{Tstatus}</h1>
          </div>
        </div>

        {/* In progress */}
        {isInProgress && (
          <div className="bg-white rounded-3xl shadow-xl p-5 md:p-7">
            <h2 className="text-xl md:text-2xl font-bold text-slate-700 mb-5">
              Today's Progress
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-2xl p-5 shadow">
                <p className="text-gray-500">In Time</p>
                <h1 className="text-2xl font-bold text-green-600">{Data.In_Time}</h1>
                {status.inTime?.isOutside && (
                  <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${
                    status.inTime.approved
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {status.inTime.approved ? "✓ Outside — Approved" : "⚠ Outside — Pending"}
                  </span>
                )}
              </div>
              <div className={`rounded-2xl p-5 shadow ${targetMet ? "bg-emerald-50" : "bg-purple-50"}`}>
                <p className="text-gray-500">
                  {targetMet ? "Overtime" : "Time Left for 9h Target"}
                </p>
                <h1 className={`text-2xl font-bold ${targetMet ? "text-emerald-600" : "text-purple-600"}`}>
                  {targetMet
                    ? `+${formatMinutes(Math.abs(remainingMinutes))}`
                    : formatMinutes(remainingMinutes)}
                </h1>
              </div>
            </div>
          </div>
        )}

        {/* Today's attendance (complete) */}
        {isComplete && (
          <div className="bg-white rounded-3xl shadow-xl p-5 md:p-7">
            <h2 className="text-xl md:text-2xl font-bold mb-6">Today's Attendance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              {/* In time */}
              <div className="bg-green-50 rounded-2xl p-5 shadow">
                <p className="text-gray-500">In Time</p>
                <h1 className="text-2xl font-bold text-green-600">{Data.In_Time}</h1>
                {status.inTime?.isOutside && (
                  <div className="mt-2 space-y-2">
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                      status.inTime.approved
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {status.inTime.approved ? "✓ Outside — Approved" : "⚠ Outside — Pending"}
                    </span>
                    {!status.inTime.approved && !status.inTime.requested && (
                      <button
                        onClick={() => requestApproval("inTime")}
                        disabled={approvalLoading.inTime}
                        className="block w-full text-center text-xs font-semibold bg-yellow-500 text-white px-3 py-1.5 rounded-xl hover:bg-yellow-600 active:scale-95 duration-200 disabled:opacity-60"
                      >
                        {approvalLoading.inTime ? "Sending..." : "Request approval"}
                      </button>
                    )}
                    {!status.inTime.approved && status.inTime.requested && (
                      <span className="block text-xs text-yellow-700 font-medium">
                        Request sent — awaiting response
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Out time */}
              <div className="bg-red-50 rounded-2xl p-5 shadow">
                <p className="text-gray-500">Out Time</p>
                <h1 className="text-2xl font-bold text-red-600">{outTimeValue}</h1>
                {status.outTime?.isOutside && (
                  <div className="mt-2 space-y-2">
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                      status.outTime.approved
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {status.outTime.approved ? "✓ Outside — Approved" : "⚠ Outside — Pending"}
                    </span>
                    {!status.outTime.approved && !status.outTime.requested && (
                      <button
                        onClick={() => requestApproval("outTime")}
                        disabled={approvalLoading.outTime}
                        className="block w-full text-center text-xs font-semibold bg-yellow-500 text-white px-3 py-1.5 rounded-xl hover:bg-yellow-600 active:scale-95 duration-200 disabled:opacity-60"
                      >
                        {approvalLoading.outTime ? "Sending..." : "Request approval"}
                      </button>
                    )}
                    {!status.outTime.approved && status.outTime.requested && (
                      <span className="block text-xs text-yellow-700 font-medium">
                        Request sent — awaiting response
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-2xl p-5 shadow">
                <p className="text-gray-500">Hours Worked</p>
                <h1 className="text-2xl font-bold text-blue-600">{Data.total_hours}</h1>
              </div>

              <div className="bg-yellow-50 rounded-2xl p-5 shadow">
                <p className="text-gray-500">Task</p>
                <h1 className="text-base md:text-lg font-bold text-yellow-600 break-words">
                  {Data.Todays_Task}
                </h1>
              </div>
            </div>
          </div>
        )}

        {/* Week / Month summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-3xl p-5 md:p-7 shadow-xl">
            <h2 className="text-2xl font-bold mb-5">📅 This Week</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Days Present</span>
                <span>{weekSummary?.total_days || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Hours</span>
                <span>{weekSummary?.total_hours || "0h"}</span>
              </div>
              <div className="flex justify-between">
                <span>Average / Day</span>
                <span>{weekSummary?.avg_per_day || "0h"}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-3xl p-5 md:p-7 shadow-xl">
            <h2 className="text-2xl font-bold mb-5">📆 This Month</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Days Present</span>
                <span>{monthSummary?.total_days || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Hours</span>
                <span>{monthSummary?.total_hours || "0h"}</span>
              </div>
              <div className="flex justify-between">
                <span>Average / Day</span>
                <span>{monthSummary?.avg_per_day || "0h"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance history */}
        <div className="bg-white rounded-3xl shadow-xl p-5 md:p-7">
          <h2 className="text-xl md:text-2xl font-bold mb-6">📋 Attendance History</h2>

          {summaryLoading && (
            <p className="text-gray-400 text-sm text-center py-8">Loading history...</p>
          )}

          {!summaryLoading && (monthSummary?.attendance || []).length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No attendance records this month.</p>
          )}

          <div className="space-y-5">
            {(monthSummary?.attendance || []).map((item, index) => (
              <div
                key={item._id || index}
                className="border rounded-2xl p-5 bg-slate-50 shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  <div>
                    <p className="text-gray-500 text-sm">Date</p>
                    <h1 className="font-bold">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </h1>
                  </div>
<div>
  <p className="text-gray-500 text-sm">In Time</p>
  <h1 className="font-bold text-green-600">
    {item.In_Time || "-"}
  </h1>

  {item.In_time_outside && (
    <span
      className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        item.In_time_approved
          ? "bg-green-100 text-green-700"
          : item.In_Time_reason
          ? "bg-yellow-100 text-yellow-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {item.In_time_approved
        ? "Outside — Approved"
        : item.In_Time_reason
        ? "Outside — Pending"
        : "Outside — Need Approval"}
        <div>
  <p className="text-gray-500 text-sm">In Time</p>
  <h1 className="font-bold text-green-600">
    {Data.In_Time}
  </h1>

  {Data?.In_time_outside && (
    <div className="mt-3 flex items-center flex-wrap gap-2">
  {status.inTime === "approved" && (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
      ✅ Outside Approved
    </span>
  )}

  {status.inTime === "pending" && (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
      ⏳ Approval Pending
    </span>
  )}

  {status.inTime === "sendApproval" && (
    <button
      onClick={() => sendApproval("In_Time")}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow transition"
    >
      📤 Send Approval Request
    </button>
  )}
</div>
  )}
</div>
    </span>
  )}
</div>

<div>
  <p className="text-gray-500 text-sm">Out Time</p>
  <h1 className="font-bold text-red-600">
    {item.Out_Time || item.Out_time || "-"}
  </h1>

  {item.Out_time_outside && (
    <span
      className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        item.Out_time_approved
          ? "bg-green-100 text-green-700"
          : item.Out_time_reason
          ? "bg-yellow-100 text-yellow-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {item.Out_time_approved
        ? "Outside — Approved"
        : item.Out_time_reason
        ? "Outside — Pending"
        : "Outside — Need Approval"}
        <div>
  <p className="text-gray-500 text-sm">Out Time</p>
  <h1 className="font-bold text-red-600">
    {outTimeValue}
  </h1>

  {Data?.Out_time_outside && (
    <div className="mt-3 flex items-center flex-wrap gap-2">
  {status.outTime === "approved" && (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
      ✅ Outside Approved
    </span>
  )}

  {status.outTime === "pending" && (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
      ⏳ Approval Pending
    </span>
  )}

  {status.outTime === "sendApproval" && (
    <button
      onClick={() => sendApproval("Out_time")}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow transition"
    >
      📤 Send Approval Request
    </button>
  )}
</div>
  )}
</div>
    </span>
  )}
</div>

                  

                  <div>
                    <p className="text-gray-500 text-sm">Hours Worked</p>
                    <h1 className="font-bold text-blue-600">{item.total_hours || "-"}</h1>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Today's Task</p>
                    <h1 className="font-bold break-words">{item.Todays_Task || "-"}</h1>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Delay In Reason</p>
                    <h1 className="font-bold break-words">{item.delay_in_reason || "-"}</h1>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">In Time Reason</p>
                    <h1 className="font-bold break-words">{item.In_Time_reason || "-"}</h1>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Out Time Reason</p>
                    <h1 className="font-bold break-words">{item.Out_time_reason || "-"}</h1>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Reason for Task Delay</p>
                    <h1 className="font-bold break-words">
                      {item.reason_for_task_delay || item.T_reason || "-"}
                    </h1>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Remarks</p>
                    <h1 className="font-bold break-words">{item.remarks || "-"}</h1>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Created At</p>
                    <h1 className="font-bold">{new Date(item.createdAt).toLocaleString()}</h1>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm">Updated At</p>
                    <h1 className="font-bold">{new Date(item.updatedAt).toLocaleString()}</h1>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;