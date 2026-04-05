import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { motion } from "motion/react";

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  toolName: string;
}

export function ReviewModal({ open, onClose, toolName }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (review.trim().length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }

    setIsLoading(true);

    // 暂未接后端：真实发评需用户侧 POST API、落 review 表与 ugc_status 审核流（见 docs/项目-PRD-ORD-与实现差距及优化清单.md）
    await new Promise((resolve) => setTimeout(resolve, 1500)); // 占位延迟，避免误以为是即时成功写库

    toast.success("Review submitted successfully!");
    onClose();
    
    // Reset form
    setRating(0);
    setReview("");
    setPros("");
    setCons("");
    setIsLoading(false);
  };

  const handleCancel = () => {
    setRating(0);
    setReview("");
    setPros("");
    setCons("");
    onClose();
  };

  return (
    <Dialog
      open={open} // 受控显隐
      onOpenChange={(next) => {
        if (!next) onClose(); // 关闭时通知父级（忽略 true，避免误关）
      }}
    >
      <DialogContent className="bg-[#1a0b2e] border-purple-500/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Write a Review
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-2">Share your experience with {toolName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Star Rating */}
          <div>
            <label className="text-sm text-gray-400 mb-3 block">Your Rating *</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-600"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-gray-400">
                  {rating === 5
                    ? "Excellent!"
                    : rating === 4
                    ? "Very Good"
                    : rating === 3
                    ? "Good"
                    : rating === 2
                    ? "Fair"
                    : "Poor"}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Your Review * <span className="text-gray-500">({review.length}/500)</span>
            </label>
            <Textarea
              placeholder="Share your experience with this tool. What did you like? What could be improved?"
              value={review}
              onChange={(e) => setReview(e.target.value.slice(0, 500))}
              className="min-h-[120px] bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400 resize-none"
              required
            />
          </div>

          {/* Pros */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Pros <span className="text-gray-500">(Optional)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Easy to use, Great results, Fast performance"
              value={pros}
              onChange={(e) => setPros(e.target.value)}
              className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
            />
          </div>

          {/* Cons */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Cons <span className="text-gray-500">(Optional)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Expensive, Learning curve, Limited features"
              value={cons}
              onChange={(e) => setCons(e.target.value)}
              className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-purple-500/30 text-gray-300 hover:bg-purple-500/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </div>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
