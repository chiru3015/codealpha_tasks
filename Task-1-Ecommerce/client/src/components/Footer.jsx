import React from 'react';
import { ShoppingBag, ShieldCheck, Truck, RefreshCw, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-20 border-t border-slate-800">
      {/* Highlights Bar */}
      <div className="border-b border-slate-800 py-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Free Express Shipping</h4>
              <p className="text-xs text-slate-400">On all orders over $100</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Secure Transactions</h4>
              <p className="text-xs text-slate-400">Encrypted payment gateway protection</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">30-Day Hassle-Free Returns</h4>
              <p className="text-xs text-slate-400">100% money back guarantee</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            NovaCart
          </div>
          <p className="text-xs leading-relaxed text-slate-400 mb-4">
            Crafted for the CodeAlpha Full Stack Development Internship. Built using React, Vite, Tailwind CSS, Express, and MongoDB Atlas.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Quick Navigation</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/" className="hover:text-white transition">Home Page</Link></li>
            <li><Link to="/products" className="hover:text-white transition">Browse All Products</Link></li>
            <li><Link to="/cart" className="hover:text-white transition">My Cart</Link></li>
            <li><Link to="/orders" className="hover:text-white transition">Order History</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Product Categories</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/products?category=Electronics" className="hover:text-white transition">Electronics</Link></li>
            <li><Link to="/products?category=Audio" className="hover:text-white transition">Audio & Sound</Link></li>
            <li><Link to="/products?category=Wearables" className="hover:text-white transition">Smart Wearables</Link></li>
            <li><Link to="/products?category=Accessories" className="hover:text-white transition">Accessories</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">Internship Project</h4>
          <p className="text-xs text-slate-400 mb-2">
            <strong>Organization:</strong> CodeAlpha
          </p>
          <p className="text-xs text-slate-400 mb-2">
            <strong>Track:</strong> Full Stack Development
          </p>
          <p className="text-xs text-slate-400">
            <strong>Developer:</strong> Chiru-3015
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-1">
          &copy; 2026 NovaCart. Built with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for CodeAlpha.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
