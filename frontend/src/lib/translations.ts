export type Lang = 'en' | 'hi';

const UI = {
  // Page titles
  pageDashboard:    { en: 'Dashboard',    hi: 'डैशबोर्ड' },
  pageChatCopilot:  { en: 'Chat Copilot', hi: 'चैट सहायक' },

  // Sidebar nav labels
  navDashboard:     { en: 'Dashboard',   hi: 'डैशबोर्ड' },
  navChatCopilot:   { en: 'Chat Copilot', hi: 'चैट सहायक' },
  navAssessment:    { en: 'Assessment',  hi: 'मूल्यांकन' },
  navPolicies:      { en: 'Policies',    hi: 'नीतियां' },
  navIncidents:     { en: 'Incidents',   hi: 'घटनाएं' },
  navAdmin:         { en: 'Admin',       hi: 'प्रशासन' },
  navSoon:          { en: 'Soon',        hi: 'जल्द' },

  // Institution hero
  institutionPro:   { en: 'Institution Pro', hi: 'संस्था प्रो' },

  // Compliance score card
  complianceScore:  { en: 'DPDP Compliance Score', hi: 'DPDP अनुपालन स्कोर' },
  outOf100:         { en: 'out of 100',  hi: '100 में से' },
  statusGood:       { en: 'Good',        hi: 'अच्छा' },
  statusModerate:   { en: 'Moderate',    hi: 'मध्यम' },
  statusCritical:   { en: 'Critical',    hi: 'गंभीर' },
  up6Points:        { en: '↑ Up 6 points this month', hi: '↑ इस महीने 6 अंक ऊपर' },

  // Score trend card
  scoreTrend:       { en: 'Score Trend (6 months)', hi: 'स्कोर ट्रेंड (6 महीने)' },
  plus31SinceJan:   { en: '+31 since Jan', hi: 'जनवरी से +31' },

  // Risk breakdown
  riskBreakdown:    { en: 'Risk breakdown', hi: 'जोखिम विश्लेषण' },
  levelHigh:        { en: 'HIGH',   hi: 'उच्च' },
  levelMedium:      { en: 'MEDIUM', hi: 'मध्यम' },
  levelLow:         { en: 'LOW',    hi: 'कम' },

  // Chat empty state
  chatTitle:        { en: 'DPDP Mitra', hi: 'DPDP मित्र' },
  chatSubtitle:     {
    en: "Ask me anything about India's Digital Personal Data Protection Act, 2023. I can explain your rights, data fiduciary obligations, consent rules, and more.",
    hi: 'भारत के डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के बारे में कुछ भी पूछें। मैं आपके अधिकार, डेटा फिड्युशियरी दायित्व, सहमति नियम, और अधिक समझा सकता हूं।',
  },
  suggestedQ1: { en: 'What rights do I have as a Data Principal?',       hi: 'डेटा प्रिंसिपल के रूप में मेरे क्या अधिकार हैं?' },
  suggestedQ2: { en: 'What are the obligations of a Data Fiduciary?',    hi: 'डेटा फिड्युशियरी के क्या दायित्व हैं?' },
  suggestedQ3: { en: 'How does consent work under the DPDP Act?',        hi: 'DPDP अधिनियम के तहत सहमति कैसे काम करती है?' },

  // Chat sidebar
  newConversation:  { en: 'New Conversation',                hi: 'नई बातचीत' },
  noConversations:  { en: 'No conversations yet.',           hi: 'अभी तक कोई बातचीत नहीं।' },
  startNewAbove:    { en: 'Start a new one above.',          hi: 'ऊपर नई शुरू करें।' },
  footerAct:        { en: 'DPDP Act 2023',                   hi: 'DPDP अधिनियम 2023' },
  footerDisclaimer: { en: 'General guidance only — not legal advice', hi: 'केवल सामान्य मार्गदर्शन — कानूनी सलाह नहीं' },

  // Input bar
  inputPlaceholder: { en: 'Ask about the DPDP Act 2023...', hi: 'DPDP अधिनियम 2023 के बारे में पूछें...' },
  inputHint:        { en: 'Enter to send · Shift+Enter for new line', hi: 'भेजने के लिए Enter · नई लाइन के लिए Shift+Enter' },
  recordingLabel:   { en: '● Recording...', hi: '● रिकॉर्डिंग...' },
  recordingHint:    { en: 'Recording — release to send', hi: 'रिकॉर्डिंग हो रही है — भेजने के लिए छोड़ें' },
} satisfies Record<string, { en: string; hi: string }>;

export type TranslationKey = keyof typeof UI;

export function t(key: TranslationKey, lang: Lang): string {
  return UI[key][lang];
}

// Risk card lookup maps — keyed by the English string from mockData
export const RISK_NAME_HI: Record<string, string> = {
  'Consent Risk':       'सहमति जोखिम',
  'Data Security Risk': 'डेटा सुरक्षा जोखिम',
  'Vendor Risk':        'विक्रेता जोखिम',
  'Retention Risk':     'प्रतिधारण जोखिम',
};

export const RISK_DESC_HI: Record<string, string> = {
  'Parental consent records need updating':    'अभिभावक सहमति रिकॉर्ड अपडेट करने की आवश्यकता है',
  'Security controls are well maintained':     'सुरक्षा नियंत्रण अच्छी तरह बनाए हुए हैं',
  '3 vendors lack data processing agreements': '3 विक्रेताओं के पास डेटा प्रोसेसिंग समझौते नहीं हैं',
  'Data retention policy needs review':        'डेटा प्रतिधारण नीति की समीक्षा आवश्यक है',
};
