import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { APP_CONTACT } from '../../firebaseConfig';

export default function Footer() {
  return (
    <footer className="bg-navy-800 dark:bg-navy-900 text-gray-300 mt-auto">
      <div className="page-wrap py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-white font-bold text-lg">ReRoute</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Discover premium farmhouse experiences. Book your perfect countryside getaway today.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/explore" className="hover:text-gold-400 transition-colors">Explore Farmhouses</Link></li>
              <li><Link to="/login" className="hover:text-gold-400 transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-gold-400 transition-colors">List Your Property</Link></li>
            </ul>
          </div>

          {/* Only app owner contact is shown here — farmhouse owner contacts are hidden */}
          <div>
            <h4 className="text-white font-semibold mb-3">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-gold-400 flex-shrink-0" />
                <a href={`mailto:${APP_CONTACT.supportEmail}`} className="hover:text-gold-400 transition-colors">
                  {APP_CONTACT.supportEmail}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-gold-400 flex-shrink-0" />
                <a href={`tel:${APP_CONTACT.supportPhone}`} className="hover:text-gold-400 transition-colors">
                  {APP_CONTACT.supportPhone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-700 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} ReRoute. All rights reserved.</p>
          <p>Made for farmhouse lovers</p>
        </div>
      </div>
    </footer>
  );
}
