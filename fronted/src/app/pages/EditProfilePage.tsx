import { useState } from "react";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useLanguage } from "../contexts/LanguageContext";
import { Camera, Save, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

export function EditProfilePage() {
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState("John Developer");
  const [email, setEmail] = useState("john.dev@example.com");
  const [website, setWebsite] = useState("https://johndeveloper.com");
  const [twitter, setTwitter] = useState("@johndev");
  const [avatar, setAvatar] = useState("https://api.dicebear.com/7.x/avataaars/svg?seed=John");
  const [isLoading, setIsLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        toast.success("Avatar updated!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success("Profile updated successfully!");
    setIsLoading(false);
  };

  const handleDiscard = () => {
    setDisplayName("John Developer");
    setEmail("john.dev@example.com");
    setWebsite("https://johndeveloper.com");
    setTwitter("@johndev");
    setAvatar("https://api.dicebear.com/7.x/avataaars/svg?seed=John");
    toast.info("Changes discarded");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        title="Edit Profile"
        description="Update your profile information, avatar, and social links"
      />
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Edit Profile</h1>
            <p className="text-gray-400">Update your personal information and preferences</p>
          </div>

          {/* Form Card */}
          <div className="bg-[#1a0b2e]/50 border border-purple-500/30 rounded-2xl p-6 md:p-8">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <img
                    src={avatar}
                    alt="Profile Avatar"
                    className="w-32 h-32 rounded-full border-4 border-purple-500/30 object-cover"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-3">Click on avatar to upload new image</p>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                  required
                />
              </div>

              {/* Website */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Website <span className="text-gray-500">(Optional)</span>
                </label>
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                />
              </div>

              {/* Twitter/X Handle */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Twitter/X Handle <span className="text-gray-500">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    @
                  </span>
                  <Input
                    type="text"
                    value={twitter.replace("@", "")}
                    onChange={(e) => setTwitter("@" + e.target.value.replace("@", ""))}
                    placeholder="username"
                    className="pl-8 bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Changes
                    </div>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDiscard}
                  className="flex-1 border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Discard
                </Button>
              </div>
            </form>
          </div>

          {/* Additional Info */}
          <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <p className="text-sm text-gray-400">
              <span className="text-cyan-400 font-semibold">Note:</span> Your profile information
              will be visible to other users. Make sure to keep your contact details up to date.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
