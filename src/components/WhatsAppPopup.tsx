import { X, MessageCircle } from 'lucide-react';

interface WhatsAppPopupProps {
  onClose: () => void;
}

export default function WhatsAppPopup({ onClose }: WhatsAppPopupProps) {
  const phoneNumber = '+917838908235';
  const message = 'Hi, I would like to upgrade to the paid version of ConvoAI.';
  const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;

  const handleWhatsAppClick = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <MessageCircle size={40} className="text-white" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Upgrade to Premium
          </h2>

          <p className="text-slate-600 mb-6">
            You've reached your free conversation limit. Contact our support team via WhatsApp to upgrade to the paid version and continue enjoying ConvoAI.
          </p>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-blue-800 mb-2">Premium Benefits:</p>
            <ul className="text-xs text-blue-700 space-y-1 text-left">
              <li>✓ Unlimited conversations</li>
              <li>✓ Priority support</li>
              <li>✓ Advanced features</li>
              <li>✓ Custom API integration</li>
            </ul>
          </div>

          <button
            onClick={handleWhatsAppClick}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <MessageCircle size={20} />
            Contact on WhatsApp
          </button>

          <p className="text-xs text-slate-500 mt-4">
            WhatsApp: {phoneNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
