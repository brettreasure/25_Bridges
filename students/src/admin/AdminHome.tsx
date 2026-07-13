import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "../../convex/_generated/api";

function toDdMm(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}-${month}`;
}

// Picks up to `count` evenly-spaced dates (by index, not calendar time) from
// an ascending-date series, always including the first and last, so the
// X axis reads as a handful of clean labels instead of one per bar.
function equidistantDates(dates: string[], count = 6): string[] {
  if (dates.length === 0) return [];
  const n = Math.min(count, dates.length);
  const step = (dates.length - 1) / (n - 1 || 1);
  const indices = new Set(Array.from({ length: n }, (_, i) => Math.round(i * step)));
  return [...indices].map((i) => dates[i]);
}

export default function AdminHome() {
  const pending = useQuery(api.people.listByApproval, { approvalStatus: "pending" });
  const wednesdayTrend = useQuery(api.dashboard.wednesdayAttendanceTrend, {});
  const churn = useQuery(api.dashboard.oneTimeAttendanceRate, {});

  const churnData = churn
    ? [
        { name: "Attended once", value: churn.oneTimeStudents },
        { name: "Returned", value: churn.totalAttendingStudents - churn.oneTimeStudents },
      ]
    : [];

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="card">
        <Link to="/admin/pending" className="btn-link-plain">
          Pending registrations
        </Link>
        : {pending === undefined ? "…" : pending.length}
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
        <div className="card" style={{ flex: "1 1 420px" }}>
          <h2 style={{ marginTop: 0 }}>Wednesday attendance — last 12 months</h2>
          <p className="text-secondary">Students only (guests, aides, and teachers excluded).</p>
          {wednesdayTrend === undefined && <p>Loading...</p>}
          {wednesdayTrend && wednesdayTrend.length === 0 && (
            <p className="text-secondary">No Wednesday sessions in this window.</p>
          )}
          {wednesdayTrend && wednesdayTrend.length > 0 && (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wednesdayTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-08)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    ticks={equidistantDates(wednesdayTrend.map((d) => d.date))}
                    tickFormatter={toDdMm}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--navy)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" style={{ flex: "1 1 320px" }}>
          <h2 style={{ marginTop: 0 }}>One-time attendance</h2>
          <p className="text-secondary">Students who attended a single session, across all Wednesdays and Saturdays.</p>
          {churn === undefined && <p>Loading...</p>}
          {churn && churn.totalAttendingStudents === 0 && (
            <p className="text-secondary">No student attendance recorded yet.</p>
          )}
          {churn && churn.totalAttendingStudents > 0 && (
            <>
              <div style={{ height: 200, display: "flex", justifyContent: "center" }}>
                <PieChart width={280} height={200}>
                  <Pie
                    data={churnData}
                    dataKey="value"
                    nameKey="name"
                    cx={140}
                    cy={100}
                    innerRadius={50}
                    outerRadius={80}
                    isAnimationActive={false}
                  >
                    <Cell fill="var(--danger)" />
                    <Cell fill="var(--navy)" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>
              <p style={{ textAlign: "center", marginBottom: 0 }}>
                <strong>{churn.percentage.toFixed(0)}%</strong> ({churn.oneTimeStudents} of{" "}
                {churn.totalAttendingStudents}) attended only once
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
