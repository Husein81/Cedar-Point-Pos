export type Locale = "en" | "ar";

const en = {
  // Navigation sections
  POS: "POS",
  "Business Partners": "Business Partners",
  Inventory: "Inventory",
  Finance: "Finance",

  // Navigation items
  Home: "Home",
  Dashboard: "Dashboard",
  Orders: "Orders",
  Suppliers: "Suppliers",
  Customers: "Customers",
  Categories: "Categories",
  Products: "Products",
  Stock: "Stock",
  Modifiers: "Modifiers",
  Offers: "Offers",
  Kitchen: "Kitchen",
  Transfers: "Transfers",
  Invoices: "Invoices",
  Payments: "Payments",
  Refunds: "Refunds",
  Reports: "Reports",

  // User dropdown
  Profile: "Profile",
  Appearance: "Appearance",
  Settings: "Settings",
  Logout: "Logout",

  // Appearance dialog
  "Appearance Settings": "Appearance Settings",
  "Customize the look and feel of the application.":
    "Customize the look and feel of the application.",
  Light: "Light",
  Dark: "Dark",
  System: "System",

  // Heading
  "Go back": "Go back",

  // Auth
  "Sign in to POS": "Sign in to POS",
  "Enter your username and Password to continue":
    "Enter your username and Password to continue",
  Username: "Username",
  "Enter your username": "Enter your username",
  Password: "Password",
  "Enter your password": "Enter your password",
  "Verify & Continue": "Verify & Continue",
  "Forgot Password?": "Forgot Password?",
  "Authorized staff access only.": "Authorized staff access only.",

  // Settings hub
  "Manage your business configuration and preferences":
    "Manage your business configuration and preferences",
  "No settings available for your account.":
    "No settings available for your account.",

  // Settings section labels
  Currencies: "Currencies",
  Colors: "Colors",
  "Loyalty Program": "Loyalty Program",
  Language: "Language",

  // Settings section descriptions
  "Manage currencies and exchange rates for your business":
    "Manage currencies and exchange rates for your business",
  "Manage colors for your categories and products":
    "Manage colors for your categories and products",
  "Configure customer loyalty points, earning, and redemption":
    "Configure customer loyalty points, earning, and redemption",
  "Switch between Arabic and English interface":
    "Switch between Arabic and English interface",

  // Language settings page
  "Changing the language updates the interface direction and text. Arabic uses right-to-left layout.":
    "Changing the language updates the interface direction and text. Arabic uses right-to-left layout.",
  English: "English",
  Arabic: "Arabic",

  // App name
  "CedarPoint POS": "CedarPoint POS",
} as const;

const ar: Record<keyof typeof en, string> = {
  // Navigation sections
  POS: "نقطة البيع",
  "Business Partners": "شركاء الأعمال",
  Inventory: "المخزون",
  Finance: "المالية",

  // Navigation items
  Home: "الرئيسية",
  Dashboard: "لوحة التحكم",
  Orders: "الطلبات",
  Suppliers: "الموردون",
  Customers: "العملاء",
  Categories: "الفئات",
  Products: "المنتجات",
  Stock: "المخزون",
  Modifiers: "المعدِّلات",
  Offers: "العروض",
  Kitchen: "المطبخ",
  Transfers: "التحويلات",
  Invoices: "الفواتير",
  Payments: "المدفوعات",
  Refunds: "المستردات",
  Reports: "التقارير",

  // User dropdown
  Profile: "الملف الشخصي",
  Appearance: "المظهر",
  Settings: "الإعدادات",
  Logout: "تسجيل الخروج",

  // Appearance dialog
  "Appearance Settings": "إعدادات المظهر",
  "Customize the look and feel of the application.": "تخصيص مظهر التطبيق.",
  Light: "فاتح",
  Dark: "داكن",
  System: "النظام",

  // Heading
  "Go back": "رجوع",

  // Auth
  "Sign in to POS": "تسجيل الدخول إلى نقطة البيع",
  "Enter your username and Password to continue":
    "أدخل اسم المستخدم وكلمة المرور للمتابعة",
  Username: "اسم المستخدم",
  "Enter your username": "أدخل اسم المستخدم",
  Password: "كلمة المرور",
  "Enter your password": "أدخل كلمة المرور",
  "Verify & Continue": "تحقق وتابع",
  "Forgot Password?": "نسيت كلمة المرور؟",
  "Authorized staff access only.": "للموظفين المصرح لهم فقط.",

  // Settings hub
  "Manage your business configuration and preferences":
    "إدارة إعدادات وتفضيلات عملك",
  "No settings available for your account.": "لا توجد إعدادات متاحة لحسابك.",

  // Settings section labels
  Currencies: "العملات",
  Colors: "الألوان",
  "Loyalty Program": "برنامج الولاء",
  Language: "اللغة",

  // Settings section descriptions
  "Manage currencies and exchange rates for your business":
    "إدارة العملات وأسعار الصرف لعملك",
  "Manage colors for your categories and products":
    "إدارة ألوان فئاتك ومنتجاتك",
  "Configure customer loyalty points, earning, and redemption":
    "تكوين نقاط ولاء العملاء والكسب والاسترداد",
  "Switch between Arabic and English interface":
    "التبديل بين واجهة العربية والإنجليزية",

  // Language settings page
  "Changing the language updates the interface direction and text. Arabic uses right-to-left layout.":
    "تغيير اللغة يحدِّث اتجاه الواجهة والنص. العربية تستخدم تخطيط اليمين إلى اليسار.",
  English: "الإنجليزية",
  Arabic: "العربية",

  // App name
  "CedarPoint POS": "سيدار بوينت",
};

export const translations = { en, ar } as const;

export type TranslationKey = keyof typeof en;
