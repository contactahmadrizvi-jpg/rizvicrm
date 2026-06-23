"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-[#4a4a48] tracking-wide uppercase">{label}</label>
      )}
      <input
        {...props}
        className={`
          w-full bg-white border border-[#e8e8e4] rounded-lg px-3 py-2.5
          text-[#111110] placeholder-[#b0b0aa] text-sm font-normal
          focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e]
          transition-all duration-150 disabled:bg-[#f4f4f2] disabled:text-[#b0b0aa]
          ${error ? "border-[#c0392b] focus:ring-[#c0392b]/10 focus:border-[#c0392b]" : ""}
          ${className}
        `}
      />
      {error && <p className="text-xs text-[#c0392b] font-medium">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-[#4a4a48] tracking-wide uppercase">{label}</label>
      )}
      <textarea
        {...props}
        className={`
          w-full bg-white border border-[#e8e8e4] rounded-lg px-3 py-2.5
          text-[#111110] placeholder-[#b0b0aa] text-sm font-normal
          focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e]
          transition-all duration-150 resize-none disabled:bg-[#f4f4f2] disabled:text-[#b0b0aa]
          ${error ? "border-[#c0392b] focus:ring-[#c0392b]/10 focus:border-[#c0392b]" : ""}
          ${className}
        `}
      />
      {error && <p className="text-xs text-[#c0392b] font-medium">{error}</p>}
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
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-[#4a4a48] tracking-wide uppercase">{label}</label>
      )}
      <select
        {...props}
        className={`
          w-full bg-white border border-[#e8e8e4] rounded-lg px-3 py-2.5
          text-[#111110] text-sm font-normal
          focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/10 focus:border-[#1a1a2e]
          transition-all duration-150 disabled:bg-[#f4f4f2] disabled:text-[#b0b0aa]
          ${error ? "border-[#c0392b]" : ""}
          ${className}
        `}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[#c0392b] font-medium">{error}</p>}
    </div>
  );
}
