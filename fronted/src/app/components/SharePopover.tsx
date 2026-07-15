import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";

interface SharePopoverProps {
  toolName: string;
  toolUrl: string;
}

export function SharePopover({ toolName, toolUrl }: SharePopoverProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(toolUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(toolUrl);
    const encodedText = encodeURIComponent(`Check out ${toolName} - an amazing AI tool!`);
    
    let shareUrl = "";
    
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-purple-500/30 text-gray-300 hover:bg-purple-500/20 hover:text-cyan-400"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-[#1a0b2e] border-purple-500/30 text-white p-4">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Share {toolName}</h3>
          
          {/* Copy Link */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Copy Link</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={toolUrl}
                readOnly
                className="bg-[#0a0118] border-purple-500/30 text-gray-300 text-sm"
              />
              <Button
                onClick={handleCopyLink}
                size="sm"
                className={`${
                  copied
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-purple-500 hover:bg-purple-600"
                } text-white transition-colors`}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Share on social</label>
            <div className="grid grid-cols-3 gap-2">
              {/* Twitter/X */}
              <Button
                onClick={() => handleShare("twitter")}
                variant="outline"
                className="border-purple-500/30 hover:bg-purple-500/20 hover:border-cyan-400/50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Button>

              {/* LinkedIn */}
              <Button
                onClick={() => handleShare("linkedin")}
                variant="outline"
                className="border-purple-500/30 hover:bg-purple-500/20 hover:border-cyan-400/50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Button>

              {/* Facebook */}
              <Button
                onClick={() => handleShare("facebook")}
                variant="outline"
                className="border-purple-500/30 hover:bg-purple-500/20 hover:border-cyan-400/50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
