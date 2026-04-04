import { Link, useLocation, useNavigate } from "react-router";
import { Sparkles, Menu, X, User, LogOut, Settings, Heart, Map, BookOpen, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react"; // useMemo：登录态下再展示提交入口
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AuthModal } from "./AuthModal";
import { toast } from "sonner";
import { apiGet } from "../../lib/api"; // 拉取后台配置的前台主导航项
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { motion } from "motion/react";
import type { HomeSeo } from "../pages/home/types"; // home_seo API 与首页类型一致

/** 后台 GET /api/site/frontend_nav 单项形状（与 admin_settings.frontend_menu_items 筛选后一致） */
type FrontendNavItem = { key: string; label: string; path: string; order: number };

/** 判定是否为「提交工具」菜单项（路径或 i18n 键任一命中即视为需登录） */
function isSubmitNavItem(item: FrontendNavItem): boolean {
  const trimmed = (item.path ?? "").trim(); // 运营可能配前后空白
  const pathNorm = trimmed.replace(/\/+$/, "") || "/"; // 去掉尾斜杠便于与 /submit 比较
  return pathNorm === "/submit" || item.key === "nav.submit"; // 与 DEFAULT 与后台 key 对齐
}

/** 顶栏品牌默认（home_seo.brand_title 缺失或请求失败时使用） */
const DEFAULT_SITE_BRAND = "AI Tools Hub";

/** 运营配置的 emoji 去空白并限长，避免异常长串撑爆布局 */
function normalizeBrandIconEmoji(raw: unknown): string {
  if (typeof raw !== "string") return ""; // 非字符串视为未配置
  const t = raw.trim().slice(0, 8); // 顶栏装饰：至多约两个 grapheme 的保守上限
  return t; // 空串表示仍用默认 Lucide 图标
}

/** 无配置或请求失败时的默认主导航（与历史硬编码一致） */
const DEFAULT_FRONT_MAIN_NAV: FrontendNavItem[] = [
  { key: "nav.home", label: "Home", path: "/", order: 0 },
  { key: "nav.compare", label: "Compare", path: "/compare", order: 1 },
  { key: "nav.dashboard", label: "Dashboard", path: "/dashboard", order: 2 },
  { key: "nav.submit", label: "Submit", path: "/submit", order: 3 },
  { key: "nav.more", label: "More", path: "/more", order: 4 },
];

