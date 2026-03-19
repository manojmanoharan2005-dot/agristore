import { useEffect, useState } from 'react';
import { X, Bell } from 'lucide-react';

const updates = [
  'Monsoon prep discount: Up to 30% off on irrigation accessories',
  'Free delivery above Rs. 999 across selected districts',
  'New arrivals: Bio-fertilizers for Kharif crops now live',
  'AgriSmart AI now supports crop disease first-aid guidance'
];

const NotificationTicker = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % updates.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;

  return (
      <div
        className={`fixed top-16 right-4 z-[9999] max-w-xs w-full transition-all duration-500 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
        }`}
      >
      <div className="bg-primary text-white rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
        <Bell size={15} className="mt-0.5 shrink-0 text-accent" />
        <p className="flex-1 leading-snug text-xs font-semibold uppercase tracking-wide">{updates[index]}</p>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 hover:opacity-70 transition-opacity mt-0.5"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default NotificationTicker;
