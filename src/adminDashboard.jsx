import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
const API_URL = "https://emp-backend.stackenzo.com/api/fill/getAttendanceAdmin";
const APPROVE_URL = "https://emp-backend.stackenzo.com/api/fill/approveOutside";
// const API_URL = "http://localhost:3002/api/fill/getAttendanceAdmin";
// const APPROVE_URL = "http://localhost:3002/api/fill/approveOutside";

// ── Replace with your actual headId source (auth context / localStorage / JWT) ──
const HEAD_token = localStorage.getItem("LoginToken") || "";

const head_Id=jwtDecode(HEAD_token)

const FILTERS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "All Time", value: "all" },
];

const DEPT_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
];

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function computeEffectiveMinutes(attendance) {
  let total = 0;
  for (const rec of attendance) {
    if (!rec.total_hours) continue;
    const match = rec.total_hours.match(/(\d+)h\s(\d+)m/);
    if (!match) continue;
    const mins = parseInt(match[1]) * 60 + parseInt(match[2]);
    const inPenalty = rec.In_time_outside && !rec.In_time_approved;
    const outPenalty = rec.Out_time_outside && !rec.Out_time_approved;
    if (inPenalty || outPenalty) continue;
    total += mins;
  }
  return total;
}

function formatMinutes(mins) {
  if (mins <= 0) return "0h 0m";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ outside, approved }) {
  if (!outside)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium whitespace-nowrap">
        Office
      </span>
    );
  if (approved)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium whitespace-nowrap">
        Outside ✓
      </span>
    );
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium whitespace-nowrap">
      Outside ✗
    </span>
  );
}

// ── ApproveButtons ────────────────────────────────────────────────────────────
function ApproveButtons({ rec, type, employeeId, onDone }) {
  const [loading, setLoading] = useState(false);

  const approvedField = type === "In_Time" ? "In_time_approved" : "Out_time_approved";
  const outsideField = type === "In_Time" ? "In_time_outside" : "Out_time_outside";
  const label = type === "In_Time" ? "In" : "Out";

  if (!rec[outsideField] || rec[approvedField]) return null;

  const call = async (action) => {
    if (!HEAD_token) {
      alert("Head ID not found. Please check your auth setup.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(APPROVE_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId: rec._id,
          employeeId,               // ← comes from member_id, not rec
          type,
          action,
          headId: head_Id.id,
          NotificationId: rec.notificationId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Request failed");
      onDone(rec._id, type, action === "approve");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex gap-1.5">
      <button
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation();
          call("approve");
        }}
        className="text-xs px-2 py-0.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 disabled:opacity-40 transition-colors whitespace-nowrap"
      >
        {loading ? "…" : `Approve ${label}`}
      </button>
      <button
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation();
          call("reject");
        }}
        className="text-xs px-2 py-0.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-600 font-semibold hover:bg-rose-100 disabled:opacity-40 transition-colors whitespace-nowrap"
      >
        {loading ? "…" : `Reject ${label}`}
      </button>
    </span>
  );
}

