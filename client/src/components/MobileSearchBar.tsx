import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDebounce } from "../hooks/useDebounce";
import { fetchSearchSuggestions } from "../utils/searchSuggestions";
import { SEARCH_SUGGESTIONS_LIMIT } from "../config/pagination";

interface SearchSuggestion {
  product_name: string;
  product_id: string;
}

export default function MobileSearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const debouncedQuery = useDebounce(q, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  // Закрытие подсказок при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Загрузка подсказок
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const data = await fetchSearchSuggestions(debouncedQuery.trim(), SEARCH_SUGGESTIONS_LIMIT);
        if (requestId !== requestIdRef.current) return;
        
        const uniqueSuggestions: SearchSuggestion[] = [];
        const seenNames = new Set<string>();
        
        data.forEach((item: any) => {
          const productName = item.product_name || item.name || "";
          if (productName && !seenNames.has(productName.toLowerCase())) {
            seenNames.add(productName.toLowerCase());
            uniqueSuggestions.push({
              product_name: productName,
              product_id: item.product_id || item.id || "",
            });
          }
        });

        setSuggestions(uniqueSuggestions);
        setShowSuggestions(uniqueSuggestions.length > 0);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        console.error("Error fetching search suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQ(suggestion.product_name);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(suggestion.product_name)}`);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0 && debouncedQuery.trim().length >= 2) {
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={searchRef} className="flex-1 relative">
      <form onSubmit={onSubmit} className="flex-1" role="search">
        <div className="relative flex items-center h-11 bg-gray-100 rounded-lg px-3">
          <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            name="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={t("header.searchPlaceholder")}
            className="flex-1 bg-gray-100 outline-none text-sm text-gray-900 placeholder:text-gray-400 border-0"
            style={{ background: 'transparent' }}
            data-header-mobile="true"
            autoComplete="off"
          />
        </div>
      </form>

      {/* Выпадающий список подсказок */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
          {loading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              {t("common.loading") || "Загрузка..."}
            </div>
          )}
          {!loading && suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.product_id}-${index}`}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <svg 
                  className="w-5 h-5 text-gray-400 flex-shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-gray-900 text-sm truncate">{suggestion.product_name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

