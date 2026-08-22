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

export default function AdminHome() {
  const pending = useQuery(api.people.listByApproval, { approvalStatus: "pending" });
  const wednesdayTrend = useQuery(api.dashboard.wednesdayAttendanceTrend, {});
  const saturdayTrend = useQuery(api.dashboard.saturdayAttendanceTrend, {});
  const churn = useQuery(api.dashboard.oneTimeAttendanceRate, {});
  const streaks = useQuery(api.dashboard.topAttendanceStreaks, {});

  const churnData = churn
    ? [
        { name: "Attended once", value: churn.oneTimeStudents },
        { name: "Returned", value: churn.totalAttendingStudents - churn.oneTimeStudents },
      ]
    : [];

  const sharedTrendMax = Math.max(
    0,
    ...(wednesdayTrend ?? []).map((d) => d.count),
    ...(saturdayTrend ?? []).map((d) => d.count)
  );
  const trendYDomain: [number, number] = [0, sharedTrendMax];
  const trendTickFormatter = (date: string) => date.slice(5);

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
                    tickFormatter={trendTickFormatter}
                    interval="preserveStartEnd"
                  />
                  <YAxis allowDecimals={false} domain={trendYDomain} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--navy)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" style={{ flex: "1 1 420px" }}>
          <h2 style={{ marginTop: 0 }}>Saturday attendance — last 12 months</h2>
          <p className="text-secondary">Students only (guests, aides, and teachers excluded).</p>
          {saturdayTrend === undefined && <p>Loading...</p>}
          {saturdayTrend && saturdayTrend.length === 0 && (
            <p className="text-secondary">No Saturday sessions in this window.</p>
          )}
          {saturdayTrend && saturdayTrend.length > 0 && (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={saturdayTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-08)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={trendTickFormatter}
                    interval="preserveStartEnd"
                  />
                  <YAxis allowDecimals={false} domain={trendYDomain} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--chartreuse)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" style={{ flex: "1 1 320px" }}>
          <h2 style={{ marginTop: 0 }}>Top attendance streaks</h2>
          <p className="text-secondary">
            Consecutive Wednesday/Saturday weeks attended, ending at the most recent class held.
          </p>
          {streaks === undefined && <p>Loading...</p>}
          {streaks && streaks.length === 0 && <p className="text-secondary">No active streaks yet.</p>}
          {streaks && streaks.length > 0 && (
            <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {streaks.map((s) => (
                <li key={s.personId}>
                  {s.name} — <strong>{s.streak}</strong> {s.streak === 1 ? "week" : "weeks"}
                </li>
              ))}
            </ol>
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
