import { X } from 'lucide-react';

const ErrorToast = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-[10000] w-[min(92vw,380px)]">
      <div className="bg-secondary text-white rounded-lg shadow-lg border-l-4 border-red-500 px-4 py-3 flex items-start gap-3">
        <X size={18} className="text-red-400 shrink-0 mt-0.5" />
        <p className="flex-1 text-sm leading-5 font-medium">{message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close error notification"
          className="shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default ErrorToast;
