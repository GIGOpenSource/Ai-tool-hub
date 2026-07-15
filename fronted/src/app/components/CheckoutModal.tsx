import { useState } from "react";
import { CreditCard, Lock, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { motion } from "motion/react";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CheckoutModal({ open, onClose, onSuccess }: CheckoutModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    setExpiry(formatted);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, "").slice(0, 3);
    setCvc(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardNumber || !expiry || !cvc || !cardholderName) {
      toast.error("Please fill in all payment details");
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.success("Payment successful! Your tool is now boosted.");
    onSuccess?.();
    onClose();

    // Reset form
    setCardNumber("");
    setExpiry("");
    setCvc("");
    setCardholderName("");
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a0b2e] border-purple-500/30 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Boost Your Tool's Visibility
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 mt-4">
          {/* Order Summary */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
            <div className="bg-[#0a0118] border border-purple-500/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
                <div>
                  <h4 className="font-semibold text-white">Featured Tool Placement</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Premium visibility for your AI tool
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-cyan-400">$99</div>
                  <div className="text-xs text-gray-500">/month</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>$99.00</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Processing fee</span>
                  <span>$2.97</span>
                </div>
                <div className="flex justify-between font-bold text-white text-lg pt-2 border-t border-purple-500/20">
                  <span>Total</span>
                  <span>$101.97</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="mt-6 pt-6 border-t border-purple-500/20">
                <h4 className="font-semibold text-white mb-3">What's included:</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Featured placement on homepage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>5x more visibility & clicks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Priority in category listings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Cancel anytime</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Card Number */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Card Number</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                    className="pl-10 bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* Expiry & CVC */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Expiry Date</label>
                  <Input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    maxLength={5}
                    className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">CVC</label>
                  <Input
                    type="text"
                    placeholder="123"
                    value={cvc}
                    onChange={handleCvcChange}
                    maxLength={3}
                    className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Cardholder Name</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="bg-[#0a0118] border-purple-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
                  required
                />
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Lock className="w-4 h-4 text-green-400 mt-0.5" />
                <p className="text-xs text-gray-300">
                  Your payment information is encrypted and secure. We never store your card details.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 text-lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Pay $101.97 & Boost Tool
                  </div>
                )}
              </Button>

              {/* Cancel Button */}
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