export function Navigation() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mainNav, setMainNav] = useState<FrontendNavItem[]>(DEFAULT_FRONT_MAIN_NAV); // 可先渲染默认再被 API 覆盖
  const [siteBrand, setSiteBrand] = useState<string>(DEFAULT_SITE_BRAND); // 来自 site_json.home_seo.brand_title
  const [siteBrandIconEmoji, setSiteBrandIconEmoji] = useState<string>(""); // home_seo.brand_icon_emoji，空则 Sparkles
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: "login" | "signup" }>({
    open: false,
    mode: "login",
  });

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<FrontendNavItem[]>("/api/site/frontend_nav").catch(() => [] as FrontendNavItem[]),
      apiGet<HomeSeo>("/api/site/home_seo").catch(() => ({}) as Partial<HomeSeo>), // 失败时用空对象回落
    ]).then(([rows, homeSeo]) => {
      if (!alive) return;
      if (rows.length > 0) setMainNav(rows);
      const bt = typeof homeSeo?.brand_title === "string" ? homeSeo.brand_title.trim() : "";
      if (bt) setSiteBrand(bt);
      setSiteBrandIconEmoji(normalizeBrandIconEmoji(homeSeo?.brand_icon_emoji)); // 可选顶栏图标字符
    });
    return () => {
      alive = false;
    };
  }, []);

  /** 若 key 在 i18n 中有翻译则用 t(key)，否则用后台 label */
  const navLabel = (item: FrontendNavItem) =>
    item.key && t(item.key) !== item.key ? t(item.key) : item.label;

  const visibleMainNav = useMemo(() => {
    if (user) return mainNav; // 已登录：后台配置全展示
    return mainNav.filter((item) => !isSubmitNavItem(item)); // 未登录：隐藏 Submit Tool
  }, [mainNav, user]); // 菜单拉取或登入登出时重算

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) => {
    return isActive(path)
      ? "text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-1"
      : "text-gray-300 hover:text-cyan-400 transition-colors";
  };

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-[#0a0118]/80 border-b border-purple-900/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2" aria-label={siteBrand}>
              {siteBrandIconEmoji ? (
                <span className="text-2xl leading-none w-8 h-8 flex items-center justify-center" aria-hidden={true}>
                  {siteBrandIconEmoji}
                </span>
              ) : (
                <Sparkles className="w-8 h-8 text-cyan-400 shrink-0" aria-hidden={true} />
              )}
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {siteBrand}
              </span>
            </Link>

            {/* Desktop Navigation：顺序与文案由 admin_settings.frontend_menu_items 控制（失败则 DEFAULT_FRONT_MAIN_NAV） */}
            <nav className="hidden md:flex items-center gap-6">
              {visibleMainNav.map((item) => (
                <Link key={item.path + item.order} to={item.path} className={navLinkClass(item.path)}>
                  {navLabel(item)}
                </Link>
              ))}
              <LanguageSwitcher />
              
              {user ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                      >
                        <span className="text-2xl mr-2">{user.avatar}</span>
                        {user.name}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a0b2e] border-purple-500/30">
                      <DropdownMenuItem 
                        onClick={() => navigate("/profile")}
                        className="cursor-pointer text-gray-300 hover:bg-purple-500/30 hover:text-cyan-400"
                      >
                        <User className="w-4 h-4 mr-2" />
                        {t("nav.profile")}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => navigate("/favorites")}
                        className="cursor-pointer text-gray-300 hover:bg-purple-500/30 hover:text-cyan-400"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        {t("nav.favorites")}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => navigate("/settings")}
                        className="cursor-pointer text-gray-300 hover:bg-purple-500/30 hover:text-cyan-400"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {t("nav.settings")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-purple-500/20" />
                      <DropdownMenuItem
                        onClick={() => {
                          logout();
                          toast.success(t("notif.logoutSuccess"));
                        }}
                        className="cursor-pointer text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setAuthModal({ open: true, mode: "login" })}
                    className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                    data-testid="nav-open-login"
                  >
                    {t("nav.login")}
                  </Button>
                  <Button
                    onClick={() => setAuthModal({ open: true, mode: "signup" })}
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    {t("nav.signup")}
                  </Button>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mt-4 pb-4 flex flex-col gap-4"
            >
              {visibleMainNav.map((item) => (
                <Link
                  key={`m-${item.path}-${item.order}`}
                  to={item.path}
                  className={`${isActive(item.path) ? "text-cyan-400 font-semibold" : "text-gray-300"} hover:text-cyan-400 transition-colors`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {navLabel(item)}
                </Link>
              ))}
              <div className="border-t border-purple-500/20 pt-4 mt-2">
                <LanguageSwitcher />
              </div>
              
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 w-full justify-start"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {t("nav.profile")}
                    </Button>
                  </Link>
                  <Link to="/favorites" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 w-full justify-start"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {t("nav.favorites")}
                    </Button>
                  </Link>
                  <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 w-full justify-start"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {t("nav.settings")}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      logout();
                      toast.success(t("notif.logoutSuccess"));
                      setMobileMenuOpen(false);
                    }}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/20 w-full justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAuthModal({ open: true, mode: "login" });
                      setMobileMenuOpen(false);
                    }}
                    className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 w-full"
                  >
                    {t("nav.login")}
                  </Button>
                  <Button
                    onClick={() => {
                      setAuthModal({ open: true, mode: "signup" });
                      setMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 w-full"
                  >
                    {t("nav.signup")}
                  </Button>
                </>
              )}
            </motion.nav>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        mode={authModal.mode}
      />
    </>
  );
}