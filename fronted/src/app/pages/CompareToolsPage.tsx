import { useState } from "react";
import { Link } from "react-router";
import { Plus, X, Search, CheckCircle2, XCircle, Star, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { SEO } from "../components/SEO";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

// Mock tools data
const availableTools = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    logo: "🤖",
    category: "Copywriting",
    rating: 4.8,
    pricing: "Freemium",
    description: "Advanced conversational AI",
    features: ["Natural language understanding", "Multi-language support", "Code generation", "Image generation"],
    pros: ["Most advanced language model", "Excellent context understanding", "Regular updates"],
    cons: ["Can be expensive", "Rate limits on free tier", "Occasional inaccuracies"],
  },
  {
    id: "claude",
    name: "Claude",
    logo: "🎭",
    category: "Copywriting",
    rating: 4.7,
    pricing: "Freemium",
    description: "AI assistant by Anthropic",
    features: ["Long context window", "Safe and helpful", "Document analysis", "Code assistance"],
    pros: ["Excellent for long documents", "Very ethical and safe", "Great for analysis"],
    cons: ["Slower response sometimes", "Limited image capabilities", "Fewer integrations"],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    logo: "✨",
    category: "Copywriting",
    rating: 4.6,
    pricing: "Free",
    description: "Google's multimodal AI",
    features: ["Multimodal input", "Google integration", "Real-time info", "Large context"],
    pros: ["Free to use", "Google integration", "Real-time information"],
    cons: ["Less creative", "Privacy concerns", "Limited customization"],
  },
  {
    id: "midjourney",
    name: "Midjourney",
    logo: "🎨",
    category: "Image Generation",
    rating: 4.9,
    pricing: "Paid",
    description: "AI art generator",
    features: ["High-quality images", "Artistic styles", "Community gallery", "Commercial use"],
    pros: ["Best image quality", "Amazing artistic results", "Active community"],
    cons: ["Paid only", "Requires Discord", "Can be complex"],
  },
  {
    id: "dalle",
    name: "DALL-E 3",
    logo: "🖼️",
    category: "Image Generation",
    rating: 4.7,
    pricing: "Freemium",
    description: "OpenAI's image generator",
    features: ["Text-to-image", "Image editing", "High resolution", "ChatGPT integration"],
    pros: ["Integrated with ChatGPT", "Easy to use", "Good prompt understanding"],
    cons: ["Content restrictions", "Limited free usage", "Slower generation"],
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    logo: "💻",
    category: "Code Assistant",
    rating: 4.8,
    pricing: "Paid",
    description: "AI pair programmer",
    features: ["Code completion", "Multi-language", "IDE integration", "Code explanation"],
    pros: ["Excellent code suggestions", "IDE integration", "Learns your style"],
    cons: ["Subscription required", "Can suggest insecure code", "Limited context"],
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: "⚡",
    category: "Code Assistant",
    rating: 4.6,
    pricing: "Freemium",
    description: "AI-powered code editor",
    features: ["AI code editing", "Chat with codebase", "Multi-file edits", "Terminal integration"],
    pros: ["Full IDE experience", "Can edit multiple files", "Great for refactoring"],
    cons: ["New tool learning curve", "Resource intensive", "Limited extensions"],
  },
];

