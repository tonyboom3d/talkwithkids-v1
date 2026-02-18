// Demo data provider for the dashboard
// All mock data is centralized here

export const DEMO_PRODUCTS = [
  { id: "p1", name: "חולצת פולו קלאסית", price: 189, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop", inStock: true },
  { id: "p2", name: "מכנסי ג'ינס סלים", price: 279, image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=80&h=80&fit=crop", inStock: true },
  { id: "p3", name: "שמלת ערב שחורה", price: 449, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=80&h=80&fit=crop", inStock: true },
  { id: "p4", name: "נעלי ספורט לבנות", price: 359, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop", inStock: false },
  { id: "p5", name: "תיק גב עור", price: 520, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=80&h=80&fit=crop", inStock: true },
  { id: "p6", name: "כובע שמש קש", price: 89, image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=80&h=80&fit=crop", inStock: true },
  { id: "p7", name: "חגורת עור חומה", price: 149, image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=80&h=80&fit=crop", inStock: true },
  { id: "p8", name: "משקפי שמש אוויאטור", price: 299, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=80&h=80&fit=crop", inStock: false },
];

export const DEMO_CUSTOMERS = [
  { id: "c1", firstName: "יוסי", lastName: "כהן", email: "yossi@email.com", phone: "050-1234567" },
  { id: "c2", firstName: "מיכל", lastName: "לוי", email: "michal@email.com", phone: "052-9876543" },
  { id: "c3", firstName: "אבי", lastName: "ישראלי", email: "", phone: "054-5551234" },
  { id: "c4", firstName: "רונית", lastName: "דוד", email: "ronit.d@email.com", phone: "" },
  { id: "c5", firstName: "דני", lastName: "שמעוני", email: "dani.s@email.com", phone: "058-7778899" },
];

export const DEMO_ORDERS = [
  {
    id: "ORD-1001",
    date: "2026-02-18T10:30:00",
    customer: { firstName: "יוסי", lastName: "כהן", email: "yossi@email.com", phone: "050-1234567" },
    products: [
      { id: "p1", name: "חולצת פולו קלאסית", price: 189, quantity: 2 },
      { id: "p5", name: "תיק גב עור", price: 520, quantity: 1 },
    ],
    total: 898,
    paymentStatus: "paid",
    notes: "לקוח ביקש עטיפת מתנה",
    paymentLink: "https://example.com/pay/abc123",
    timeline: [
      { type: "created", text: "נוצר קישור תשלום", by: "שרה מ.", date: "2026-02-18T10:30:00" },
      { type: "sent", text: "נשלח קישור ללקוח", by: "מערכת", date: "2026-02-18T10:31:00" },
      { type: "opened", text: "הלקוח פתח את הקישור", by: "לקוח", date: "2026-02-18T10:45:00" },
      { type: "paid", text: "הלקוח השלים תשלום בהצלחה", by: "לקוח", date: "2026-02-18T10:47:00" },
      { type: "shipped", text: "הזמנה נשלחה לחברת המשלוחים", by: "שרה מ.", date: "2026-02-18T14:00:00" },
      { type: "note", text: "נוספה הערה: לקוח ביקש עטיפת מתנה", by: "שרה מ.", date: "2026-02-18T14:05:00" },
    ],
    orderNotes: [
      { id: "n1", text: "לקוח ביקש עטיפת מתנה", by: "שרה מ.", date: "2026-02-18T14:05:00" },
    ]
  },
  {
    id: "ORD-1002",
    date: "2026-02-17T15:20:00",
    customer: { firstName: "מיכל", lastName: "לוי", email: "michal@email.com", phone: "052-9876543" },
    products: [
      { id: "p3", name: "שמלת ערב שחורה", price: 449, quantity: 1 },
    ],
    total: 449,
    paymentStatus: "unpaid",
    notes: "",
    paymentLink: "https://example.com/pay/def456",
    timeline: [
      { type: "created", text: "נוצר קישור תשלום", by: "דנה כ.", date: "2026-02-17T15:20:00" },
      { type: "sent", text: "נשלח קישור ללקוח", by: "מערכת", date: "2026-02-17T15:21:00" },
      { type: "opened", text: "הלקוח פתח את הקישור", by: "לקוח", date: "2026-02-17T16:00:00" },
      { type: "failed", text: "נכשל ניסיון תשלום", by: "מערכת", date: "2026-02-17T16:02:00" },
    ],
    orderNotes: []
  },
  {
    id: "ORD-1003",
    date: "2026-02-16T09:10:00",
    customer: { firstName: "אבי", lastName: "ישראלי", email: "", phone: "054-5551234" },
    products: [
      { id: "p6", name: "כובע שמש קש", price: 89, quantity: 3 },
      { id: "p7", name: "חגורת עור חומה", price: 149, quantity: 1 },
    ],
    total: 416,
    paymentStatus: "paid",
    notes: "משלוח אקספרס",
    paymentLink: "https://example.com/pay/ghi789",
    timeline: [
      { type: "created", text: "נוצר קישור תשלום", by: "שרה מ.", date: "2026-02-16T09:10:00" },
      { type: "sent", text: "נשלח קישור ללקוח", by: "מערכת", date: "2026-02-16T09:11:00" },
      { type: "paid", text: "הלקוח השלים תשלום בהצלחה", by: "לקוח", date: "2026-02-16T09:30:00" },
      { type: "shipped", text: "הזמנה נשלחה לחברת המשלוחים", by: "שרה מ.", date: "2026-02-16T12:00:00" },
      { type: "contact_updated", text: "שונו פרטי הקשר של הלקוח", by: "דנה כ.", date: "2026-02-16T12:15:00" },
      { type: "note", text: "נוספה הערה: משלוח אקספרס", by: "שרה מ.", date: "2026-02-16T12:20:00" },
    ],
    orderNotes: [
      { id: "n2", text: "משלוח אקספרס", by: "שרה מ.", date: "2026-02-16T12:20:00" },
      { id: "n3", text: "הלקוח עדכן כתובת חדשה", by: "דנה כ.", date: "2026-02-16T13:00:00" },
    ]
  },
  {
    id: "ORD-1004",
    date: "2026-02-15T18:45:00",
    customer: { firstName: "רונית", lastName: "דוד", email: "ronit.d@email.com", phone: "" },
    products: [
      { id: "p2", name: "מכנסי ג'ינס סלים", price: 279, quantity: 1 },
      { id: "p1", name: "חולצת פולו קלאסית", price: 189, quantity: 1 },
    ],
    total: 468,
    paymentStatus: "unpaid",
    notes: "",
    paymentLink: "https://example.com/pay/jkl012",
    timeline: [
      { type: "created", text: "נוצר קישור תשלום", by: "שרה מ.", date: "2026-02-15T18:45:00" },
      { type: "sent", text: "נשלח קישור ללקוח", by: "מערכת", date: "2026-02-15T18:46:00" },
    ],
    orderNotes: []
  },
];