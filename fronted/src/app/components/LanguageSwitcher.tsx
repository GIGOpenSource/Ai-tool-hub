import { Globe } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const languageOptions = [
  { value: "en", label: "🇺🇸 English", name: "English" },
  { value: "zh", label: "🇨🇳 中文", name: "中文" },
  { value: "ko", label: "🇰🇷 한국어", name: "한국어" },
  { value: "ja", label: "🇯🇵 日本語", name: "日本語" },
  { value: "pt", label: "🇧🇷 Português", name: "Português" },
  { value: "es", label: "🇪🇸 Español", name: "Español" },
  { value: "fr", label: "🇫🇷 Français", name: "Français" },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const currentLang = languageOptions.find(lang => lang.value === language);

  return (
    <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
      <SelectTrigger className="w-[140px] border-purple-500/30 bg-[#1a0b2e]/50 text-gray-300 hover:bg-purple-500/20 focus:ring-cyan-400/50">
        <Globe className="w-4 h-4 mr-2" />
        <SelectValue>{currentLang?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-[#1a0b2e] border-purple-500/30 max-h-[300px]">
        {languageOptions.map((lang) => (
          <SelectItem 
            key={lang.value}
            value={lang.value} 
            className="text-gray-300 hover:bg-purple-500/30 focus:bg-purple-500/20 focus:text-cyan-400 cursor-pointer"
          >
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}