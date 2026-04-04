import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "signup";
}

export function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const { t } = useLanguage();
  const { login, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match!");
          setLoading(false);
          return;
        }
        await signup(email, password, name);
        toast.success(t("notif.signupSuccess"));
      } else {
        await login(email, password);
        toast.success(t("notif.loginSuccess"));
      }
      
      onClose();
      setEmail("");
      setPassword("");
      setName("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in" data-testid="auth-modal-backdrop">
      <div className="bg-[#1a0b2e] border border-purple-500/30 rounded-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95" data-testid="auth-modal-panel">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {mode === "login" ? t("modal.login") : t("modal.signup")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-modal-form">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name" className="text-gray-300 mb-2 block">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-purple-900/20 border-purple-500/30 text-white"
                placeholder="Your name"
                data-testid="auth-modal-name"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-gray-300 mb-2 block">
              {t("modal.email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-purple-900/20 border-purple-500/30 text-white"
              placeholder="you@example.com"
              data-testid="auth-modal-email"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-300 mb-2 block">
              {t("modal.password")}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-purple-900/20 border-purple-500/30 text-white"
              placeholder="••••••••"
              data-testid="auth-modal-password"
            />
          </div>

          {mode === "signup" && (
            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300 mb-2 block">
                {t("modal.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-purple-900/20 border-purple-500/30 text-white"
                placeholder="••••••••"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
            >
              {t("modal.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
              data-testid="auth-modal-submit"
            >
              {loading ? t("common.loading") : t("modal.submit")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}