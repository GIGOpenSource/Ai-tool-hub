import { Link, useParams } from "react-router";
import { ArrowLeft, GitCompare, CheckCircle2, XCircle, Star, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { motion } from "motion/react";

const comparisonData: Record<string, any> = {
  chatgpt: {
    mainTool: {
      name: "ChatGPT",
      logo: "🤖",
      developer: "OpenAI",
      rating: 4.8,
      pricing: "Free - $20/mo",
      description: "Advanced conversational AI with GPT-4 capabilities",
    },
    alternatives: [
      {
        name: "Claude",
        logo: "🧠",
        developer: "Anthropic",
        rating: 4.7,
        pricing: "Free - $20/mo",
        description: "AI assistant focused on being helpful, harmless, and honest",
      },
      {
        name: "Google Gemini",
        logo: "✨",
        developer: "Google",
        rating: 4.6,
        pricing: "Free",
        description: "Multimodal AI model with deep Google integration",
      },
      {
        name: "Microsoft Copilot",
        logo: "💡",
        developer: "Microsoft",
        rating: 4.5,
        pricing: "Free - $30/mo",
        description: "AI companion integrated with Microsoft 365",
      },
    ],
    features: [
      {
        category: "Pricing",
        items: [
          { name: "Free Plan", chatgpt: true, claude: true, gemini: true, copilot: true },
          { name: "Premium Pricing", chatgpt: "$20/mo", claude: "$20/mo", gemini: "Free", copilot: "$30/mo" },
          { name: "Team Plans", chatgpt: true, claude: true, gemini: false, copilot: true },
        ],
      },
      {
        category: "Capabilities",
        items: [
          { name: "Text Generation", chatgpt: true, claude: true, gemini: true, copilot: true },
          { name: "Code Generation", chatgpt: true, claude: true, gemini: true, copilot: true },
          { name: "Image Generation", chatgpt: true, claude: false, gemini: true, copilot: true },
          { name: "Image Analysis", chatgpt: true, claude: true, gemini: true, copilot: true },
          { name: "Web Browsing", chatgpt: true, claude: false, gemini: true, copilot: true },
          { name: "File Upload", chatgpt: true, claude: true, gemini: true, copilot: true },
        ],
      },
      {
        category: "Context & Memory",
        items: [
          { name: "Context Window", chatgpt: "128K tokens", claude: "200K tokens", gemini: "1M tokens", copilot: "128K tokens" },
          { name: "Conversation Memory", chatgpt: true, claude: false, gemini: true, copilot: true },
          { name: "Custom Instructions", chatgpt: true, claude: false, gemini: false, copilot: false },
        ],
      },
      {
        category: "Integration",
        items: [
          { name: "API Access", chatgpt: true, claude: true, gemini: true, copilot: true },
          { name: "Mobile App", chatgpt: true, claude: true, gemini: true, copilot: true },
          { name: "Browser Extension", chatgpt: false, claude: false, gemini: true, copilot: true },
          { name: "Office Integration", chatgpt: false, claude: false, gemini: false, copilot: true },
        ],
      },
    ],
    pros: {
      chatgpt: [
        "Most advanced language understanding",
        "DALL-E integration for images",
        "Large plugin ecosystem",
        "Custom GPTs marketplace",
      ],
      claude: [
        "Largest context window (200K)",
        "Strong ethical guidelines",
        "Excellent for long documents",
        "Constitutional AI approach",
      ],
      gemini: [
        "Completely free to use",
        "Deep Google Search integration",
        "Massive 1M token context",
        "Multimodal from the ground up",
      ],
      copilot: [
        "Seamless Microsoft 365 integration",
        "Enterprise security features",
        "Built into Windows 11",
        "Access to GPT-4 for free",
      ],
    },
    cons: {
      chatgpt: [
        "Can be expensive for heavy users",
        "Slower during peak times",
        "Free tier limitations",
      ],
      claude: [
        "No image generation",
        "Limited web browsing",
        "Smaller user community",
      ],
      gemini: [
        "Less accurate than GPT-4",
        "No team features yet",
        "Limited third-party integrations",
      ],
      copilot: [
        "Most expensive premium tier",
        "Requires Microsoft account",
        "Less customization options",
      ],
    },
  },
};

export function ComparisonPage() {
  const { toolName } = useParams();
  const data = toolName ? comparisonData[toolName] : null;

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Comparison not found</h1>
          <Link to="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const allTools = [data.mainTool, ...data.alternatives];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0 mb-4">
            <GitCompare className="w-4 h-4 mr-1" />
            SEO Comparison
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {data.mainTool.name} vs Best Alternatives 2026
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Comprehensive comparison of {data.mainTool.name} with top alternatives. Find the best AI assistant for your needs.
          </p>
        </div>

        {/* Tools Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {allTools.map((tool, index) => (
            <div
              key={index}
              className={`bg-[#1a0b2e]/50 border rounded-2xl p-6 ${
                index === 0 ? "border-cyan-500/50 ring-2 ring-cyan-500/20" : "border-purple-500/20"
              }`}
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">{tool.logo}</div>
                <h3 className="text-xl font-bold text-white mb-1">{tool.name}</h3>
                <p className="text-gray-500 text-sm mb-3">{tool.developer}</p>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="text-yellow-400">⭐</span>
                  <span className="text-white font-semibold">{tool.rating}</span>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-3">
                  {tool.pricing}
                </Badge>
                <p className="text-gray-400 text-sm line-clamp-2">{tool.description}</p>
              </div>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit
              </Button>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl overflow-hidden mb-12">
          <div className="overflow-x-auto">
            {data.features.map((section: any, sectionIndex: number) => (
              <div key={sectionIndex}>
                <div className="bg-purple-900/30 px-6 py-4 border-b border-purple-500/20">
                  <h2 className="text-xl font-bold text-white">{section.category}</h2>
                </div>
                <div className="divide-y divide-purple-500/10">
                  {section.items.map((item: any, itemIndex: number) => (
                    <div key={itemIndex} className="grid grid-cols-5 gap-4 px-6 py-4 hover:bg-purple-900/20 transition-colors">
                      <div className="col-span-1 text-gray-300 font-medium">{item.name}</div>
                      <div className="text-center">
                        {typeof item.chatgpt === "boolean" ? (
                          item.chatgpt ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                          )
                        ) : (
                          <span className="text-cyan-400 font-semibold">{item.chatgpt}</span>
                        )}
                      </div>
                      <div className="text-center">
                        {typeof item.claude === "boolean" ? (
                          item.claude ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-300">{item.claude}</span>
                        )}
                      </div>
                      <div className="text-center">
                        {typeof item.gemini === "boolean" ? (
                          item.gemini ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-300">{item.gemini}</span>
                        )}
                      </div>
                      <div className="text-center">
                        {typeof item.copilot === "boolean" ? (
                          item.copilot ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-300">{item.copilot}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pros and Cons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {allTools.map((tool, index) => {
            const toolKey = index === 0 ? "chatgpt" : index === 1 ? "claude" : index === 2 ? "gemini" : "copilot";
            return (
              <div key={index} className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">{tool.name}</h3>
                
                <div className="mb-4">
                  <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Pros
                  </h4>
                  <ul className="space-y-1">
                    {data.pros[toolKey].map((pro: string, i: number) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-green-400 mt-1">+</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Cons
                  </h4>
                  <ul className="space-y-1">
                    {data.cons[toolKey].map((con: string, i: number) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-red-400 mt-1">-</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* SEO Content Section */}
        <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Which AI Assistant Should You Choose?</h2>
          <div className="text-gray-300 space-y-4">
            <p>
              Choosing the right AI assistant depends on your specific needs and use case. Here's a quick guide to help you decide:
            </p>
            <div className="space-y-3">
              <div className="bg-purple-900/20 rounded-lg p-4">
                <h3 className="text-cyan-400 font-semibold mb-2">Choose {data.mainTool.name} if:</h3>
                <p className="text-gray-400">
                  You need the most advanced language model with plugin support and want access to DALL-E for image generation.
                  Best for professionals who need the cutting edge of AI technology.
                </p>
              </div>
              <div className="bg-purple-900/20 rounded-lg p-4">
                <h3 className="text-cyan-400 font-semibold mb-2">Choose Claude if:</h3>
                <p className="text-gray-400">
                  You work with very long documents and need a large context window. Ideal for researchers and writers who
                  value safety and ethical AI.
                </p>
              </div>
              <div className="bg-purple-900/20 rounded-lg p-4">
                <h3 className="text-cyan-400 font-semibold mb-2">Choose Google Gemini if:</h3>
                <p className="text-gray-400">
                  You want a completely free option with excellent Google integration and multimodal capabilities. Perfect
                  for students and casual users.
                </p>
              </div>
              <div className="bg-purple-900/20 rounded-lg p-4">
                <h3 className="text-cyan-400 font-semibold mb-2">Choose Microsoft Copilot if:</h3>
                <p className="text-gray-400">
                  You're heavily invested in the Microsoft ecosystem and need enterprise-grade features with Office 365
                  integration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-900/20 bg-[#0a0118]/80 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-500">
            <p>Last Updated: March 2026 | All pricing and features subject to change</p>
          </div>
        </div>
      </footer>
    </div>
  );
}