import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  ArrowLeft,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const CartPage = () => {
  const {
    cartItems,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleProceedToCheckout = () => {
    if (!user) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Your Cart is Empty</h2>
        <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
          Looks like you haven't added anything to your cart yet. Explore our latest arrivals to get started.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Shopping Cart
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review your selected items before proceeding to secure checkout.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Empty Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div
              key={item.product}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 shadow-sm"
            >
              {/* Product Thumbnail */}
              <Link to={`/products/${item.product}`} className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </Link>

              {/* Product Info */}
              <div className="flex-1 text-center sm:text-left">
                <Link
                  to={`/products/${item.product}`}
                  className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unit Price: ${item.price.toFixed(2)}
                </p>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <button
                  onClick={() => updateQuantity(item.product, item.quantity - 1)}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 transition"
                >
                  -
                </button>
                <span className="px-3 py-1 text-xs font-bold text-slate-800">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.product, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition"
                >
                  +
                </button>
              </div>

              {/* Item Total */}
              <div className="text-right min-w-[80px]">
                <span className="text-sm font-extrabold text-slate-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => removeFromCart(item.product)}
                className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                title="Remove Item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline pt-2"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6 h-fit">
          <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Order Summary
          </h2>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span className="font-bold text-slate-900">${itemsPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Estimated Shipping</span>
              <span className="font-bold text-slate-900">
                {shippingPrice === 0 ? (
                  <span className="text-emerald-600 font-extrabold">FREE</span>
                ) : (
                  `$${shippingPrice.toFixed(2)}`
                )}
              </span>
            </div>
            {itemsPrice < 100 && (
              <p className="text-[11px] text-indigo-600 bg-indigo-50 p-2 rounded-lg flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 flex-shrink-0" />
                Add ${(100 - itemsPrice).toFixed(2)} more for free express shipping!
              </p>
            )}
            <div className="flex justify-between">
              <span>Estimated Tax (10%)</span>
              <span className="font-bold text-slate-900">${taxPrice.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
              <span className="font-extrabold text-slate-900">Total Due</span>
              <span className="text-xl font-black text-indigo-600">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleProceedToCheckout}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2"
          >
            Proceed to Checkout <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
