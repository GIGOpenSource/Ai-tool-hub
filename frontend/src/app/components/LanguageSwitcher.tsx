import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage, type Language } from "../contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { apiGet } from "../../lib/api";

type LocRow = { code: string; label: string; flag: string };

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [locales, setLocales] = useState<LocRow[]>([]);

  useEffect(() => {
    apiGet<LocRow[]>("/api/locales").then(setLocales).catch(() => setLocales([]));
  }, []);

  const current = locales.find((l) => l.code === language);
  const display = current ? `${current.flag} ${current.label}` : language;

  return (
    <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
      <SelectTrigger className="w-[160px] border-purple-500/30 bg-[#1a0b2e]/50 text-gray-300 hover:bg-purple-500/20 focus:ring-cyan-400/50">
        <Globe className="w-4 h-4 mr-2" />
        <SelectValue>{display}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-[#1a0b2e] border-purple-500/30 max-h-[300px]">
        {locales.map((loc) => (
          <SelectItem key={loc.code} value={loc.code} className="text-gray-300 hover:bg-purple-500/30 focus:bg-purple-500/20 focus:text-cyan-400 cursor-pointer">
            {loc.flag} {loc.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
