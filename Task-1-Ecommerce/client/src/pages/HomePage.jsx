import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, Zap, TrendingUp, ShoppingBag } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/products?featured=true');
        setFeaturedProducts(res.data);
      } catch (err) {
        console.error('Error fetching featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const categories = [
    { name: 'Electronics', count: 'Gadgets & Setup', icon: '💻' },
    { name: 'Audio', count: 'Headphones & Speakers', icon: '🎧' },
    { name: 'Wearables', count: 'Smart Watches', icon: '⌚' },
    { name: 'Accessories', count: 'Bags & Style', icon: '🎒' },
  ];

  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white px-6 sm:px-12 py-16 sm:py-24 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_50%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            CodeAlpha Internship Project • NovaCart
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Next-Gen Lifestyle & Tech Essentials.
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Discover precision-crafted audio gear, high-performance mechanical peripherals, and smart lifestyle accessories with real-time stock management.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-4 h-4" />
              Explore All Products
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/products?category=Audio"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-semibold text-sm backdrop-blur-sm transition-all"
            >
              Browse Audio Gear
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Popular Categories</h2>
            <p className="text-sm text-slate-500">Curated collections for your workspace and lifestyle</p>
          </div>
          <Link to="/products" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 transition-all flex items-center gap-4"
            >
              <span className="text-3xl p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                {cat.icon}
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-400">{cat.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Top Rated Items
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Featured Products</h2>
          </div>
          <Link
            to="/products"
            className="text-xs sm:text-sm font-semibold px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition"
          >
            See All Items
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse space-y-3">
                <div className="bg-slate-200 rounded-xl aspect-square w-full" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm">No featured products found yet.</p>
            <Link to="/products" className="text-xs text-indigo-600 font-semibold underline mt-2 inline-block">
              Check all products in the catalog
            </Link>
          </div>
        )}
      </section>

      {/* Feature Badges / Why Choose Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto md:mx-0">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Instant Real-Time Order Processing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Integrated with real Express and MongoDB Atlas operations. Stock count automatically adjusts when orders are confirmed.
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto md:mx-0">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">JWT Token Authentication</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Secure password hashing with bcryptjs and JSON Web Tokens for role-based authorization (Customer vs Admin).
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto md:mx-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Full-Stack CodeAlpha Architecture</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Modern responsive React 19 frontend styled with Tailwind CSS, communicating with a RESTful Express.js backend.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
