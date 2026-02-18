import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Search, X, Plus, Minus, Package, ChevronDown } from "lucide-react";
import { LoadingSpinner } from "./LoadingSkeleton";
import { DEMO_PRODUCTS } from "./DemoDataProvider";

export default function ProductSelector({ isDemo, selectedProducts, setSelectedProducts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      if (isDemo) {
        setProducts(DEMO_PRODUCTS);
      }
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [isDemo]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.includes(searchQuery)
  );

  const addProduct = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setSelectedProducts(prev => {
      return prev.map(p => {
        if (p.id === productId) {
          const newQty = p.quantity + delta;
          return newQty <= 0 ? null : { ...p, quantity: newQty };
        }
        return p;
      }).filter(Boolean);
    });
  };

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const total = selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-[18px] h-[18px] text-slate-400" />
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          בחירת מוצרים
          <span className="text-red-400">*</span>
        </Label>
      </div>

      {/* Dropdown Trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors text-sm"
        >
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          <span className="text-slate-500">
            {selectedProducts.length > 0
              ? `${selectedProducts.length} מוצרים נבחרו`
              : "בחר מוצרים מהקטלוג..."
            }
          </span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            >
              {/* Search */}
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="חיפוש מוצר..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 h-9 text-sm border-slate-200"
                    dir="rtl"
                    autoFocus
                  />
                </div>
              </div>

              {/* Products List */}
              <div className="max-h-64 overflow-y-auto">
                {isLoading ? (
                  <LoadingSpinner text="טוען מוצרים..." />
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    לא נמצאו מוצרים
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = selectedProducts.some(p => p.id === product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => product.inStock && addProduct(product)}
                        disabled={!product.inStock}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-right border-b border-slate-50 last:border-0 ${
                          !product.inStock ? 'opacity-50 cursor-not-allowed bg-slate-50' :
                          isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          {isSelected && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px] border-0 shrink-0">נבחר</Badge>
                          )}
                          <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                            ₪{product.price}
                          </span>
                          {!product.inStock && (
                            <Badge variant="outline" className="text-red-500 border-red-200 text-[10px] shrink-0">אזל מהמלאי</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm text-slate-700">{product.name}</span>
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-100"
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Products */}
      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {selectedProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100"
              >
                <button onClick={() => removeProduct(product.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-slate-700 shrink-0">
                  ₪{product.price * product.quantity}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => updateQuantity(product.id, 1)} className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 w-6 text-center">{product.quantity}</span>
                  <button onClick={() => updateQuantity(product.id, -1)} className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                    <Minus className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <span className="text-sm text-slate-700">{product.name}</span>
                </div>
                <img src={product.image} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-100 shrink-0" />
              </motion.div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-base font-bold text-slate-800">₪{total.toLocaleString()}</span>
              <span className="text-sm text-slate-500">סה״כ</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}