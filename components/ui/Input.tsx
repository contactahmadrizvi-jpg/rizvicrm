"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <input
        {...props}
        className={`
          w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5
          text-slate-900 placeholder-slate-400 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
          transition-all disabled:bg-slate-50 disabled:text-slate-400
          ${error ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : ""} ${className}
        `}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <textarea
        {...props}
        className={`
          w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5
          text-slate-900 placeholder-slate-400 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
          transition-all resize-none disabled:bg-slate-50 disabled:text-slate-400
          ${error ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : ""} ${className}
        `}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <select
        {...props}
        className={`
          w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5
          text-slate-900 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
          transition-all disabled:bg-slate-50 disabled:text-slate-400
          ${error ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : ""} ${className}
        `}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
