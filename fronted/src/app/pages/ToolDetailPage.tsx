import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink, Star, ThumbsUp, ThumbsDown, Play, Sparkles, Heart, Share2, BookmarkPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ReviewModal } from "../components/ReviewModal";
import { toast } from "sonner";
import { motion } from "motion/react";

const toolData: Record<string, any> = {
  chatgpt: {
    name: "ChatGPT",
    logo: "🤖",
    tagline: "Advanced conversational AI for natural language understanding and generation",
    rating: 4.8,
    totalReviews: 15420,
    category: "Copywriting",
    pricing: "Freemium",
    website: "https://chat.openai.com",
    description: `ChatGPT is a state-of-the-art language model developed by OpenAI. It can understand and generate human-like text, making it perfect for a wide range of applications including content creation, coding assistance, research, and creative writing.

With advanced reasoning capabilities and a vast knowledge base, ChatGPT helps professionals and creators accomplish tasks more efficiently. The tool supports multiple languages and can adapt to various writing styles and tones.`,
    features: [
      "Natural language understanding and generation",
      "Multi-language support (50+ languages)",
      "Context-aware conversations",
      "Code generation and debugging",
      "Creative writing assistance",
      "Research and information synthesis",
      "Custom instructions and memory",
      "Image generation (DALL-E integration)",
    ],
    screenshots: ["📸", "🖼️", "💬"],
    alternatives: [
      { id: "claude", name: "Claude", rating: 4.7, pricing: "Freemium" },
      { id: "gemini", name: "Google Gemini", rating: 4.6, pricing: "Free" },
      { id: "copilot", name: "Microsoft Copilot", rating: 4.5, pricing: "Freemium" },
    ],
    pricingPlans: [
      { name: "Free", price: "$0", features: ["Limited access", "Standard response speed", "Basic features"] },
      { name: "Plus", price: "$20", features: ["Unlimited access", "Faster response", "GPT-4 access", "Priority support"] },
      { name: "Team", price: "$30", features: ["Everything in Plus", "Team workspace", "Admin console", "Usage analytics"] },
    ],
    reviews: [
      {
        user: "Sarah Chen",
        avatar: "👩",
        rating: 5,
        date: "March 2026",
        comment: "Absolutely game-changing for my content creation workflow. Saves me hours every week!",
        helpful: 234,
      },
      {
        user: "Alex Kumar",
        avatar: "👨",
        rating: 5,
        date: "February 2026",
        comment: "Best AI assistant I've used. The responses are accurate and context-aware.",
        helpful: 189,
      },
      {
        user: "Maria Santos",
        avatar: "👩",
        rating: 4,
        date: "February 2026",
        comment: "Great tool overall, but sometimes it can be a bit slow during peak hours.",
        helpful: 156,
      },
    ],
  },
};

