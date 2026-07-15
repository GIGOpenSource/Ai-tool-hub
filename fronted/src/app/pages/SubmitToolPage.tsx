import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Upload, Image, Link as LinkIcon, Tag, DollarSign, FileText, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { toast } from "sonner";
import { motion } from "motion/react";

const categories = [
  "Video Editing",
  "Copywriting",
  "Image Generation",
  "Code Assistant",
  "Productivity",
  "Analytics",
  "Audio Processing",
  "Data Analysis",
];

const pricingOptions = ["Free", "Freemium", "Paid"];

export function SubmitToolPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    description: "",
    longDescription: "",
    category: "",
    pricing: "",
    features: "",
    logo: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please login to submit a tool");
      return;
    }

    setLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setLoading(false);
    setSubmitted(true);
    toast.success("Tool submitted successfully! We'll review it soon.");
    
    // Reset form after 3 seconds and redirect
    setTimeout(() => {
      navigate("/");
    }, 3000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const breadcrumbs = [
    { label: t("nav.home"), href: "/" },
    { label: "Submit Tool" },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Please login to submit a tool</h1>
          <Link to="/">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
        <Navigation />
        
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-12">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Submission Received!</h2>
              <p className="text-gray-400 mb-6">
                Thank you for submitting {formData.name}. Our team will review it and get back to you soon.
              </p>
              <p className="text-gray-500 text-sm">Redirecting to homepage...</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">Submit AI Tool</h1>
            </div>
            <p className="text-gray-400">
              Share your AI tool with our community. Fill out the form below and we'll review your submission.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 md:p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300 mb-2 block">
                      Tool Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                      placeholder="e.g., ChatGPT, Midjourney"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-gray-300 mb-2 block">
                      Website URL <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        required
                        className="pl-10 bg-purple-900/20 border-purple-500/30 text-white"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-gray-300 mb-2 block">
                      Short Description <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="description"
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      required
                      maxLength={100}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                      placeholder="One-line description (max 100 characters)"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      {formData.description.length}/100 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="longDescription" className="text-gray-300 mb-2 block">
                      Detailed Description <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      id="longDescription"
                      value={formData.longDescription}
                      onChange={(e) => handleInputChange("longDescription", e.target.value)}
                      required
                      rows={6}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                      placeholder="Provide a detailed description of your tool, its features, and what makes it unique..."
                    />
                  </div>
                </div>
              </div>

              {/* Categorization */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-cyan-400" />
                  Categorization
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300 mb-3 block">
                      Category <span className="text-red-400">*</span>
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleInputChange("category", category)}
                          className={`p-3 rounded-lg border transition-all text-sm ${
                            formData.category === category
                              ? "border-cyan-400 bg-cyan-500/20 text-cyan-400"
                              : "border-purple-500/30 bg-purple-900/20 text-gray-300 hover:border-cyan-400/50"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-3 block">
                      Pricing Model <span className="text-red-400">*</span>
                    </Label>
                    <div className="flex gap-3">
                      {pricingOptions.map((pricing) => (
                        <button
                          key={pricing}
                          type="button"
                          onClick={() => handleInputChange("pricing", pricing)}
                          className={`flex-1 p-3 rounded-lg border transition-all ${
                            formData.pricing === pricing
                              ? "border-cyan-400 bg-cyan-500/20 text-cyan-400"
                              : "border-purple-500/30 bg-purple-900/20 text-gray-300 hover:border-cyan-400/50"
                          }`}
                        >
                          {pricing}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                  Additional Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="features" className="text-gray-300 mb-2 block">
                      Key Features
                    </Label>
                    <Textarea
                      id="features"
                      value={formData.features}
                      onChange={(e) => handleInputChange("features", e.target.value)}
                      rows={4}
                      className="bg-purple-900/20 border-purple-500/30 text-white"
                      placeholder="List key features, one per line..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="logo" className="text-gray-300 mb-2 block">
                      Logo URL
                    </Label>
                    <div className="relative">
                      <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="logo"
                        type="url"
                        value={formData.logo}
                        onChange={(e) => handleInputChange("logo", e.target.value)}
                        className="pl-10 bg-purple-900/20 border-purple-500/30 text-white"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      Optional: Provide a link to your tool's logo or icon
                    </p>
                  </div>
                </div>
              </div>

              {/* Guidelines */}
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Submission Guidelines</h4>
                <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
                  <li>Tool must be AI-powered or AI-related</li>
                  <li>Provide accurate and up-to-date information</li>
                  <li>Description should be clear and professional</li>
                  <li>All submissions are reviewed before publishing</li>
                  <li>Spam or low-quality submissions will be rejected</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex-1 border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.name || !formData.website || !formData.description || !formData.longDescription || !formData.category || !formData.pricing}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Tool
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}