export function CompareToolsPage() {
  const { t } = useLanguage();
  const [selectedTools, setSelectedTools] = useState<typeof availableTools>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showToolSelector, setShowToolSelector] = useState(true);

  const filteredTools = availableTools.filter(
    (tool) =>
      !selectedTools.find((t) => t.id === tool.id) &&
      (tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addTool = (tool: typeof availableTools[0]) => {
    if (selectedTools.length >= 4) {
      toast.error("Maximum 4 tools can be compared");
      return;
    }
    setSelectedTools([...selectedTools, tool]);
    toast.success(`${tool.name} added to comparison`);
  };

  const removeTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter((t) => t.id !== toolId));
    toast.success("Tool removed from comparison");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO
        title="Compare AI Tools Side-by-Side"
        description="Select up to 4 AI tools and compare features, pricing, pros and cons. Find the perfect AI tool for your needs with our comprehensive comparison tool."
        keywords="compare AI tools, AI tool comparison, ChatGPT vs Claude, Midjourney vs DALL-E, AI comparison"
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t("nav.compare")}
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Select up to 4 AI tools to compare side-by-side. Analyze features, pricing, and user ratings to find the perfect tool for your needs.
          </p>
        </motion.div>

        {/* Selected Tools Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Selected Tools ({selectedTools.length}/4)
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowToolSelector(!showToolSelector)}
              className="border-purple-500/30 text-cyan-400 hover:bg-purple-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showToolSelector ? "Hide" : "Show"} Tool Selector
            </Button>
          </div>

          {selectedTools.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              <AnimatePresence>
                {selectedTools.map((tool) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 rounded-full px-4 py-2 hover:border-cyan-400/60 transition-all"
                  >
                    <span className="text-2xl">{tool.logo}</span>
                    <span className="text-white font-semibold">{tool.name}</span>
                    <button
                      onClick={() => removeTool(tool.id)}
                      className="ml-2 p-1 rounded-full hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-8 bg-[#1a0b2e]/30 border border-purple-500/20 rounded-xl">
              <p className="text-gray-400">No tools selected. Add tools to start comparing.</p>
            </div>
          )}
        </motion.div>

        {/* Tool Selector */}
        <AnimatePresence>
          {showToolSelector && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Available Tools</h2>
                
                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search tools by name or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 bg-[#0a0118]/50 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTools.map((tool) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-[#0a0118]/50 border border-purple-500/20 rounded-xl p-4 hover:border-cyan-400/50 hover:bg-purple-900/20 transition-all cursor-pointer"
                      onClick={() => addTool(tool)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{tool.logo}</span>
                          <div>
                            <h3 className="text-white font-bold group-hover:text-cyan-400 transition-colors">
                              {tool.name}
                            </h3>
                            <Badge className="bg-purple-500/20 text-purple-300 text-xs mt-1">
                              {tool.category}
                            </Badge>
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{tool.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white text-sm font-semibold">{tool.rating}</span>
                        </div>
                        <Badge className="bg-cyan-500/20 text-cyan-300 text-xs">
                          {tool.pricing}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {filteredTools.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No tools found matching your search.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison Table */}
        {selectedTools.length >= 2 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-900/30 border-b border-purple-500/20">
                  <tr>
                    <th className="text-left p-4 text-gray-300 font-semibold min-w-[150px]">Feature</th>
                    {selectedTools.map((tool) => (
                      <th key={tool.id} className="text-center p-4 min-w-[250px]">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">{tool.logo}</span>
                          <span className="text-white font-bold">{tool.name}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-white text-sm">{tool.rating}</span>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Category */}
                  <tr className="border-b border-purple-500/10">
                    <td className="p-4 text-gray-300 font-semibold">Category</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center">
                        <Badge className="bg-purple-500/20 text-purple-300">
                          {tool.category}
                        </Badge>
                      </td>
                    ))}
                  </tr>

                  {/* Pricing */}
                  <tr className="border-b border-purple-500/10 bg-[#0a0118]/30">
                    <td className="p-4 text-gray-300 font-semibold">Pricing</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center">
                        <Badge className={`${
                          tool.pricing === "Free" ? "bg-green-500/20 text-green-300" :
                          tool.pricing === "Paid" ? "bg-orange-500/20 text-orange-300" :
                          "bg-cyan-500/20 text-cyan-300"
                        }`}>
                          {tool.pricing}
                        </Badge>
                      </td>
                    ))}
                  </tr>

                  {/* Description */}
                  <tr className="border-b border-purple-500/10">
                    <td className="p-4 text-gray-300 font-semibold">Description</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center text-gray-400 text-sm">
                        {tool.description}
                      </td>
                    ))}
                  </tr>

                  {/* Features */}
                  <tr className="border-b border-purple-500/10 bg-[#0a0118]/30">
                    <td className="p-4 text-gray-300 font-semibold">Key Features</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4">
                        <ul className="space-y-2 text-left">
                          {tool.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-400 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                  {/* Pros */}
                  <tr className="border-b border-purple-500/10">
                    <td className="p-4 text-gray-300 font-semibold">Pros</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4">
                        <ul className="space-y-2 text-left">
                          {tool.pros.map((pro, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-400 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                  {/* Cons */}
                  <tr className="border-b border-purple-500/10 bg-[#0a0118]/30">
                    <td className="p-4 text-gray-300 font-semibold">Cons</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4">
                        <ul className="space-y-2 text-left">
                          {tool.cons.map((con, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-400 text-sm">
                              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                  {/* Action */}
                  <tr>
                    <td className="p-4 text-gray-300 font-semibold">Visit</td>
                    {selectedTools.map((tool) => (
                      <td key={tool.id} className="p-4 text-center">
                        <Link to={`/tool/${tool.id}`}>
                          <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : selectedTools.length === 1 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-[#1a0b2e]/30 border border-purple-500/20 rounded-2xl"
          >
            <ArrowRight className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Add One More Tool</h3>
            <p className="text-gray-400">Select at least one more tool to start comparing</p>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}