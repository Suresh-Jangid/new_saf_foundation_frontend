// Translation utility for bilingual text (English and Hindi)
export interface BilingualText {
  en: string;
  hi: string;
}

export const translations = {
  // Common UI elements
  common: {
    dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
    loading: { en: "Loading...", hi: "लोड हो रहा है..." },
    submit: { en: "Submit", hi: "जमा करें" },
    cancel: { en: "Cancel", hi: "रद्द करें" },
    save: { en: "Save", hi: "सहेजें" },
    edit: { en: "Edit", hi: "संपादित करें" },
    delete: { en: "Delete", hi: "हटाएं" },
    add: { en: "Add", hi: "जोड़ें" },
    update: { en: "Update", hi: "अपडेट करें" },
    search: { en: "Search", hi: "खोजें" },
    filter: { en: "Filter", hi: "फ़िल्टर करें" },
    view: { en: "View", hi: "देखें" },
    back: { en: "Back", hi: "वापस" },
    next: { en: "Next", hi: "अगला" },
    previous: { en: "Previous", hi: "पिछला" },
    close: { en: "Close", hi: "बंद करें" },
    confirm: { en: "Confirm", hi: "पुष्टि करें" },
    yes: { en: "Yes", hi: "हाँ" },
    no: { en: "No", hi: "नहीं" },
    required: { en: "Required", hi: "आवश्यक" },
    optional: { en: "Optional", hi: "वैकल्पिक" },
    all: { en: "All", hi: "सभी" },
    none: { en: "None", hi: "कोई नहीं" },
    Male: { en: "Male", hi: "पुरुष" },
    Female: { en: "Female", hi: "महिला" },
    other: { en: "Other", hi: "अन्य" },
    success: { en: "Success", hi: "सफलता" },
    error: { en: "Error", hi: "त्रुटि" },
    warning: { en: "Warning", hi: "चेतावनी" },
    info: { en: "Info", hi: "जानकारी" },
    actions: { en: "Actions", hi: "कार्रवाई" },
  },

  // Navigation
  navigation: {
    dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
    generalApplications: { en: "General Marriage Applications", hi: "सामान्य आवेदन" },
    insuranceApplications: { en: "Insurance Bima Applications", hi: "बीमा आवेदन" },
    marriageCongratulations: { en: "General Marriage Congratulations Payment", hi: "विवाह बधाई" },
    disabilityCycle: { en: "Disability Cycle", hi: "दिव्यांग साइकिल" },
    sewingMachine: { en: "Sewing Machine", hi: "सिलाई मशीन" },
    pensionYojana: { en: "Pension Yojana Application Payment", hi: "पेंशन योजना" },
    agentRegistration: { en: "Agent Registration", hi: "एजेंट पंजीकरण" },
    loanApplication: { en: "Loan Application", hi: "ऋण आवेदन" },
    financialHelp: { en: "Financial Application Payment", hi: "वित्तीय सहायता" },
    paymentManagement: { en: "Payment Management", hi: "भुगतान प्रबंधन" },
    logout: { en: "Log Out", hi: "लॉग आउट" },
  },

  // Form fields
  formFields: {
    formNumber: { en: "Form Number", hi: "फॉर्म नंबर" },
    applicationDate: { en: "Application Date", hi: "आवेदन तिथि" },
    applicantName: { en: "Applicant Name", hi: "आवेदक का नाम" },
    fatherName: { en: "Father's Name", hi: "पिता का नाम" },
    motherName: { en: "Mother's Name", hi: "माता का नाम" },
    wifeName: { en: "Husband's Name", hi: "पति का नाम" },
    dateOfBirth: { en: "Date of Birth", hi: "जन्म तिथि" },
    age: { en: "Age", hi: "आयु" },
    gender: { en: "Gender", hi: "लिंग" },
    mobile: { en: "Mobile Number", hi: "मोबाइल नंबर" },
    aadharNumber: { en: "Aadhar Number", hi: "आधार संख्या" },
    address: { en: "Address", hi: "पता" },
    pinCode: { en: "Pin Code", hi: "पिन कोड" },
    tehsil: { en: "Tehsil", hi: "तहसील" },
    district: { en: "District", hi: "जिला" },
    state: { en: "State", hi: "राज्य" },
    gotra: { en: "Gotra", hi: "गोत्र" },
    category: { en: "Category", hi: "श्रेणी" },
    nomineeName: { en: "Nominee Name", hi: "नॉमिनी का नाम" },
    nomineeRelation: { en: "Nominee Relation", hi: "नॉमिनी से संबंध" },
    workerName: { en: "Worker Name", hi: "कार्यकर्ता का नाम" },
    workerMobile: { en: "Worker Mobile", hi: "कार्यकर्ता का मोबाइल" },
    affidavit: { en: "Affidavit", hi: "शपथ पत्र" },
    passportPhoto: { en: "Passport Photo", hi: "पासपोर्ट साइज फोटो" },
    paymentAmount: { en: "Payment Amount", hi: "भुगतान राशि" },
    paymentMode: { en: "Payment Mode", hi: "भुगतान का तरीका" },
    paymentDate: { en: "Payment Date", hi: "भुगतान तिथि" },
    remarks: { en: "Remarks", hi: "टिप्पणी" },
    fee: { en: "Fee", hi: "शुल्क" },
  },

  // Messages
  messages: {
    // Success messages
    loginSuccess: { en: "Login Successful", hi: "लॉगिन सफल" },
    recordAdded: { en: "Record added successfully", hi: "रिकॉर्ड सफलतापूर्वक जोड़ा गया" },
    recordUpdated: { en: "Record updated successfully", hi: "रिकॉर्ड सफलतापूर्वक अपडेट किया गया" },
    recordDeleted: { en: "Record deleted successfully", hi: "रिकॉर्ड सफलतापूर्वक हटा दिया गया" },
    applicationSubmitted: { en: "Application submitted successfully", hi: "आवेदन सफलतापूर्वक जमा किया गया" },
    
    // Role-specific messages
    adminLoginSuccess: { en: "Admin login successful", hi: "एडमिन लॉगिन सफल" },
    agentLoginSuccess: { en: "Agent login successful", hi: "एजेंट लॉगिन सफल" },
    accessDenied: { en: "Access denied. You don't have permission to view this page.", hi: "पहुंच अस्वीकृत। आपको इस पेज को देखने की अनुमति नहीं है।" },
    adminOnly: { en: "This feature is only available to administrators.", hi: "यह सुविधा केवल प्रशासकों के लिए उपलब्ध है।" },
    agentOnly: { en: "This feature is only available to agents.", hi: "यह सुविधा केवल एजेंटों के लिए उपलब्ध है।" },
    
    // Error messages
    loginFailed: { en: "Login failed. Please check your credentials.", hi: "लॉगिन विफल। कृपया अपने क्रेडेंशियल्स जांचें।" },
    invalidCredentials: { en: "Invalid mobile number or password.", hi: "अमान्य मोबाइल नंबर या पासवर्ड।" },
    networkError: { en: "Network error. Please try again.", hi: "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।" },
    serverError: { en: "Server error. Please try again later.", hi: "सर्वर त्रुटि। कृपया बाद में पुनः प्रयास करें।" },
  },

  // Role-specific labels
  roles: {
    admin: { en: "Administrator", hi: "प्रशासक" },
    agent: { en: "Agent", hi: "एजेंट" },
    adminPanel: { en: "Admin Panel", hi: "एडमिन पैनल" },
    agentPanel: { en: "Agent Panel", hi: "एजेंट पैनल" },
    foundationAdmin: { en: "Foundation Admin", hi: "फाउंडेशन एडमिन" },
    foundationAgent: { en: "Foundation Agent", hi: "फाउंडेशन एजेंट" },
  },

  // Placeholders
  placeholders: {
    enterMobile: { en: "Enter mobile number", hi: "मोबाइल नंबर दर्ज करें" },
    enterPassword: { en: "Enter password", hi: "पासवर्ड दर्ज करें" },
    enterName: { en: "Enter name", hi: "नाम दर्ज करें" },
    enterAmount: { en: "Enter amount", hi: "राशि दर्ज करें" },
    selectDate: { en: "Select date (dd-mm-yyyy)", hi: "तिथि चुनें (dd-mm-yyyy)" },
    selectGender: { en: "Select gender", hi: "लिंग चुनें" },
    selectCategory: { en: "Select category", hi: "श्रेणी चुनें" },
    selectPaymentMode: { en: "Select payment mode", hi: "भुगतान का तरीका चुनें" },
    searchByName: { en: "Search by name", hi: "नाम से खोजें" },
    filterByGender: { en: "Filter by gender", hi: "लिंग से फ़िल्टर करें" },
    filterByTehsil: { en: "Filter by tehsil", hi: "तहसील से फ़िल्टर करें" },
    filterByAddress: { en: "Filter by address", hi: "पते से फ़िल्टर करें" },
    village: { en: "Village", hi: "गांव" },
  },

  // Dashboard stats
  dashboard: {
    totalRecords: { en: "Total Records", hi: "कुल रिकॉर्ड" },
    totalDonations: { en: "Total Donations", hi: "कुल दान" },
    totalBeneficiaries: { en: "Total Beneficiaries", hi: "कुल लाभार्थी" },
    recentApplications: { en: "Recent Applications", hi: "हाल के आवेदन" },
    financialHelp: { en: "Financial Application Payment", hi: "वित्तीय सहायता" },
    membership: { en: "Membership", hi: "सदस्यता" },
    marriageCongratulations: { en: "General Marriage Congratulations Payment", hi: "विवाह बधाई" },
    disabilityCycle: { en: "Disability Cycle", hi: "दिव्यांग साइकिल" },
    donationReceipts: { en: "Donation Receipts", hi: "दान रसीद" },
    membershipCertificates: { en: "Membership Certificates", hi: "सदस्यता प्रमाणपत्र" },
    generalApplications: { en: "General Marriage Applications", hi: "सामान्य आवेदन" },
    sewingMachine: { en: "Sewing Machine", hi: "सिलाई मशीन" },
    foundationRegistration: { en: "Foundation Registration", hi: "फाउंडेशन पंजीकरण" },
    beneficiaryRegistration: { en: "Beneficiary Registration", hi: "लाभार्थी पंजीकरण" },
    last7Days: { en: "Last 7 Days", hi: "पिछले 7 दिन" },
  },

  // Login page
  login: {
    title: { en: "Admin Portal", hi: "एडमिन पोर्टल" },
    subtitle: { en: "SAF Foundation Portal", hi: "एसएएफ फाउंडेशन पोर्टल" },
    signIn: { en: "Sign In", hi: "साइन इन करें" },
    signingIn: { en: "Signing in...", hi: "साइन इन हो रहा है..." },
    secureAccess: { en: "Secure admin access for foundation management", hi: "फाउंडेशन प्रबंधन के लिए सुरक्षित एडमिन एक्सेस" },
  },
};

// Helper function to get bilingual text
export function getBilingualText(key: string, language: 'en' | 'hi' = 'en'): string {
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  if (value && typeof value === 'object' && 'en' in value && 'hi' in value) {
    return value[language];
  }
  
  return key;
}

// Helper function to get both languages
export function getBilingual(key: string): BilingualText {
  return {
    en: getBilingualText(key, 'en'),
    hi: getBilingualText(key, 'hi')
  };
}

// Helper function to format bilingual text for display
export function formatBilingual(key: string, separator: string = ' / '): string {
  const bilingual = getBilingual(key);
  return `${bilingual.hi}${separator}${bilingual.en}`;
}

export default translations; 