
import React from 'react';
import BrandLogo from '../ui/BrandLogo';
import { Phone, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B1020] border-t border-slate-800 py-12 text-slate-400">
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
          <div className="flex flex-col items-center md:items-start gap-2">
            <BrandLogo variant="dark" size="md" showSubtitle={true} />
            <p className="text-xs text-slate-400 mt-2 max-w-sm text-center md:text-left">
              Managed by SSK Samaj Bangalore Organisations. Dedicated to community intelligence, unity, and welfare.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-xs">
            <a 
              href="tel:+918884449689" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-saffron-500/20 text-saffron-300 hover:text-white border border-saffron-500/20 transition-all font-semibold"
            >
              <Phone size={14} className="text-saffron-400" />
              <span>Helpline: +91 888 444 9689</span>
            </a>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} SSK People. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>Built for the Samaj with</span>
            <Heart size={13} className="text-rose-400 fill-rose-400" />
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