export function ToolDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const tool = id ? toolData[id] : null;
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [helpfulReviews, setHelpfulReviews] = useState<Set<number>>(new Set());

  if (!tool) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Tool not found</h1>
          <Link to="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? "Removed from favorites" : t("notif.addedToFavorites"));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: tool.name,
        text: tool.tagline,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const toggleHelpful = (index: number) => {
    const newHelpful = new Set(helpfulReviews);
    if (newHelpful.has(index)) {
      newHelpful.delete(index);
    } else {
      newHelpful.add(index);
    }
    setHelpfulReviews(newHelpful);
  };

  const breadcrumbs = [
    { label: t("nav.home"), href: "/" },
    { label: tool.category },
    { label: tool.name },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tool Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 md:p-8 mb-6"
            >
              <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                <div className="text-6xl">{tool.logo}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">{tool.name}</h1>
                  </div>
                  <p className="text-lg text-gray-300 mb-4">{tool.tagline}</p>
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-semibold text-lg">{tool.rating}</span>
                      <span className="text-gray-400">({tool.totalReviews.toLocaleString()} {t("tool.reviews")})</span>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{tool.category}</Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">{tool.pricing}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-8">
                      <ExternalLink className="w-5 h-5 mr-2" />
                      {t("tool.visitWebsite")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={toggleFavorite}
                      className={`border-purple-500/30 ${
                        isFavorite ? "bg-pink-500/20 text-pink-400 border-pink-500/30" : "text-gray-300"
                      } hover:bg-purple-500/20`}
                    >
                      <Heart className={`w-5 h-5 mr-2 ${isFavorite ? "fill-pink-400" : ""}`} />
                      {t("tool.addToFavorites")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShare}
                      className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                    >
                      <Share2 className="w-5 h-5 mr-2" />
                      {t("tool.share")}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs for Content */}
            <Tabs defaultValue="overview" className="mb-6">
              <TabsList className="bg-[#1a0b2e]/50 border border-purple-500/20 mb-6">
                <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  {t("detail.overview")}
                </TabsTrigger>
                <TabsTrigger value="features" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  {t("detail.features")}
                </TabsTrigger>
                <TabsTrigger value="gallery" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  {t("detail.gallery")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-4">{t("detail.about")} {tool.name}</h2>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">{tool.description}</p>
                </motion.div>
              </TabsContent>

              <TabsContent value="features">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-4">{t("detail.keyFeatures")}</h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tool.features.map((feature: string, index: number) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-2 text-gray-300"
                      >
                        <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </TabsContent>

              <TabsContent value="gallery">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-4">{t("detail.screenshots")}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tool.screenshots.map((screenshot: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="aspect-video bg-gradient-to-br from-purple-900/30 to-cyan-900/30 rounded-xl flex items-center justify-center border border-purple-500/20 group hover:border-cyan-400/50 transition-all cursor-pointer"
                      >
                        <div className="text-center">
                          <div className="text-6xl mb-2">{screenshot}</div>
                          {index === 0 && (
                            <div className="flex items-center justify-center gap-2 text-cyan-400">
                              <Play className="w-5 h-5" />
                              <span>{t("detail.watchDemo")}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>

            {/* User Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{t("detail.userReviews")}</h2>
                <Button
                  onClick={() => setReviewModalOpen(true)}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
                >
                  {t("detail.writeReview")}
                </Button>
              </div>

              {/* Rating Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-purple-500/20">
                <div className="text-center md:text-left">
                  <div className="text-5xl font-bold text-white mb-2">{tool.rating}</div>
                  <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-400">{tool.totalReviews.toLocaleString()} {t("tool.reviews")}</p>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-gray-300 text-sm w-12">{stars} star</span>
                      <Progress value={stars === 5 ? 80 : stars === 4 ? 15 : 5} className="flex-1 h-2" />
                      <span className="text-gray-400 text-sm w-12">{stars === 5 ? "80%" : stars === 4 ? "15%" : "5%"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="space-y-6">
                {tool.reviews.map((review: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-purple-500/10 last:border-0 pb-6 last:pb-0"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">{review.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="text-white font-semibold">{review.user}</h4>
                            <p className="text-gray-500 text-sm">{review.date}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-300 mb-3">{review.comment}</p>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleHelpful(index)}
                            className={`flex items-center gap-1 transition-colors text-sm ${
                              helpfulReviews.has(index) ? "text-cyan-400" : "text-gray-400 hover:text-cyan-400"
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{t("detail.helpful")} ({review.helpful + (helpfulReviews.has(index) ? 1 : 0)})</span>
                          </button>
                          <button className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors text-sm">
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Plans */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 sticky top-24"
            >
              <h3 className="text-xl font-bold text-white mb-4">{t("detail.pricingPlans")}</h3>
              <div className="space-y-4">
                {tool.pricingPlans.map((plan: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 hover:border-cyan-400/50 transition-all"
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                      <span className="text-2xl font-bold text-cyan-400">{plan.price}</span>
                      {plan.price !== "$0" && <span className="text-gray-400 text-sm">{t("detail.perMonth")}</span>}
                    </div>
                    <ul className="space-y-1">
                      {plan.features.map((feature: string, i: number) => (
                        <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Top Alternatives */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-4">{t("detail.topAlternatives")}</h3>
              <div className="space-y-3">
                {tool.alternatives.map((alt: any, index: number) => (
                  <Link
                    key={alt.id}
                    to={`/tool/${alt.id}`}
                    className="flex items-center justify-between p-3 bg-purple-900/20 rounded-lg hover:bg-purple-900/40 transition-all group"
                  >
                    <div>
                      <h4 className="text-white font-semibold group-hover:text-cyan-400 transition-colors">{alt.name}</h4>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-gray-400">{alt.rating}</span>
                      </div>
                    </div>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">{alt.pricing}</Badge>
                  </Link>
                ))}
              </div>
              <Link to="/compare/chatgpt">
                <Button variant="outline" className="w-full mt-4 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20">
                  {t("detail.compareAll")}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        toolName={tool.name}
      />
    </div>
  );
}