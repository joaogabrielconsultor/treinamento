import { BookOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const sizes = {
  sm: { wrap: 'w-9 h-9',   icon: 'w-5 h-5' },
  md: { wrap: 'w-12 h-12', icon: 'w-6 h-6' },
  lg: { wrap: 'w-24 h-24', icon: 'w-10 h-10' },
};

export function LogoComponent({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { logoUrl } = useAppContext();
  const { wrap, icon } = sizes[size];

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Logo"
        className={`${wrap} object-contain rounded-xl flex-shrink-0`}
      />
    );
  }

  return (
    <div className={`${wrap} bg-brand rounded-xl flex items-center justify-center flex-shrink-0`}>
      <BookOpen className={`${icon} text-white`} />
    </div>
  );
}
