import { BookOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const sizes = {
  sm: { wrap: 'w-7 h-7',  icon: 'w-4 h-4' },
  md: { wrap: 'w-9 h-9',  icon: 'w-5 h-5' },
  lg: { wrap: 'w-16 h-16', icon: 'w-8 h-8' },
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
