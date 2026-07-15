import { Link } from "react-router";
import { BookOpen, Home, Search, Heart, Star, Filter, Share2, Upload, User, MessageSquare, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { motion } from "motion/react";

const steps = [
  {
    title: "1. Discover AI Tools",
    icon: Search,
    description: "Browse through our curated collection of AI tools",
    color: "text-cyan-400",
    features: [
      "Use the search bar to find specific tools",
      "Filter by category (Video, Copywriting, Image, Code, etc.)",
      "Sort by popularity, rating, or newest",
      "Filter by pricing (Free, Freemium, Paid)",
    ],
    path: "/",
  },
  {
    title: "2. View Tool Details",
    icon: BookOpen,
    description: "Learn everything about AI tools with comprehensive information",
    color: "text-purple-400",
    features: [
      "Read detailed descriptions and features",
      "View screenshots and demo videos",
      "Check pricing plans and availability",
      "See user ratings and reviews",
      "Compare with alternative tools",
    ],
    path: "/tool/chatgpt",
  },
  {
    title: "3. Compare Alternatives",
    icon: Filter,
    description: "Make informed decisions with side-by-side comparisons",
    color: "text-pink-400",
    features: [
      "Compare features across multiple tools",
      "View pricing differences",
      "Check ratings and user feedback",
      "Identify the best tool for your needs",
    ],
    path: "/compare/chatgpt",
  },
  {
    title: "4. Save Your Favorites",
    icon: Heart,
    description: "Build your personal collection of AI tools",
    color: "text-red-400",
    features: [
      "Click the heart icon on any tool card",
      "Access all favorites from your profile",
      "Search and filter your saved tools",
      "Remove tools you no longer need",
    ],
    path: "/favorites",
  },
  {
    title: "5. Share & Review",
    icon: MessageSquare,
    description: "Help the community by sharing your experience",
    color: "text-green-400",
    features: [
      "Leave ratings and reviews for tools you've used",
      "Share tools with friends and colleagues",
      "Read reviews from other users",
      "Vote on helpful reviews",
    ],
    path: "/tool/chatgpt",
  },
  {
    title: "6. Submit New Tools",
    icon: Upload,
    description: "Contribute to the community by adding tools",
    color: "text-yellow-400",
    features: [
      "Submit your own AI tool",
      "Help others discover new tools",
      "Provide detailed information",
      "Track submission status",
    ],
    path: "/submit",
  },
];

const features = [
  {
    icon: Search,
    title: "Smart Search",
    description: "Auto-suggest and powerful filtering",
  },
  {
    icon: Star,
    title: "User Reviews",
    description: "Authentic ratings and feedback",
  },
  {
    icon: Filter,
    title: "Advanced Filters",
    description: "Find exactly what you need",
  },
  {
    icon: Share2,
    title: "Social Sharing",
    description: "Share discoveries easily",
  },
  {
    icon: User,
    title: "User Profiles",
    description: "Personalized experience",
  },
  {
    icon: Heart,
    title: "Favorites",
    description: "Save and organize tools",
  },
];

export function GuidePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-cyan-400" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              User Guide
            </h1>
          </div>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Learn how to make the most of AI Tools Hub. Follow this complete walkthrough to discover, compare, and manage AI tools efficiently.
          </p>
        </motion.div>

        {/* Interactive Flow */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Complete Workflow</h2>
          <div className="max-w-4xl mx-auto space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 hover:border-cyan-400/50 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 shrink-0">
                        <Icon className={`w-8 h-8 ${step.color}`} />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-gray-400 mb-4">{step.description}</p>
                        
                        <ul className="space-y-2 mb-4">
                          {step.features.map((feature, fIndex) => (
                            <li key={fIndex} className="flex items-start gap-2 text-gray-300">
                              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <Link to={step.path}>
                          <Button
                            variant="outline"
                            className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:border-cyan-400/50 group-hover:text-cyan-400"
                          >
                            Try it now
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Key Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6 hover:border-cyan-400/50 hover:bg-purple-900/30 transition-all"
                >
                  <Icon className="w-8 h-8 text-cyan-400 mb-3" />
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* User Account Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white mb-8 text-center">User Account Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6">
              <User className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">My Profile</h3>
              <ul className="space-y-2 text-gray-400">
                <li>• View your activity history</li>
                <li>• Edit personal information</li>
                <li>• Track statistics and contributions</li>
                <li>• Manage account settings</li>
              </ul>
              <Link to="/profile" className="mt-4 inline-block">
                <Button variant="outline" className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20">
                  Go to Profile
                </Button>
              </Link>
            </div>

            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-xl p-6">
              <Heart className="w-8 h-8 text-pink-400 mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">My Favorites</h3>
              <ul className="space-y-2 text-gray-400">
                <li>• Save tools for quick access</li>
                <li>• Organize by category</li>
                <li>• Search your collection</li>
                <li>• Export favorites list</li>
              </ul>
              <Link to="/favorites" className="mt-4 inline-block">
                <Button variant="outline" className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20">
                  View Favorites
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Tips & Best Practices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-8"
        >
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Tips & Best Practices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-bold text-cyan-400 mb-3">For Tool Discovery</h3>
              <ul className="space-y-2 text-gray-300">
                <li>✓ Use filters to narrow down options</li>
                <li>✓ Check ratings and review counts</li>
                <li>✓ Read user reviews for real insights</li>
                <li>✓ Compare alternatives before deciding</li>
                <li>✓ Save interesting tools for later</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-3">For Contributing</h3>
              <ul className="space-y-2 text-gray-300">
                <li>✓ Submit tools you find valuable</li>
                <li>✓ Write detailed, honest reviews</li>
                <li>✓ Help others with accurate ratings</li>
                <li>✓ Share tools with your network</li>
                <li>✓ Keep information up-to-date</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-center mt-16"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-6">
            Explore our collection of AI tools and start building your favorites list today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                <Home className="w-4 h-4 mr-2" />
                Explore AI Tools
              </Button>
            </Link>
            <Link to="/sitemap">
              <Button variant="outline" className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20">
                View Site Map
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}