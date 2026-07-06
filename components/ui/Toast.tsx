"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  onClose: () => void;
};

// Fixed bottom-right pill, auto-dismisses after 3 seconds
export default function Toast({ message, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="flex items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 text-brand"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
        {message}
      </div>
    </div>
  );
}
