"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
  onDateChange: (startDate: Date | null, endDate: Date | null) => void;
  className?: string;
}

export function DateRangePicker({ onDateChange, className = "" }: DateRangePickerProps) {
  const [mode, setMode] = useState<"custom" | "month">("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const handleCustomDateChange = () => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    onDateChange(start, end);
  };

  const handleMonthChange = (monthStr: string) => {
    setSelectedMonth(monthStr);
    if (!monthStr) {
      onDateChange(null, null);
      return;
    }

    const [year, month] = monthStr.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    onDateChange(start, end);
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      options.push({ value, label });
    }
    return options;
  };

  return (
    <div className={`bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-indigo-600" />
        <h3 className="text-slate-800 font-semibold text-sm">Performance Period</h3>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("custom")}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "custom"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10"
              : "bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
          }`}
        >
          Custom Range
        </button>
        <button
          onClick={() => setMode("month")}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "month"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10"
              : "bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
          }`}
        >
          By Month
        </button>
      </div>

      {mode === "custom" ? (
        <div className="space-y-3">
          <div>
            <label className="text-slate-500 text-xs font-medium block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value && endDate) handleCustomDateChange();
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-500 text-xs font-medium block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (startDate && e.target.value) handleCustomDateChange();
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              onDateChange(null, null);
            }}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-sm rounded-lg transition-colors border border-slate-200/40"
          >
            Clear Dates
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-slate-500 text-xs font-medium block mb-1">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Time</option>
              {getMonthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
