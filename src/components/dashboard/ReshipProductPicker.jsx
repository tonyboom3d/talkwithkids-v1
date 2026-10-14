import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Minus, X, Truck, ChevronDown } from "lucide-react";
import { LoadingSpinner } from "./LoadingSkeleton";
import { usePostMessage } from "@/hooks/usePostMessage";

/** בחירת מוצרים לפי GET_TAPUZ_PRODUCTS — פיזיים בלבד, deliveryType "תפוז" (לא "בית") */
export default function ReshipProductPicker({ isDemo, demoProducts = [], selectedProducts, setSelectedProducts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { request } = usePostMessage();

  useEffect(() => {
    if (isDemo) {
      setProducts(demoProducts);
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      try {
        const result = await request("GET_TAPUZ_PRODUCTS");
        setProducts(result.products || []);
      } catch (err) {
        console.error("[UI] Failed to load tapuz products:", err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isDemo, demoProducts, request]);

  const addProduct = (product) => {
    const existing = selectedProducts.find((p) => p.id === product.id);
    if (existing) {
      setSelectedProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)));
    } else {
      setSelectedProducts((prev) => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setSelectedProducts((prev) =>
      prev
        .map((p) => (p.id === productId ? { ...p, quantity: p.quantity + delta } : p))
        .filter((p) => p.quantity > 0)
    );
  };

  const removeProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="w-[18px] h-[18px] text-slate-400" />
        <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          מוצרים למשלוח (תפוז בלבד)
          <span className="text-red-400">*</span>
        </Label>
      </div>

      <div className="relative">
        <button
          type="button"
          dir="rtl"
          onClick={() => setIsOpen((v) => !v)}
          className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors text-sm"
        >
          <span className="text-slate-500 text-right flex-1 min-w-0">
            {selectedProducts.length > 0 ? `${selectedProducts.length} מוצרים נבחרו` : "בחר מוצרים למשלוח..."}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute z-30 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto" dir="rtl">
              {isLoading ? (
                <LoadingSpinner text="טוען מוצרים..." />
              ) : products.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  לא נמצאו מוצרים מוגדרים למשלוח תפוז
                </div>
              ) : (
                products.map((product) => {
                  const isSelected = selectedProducts.some((p) => p.id === product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className={`w-full px-4 py-3 text-right transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between gap-2 ${
                        isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm text-slate-800 truncate">{product.name}</span>
                      {isSelected && <Badge className="border-0 bg-blue-100 text-xs text-blue-700 shrink-0">נבחר</Badge>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          {selectedProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border bg-slate-50 border-slate-100"
              dir="rtl"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {product.image && (
                  <img src={product.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 object-cover" />
                )}
                <span className="truncate text-sm text-slate-700">{product.name}</span>
                <button type="button" onClick={() => removeProduct(product.id)} className="shrink-0 p-1 text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1.5" dir="ltr">
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-600" />
                </button>
                <span className="w-6 text-center text-sm font-medium tabular-nums text-slate-700">{product.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100"
                >
                  <Minus className="h-3.5 w-3.5 text-slate-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
