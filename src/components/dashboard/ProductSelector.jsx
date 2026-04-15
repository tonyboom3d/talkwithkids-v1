import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Search, X, Plus, Minus, Package, ChevronDown } from "lucide-react";
import { LoadingSpinner } from "./LoadingSkeleton";
import { DEMO_PRODUCTS } from "./DemoDataProvider";
import { usePostMessage } from "@/hooks/usePostMessage";

export default function ProductSelector({ isDemo, selectedProducts, setSelectedProducts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { request } = usePostMessage();

  useEffect(() => {
    setIsLoading(true);

    if (isDemo) {
      const timer = setTimeout(() => {
        setProducts(DEMO_PRODUCTS);
        setIsLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }

    (async () => {
      try {
        const result = await request('GET_PRODUCTS');
        setProducts(result.products || []);
      } catch (err) {
        console.error('[UI] Failed to load products:', err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isDemo, request]);

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
    const catalogPrice = Number(product.price);
    const unitPrice = Number.isFinite(catalogPrice) ? catalogPrice : 0;
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedProducts(prev => [...prev, {
        ...product,
        quantity: 1,
        price: unitPrice,
        catalogPrice: unitPrice,
      }]);
    }
    setIsOpen(false);
  };

  const updateUnitPrice = (productId, rawValue) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const parsed = rawValue === '' ? '' : Number(rawValue);
      return { ...p, price: parsed };
    }));
  };

  const commitUnitPrice = (productId) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const catalogPrice = Number(p.catalogPrice) || 0;
      let price = Number(p.price);
      if (!Number.isFinite(price) || price < 0) price = 0;
      if (price > catalogPrice) price = catalogPrice;
      return { ...p, price };
    }));
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
        <Label className="text-base font-medium text-slate-700 flex items-center gap-1">
          בחירת מוצרים
          <span className="text-red-400">*</span>
        </Label>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          dir="rtl"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors text-base"
        >
          <span className="text-slate-500 text-right flex-1 min-w-0">
            {selectedProducts.length > 0
              ? `${selectedProducts.length} מוצרים נבחרו`
              : "בחר מוצרים מהקטלוג..."
            }
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="חיפוש מוצר..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 h-9 text-base border-slate-200"
                    dir="rtl"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto" dir="ltr">
                {isLoading ? (
                  <LoadingSpinner text="טוען מוצרים..." />
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-base text-slate-400" dir="rtl">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    לא נמצאו מוצרים
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = selectedProducts.some(p => p.id === product.id);
                    const listPrice = product.price != null && Number.isFinite(Number(product.price)) ? Number(product.price) : null;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        dir="ltr"
                        onClick={() => addProduct(product)}
                        className={`w-full px-4 py-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 transition-colors border-b border-slate-50 last:border-0 ${
                          isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex shrink-0 items-center gap-2 justify-self-start">
                          {listPrice != null && (
                            <span className="text-sm font-medium text-slate-600 tabular-nums whitespace-nowrap" dir="ltr">
                              ₪{listPrice.toLocaleString("he-IL")}
                            </span>
                          )}
                          {isSelected && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs border-0 shrink-0">נבחר</Badge>
                          )}
                        </div>
                        <span className="text-base text-slate-700 truncate text-right min-w-0 justify-self-stretch self-center" dir="rtl">
                          {product.name}
                        </span>
                        <div className="justify-self-end shrink-0">
                          {product.image && (
                            <img
                              src={product.image}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-slate-100"
                            />
                          )}
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

      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {selectedProducts.map((product) => {
              const catalogPrice = Number(product.catalogPrice) || 0;
              const effectivePrice = Number.isFinite(Number(product.price)) ? Number(product.price) : catalogPrice;
              const isPriceOverridden = effectivePrice !== catalogPrice;
              const lineTotal = (Number.isFinite(Number(product.price)) ? Number(product.price) : 0) * product.quantity;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-1"
                >
                  <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${
                      isPriceOverridden
                        ? "bg-amber-50 border-amber-200"
                        : "bg-slate-50 border-slate-100"
                    }`}
                    dir="rtl"
                  >
                    {product.image && (
                      <img src={product.image} alt="" className="w-11 h-11 rounded-lg object-cover border border-slate-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 text-right space-y-0.5">
                      <span className="text-base text-slate-700 block">{product.name}</span>
                      <span className="text-sm text-slate-500 tabular-nums">
                        סה״כ שורה: ₪{lineTotal.toLocaleString("he-IL")}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0" dir="ltr">
                      <span className="text-xs text-slate-500 text-right w-full" dir="rtl">
                        מחיר ליחידה{isPriceOverridden && <span className="mr-1 text-amber-600 font-medium">(מחיר מותאם)</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max={catalogPrice}
                          step="0.01"
                          value={product.price === '' ? '' : product.price}
                          onChange={(e) => updateUnitPrice(product.id, e.target.value)}
                          onBlur={() => commitUnitPrice(product.id)}
                          className={`h-8 w-24 text-sm text-right tabular-nums ${
                            isPriceOverridden ? "border-amber-300 bg-white" : "border-slate-200"
                          }`}
                          dir="ltr"
                        />
                        <span className="text-sm text-slate-500 shrink-0">₪</span>
                      </div>
                      {catalogPrice > 0 && (
                        <span className="text-[10px] text-slate-400 tabular-nums" dir="rtl">
                          מחיר קטלוג: ₪{catalogPrice.toLocaleString("he-IL")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => updateQuantity(product.id, 1)} className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <Plus className="w-4 h-4 text-slate-600" />
                      </button>
                      <span className="text-base font-medium text-slate-700 w-7 text-center tabular-nums">{product.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(product.id, -1)} className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <Minus className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                    <button type="button" onClick={() => removeProduct(product.id)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            <div className="flex items-center justify-start gap-2 pt-2 border-t border-slate-200/60" dir="rtl">
              <span className="text-base text-slate-600 font-medium">סה״כ</span>
              <span className="text-lg font-bold text-slate-800 tabular-nums">₪{total.toLocaleString()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
