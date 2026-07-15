import { useState } from "react";
import { Link } from "react-router";
import { User, Mail, Calendar, Edit2, Save, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { toast } from "sonner";
import { motion } from "motion/react";

const activityData = [
  {
    type: "review",
    tool: "ChatGPT",
    action: "Left a 5-star review",
    date: "2 days ago",
    icon: "⭐",
  },
  {
    type: "favorite",
    tool: "Midjourney",
    action: "Added to favorites",
    date: "5 days ago",
    icon: "❤️",
  },
  {
    type: "visit",
    tool: "GitHub Copilot",
    action: "Visited tool page",
    date: "1 week ago",
    icon: "👁️",
  },
  {
    type: "review",
    tool: "Notion AI",
    action: "Left a 4-star review",
    date: "2 weeks ago",
    icon: "⭐",
  },
];

const stats = [
  { label: "Tools Reviewed", value: 12, color: "text-cyan-400" },
  { label: "Favorites", value: 8, color: "text-pink-400" },
  { label: "Tools Submitted", value: 3, color: "text-purple-400" },
  { label: "Helpful Votes", value: 156, color: "text-green-400" },
];

export function ProfilePage() {
  const { t } = useLanguage();
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    email: user?.email || "",
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Please login to view your profile</h1>
          <Link to="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateProfile(editedUser);
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleCancel = () => {
    setEditedUser({
      name: user.name,
      bio: user.bio || "",
      email: user.email,
    });
    setIsEditing(false);
  };

  const breadcrumbs = [
    { label: t("nav.home"), href: "/" },
    { label: "My Profile" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 sticky top-24"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4 mx-auto w-24 h-24 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full border-2 border-cyan-400/50">
                  {user.avatar}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
                <p className="text-gray-400 text-sm mb-4">{user.email}</p>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  Member since {user.joinDate}
                </Badge>
                
                {/* Edit Profile Button */}
                <Link to="/edit-profile" className="block mt-4">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
              </div>

              {user.bio && (
                <div className="mb-6 pb-6 border-b border-purple-500/20">
                  <p className="text-gray-300 text-center">{user.bio}</p>
                </div>
              )}

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-purple-500/20">
                <h3 className="text-lg font-bold text-white mb-4">Statistics</h3>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((stat, index) => (
                    <div
                      key={index}
                      className="bg-purple-900/20 rounded-lg p-3 text-center border border-purple-500/20"
                    >
                      <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                      <div className="text-gray-400 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit Profile Form */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 mb-2 block">Name</label>
                    <Input
                      value={editedUser.name}
                      onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 mb-2 block">Email</label>
                    <Input
                      value={editedUser.email}
                      onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 mb-2 block">Bio</label>
                    <Textarea
                      value={editedUser.bio}
                      onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/favorites">
                  <Button
                    variant="outline"
                    className="w-full h-auto flex-col py-6 border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50"
                  >
                    <span className="text-3xl mb-2">❤️</span>
                    <span>My Favorites</span>
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    className="w-full h-auto flex-col py-6 border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50"
                  >
                    <span className="text-3xl mb-2">📊</span>
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Link to="/settings">
                  <Button
                    variant="outline"
                    className="w-full h-auto flex-col py-6 border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50"
                  >
                    <span className="text-3xl mb-2">⚙️</span>
                    <span>Settings</span>
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {activityData.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-start gap-4 p-4 bg-purple-900/20 rounded-lg border border-purple-500/10 hover:border-cyan-400/30 transition-all"
                  >
                    <div className="text-2xl">{activity.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-white font-semibold">{activity.tool}</h4>
                        <span className="text-gray-500 text-xs">{activity.date}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{activity.action}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}