// ── AttendanceRow ─────────────────────────────────────────────────────────────
function AttendanceRow({ rec: initialRec, index, employeeId, onApprovalChange }) {
  const [expanded, setExpanded] = useState(false);
  const [rec, setRec] = useState(initialRec);

  const handleDone = (id, type, approved) => {
    const field = type === "In_Time" ? "In_time_approved" : "Out_time_approved";
    setRec((prev) => ({ ...prev, [field]: approved }));
    onApprovalChange?.(id, type, approved);
  };

  const isPenalized =
    (rec.In_time_outside && !rec.In_time_approved) ||
    (rec.Out_time_outside && !rec.Out_time_approved);

  return (
    <>
      <tr
        className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50/80 ${
          isPenalized ? "bg-rose-50/40" : ""
        }`}
        onClick={() => setExpanded((p) => !p)}
      >
        <td className="py-3 px-4 text-sm text-slate-500 font-medium">{index + 1}</td>
        <td className="py-3 px-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
          {rec.date}
        </td>
        <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
          {rec.In_Time || "—"}
        </td>
        <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
          {rec.Out_time || "—"}
        </td>

        {/* In status + approve */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge outside={rec.In_time_outside} approved={rec.In_time_approved} />
            <ApproveButtons rec={rec} type="In_Time" employeeId={employeeId} onDone={handleDone} />
          </div>
        </td>

        {/* Out status + approve */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge outside={rec.Out_time_outside} approved={rec.Out_time_approved} />
            <ApproveButtons rec={rec} type="Out_time" employeeId={employeeId} onDone={handleDone} />
          </div>
        </td>

        <td className="py-3 px-4">
          <span
            className={`text-sm font-bold ${
              isPenalized ? "text-rose-400 line-through" : "text-violet-700"
            }`}
          >
            {rec.total_hours || "—"}
          </span>
          {isPenalized && (
            <span className="ml-2 text-xs text-rose-500 font-medium">Not counted</span>
          )}
        </td>

        <td className="py-3 px-4 text-slate-400 text-xs select-none">
          {expanded ? "▲" : "▼"}
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {rec.In_Time_reason && (
                <DetailCard label="In Reason" value={rec.In_Time_reason} />
              )}
              {rec.delay_in_reason && (
                <DetailCard label="Delay Reason" value={rec.delay_in_reason} />
              )}
              {rec.Out_time_reason && (
                <DetailCard label="Out Reason" value={rec.Out_time_reason} />
              )}
              {rec.Todays_Task && (
                <DetailCard label="Task" value={rec.Todays_Task} />
              )}
              {rec.reason_for_task_delay && (
                <DetailCard label="Task Delay" value={rec.reason_for_task_delay} />
              )}
              {rec.remarks && (
                <DetailCard label="Remarks" value={rec.remarks} />
              )}
              {!rec.In_Time_reason &&
                !rec.delay_in_reason &&
                !rec.Out_time_reason &&
                !rec.Todays_Task &&
                !rec.reason_for_task_delay &&
                !rec.remarks && (
                  <p className="text-slate-400 text-sm col-span-3">No additional details.</p>
                )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
      <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}

// ── MemberCard ────────────────────────────────────────────────────────────────
function MemberCard({ member: initialMember, colorClass }) {
  const [open, setOpen] = useState(false);
  const [attendance, setAttendance] = useState(initialMember.attendance);
  const { member_info, total_days, total_hours } = initialMember;

  const effectiveMins = computeEffectiveMinutes(attendance);
  const effectiveHours = formatMinutes(effectiveMins);

  const approvedDays = attendance.filter(
    (r) =>
      (!r.In_time_outside || r.In_time_approved) &&
      (!r.Out_time_outside || r.Out_time_approved)
  ).length;
  const unapprovedDays = total_days - approvedDays;

  const handleApprovalChange = (id, type, approved) => {
    setAttendance((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        const field = type === "In_Time" ? "In_time_approved" : "Out_time_approved";
        return { ...r, [field]: approved };
      })
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colorClass} p-5`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
            {getInitials(member_info?.Name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg leading-tight truncate">
              {member_info?.Name || "Unknown"}
            </h3>
            <p className="text-white/80 text-sm truncate">{member_info?.Email}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
              {member_info?.Role || "—"}
            </span>
            <p className="text-white/70 text-xs mt-1">{member_info?.Department}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <StatCell value={total_days} label="Days Present" color="text-slate-800" />
        <StatCell value={effectiveHours} label="Effective Hours" color="text-violet-600" />
        <StatCell
          value={unapprovedDays}
          label="Unapproved Days"
          color={unapprovedDays > 0 ? "text-rose-500" : "text-emerald-500"}
        />
      </div>

      {/* Toggle */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span>View Attendance Records ({total_days})</span>
        <span
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {/* Table */}
      {open && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-left min-w-[780px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  "#",
                  "Date",
                  "In Time",
                  "Out Time",
                  "In Status",
                  "Out Status",
                  "Hours",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="py-2.5 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendance.map((rec, i) => (
                <AttendanceRow
                  key={rec._id}
                  rec={rec}
                  index={i}
                  employeeId={initialMember.member_id}   // ← the fix
                  onApprovalChange={handleApprovalChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCell({ value, label, color }) {
  return (
    <div className="p-4 text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
    </div>
  );
}

// ── AdminDashboard ────────────────────────────────────────────────────────────
function AdminDashboard() {
  const [filter, setFilter] = useState("today");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filter }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to fetch");
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filter]);

  const overallEffectiveMins =
    data?.members?.reduce(
      (acc, m) => acc + computeEffectiveMinutes(m.attendance),
      0
    ) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Attendance Overview
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Track your team's working hours
            </p>
          </div>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  filter === f.value
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Summary Banner */}
        {data && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Members", value: data.total_members, icon: "👥", color: "text-violet-600" },
              { label: "Total Records", value: data.total_records, icon: "📋", color: "text-blue-600" },
              { label: "Logged Hours", value: data.overall_total_hours, icon: "⏱️", color: "text-amber-600" },
              {
                label: "Effective Hours",
                value: formatMinutes(overallEffectiveMins),
                icon: "✅",
                color: "text-emerald-600",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4"
              >
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Loading attendance data…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-4xl">⚠️</span>
            <p className="text-slate-700 font-semibold">{error}</p>
            <button
              onClick={() => setFilter((f) => f)}
              className="mt-2 text-sm text-violet-600 hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Member Cards */}
        {!loading && !error && data?.members?.length > 0 && (
          <div className="flex flex-col gap-5">
            {data.members.map((member, i) => (
              <MemberCard
                key={member.member_id}
                member={member}
                colorClass={DEPT_COLORS[i % DEPT_COLORS.length]}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data?.members?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-5xl">🗓️</span>
            <p className="text-slate-700 font-bold text-lg">No records found</p>
            <p className="text-slate-400 text-sm">Try a different filter period</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;