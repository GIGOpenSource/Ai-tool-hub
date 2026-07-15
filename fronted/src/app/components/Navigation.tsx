import { Link, useLocation, useNavigate } from "react-router";
import { Sparkles, Menu, X, User, LogOut, Settings, Heart, Map, BookOpen, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AuthModal } from "./AuthModal";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { motion } from "motion/react";

export function Navigation() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: "login" | "signup" }>({
    open: false,
    mode: "login",
  });

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
            <Link to="/" className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-cyan-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                AI Tools Hub
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className={navLinkClass("/")}>
                {t("nav.home")}
              </Link>
              <Link to="/compare" className={navLinkClass("/compare")}>
                {t("nav.compare")}
              </Link>
              <Link to="/dashboard" className={navLinkClass("/dashboard")}>
                {t("nav.dashboard")}
              </Link>
              <Link to="/submit" className={navLinkClass("/submit")}>
                {t("nav.submit")}
              </Link>
              <Link to="/more" className={navLinkClass("/more")}>
                {t("nav.more")}
              </Link>
              
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
                        My Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => navigate("/favorites")}
                        className="cursor-pointer text-gray-300 hover:bg-purple-500/30 hover:text-cyan-400"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        My Favorites
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => navigate("/settings")}
                        className="cursor-pointer text-gray-300 hover:bg-purple-500/30 hover:text-cyan-400"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-purple-500/20" />
                      <DropdownMenuItem
                        onClick={() => {
                          logout();
                          toast.success("Logged out successfully");
                        }}
                        className="cursor-pointer text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
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
              <Link
                to="/"
                className={`${isActive("/") ? "text-cyan-400 font-semibold" : "text-gray-300"} hover:text-cyan-400 transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.home")}
              </Link>
              <Link
                to="/compare"
                className={`${isActive("/compare") ? "text-cyan-400 font-semibold" : "text-gray-300"} hover:text-cyan-400 transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.compare")}
              </Link>
              <Link
                to="/dashboard"
                className={`${isActive("/dashboard") ? "text-cyan-400 font-semibold" : "text-gray-300"} hover:text-cyan-400 transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.dashboard")}
              </Link>
              <Link
                to="/submit"
                className={`${isActive("/submit") ? "text-cyan-400 font-semibold" : "text-gray-300"} hover:text-cyan-400 transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.submit")}
              </Link>
              <Link
                to="/more"
                className={`${isActive("/more") ? "text-cyan-400 font-semibold" : "text-gray-300"} hover:text-cyan-400 transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.more")}
              </Link>
              
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
                      My Profile
                    </Button>
                  </Link>
                  <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 w-full justify-start"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      logout();
                      toast.success("Logged out successfully");
                      setMobileMenuOpen(false);
                    }}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/20 w-full justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
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