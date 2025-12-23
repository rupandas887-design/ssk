
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 py-8">
      <div className="container mx-auto text-center text-gray-400">
        <p className="font-cinzel text-lg">SSK PEOPLE</p>
        <p className="mt-2">Managed by SSK Samaj Bangalore Organisations</p>
        <p className="mt-1">For volunteer registration, contact: <a href="tel:+918884449689" className="text-orange-500 hover:underline">+91 888 444 9689</a></p>
        <p className="mt-4 text-sm">&copy; {new Date().getFullYear()} sskpeople.com. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
