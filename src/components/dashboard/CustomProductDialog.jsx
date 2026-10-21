import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, PackagePlus, X } from "lucide-react";
import { usePostMessage } from "@/hooks/usePostMessage";

const EMPTY_STATE = {
  name: "",
  fullPrice: "",
  discountPrice: "",
  quantity: "1",
  notes: "",
};

const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.85;
const ACCEPTED_IMAGE_TYPES = /^image\/(jpeg|png|webp)$/i;

/** מקבל File, מקטין ל-1200px ומחזיר data URL (JPEG) לתצוגה/העלאה */
function resizeImageToDataUrl(file, maxDim = MAX_IMAGE_DIMENSION, quality = IMAGE_QUALITY) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("לא ניתן לקרוא את התמונה"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * פופאפ ליצירת מוצר קאסטום (לא מהקטלוג) להוספה להזמנה:
 * שם, מחיר מלא, מחיר הנחה, תמונה (מועלית ל-Media Manager), כמות והערות ללקוח.
 */
export default function CustomProductDialog({ open, onClose, isDemo, onConfirm }) {
  const [form, setForm] = useState({ ...EMPTY_STATE });
  const [imagePreview, setImagePreview] = useState("");
  const [wixImage, setWixImage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const { request } = usePostMessage();

  const resetForm = () => {
    setForm({ ...EMPTY_STATE });
    setImagePreview("");
    setWixImage("");
    setError("");
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 3700);
  };

  const handleField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.test(file.type)) {
      showError("יש להעלות קובץ תמונה מסוג JPG, PNG או WEBP");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingImage(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      if (isDemo) {
        setImagePreview(dataUrl);
        setWixImage("");
      } else {
        const result = await request("UPLOAD_CUSTOM_PRODUCT_IMAGE", {
          base64: dataUrl,
          fileName: file.name || "custom-product.jpg",
          mimeType: "image/jpeg",
        });
        setImagePreview(result?.publicUrl || "");
        setWixImage(result?.wixImage || "");
      }
    } catch (err) {
      console.error("[UI] Custom product image upload failed:", err);
      showError(err?.message || "העלאת התמונה נכשלה");
      setImagePreview("");
      setWixImage("");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setImagePreview("");
    setWixImage("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      showError("יש למלא שם מוצר");
      return;
    }

    const fullPriceNum = Number(form.fullPrice);
    if (!Number.isFinite(fullPriceNum) || fullPriceNum <= 0) {
      showError("יש למלא מחיר מלא גדול מ-0");
      return;
    }

    const discountTrim = String(form.discountPrice || "").trim();
    let discountNum = null;
    if (discountTrim !== "") {
      discountNum = Number(discountTrim);
      if (!Number.isFinite(discountNum) || discountNum < 0) {
        showError("מחיר ההנחה לא תקין");
        return;
      }
      if (discountNum > fullPriceNum) {
        showError("מחיר ההנחה לא יכול להיות גבוה מהמחיר המלא");
        return;
      }
    }

    const quantityNum = Math.max(1, Math.round(Number(form.quantity) || 1));

    if (isUploadingImage) {
      showError("יש להמתין לסיום העלאת התמונה");
      return;
    }

    const effectivePrice = discountNum != null ? discountNum : fullPriceNum;

    onConfirm({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isCustom: true,
      name: trimmedName,
      price: effectivePrice,
      unitPrice: effectivePrice,
      catalogPrice: fullPriceNum,
      quantity: quantityNum,
      image: imagePreview || "",
      wixImage: wixImage || "",
      notes: form.notes.trim(),
    });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isUploadingImage) handleClose(); }}>
      <DialogContent dir="rtl" className="max-w-md max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-right">
            <PackagePlus className="w-[18px] h-[18px] text-slate-400" />
            יצירת מוצר קאסטום
          </DialogTitle>
          <DialogDescription className="text-right leading-relaxed">
            מוצר שאינו מהקטלוג — ייווסף להזמנה כפריט נפרד עם פרטים שתגדירי כאן.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="block text-right text-sm font-medium text-slate-700">
              שם המוצר
              <span className="text-red-400 mr-0.5">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={handleField("name")}
              placeholder="לדוגמה: ערכת יצירה מותאמת"
              className="h-10 text-right"
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="block text-right text-sm font-medium text-slate-700">
                מחיר מלא
                <span className="text-red-400 mr-0.5">*</span>
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fullPrice}
                  onChange={handleField("fullPrice")}
                  className="h-10 text-right"
                  dir="ltr"
                />
                <span className="shrink-0 text-sm text-slate-500">₪</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-right text-sm font-medium text-slate-700">
                מחיר הנחה
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountPrice}
                  onChange={handleField("discountPrice")}
                  placeholder="אופציונלי"
                  className="h-10 text-right"
                  dir="ltr"
                />
                <span className="shrink-0 text-sm text-slate-500">₪</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="block text-right text-sm font-medium text-slate-700">כמות</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={handleField("quantity")}
              className="h-10 w-24 text-right"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="block text-right text-sm font-medium text-slate-700">תמונה (אופציונלי)</Label>
            {imagePreview ? (
              <div className="flex items-center gap-3" dir="rtl">
                <img src={imagePreview} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                  הסרת תמונה
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    מעלה תמונה...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    העלאת תמונה
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="block text-right text-sm font-medium text-slate-700">הערות למוצר (ללקוח/ה)</Label>
            <Textarea
              value={form.notes}
              onChange={handleField("notes")}
              placeholder="לדוגמה: פרטים מיוחדים על המוצר שיוצגו ללקוח/ה"
              className="min-h-[60px] text-sm border-slate-200 focus:border-slate-400 resize-none"
              dir="rtl"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-sm text-red-500 text-center font-medium"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-2 sm:justify-start sm:space-x-0">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isUploadingImage}
            className="bg-[#30D46B] text-black hover:bg-[#28b85f] font-medium"
          >
            אישור
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isUploadingImage}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
