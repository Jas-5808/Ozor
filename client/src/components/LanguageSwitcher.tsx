import React, { useState } from "react";

type Option = {
  img: string;
  label: string;
  value: string;
};

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Option>({ img: "/icons/uzb.png", label: "UZS", value: "uz" });

  const handleSelect = (value: string, img: string, label: string) => {
    setSelected({ value, img, label });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1.5 h-8 px-2.5 md:px-3 rounded-lg bg-white/10 border border-white/10 backdrop-blur-md cursor-pointer hover:bg-white/15 active:scale-[0.99] transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <img src={selected.img} alt={selected.value} className="h-3.5 w-5 object-contain" />
        <span className="text-xs font-medium">{selected.label}</span>
      </div>
      {isOpen && (
        <ul className="absolute mt-2 w-48 rounded-xl overflow-hidden right-0 bg-[#434344]/90 backdrop-blur-xl border border-white/10 shadow-lg">
          <p className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-white/70">Язык</p>
          <li
            className="px-3 py-2 hover:bg-white/10 cursor-pointer flex items-center justify-between"
            onClick={() => handleSelect("uz", "/icons/uzb.png", "UZS")}
          >
            <span>UZ</span>
            <span className="text-white/70">Oʻzbek</span>
          </li>
          <li
            className="px-3 py-2 hover:bg-white/10 cursor-pointer flex items-center justify-between"
            onClick={() => handleSelect("ru", "/icons/ru.png", "RU")}
          >
            <span>RU</span>
            <span className="text-white/70">Русский</span>
          </li>
        </ul>
      )}
    </div>
  );
}


