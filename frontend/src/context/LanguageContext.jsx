import { createContext, useContext, useState, useEffect } from "react";

const translations = {
  en: {
    // Brand
    brand_name: "FoodShare",
    demo_badge: "DEMO",
    
    // Navigation
    nav_dashboard: "Dashboard",
    nav_listings: "My Listings",
    nav_recurring: "Recurring",
    nav_requests: "Requests",
    nav_new_listing: "New Listing",
    nav_profile: "Profile",
    nav_browse: "Browse Food",
    nav_my_requests: "My Requests",
    nav_users: "Users",
    nav_reports: "Reports",
    nav_logout: "Sign Out",
    
    // Common Actions & Buttons
    btn_save: "Save",
    btn_cancel: "Cancel",
    btn_submit: "Submit",
    btn_request_food: "Request Food",
    btn_list_surplus: "List Surplus Food",
    btn_event_leftover: "Event Leftover",
    btn_details: "Details",
    btn_close: "Close",
    btn_view_requests: "View My Requests",
    btn_accept: "Accept",
    btn_reject: "Reject",
    btn_complete_pickup: "Confirm Pickup",
    btn_confirm_pickup: "Confirm Pickup",
    btn_cancel_request: "Cancel Request",
    btn_search: "Search",
    btn_publish_listing: "Publish Listing",
    btn_post_leftover_now: "Post Leftover Now",
    
    // Status Labels
    status_pending_approval: "Pending Approval",
    status_available: "Available",
    status_reserved: "Reserved",
    status_completed: "Completed",
    status_expired: "Expired",
    status_removed: "Removed",
    status_pending: "Pending",
    status_accepted: "Accepted",
    status_rejected: "Rejected",
    status_cancelled: "Cancelled",

    // Donor Types
    donor_type_restaurant: "Restaurant / Caterer",
    donor_type_institution: "Institution",
    donor_type_individual: "Individual",

    // Food Categories
    food_veg: "Vegetarian",
    food_non_veg: "Non-Vegetarian",
    food_cooked: "Cooked Meal",
    food_packaged: "Packaged Goods",
    all_diet: "All Diet",
    all_states: "All States",

    // Listing Form & Details
    field_title: "Listing Title",
    field_servings: "Estimated Servings",
    field_unit: "Unit",
    field_address: "Pickup Address",
    field_cooked_time: "Prepared / Cooked Time",
    field_use_by: "Use By Date",
    field_pickup_start: "Pickup Window Start",
    field_pickup_end: "Pickup Window End",
    field_description: "Description & Ingredients",
    field_allergen_notes: "Allergen Notes",
    field_handling_checklist: "Food Handling Safety Checklist",
    field_photo_upload: "Upload Photo (Max 5MB)",
    sec_food_details: "Food Details",
    sec_prep_freshness: "Preparation & Freshness",
    sec_pickup_window: "Pickup Window & Location",
    sec_checklist: "Food Safety Handling Checklist (Required)",
    checklist_desc: "All 4 boxes must be verified and checked to guarantee food safety compliance before publishing.",
    chk_covered: "Food is covered: Stored in food-grade covered containers, sealed foil trays, or wrapped.",
    chk_stored: "Properly temperature-controlled: Kept safely hot (>60°C) or promptly refrigerated (<5°C); never left at room temperature.",
    chk_not_reheated: "Not repeatedly reheated: Food was cooked once and has not undergone repeated heating and cooling cycles.",
    chk_packaged: "Packaged cleanly: Handled in a hygienic kitchen with clean utensils and sanitized hands/gloves.",
    
    // Request Flow & Pages
    request_modal_title: "Request Food Surplus",
    request_qty_label: "Quantity Desired",
    request_notes_label: "Pickup Note / Special Logistics (Optional)",
    request_phone_locked: "Phone revealed upon acceptance",
    request_phone_contact: "Donor Phone",
    requests_title: "My Food Requests",
    requests_subtitle: "Track real-time status of claims, driver pickup coordination, and receipt confirmations.",
    filter_all_requests: "All Requests",
    history_title: "Audit Trail",

    // Event Leftover Modal
    event_leftover_modal_title: "Event Leftover Quick-Post",
    event_leftover_banner: "Quick Event Dispatch: Designed for functions, weddings, community meals, or hostel surplus. Posts automatically expire at the end of the pickup window.",
    event_what_label: "What surplus food do you have?",
    event_cooked_label: "When was it cooked?",
    event_pickup_end_label: "Pickup Ends At (Auto-expires)",
    
    // Disclaimers
    platform_disclaimer: "Platform Disclaimer: All data in this environment is fictitious demo data. This system does not certify food safety. Donors remain solely responsible for the safety and handling of food distributed.",
  },
  te: {
    // Brand
    brand_name: "ఫుడ్ షేర్",
    demo_badge: "డెమో",
    
    // Navigation
    nav_dashboard: "డాష్‌బోర్డ్",
    nav_listings: "నా ఆహార జాబితాలు",
    nav_recurring: "పునరావృత విరాళాలు",
    nav_requests: "అభ్యర్థనలు",
    nav_new_listing: "కొత్త ఆహార నమోదు",
    nav_profile: "ప్రొఫైల్",
    nav_browse: "ఆహారాన్ని వెతకండి",
    nav_my_requests: "నా అభ్యర్థనలు",
    nav_users: "వినియోగదారులు",
    nav_reports: "ఫిర్యాదులు",
    nav_logout: "లాగ్ అవుట్",
    
    // Common Actions & Buttons
    btn_save: "భద్రపరచు",
    btn_cancel: "రద్దు చేయి",
    btn_submit: "సమర్పించు",
    btn_request_food: "ఆహారం అభ్యర్థించండి",
    btn_list_surplus: "మిగులు ఆహారాన్ని నమోదు చేయండి",
    btn_event_leftover: "వేడుకల మిగులు ఆహారం",
    btn_details: "వివరాలు",
    btn_close: "మూసివేయి",
    btn_view_requests: "నా అభ్యర్థనలను చూడండి",
    btn_accept: "అంగీకరించు",
    btn_reject: "తిరస్కరించు",
    btn_complete_pickup: "స్వీకరించినట్లు ధృవీకరించు",
    btn_confirm_pickup: "స్వీకరించినట్లు ధృవీకరించు",
    btn_cancel_request: "అభ్యర్థనను రద్దు చేయి",
    btn_search: "వెతకండి",
    btn_publish_listing: "ఆహారాన్ని ప్రచురించు",
    btn_post_leftover_now: "ఇప్పుడే ఆహారాన్ని నమోదు చేయండి",
    
    // Status Labels
    status_pending_approval: "ఆమోదం కోసం పెండింగ్‌లో ఉంది",
    status_available: "అందుబాటులో ఉంది",
    status_reserved: "రిజర్వ్ చేయబడింది",
    status_completed: "పూర్తయింది",
    status_expired: "గడువు ముగిసింది",
    status_removed: "తొలగించబడింది",
    status_pending: "పెండింగ్‌లో ఉంది",
    status_accepted: "అంగీకరించబడింది",
    status_rejected: "తిరస్కరించబడింది",
    status_cancelled: "రద్దు చేయబడింది",

    // Donor Types
    donor_type_restaurant: "రెస్టారెంట్ / క్యాటరర్",
    donor_type_institution: "సంస్థ / ఆశ్రమం / దేవాలయం",
    donor_type_individual: "వ్యక్తిగత దాత",

    // Food Categories
    food_veg: "శాకాహారం",
    food_non_veg: "మాంసాహారం",
    food_cooked: "వండిన భోజనం",
    food_packaged: "ప్యాక్ చేసిన ఆహారం",
    all_diet: "అన్ని రకాలు",
    all_states: "అన్ని స్థితులు",

    // Listing Form & Details
    field_title: "ఆహార శీర్షిక",
    field_servings: "అంచనా వేసిన భోజనాలు (సర్వింగ్స్)",
    field_unit: "కొలత ప్రమాణం",
    field_address: "తీసుకోవాల్సిన చిరునామా (పికప్ లొకేషన్)",
    field_cooked_time: "వండిన సమయం",
    field_use_by: "ఎప్పటిలోగా తినాలి (యూజ్ బై తేదీ)",
    field_pickup_start: "తీసుకోవడానికి ప్రారంభ సమయం",
    field_pickup_end: "ముగింపు సమయం",
    field_description: "వివరాలు & పదార్థాలు",
    field_allergen_notes: "అలెర్జీ హెచ్చరికలు",
    field_handling_checklist: "ఆహార భద్రతా తనిఖీ జాబితా",
    field_photo_upload: "ఫోటో అప్‌లోడ్ చేయండి (గరిష్టంగా 5MB)",
    sec_food_details: "ఆహార వివరాలు",
    sec_prep_freshness: "తయారీ & తాజాదనం",
    sec_pickup_window: "పికప్ సమయం & చిరునామా",
    sec_checklist: "ఆహార భద్రతా తనిఖీ జాబితా (తప్పనిసరి)",
    checklist_desc: "ప్రచురించే ముందు ఆహార భద్రతా నిబంధనలను పాటించడానికి మొత్తం 4 బాక్సులను తప్పనిసరిగా తనిఖీ చేయాలి.",
    chk_covered: "ఆహారం మూతపెట్టి ఉంది: సరైన కంటైనర్లు లేదా ఫాయిల్ ట్రేలలో భద్రపరచబడింది.",
    chk_stored: "సరైన ఉష్ణోగ్రత నియంత్రణ: వేడిగా (>60°C) లేదా ఫ్రిజ్‌లో (<5°C) ఉంచబడింది.",
    chk_not_reheated: "మళ్లీ మళ్లీ వేడి చేయలేదు: ఒకేసారి వండినది, బహుళ తాపన చక్రాలు లేవు.",
    chk_packaged: "పరిశుభ్రంగా ప్యాక్ చేయబడింది: శుభ్రమైన పాత్రలు మరియు చేతులతో ప్యాక్ చేయబడింది.",
    
    // Request Flow & Pages
    request_modal_title: "మిగులు ఆహారాన్ని అభ్యర్థించండి",
    request_qty_label: "కావలసిన పరిమాణం",
    request_notes_label: "రవాణా వివరాలు / అదనపు సమాచారం (ఐచ్ఛికం)",
    request_phone_locked: "అభ్యర్థన ఆమోదించబడిన తర్వాత ఫోన్ నంబర్ కనిపిస్తుంది",
    request_phone_contact: "దాత ఫోన్ నంబర్",
    requests_title: "నా ఆహార అభ్యర్థనలు",
    requests_subtitle: "మీ ఆహార అభ్యర్థనలు, రవాణా వివరాలు మరియు స్వీకరణ స్థితిని ట్రాక్ చేయండి.",
    filter_all_requests: "అన్ని అభ్యర్థనలు",
    history_title: "ఆడిట్ చరిత్ర",

    // Event Leftover Modal
    event_leftover_modal_title: "వేడుకల మిగులు ఆహార నమోదు",
    event_leftover_banner: "త్వరిత పంపిణీ: వేడుకలు, వివాహాలు, హాస్టళ్లు లేదా కమ్యూనిటీ భోజనాల మిగులు కోసం రూపొందించబడింది. పికప్ విండో ముగియగానే ఇవి స్వయంచాలకంగా ముగుస్తాయి.",
    event_what_label: "మీ వద్ద ఉన్న మిగులు ఆహారం ఏమిటి?",
    event_cooked_label: "ఎప్పుడు వండారు?",
    event_pickup_end_label: "తీసుకోవడానికి ముగింపు సమయం",
    
    // Disclaimers
    platform_disclaimer: "ప్లాట్‌ఫారమ్ నిరాకరణ: ఈ వాతావరణంలోని డేటా అంతా నమూనా డేటా మాత్రమే. ఈ వేదిక ఆహార నాణ్యత ధృవీకరణ వ్యవస్థ కాదు. పంపిణీ చేసే ఆహార భద్రతకు దాతలే పూర్తి బాధ్యులు.",
  },
  hi: {
    // Brand
    brand_name: "फूड शेयर",
    demo_badge: "डेमो",
    
    // Navigation
    nav_dashboard: "डैशबोर्ड",
    nav_listings: "मेरी सूचियाँ",
    nav_recurring: "आवर्ती दान",
    nav_requests: "अनुरोध",
    nav_new_listing: "नया भोजन सूचीबद्ध करें",
    nav_profile: "प्रोफ़ाइल",
    nav_browse: "भोजन खोजें",
    nav_my_requests: "मेरे अनुरोध",
    nav_users: "उपयोगकर्ता",
    nav_reports: "शिकायतें",
    nav_logout: "साइन आउट",
    
    // Common Actions & Buttons
    btn_save: "सहेजें",
    btn_cancel: "रद्द करें",
    btn_submit: "जमा करें",
    btn_request_food: "भोजन का अनुरोध करें",
    btn_list_surplus: "अतिरिक्त भोजन दान करें",
    btn_event_leftover: "समारोह का बचा भोजन",
    btn_details: "विवरण",
    btn_close: "बंद करें",
    btn_view_requests: "मेरे अनुरोध देखें",
    btn_accept: "स्वीकार करें",
    btn_reject: "अस्वीकार करें",
    btn_complete_pickup: "प्राप्त होने की पुष्टि करें",
    btn_confirm_pickup: "प्राप्त होने की पुष्टि करें",
    btn_cancel_request: "अनुरोध रद्द करें",
    btn_search: "खोजें",
    btn_publish_listing: "सूची प्रकाशित करें",
    btn_post_leftover_now: "तुरंत भोजन पोस्ट करें",
    
    // Status Labels
    status_pending_approval: "अनुमोदन की प्रतीक्षा में",
    status_available: "उपलब्ध",
    status_reserved: "आरक्षित",
    status_completed: "पूर्ण",
    status_expired: "समाप्त",
    status_removed: "हटाया गया",
    status_pending: "लंबित",
    status_accepted: "स्वीकृत",
    status_rejected: "अस्वीकृत",
    status_cancelled: "रद्द",

    // Donor Types
    donor_type_restaurant: "रेस्तरां / कैटरर",
    donor_type_institution: "संस्थान / मंदिर / हॉस्टल",
    donor_type_individual: "व्यक्तिगत दाता",

    // Food Categories
    food_veg: "शाकाहारी",
    food_non_veg: "मांसाहारी",
    food_cooked: "पका हुआ भोजन",
    food_packaged: "पैकेज्ड सामग्री",
    all_diet: "सभी आहार",
    all_states: "सभी स्थितियाँ",

    // Listing Form & Details
    field_title: "भोजन का शीर्षक",
    field_servings: "अनुमानित हिस्से (सर्विंग्स)",
    field_unit: "इकाई",
    field_address: "पिकअप का पता",
    field_cooked_time: "भोजन तैयार करने का समय",
    field_use_by: "उपयोग की अंतिम तिथि",
    field_pickup_start: "पिकअप प्रारंभ समय",
    field_pickup_end: "पिकअप समाप्ति समय",
    field_description: "विवरण और सामग्री",
    field_allergen_notes: "एलर्जी संबंधी विवरण",
    field_handling_checklist: "खाद्य सुरक्षा और स्वच्छता चेकलिस्ट",
    field_photo_upload: "तस्वीर अपलोड करें (अधिकतम 5MB)",
    sec_food_details: "भोजन विवरण",
    sec_prep_freshness: "तैयारी और ताजगी",
    sec_pickup_window: "पिकअप समय और स्थान",
    sec_checklist: "खाद्य सुरक्षा चेकलिस्ट (अनिवार्य)",
    checklist_desc: "प्रकाशित करने से पहले खाद्य सुरक्षा अनुपालन सुनिश्चित करने के लिए सभी 4 बॉक्स चेक करें।",
    chk_covered: "भोजन ढका हुआ है: भोजन-ग्रेड कंटेनर या पन्नी में सुरक्षित है।",
    chk_stored: "उचित तापमान नियंत्रण: गर्म (>60°C) या फ्रिज में (<5°C) रखा गया।",
    chk_not_reheated: "बार-बार गर्म नहीं किया गया: केवल एक बार पकाया गया है।",
    chk_packaged: "स्वच्छता से पैक किया गया: स्वच्छ रसोई और बर्तनों के साथ तैयार।",
    
    // Request Flow & Pages
    request_modal_title: "भोजन का अनुरोध करें",
    request_qty_label: "वांछित मात्रा",
    request_notes_label: "परिवहन या रसद संबंधी टिप्पणी (वैकल्पिक)",
    request_phone_locked: "अनुरोध स्वीकृत होने पर फोन नंबर दिखाई देगा",
    request_phone_contact: "दाता का फोन नंबर",
    requests_title: "मेरे भोजन अनुरोध",
    requests_subtitle: "अपने दावों की वास्तविक स्थिति, ड्राइवर समन्वय और पावती की निगरानी करें।",
    filter_all_requests: "सभी अनुरोध",
    history_title: "ऑडिट ट्रेल",

    // Event Leftover Modal
    event_leftover_modal_title: "समारोह का बचा भोजन त्वरित पोस्ट",
    event_leftover_banner: "त्वरित डिस्पैच: शादियों, समारोहों या हॉस्टल के बचे भोजन के लिए। पिकअप समय समाप्त होते ही यह अपने आप समाप्त हो जाता है।",
    event_what_label: "आपके पास कौन सा बचा हुआ भोजन है?",
    event_cooked_label: "इसे कब पकाया गया था?",
    event_pickup_end_label: "पिकअप समाप्ति समय (स्वतः समाप्त)",
    
    // Disclaimers
    platform_disclaimer: "मंच अस्वीकरण: इस प्रणाली का सभी डेटा केवल परीक्षण और प्रदर्शन के लिए है। यह मंच खाद्य सुरक्षा प्रमाणक नहीं है। वितरित भोजन की सुरक्षा के लिए दाता स्वयं जिम्मेदार हैं।",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("foodshare_language") || "en";
  });

  const setLanguage = (lang) => {
    if (["en", "te", "hi"].includes(lang)) {
      setLanguageState(lang);
      localStorage.setItem("foodshare_language", lang);
    }
  };

  const t = (key) => {
    const currentLangDict = translations[language] || translations.en;
    if (currentLangDict[key] !== undefined) {
      return currentLangDict[key];
    }
    // Fallback to English
    return translations.en[key] !== undefined ? translations.en[key] : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
