// components/requests/NewRequestButton.tsx
'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import NewRequestModal from './NewRequestModal';

export default function NewRequestButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn-primary flex items-center gap-2 shadow-ambient">
        <FileText className="w-4 h-4" />
        New Request
      </button>
      <NewRequestModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
