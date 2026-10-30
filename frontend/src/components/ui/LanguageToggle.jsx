import { useLanguage } from "../../context/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle({ className = "" }) {
  const { language, setLanguage } = useLanguage();

  const options = [
    { code: "en", label: "English" },
    { code: "te", label: "తెలుగు" },
    { code: "hi", label: "हिन्दी" },
  ];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <Globe className="h-4 w-4 text-grey-500 flex-shrink-0" />
      <div className="inline-flex rounded border border-grey-300 bg-white p-0.5 text-xs font-medium shadow-sm">
        {options.map((opt) => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={`px-2 py-1 rounded transition-colors ${
                isActive
                  ? "bg-green-600 text-white font-semibold"
                  : "text-grey-600 hover:text-grey-900 hover:bg-grey-100"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
