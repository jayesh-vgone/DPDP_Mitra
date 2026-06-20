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

  // Assessment mode badge
  assessmentModeActive: { en: 'Assessment mode active', hi: 'असेसमेंट मोड सक्रिय' },
  assessmentModeHint:   { en: 'Type /exit to turn off', hi: 'बंद करने के लिए /exit टाइप करें' },

  // Input bar
  inputPlaceholder: { en: 'Ask about the DPDP Act 2023...', hi: 'DPDP अधिनियम 2023 के बारे में पूछें...' },
  inputHint:        { en: 'Enter to send · Shift+Enter for new line', hi: 'भेजने के लिए Enter · नई लाइन के लिए Shift+Enter' },
  recordingLabel:   { en: '● Recording...', hi: '● रिकॉर्डिंग...' },
  recordingHint:    { en: 'Recording — release to send', hi: 'रिकॉर्डिंग हो रही है — भेजने के लिए छोड़ें' },

  // Auth — login page
  loginTitle:       { en: 'Sign in to EduPrivacy AI', hi: 'EduPrivacy AI में साइन इन करें' },
  loginSubtitle:    { en: 'DPDP compliance for educational institutions', hi: 'शैक्षणिक संस्थाओं के लिए DPDP अनुपालन' },
  emailLabel:       { en: 'Email address', hi: 'ईमेल पता' },
  passwordLabel:    { en: 'Password', hi: 'पासवर्ड' },
  loginBtn:         { en: 'Sign in', hi: 'साइन इन करें' },
  loginLoading:     { en: 'Signing in...', hi: 'साइन इन हो रहा है...' },
  noAccount:        { en: "Don't have an account?", hi: 'खाता नहीं है?' },
  registerLink:     { en: 'Register your institution', hi: 'अपनी संस्था पंजीकृत करें' },
  invalidCreds:     { en: 'Incorrect email or password', hi: 'गलत ईमेल या पासवर्ड' },

  // Auth — register page
  registerTitle:    { en: 'Register your institution', hi: 'अपनी संस्था पंजीकृत करें' },
  registerSubtitle: { en: 'Join EduPrivacy AI with your institution invite code', hi: 'संस्था आमंत्रण कोड के साथ EduPrivacy AI से जुड़ें' },
  inviteCodeLabel:  { en: 'Institution invite code', hi: 'संस्था आमंत्रण कोड' },
  adminNameLabel:   { en: 'Your name', hi: 'आपका नाम' },
  registerBtn:      { en: 'Create account', hi: 'खाता बनाएं' },
  registerLoading:  { en: 'Creating account...', hi: 'खाता बन रहा है...' },
  haveAccount:      { en: 'Already have an account?', hi: 'पहले से खाता है?' },
  loginLink:        { en: 'Sign in', hi: 'साइन इन करें' },
  invalidInvite:    { en: 'Invalid invite code', hi: 'अमान्य आमंत्रण कोड' },
  emailTaken:       { en: 'An account with this email already exists', hi: 'इस ईमेल से पहले से एक खाता है' },
  passwordShort:    { en: 'Password must be at least 8 characters', hi: 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए' },

  // Dashboard — blank state (no assessment yet)
  dashboardBlankTitle:  { en: 'Welcome to EduPrivacy AI', hi: 'EduPrivacy AI में आपका स्वागत है' },
  dashboardBlankBody:   {
    en: 'Complete an assessment to generate your DPDP compliance score and risk breakdown.',
    hi: 'अपना DPDP अनुपालन स्कोर और जोखिम विश्लेषण देखने के लिए एक मूल्यांकन पूरा करें।',
  },
  dashboardBlankCta:    { en: 'Take an assessment', hi: 'मूल्यांकन करें' },
  dashboardBlankSoon:   { en: 'Assessment coming soon', hi: 'मूल्यांकन जल्द आ रहा है' },

  // Header / sidebar — auth controls
  logoutBtn:        { en: 'Sign out', hi: 'साइन आउट करें' },
  profileLink:      { en: 'Profile',  hi: 'प्रोफ़ाइल' },

  // Profile page
  pageProfile:            { en: 'Profile',                    hi: 'प्रोफ़ाइल' },
  profileAccountSection:  { en: 'Account Information',        hi: 'खाता जानकारी' },
  profileNameLabel:       { en: 'Name',                       hi: 'नाम' },
  profileEmailLabel:      { en: 'Email',                      hi: 'ईमेल' },
  profileSaveBtn:         { en: 'Save Changes',               hi: 'बदलाव सहेजें' },
  profileSaving:          { en: 'Saving…',                    hi: 'सहेजा जा रहा है…' },
  profileSaved:           { en: 'Profile updated',            hi: 'प्रोफ़ाइल अपडेट हुई' },
  profilePasswordSection: { en: 'Change Password',            hi: 'पासवर्ड बदलें' },
  profileCurrentPw:       { en: 'Current Password',           hi: 'वर्तमान पासवर्ड' },
  profileNewPw:           { en: 'New Password',               hi: 'नया पासवर्ड' },
  profileConfirmPw:       { en: 'Confirm New Password',       hi: 'नया पासवर्ड दोबारा डालें' },
  profileChangePwBtn:     { en: 'Change Password',            hi: 'पासवर्ड बदलें' },
  profileChangingPw:      { en: 'Changing…',                  hi: 'बदला जा रहा है…' },
  profilePwChanged:       { en: 'Password changed',           hi: 'पासवर्ड बदल गया' },
  profilePwMismatch:      { en: 'New passwords do not match', hi: 'नए पासवर्ड मेल नहीं खाते' },
  profileEmailInUse:      { en: 'Email already in use',       hi: 'ईमेल पहले से उपयोग में है' },
  profilePwWrong:         { en: 'Current password is incorrect', hi: 'वर्तमान पासवर्ड गलत है' },
  profileShowPw:          { en: 'Show',                       hi: 'दिखाएं' },
  profileHidePw:          { en: 'Hide',                       hi: 'छुपाएं' },

  // Theme toggle
  themeToggleLight: { en: 'Switch to light mode', hi: 'लाइट मोड पर जाएं' },
  themeToggleDark:  { en: 'Switch to dark mode',  hi: 'डार्क मोड पर जाएं' },

  // Profile — Institution Details section
  profileInstSection:        { en: 'Institution Details',      hi: 'संस्था विवरण' },
  profileInstReadOnly:       { en: 'Institution Overview',     hi: 'संस्था अवलोकन' },
  profileInstName:           { en: 'Institution Name',         hi: 'संस्था का नाम' },
  profileInstType:           { en: 'Institution Type',         hi: 'संस्था प्रकार' },
  profileInstCategory:       { en: 'Institution Category',     hi: 'संस्था श्रेणी' },
  profileInstPlan:           { en: 'Plan',                     hi: 'योजना' },
  profileInstLocation:       { en: 'Location',                 hi: 'स्थान' },
  profileInstStudentCount:   { en: 'Student Count',            hi: 'छात्र संख्या' },
  profileInstStaffCount:     { en: 'Staff Count',              hi: 'कर्मचारी संख्या' },
  profileInstSubtype:        { en: 'Institution Subtype',      hi: 'संस्था उपप्रकार' },
  profileInstSubtypeNA:      { en: 'Not applicable for EdTech', hi: 'EdTech के लिए लागू नहीं' },
  profileInstSaveBtn:        { en: 'Save Institution Details', hi: 'संस्था विवरण सहेजें' },
  profileInstSaving:         { en: 'Saving…',                  hi: 'सहेजा जा रहा है…' },
  profileInstSaved:          { en: 'Institution details saved', hi: 'संस्था विवरण सहेजे गए' },
  profileInstSubtypePrompt:  { en: 'Select subtype',           hi: 'उपप्रकार चुनें' },
  profileInstLocationPrompt: { en: 'City, State',              hi: 'शहर, राज्य' },

  // Verification badges
  badgePendingVerification: { en: 'Pending Verification', hi: 'सत्यापन प्रतीक्षित' },
  badgeVerified:            { en: 'Verified',             hi: 'सत्यापित' },

  // Register — institution category dropdown (Phase 6b)
  categoryDropdownLabel: { en: 'What best describes your institution?', hi: 'आपकी संस्था सबसे अच्छे तरीके से क्या है?' },
  categorySchool:        { en: 'School (K-12)', hi: 'स्कूल (K-12)' },
  categoryHigherEd:      { en: 'Higher Education / College or University', hi: 'उच्च शिक्षा / कॉलेज या विश्वविद्यालय' },
  categoryEdtech:        { en: 'EdTech Company', hi: 'एडटेक कंपनी' },
  categorySelectPrompt:  { en: 'Select institution type', hi: 'संस्था प्रकार चुनें' },

  // Assessment wizard — general UI
  wizardTitle:        { en: 'DPDP Compliance Assessment', hi: 'DPDP अनुपालन मूल्यांकन' },
  wizardStepLabel:    { en: 'Step', hi: 'चरण' },
  wizardOfLabel:      { en: 'of', hi: 'में से' },
  wizardNext:         { en: 'Next', hi: 'अगला' },
  wizardBack:         { en: 'Back', hi: 'वापस' },
  wizardReviewBtn:    { en: 'Review & Submit', hi: 'समीक्षा और सबमिट' },
  wizardSubmit:       { en: 'Submit Assessment', hi: 'मूल्यांकन सबमिट करें' },
  wizardSubmitting:   { en: 'Submitting…', hi: 'सबमिट हो रहा है…' },
  wizardReviewTitle:  { en: 'Review Your Answers', hi: 'अपने उत्तर जांचें' },
  wizardReviewBody:   { en: 'Review your answers across all 8 categories. You cannot change them after submission.', hi: 'सभी 8 श्रेणियों में अपने उत्तर जांचें। सबमिट के बाद आप उन्हें बदल नहीं सकते।' },
  wizardLoadingText:  { en: 'Loading questions…', hi: 'प्रश्न लोड हो रहे हैं…' },
  wizardErrorText:    { en: 'Failed to load questions. Please try again.', hi: 'प्रश्न लोड करने में विफल। कृपया फिर से प्रयास करें।' },
  wizardRetry:        { en: 'Try again', hi: 'फिर से प्रयास करें' },
  wizardAnswerAll:    { en: 'Please answer all questions before proceeding.', hi: 'आगे बढ़ने से पहले कृपया सभी प्रश्नों का उत्तर दें।' },
  wizardNoPartial:    { en: 'Progress is not saved. Navigating away will restart the assessment.', hi: 'प्रगति सहेजी नहीं जाती। दूर जाने पर मूल्यांकन फिर से शुरू होगा।' },
  wizardSubmitError:  { en: 'Submission failed. Please try again.', hi: 'सबमिशन विफल। कृपया फिर से प्रयास करें।' },
  wizardDpdpSection:  { en: 'DPDP Act reference', hi: 'DPDP अधिनियम संदर्भ' },

  // Scale answer labels (0–4)
  scale0: { en: '0 — Not done',   hi: '0 — नहीं किया' },
  scale1: { en: '1 — Planning',   hi: '1 — योजना में' },
  scale2: { en: '2 — Partial',    hi: '2 — आंशिक' },
  scale3: { en: '3 — Mostly',     hi: '3 — अधिकांशतः' },
  scale4: { en: '4 — Fully done', hi: '4 — पूर्ण' },
  answerYes: { en: 'Yes', hi: 'हाँ' },
  answerNo:  { en: 'No',  hi: 'नहीं' },

  // Risk category display names (dashboard)
  riskConsentMgmt:  { en: 'Consent Management',          hi: 'सहमति प्रबंधन' },
  riskDataSecurity: { en: 'Data Security',               hi: 'डेटा सुरक्षा' },
  riskVendor:       { en: 'Vendor / Data Processor Risk', hi: 'विक्रेता जोखिम' },
  riskRetention:    { en: 'Data Retention',              hi: 'डेटा प्रतिधारण' },
  riskChildren:     { en: "Children's Data",             hi: 'बच्चों का डेटा' },
  riskBreach:       { en: 'Breach Readiness',            hi: 'उल्लंघन तैयारी' },
  riskCrossBorder:  { en: 'Cross-Border Transfer',       hi: 'सीमापार हस्तांतरण' },
  riskGrievance:    { en: 'Grievance Redressal',         hi: 'शिकायत निवारण' },

  // Risk level descriptions derived from score (dashboard)
  riskDescHigh:     { en: 'Needs immediate attention',   hi: 'तत्काल ध्यान आवश्यक' },
  riskDescMedium:   { en: 'Improvement needed',          hi: 'सुधार आवश्यक' },
  riskDescLow:      { en: 'Well maintained',             hi: 'अच्छी तरह बनाए हुए' },

  // Dashboard — live state labels
  dashboardScoreTitle:  { en: 'DPDP Compliance Score', hi: 'DPDP अनुपालन स्कोर' },
  dashboardTrendTitle:  { en: 'Score Trend', hi: 'स्कोर ट्रेंड' },
  dashboardRiskTitle:   { en: 'Risk Breakdown', hi: 'जोखिम विश्लेषण' },
  dashboardSinceFirst:  { en: 'since first assessment', hi: 'पहले मूल्यांकन से' },
  dashboardTakeAgain:   { en: 'Retake Assessment', hi: 'मूल्यांकन फिर से करें' },
  dashboardLoading:     { en: 'Loading…', hi: 'लोड हो रहा है…' },
  dashboardDownload:    { en: 'Download Report', hi: 'रिपोर्ट डाउनलोड करें' },
  dashboardDownloading: { en: 'Preparing PDF…', hi: 'PDF तैयार हो रही है…' },
  dashboardViewDetails: { en: 'View details', hi: 'विवरण देखें' },

  // Category drill-down page
  drillBackToDashboard: { en: '← Back to Dashboard', hi: '← डैशबोर्ड पर वापस' },
  drillQuestionsTitle:  { en: 'Question-by-question breakdown', hi: 'प्रश्न-दर-प्रश्न विश्लेषण' },
  drillAnswerLabel:     { en: 'Your answer', hi: 'आपका उत्तर' },
  drillDpdpSection:     { en: 'DPDP Section', hi: 'DPDP धारा' },
  drillWeight:          { en: 'Weight', hi: 'भार' },
  drillLoading:         { en: 'Loading category detail…', hi: 'श्रेणी विवरण लोड हो रहा है…' },
  drillError:           { en: 'Failed to load category detail.', hi: 'श्रेणी विवरण लोड नहीं हो सका।' },
} satisfies Record<string, { en: string; hi: string }>;

export type TranslationKey = keyof typeof UI;

export function t(key: TranslationKey, lang: Lang): string {
  return UI[key][lang];
}

// ── Category name → URL-safe slug (must match backend scoring.py CATEGORY_TO_SLUG) ──
export const CATEGORY_TO_SLUG: Record<string, string> = {
  'Consent Management':           'consent-management',
  'Data Security':                'data-security',
  'Vendor / Data Processor Risk': 'vendor-data-processor-risk',
  'Data Retention':               'data-retention',
  "Children's Data":              'childrens-data',
  'Breach Readiness':             'breach-readiness',
  'Cross-Border Transfer':        'cross-border-transfer',
  'Grievance Redressal':          'grievance-redressal',
};

// ── Risk category name → Hindi (keyed by the canonical English category name) ──
export const RISK_CATEGORY_HI: Record<string, string> = {
  'Consent Management':          'सहमति प्रबंधन',
  'Data Security':               'डेटा सुरक्षा',
  'Vendor / Data Processor Risk': 'विक्रेता जोखिम',
  'Data Retention':              'डेटा प्रतिधारण',
  "Children's Data":             'बच्चों का डेटा',
  'Breach Readiness':            'उल्लंघन तैयारी',
  'Cross-Border Transfer':       'सीमापार हस्तांतरण',
  'Grievance Redressal':         'शिकायत निवारण',
};

// ── Hindi translations for all 99 assessment question texts ───────────────────
// Keyed by the exact English question_text from seed_questions.py.
// Used by the wizard to show Hindi text when lang === 'hi'.
// Falls back to English if the key is missing.
export const QUESTION_HI: Record<string, string> = {
  // ── SCHOOL — Consent Management ──────────────────────────────────────────────
  'We obtain specific, informed written consent from parents/guardians before collecting student personal data.':
    'छात्रों का व्यक्तिगत डेटा एकत्र करने से पहले हम माता-पिता/अभिभावकों से विशिष्ट, सूचित लिखित सहमति प्राप्त करते हैं।',
  'Our consent forms clearly explain what data is collected, why it is collected, and with whom it will be shared.':
    'हमारे सहमति प्रपत्र स्पष्ट रूप से बताते हैं कि कौन सा डेटा एकत्र किया जाता है, क्यों और किसके साथ साझा किया जाएगा।',
  'We have a documented process for parents/guardians to withdraw consent and we act on withdrawals promptly.':
    'माता-पिता/अभिभावकों द्वारा सहमति वापस लेने की एक दस्तावेज़ीकृत प्रक्रिया है और हम इस पर तुरंत कार्रवाई करते हैं।',
  'We obtain separate consent for each distinct purpose of data processing (e.g. academics, extracurriculars, marketing).':
    'हम डेटा प्रसंस्करण के प्रत्येक अलग उद्देश्य (जैसे शैक्षणिक, पाठ्येतर, विपणन) के लिए अलग सहमति प्राप्त करते हैं।',

  // ── SCHOOL — Data Security ────────────────────────────────────────────────────
  'Role-based access controls ensure only authorised staff can access student personal data.':
    'भूमिका-आधारित पहुंच नियंत्रण सुनिश्चित करते हैं कि केवल अधिकृत कर्मचारी ही छात्र का व्यक्तिगत डेटा एक्सेस कर सकें।',
  'Student data is encrypted at rest and in transit (e.g. secure databases, HTTPS for all portals).':
    'छात्र डेटा विश्राम और पारगमन दोनों में एन्क्रिप्टेड है (जैसे सुरक्षित डेटाबेस, सभी पोर्टलों के लिए HTTPS)।',
  'We conduct periodic security audits or vulnerability assessments of systems handling student data.':
    'हम छात्र डेटा संभालने वाली प्रणालियों की समय-समय पर सुरक्षा ऑडिट या भेद्यता आकलन करते हैं।',
  'All staff who access student personal data have received data protection training.':
    'छात्र के व्यक्तिगत डेटा तक पहुंचने वाले सभी कर्मचारियों को डेटा संरक्षण प्रशिक्षण मिला है।',

  // ── SCHOOL — Vendor / Data Processor Risk ────────────────────────────────────
  'We have signed Data Processing Agreements (DPAs) with all third-party vendors who process student data.':
    'छात्र डेटा संसाधित करने वाले सभी तृतीय पक्ष विक्रेताओं के साथ हमने डेटा प्रसंस्करण समझौते (DPAs) हस्ताक्षरित किए हैं।',
  'We periodically review vendor compliance with our data protection requirements.':
    'हम समय-समय पर विक्रेताओं की हमारी डेटा संरक्षण आवश्यकताओं के अनुपालन की समीक्षा करते हैं।',
  'We maintain a register of all vendors and processors who handle student personal data.':
    'हम छात्र के व्यक्तिगत डेटा को संभालने वाले सभी विक्रेताओं और प्रोसेसरों का एक रजिस्टर बनाए रखते हैं।',
  'Vendor contracts prohibit sub-contracting of data processing without our explicit approval.':
    'विक्रेता अनुबंध हमारी स्पष्ट स्वीकृति के बिना डेटा प्रसंस्करण के उप-अनुबंध को प्रतिबंधित करते हैं।',

  // ── SCHOOL — Data Retention ───────────────────────────────────────────────────
  'We have a documented data retention policy specifying how long each type of student data is kept.':
    'हमारे पास एक दस्तावेज़ीकृत डेटा प्रतिधारण नीति है जो बताती है कि प्रत्येक प्रकार का छात्र डेटा कितने समय तक रखा जाता है।',
  'Student records are deleted or anonymised once their retention period expires.':
    'प्रतिधारण अवधि समाप्त होने पर छात्र रिकॉर्ड हटाए या गुमनाम किए जाते हैं।',
  'We communicate our data retention periods to parents/guardians.':
    'हम माता-पिता/अभिभावकों को अपनी डेटा प्रतिधारण अवधि के बारे में सूचित करते हैं।',
  'Data migrated from legacy systems is also subject to our current retention policy.':
    'पुरानी प्रणालियों से माइग्रेट किया गया डेटा भी हमारी वर्तमान प्रतिधारण नीति के अधीन है।',

  // ── SCHOOL — Children's Data ──────────────────────────────────────────────────
  'We verify the age of data subjects and apply enhanced protections for all students under 18.':
    'हम डेटा विषयों की आयु सत्यापित करते हैं और 18 वर्ष से कम आयु के सभी छात्रों के लिए उन्नत सुरक्षा लागू करते हैं।',
  "We never process children's data for behavioural tracking, targeted advertising, or profiling.":
    'हम कभी भी बच्चों के डेटा को व्यवहार ट्रैकिंग, लक्षित विज्ञापन या प्रोफाइलिंग के लिए संसाधित नहीं करते।',
  'Our school apps and portals display age-appropriate privacy notices understandable to students and parents.':
    'हमारे स्कूल ऐप्स और पोर्टल ऐसे आयु-उपयुक्त गोपनीयता नोटिस प्रदर्शित करते हैं जो छात्रों और माता-पिता को समझ में आएं।',
  'We have a guardian consent verification mechanism before creating student digital accounts.':
    'छात्र डिजिटल खाते बनाने से पहले हमारे पास अभिभावक सहमति सत्यापन तंत्र है।',

  // ── SCHOOL — Breach Readiness ─────────────────────────────────────────────────
  'We have a documented incident response plan specifically covering personal data breaches.':
    'हमारे पास एक दस्तावेज़ीकृत घटना प्रतिक्रिया योजना है जो विशेष रूप से व्यक्तिगत डेटा उल्लंघनों को कवर करती है।',
  'A named person is responsible for coordinating our data breach response.':
    'हमारी डेटा उल्लंघन प्रतिक्रिया के समन्वय के लिए एक नामित व्यक्ति जिम्मेदार है।',
  'We can identify affected individuals and notify them within 72 hours of detecting a breach.':
    'हम प्रभावित व्यक्तियों की पहचान कर उल्लंघन का पता चलने के 72 घंटों के भीतर उन्हें सूचित कर सकते हैं।',
  'We conduct regular drills or simulations to test our breach response capability.':
    'हम अपनी उल्लंघन प्रतिक्रिया क्षमता का परीक्षण करने के लिए नियमित अभ्यास या सिमुलेशन करते हैं।',

  // ── SCHOOL — Cross-Border Transfer ────────────────────────────────────────────
  'We know which of our student data storage systems are hosted outside India.':
    'हम जानते हैं कि हमारे कौन से छात्र डेटा संग्रहण सिस्टम भारत के बाहर होस्ट किए गए हैं।',
  'We have verified that any cross-border data transfers comply with Section 16 of the DPDP Act.':
    'हमने सत्यापित किया है कि कोई भी सीमापार डेटा हस्तांतरण DPDP अधिनियम की धारा 16 का पालन करता है।',
  'Cloud service providers used for student data store data only in permissible jurisdictions.':
    'छात्र डेटा के लिए उपयोग किए जाने वाले क्लाउड सेवा प्रदाता केवल अनुमेय क्षेत्राधिकारों में डेटा संग्रहित करते हैं।',
  'Contracts with overseas processors require them to protect student data to Indian standards.':
    'विदेशी प्रोसेसरों के साथ अनुबंध उन्हें भारतीय मानकों के अनुसार छात्र डेटा की सुरक्षा करने की आवश्यकता करते हैं।',

  // ── SCHOOL — Grievance Redressal ──────────────────────────────────────────────
  'We have designated a Data Protection Officer (or equivalent contact) accessible to parents and students.':
    'हमने एक डेटा संरक्षण अधिकारी (या समकक्ष संपर्क) नियुक्त किया है जो माता-पिता और छात्रों के लिए सुलभ है।',
  'We have a published process for parents and students to raise data-related complaints.':
    'माता-पिता और छात्रों के लिए डेटा-संबंधी शिकायतें उठाने की एक प्रकाशित प्रक्रिया है।',
  'We respond to data grievances within the timeline required by applicable rules.':
    'हम लागू नियमों द्वारा आवश्यक समयसीमा के भीतर डेटा शिकायतों का जवाब देते हैं।',
  'We maintain records of all data-related grievances received and their resolutions.':
    'हम प्राप्त सभी डेटा-संबंधी शिकायतों और उनके समाधानों के रिकॉर्ड बनाए रखते हैं।',

  // ── HIGHER_ED — Consent Management ───────────────────────────────────────────
  'We obtain clear, specific consent from students before using their personal data for purposes beyond core academic functions.':
    'हम मूल शैक्षणिक कार्यों से परे उद्देश्यों के लिए छात्रों का व्यक्तिगत डेटा उपयोग करने से पहले स्पष्ट, विशिष्ट सहमति प्राप्त करते हैं।',
  'We maintain records showing when and how consent was obtained for each student.':
    'हम रिकॉर्ड बनाए रखते हैं जो दर्शाते हैं कि प्रत्येक छात्र के लिए कब और कैसे सहमति प्राप्त की गई।',
  'Students can easily withdraw consent and are informed of the implications of doing so.':
    'छात्र आसानी से सहमति वापस ले सकते हैं और उन्हें ऐसा करने के निहितार्थों के बारे में सूचित किया जाता है।',
  'We separate consent for academic data from consent for research, marketing, or alumni relations.':
    'हम शैक्षणिक डेटा के लिए सहमति को अनुसंधान, विपणन या पूर्व छात्र संबंधों के लिए सहमति से अलग करते हैं।',

  // ── HIGHER_ED — Data Security ─────────────────────────────────────────────────
  'Access to student and faculty personal data systems is controlled via role-based permissions.':
    'छात्र और संकाय के व्यक्तिगत डेटा सिस्टम तक पहुंच भूमिका-आधारित अनुमतियों के माध्यम से नियंत्रित की जाती है।',
  'All institutional systems holding personal data are protected with encryption and regular security patches.':
    'व्यक्तिगत डेटा रखने वाले सभी संस्थागत सिस्टम एन्क्रिप्शन और नियमित सुरक्षा पैच से सुरक्षित हैं।',
  'We have a dedicated IT security policy covering student and employee personal data.':
    'हमारे पास छात्र और कर्मचारी के व्यक्तिगत डेटा को कवर करने वाली एक समर्पित IT सुरक्षा नीति है।',
  'We conduct at least annual security assessments of systems that hold personal data.':
    'हम व्यक्तिगत डेटा रखने वाले सिस्टम का कम से कम वार्षिक सुरक्षा आकलन करते हैं।',

  // ── HIGHER_ED — Vendor / Data Processor Risk ──────────────────────────────────
  'We have DPAs with all EdTech platforms, LMS providers, and cloud services that process student data.':
    'सभी EdTech प्लेटफ़ॉर्म, LMS प्रदाताओं और क्लाउड सेवाओं के साथ हमारे DPAs हैं जो छात्र डेटा संसाधित करते हैं।',
  'We maintain an inventory of all third-party vendors with access to institutional personal data.':
    'हम संस्थागत व्यक्तिगत डेटा तक पहुंच रखने वाले सभी तृतीय पक्ष विक्रेताओं की एक सूची बनाए रखते हैं।',
  'Research collaborators are subject to data protection obligations when handling personal data from our institution.':
    'हमारी संस्था के व्यक्तिगत डेटा को संभालते समय अनुसंधान सहयोगी डेटा संरक्षण दायित्वों के अधीन हैं।',
  'We audit vendor data protection practices at least annually.':
    'हम कम से कम वार्षिक आधार पर विक्रेता डेटा संरक्षण प्रथाओं का ऑडिट करते हैं।',

  // ── HIGHER_ED — Data Retention ────────────────────────────────────────────────
  'We have a published retention schedule covering all data categories (student records, exam data, faculty data).':
    'हमारे पास सभी डेटा श्रेणियों (छात्र रिकॉर्ड, परीक्षा डेटा, संकाय डेटा) को कवर करने वाला एक प्रकाशित प्रतिधारण कार्यक्रम है।',
  'Data is deleted or anonymised in accordance with our retention schedule.':
    'डेटा हमारे प्रतिधारण कार्यक्रम के अनुसार हटाया या गुमनाम किया जाता है।',
  'We retain academic records only as long as required by applicable regulatory mandates (UGC, AICTE, etc.).':
    'हम शैक्षणिक रिकॉर्ड केवल लागू नियामक जनादेशों (UGC, AICTE, आदि) द्वारा आवश्यक अवधि तक रखते हैं।',
  'We have a process to manage data belonging to alumni, former faculty, and applicants who did not enrol.':
    'पूर्व छात्रों, पूर्व संकाय और उन आवेदकों के डेटा को प्रबंधित करने के लिए हमारे पास एक प्रक्रिया है जिन्होंने प्रवेश नहीं लिया।',

  // ── HIGHER_ED — Children's Data ───────────────────────────────────────────────
  'We identify and apply special protections for any students under 18 enrolled in our institution.':
    'हम अपनी संस्था में नामांकित 18 वर्ष से कम आयु के किसी भी छात्र की पहचान करते हैं और विशेष सुरक्षा लागू करते हैं।',
  'Research activities do not involve behavioural profiling of students under 18 without explicit guardian consent.':
    'अनुसंधान गतिविधियों में स्पष्ट अभिभावक सहमति के बिना 18 वर्ष से कम आयु के छात्रों की व्यवहार प्रोफाइलिंग शामिल नहीं है।',
  'We have controls preventing student data from being used for advertising or marketing targeting.':
    'हमारे पास छात्र डेटा को विज्ञापन या विपणन लक्ष्यीकरण के लिए उपयोग होने से रोकने के नियंत्रण हैं।',
  'Age-appropriate privacy notices are communicated to any minor students in bridging or foundation programmes.':
    'ब्रिजिंग या फाउंडेशन कार्यक्रमों में किसी भी नाबालिग छात्र को आयु-उपयुक्त गोपनीयता नोटिस संप्रेषित किए जाते हैं।',

  // ── HIGHER_ED — Breach Readiness ──────────────────────────────────────────────
  'We have a formal data breach response procedure documented and accessible to relevant staff.':
    'हमारे पास एक औपचारिक डेटा उल्लंघन प्रतिक्रिया प्रक्रिया दस्तावेज़ीकृत है और संबंधित कर्मचारियों के लिए सुलभ है।',
  'We have identified the person responsible for notifying authorities in the event of a breach.':
    'हमने उल्लंघन की स्थिति में अधिकारियों को सूचित करने के लिए जिम्मेदार व्यक्ति की पहचान की है।',
  'We can notify affected students and staff within 72 hours of a confirmed breach.':
    'हम पुष्टि किए गए उल्लंघन के 72 घंटों के भीतर प्रभावित छात्रों और कर्मचारियों को सूचित कर सकते हैं।',
  'We conduct breach simulation exercises to test our response capability.':
    'हम अपनी प्रतिक्रिया क्षमता का परीक्षण करने के लिए उल्लंघन सिमुलेशन अभ्यास करते हैं।',

  // ── HIGHER_ED — Cross-Border Transfer ────────────────────────────────────────
  'We know whether any international research partnerships involve transferring personal data outside India.':
    'हम जानते हैं कि क्या कोई अंतर्राष्ट्रीय अनुसंधान साझेदारी में भारत के बाहर व्यक्तिगत डेटा स्थानांतरित करना शामिल है।',
  'Cross-border data sharing with international universities or bodies complies with Section 16 requirements.':
    'अंतर्राष्ट्रीय विश्वविद्यालयों या निकायों के साथ सीमापार डेटा साझाकरण धारा 16 की आवश्यकताओं का पालन करता है।',
  'Our cloud infrastructure (LMS, email, storage) has been assessed for data residency compliance.':
    'हमारे क्लाउड इन्फ्रास्ट्रक्चर (LMS, ईमेल, स्टोरेज) का डेटा अवास्तविकता अनुपालन के लिए आकलन किया गया है।',
  'We have legal mechanisms in place for any necessary cross-border personal data transfers.':
    'किसी भी आवश्यक सीमापार व्यक्तिगत डेटा हस्तांतरण के लिए हमारे पास कानूनी तंत्र मौजूद हैं।',

  // ── HIGHER_ED — Grievance Redressal ──────────────────────────────────────────
  'Our institution has a designated contact point for DPDP-related grievances from students and staff.':
    'हमारी संस्था में छात्रों और कर्मचारियों से DPDP-संबंधी शिकायतों के लिए एक नामित संपर्क बिंदु है।',
  'We have a published and accessible grievance redressal procedure.':
    'हमारे पास एक प्रकाशित और सुलभ शिकायत निवारण प्रक्रिया है।',
  'We resolve data protection grievances within the time periods required by applicable rules.':
    'हम लागू नियमों द्वारा आवश्यक समय अवधि के भीतर डेटा संरक्षण शिकायतों का समाधान करते हैं।',
  'We track and report internally on grievances received and how they were resolved.':
    'हम प्राप्त शिकायतों और उनके समाधान के बारे में आंतरिक रूप से ट्रैक और रिपोर्ट करते हैं।',

  // ── EDTECH — Consent Management ───────────────────────────────────────────────
  'Our platform collects informed consent from users before collecting and processing their personal data.':
    'हमारा प्लेटफ़ॉर्म उनका व्यक्तिगत डेटा एकत्र और संसाधित करने से पहले उपयोगकर्ताओं से सूचित सहमति लेता है।',
  'Consent is granular — users can consent to core features without being forced to consent to optional data uses (analytics, marketing).':
    'सहमति विस्तृत है — उपयोगकर्ता वैकल्पिक डेटा उपयोगों (एनालिटिक्स, मार्केटिंग) के लिए मजबूर किए बिना मुख्य सुविधाओं के लिए सहमति दे सकते हैं।',
  'We have a mechanism to re-obtain consent if our data processing purposes change.':
    'यदि हमारे डेटा प्रसंस्करण उद्देश्य बदलते हैं तो हमारे पास पुनः सहमति प्राप्त करने का तंत्र है।',
  'We maintain timestamped consent records for each user in our system.':
    'हम अपने सिस्टम में प्रत्येक उपयोगकर्ता के लिए समय-मुद्रांकित सहमति रिकॉर्ड बनाए रखते हैं।',
  "Our app's consent flow is prominent, clearly written, and not buried in Terms of Service.":
    'हमारे ऐप का सहमति प्रवाह प्रमुख, स्पष्ट रूप से लिखित है और सेवा की शर्तों में दबा नहीं है।',

  // ── EDTECH — Data Security ────────────────────────────────────────────────────
  'Our platform implements encryption, access controls, and secure APIs appropriate to the sensitivity of the student data we handle.':
    'हमारा प्लेटफ़ॉर्म हमारे द्वारा संभाले जाने वाले छात्र डेटा की संवेदनशीलता के अनुकूल एन्क्रिप्शन, पहुंच नियंत्रण और सुरक्षित APIs लागू करता है।',
  'We follow a secure software development lifecycle (SDLC) including regular security testing before releases.':
    'हम रिलीज से पहले नियमित सुरक्षा परीक्षण सहित एक सुरक्षित सॉफ्टवेयर विकास जीवनचक्र (SDLC) का पालन करते हैं।',
  'We conduct penetration testing at least annually on systems handling personal data.':
    'हम व्यक्तिगत डेटा संभालने वाले सिस्टम पर कम से कम वार्षिक पेनेट्रेशन परीक्षण करते हैं।',
  'All employees and contractors with access to user data have signed confidentiality agreements.':
    'उपयोगकर्ता डेटा तक पहुंच रखने वाले सभी कर्मचारियों और ठेकेदारों ने गोपनीयता समझौतों पर हस्ताक्षर किए हैं।',
  'We have a vulnerability disclosure programme or equivalent mechanism for security researchers.':
    'हमारे पास सुरक्षा शोधकर्ताओं के लिए एक भेद्यता प्रकटीकरण कार्यक्रम या समकक्ष तंत्र है।',

  // ── EDTECH — Vendor / Data Processor Risk ─────────────────────────────────────
  'We have DPAs with all third-party SDKs, analytics tools, and cloud providers that receive user personal data.':
    'उपयोगकर्ता व्यक्तिगत डेटा प्राप्त करने वाले सभी तृतीय पक्ष SDKs, एनालिटिक्स टूल और क्लाउड प्रदाताओं के साथ हमारे DPAs हैं।',
  'We have a review and approval process before any new third-party integrations go live.':
    'किसी भी नए तृतीय पक्ष एकीकरण के लाइव होने से पहले हमारे पास एक समीक्षा और अनुमोदन प्रक्रिया है।',
  'We maintain an up-to-date data map showing which third parties receive which categories of data.':
    'हम एक अद्यतन डेटा मानचित्र बनाए रखते हैं जो दर्शाता है कि कौन से तृतीय पक्ष किस श्रेणी का डेटा प्राप्त करते हैं।',
  'We have assessed whether any third-party tools or SDKs send personal data outside India.':
    'हमने आकलन किया है कि क्या कोई तृतीय पक्ष टूल या SDK व्यक्तिगत डेटा भारत के बाहर भेजता है।',

  // ── EDTECH — Data Retention ───────────────────────────────────────────────────
  'We have a documented data retention policy with defined periods for each data category (user profiles, learning analytics, content logs).':
    'हमारे पास प्रत्येक डेटा श्रेणी (उपयोगकर्ता प्रोफाइल, लर्निंग एनालिटिक्स, सामग्री लॉग) के लिए परिभाषित अवधियों के साथ एक दस्तावेज़ीकृत डेटा प्रतिधारण नीति है।',
  'User accounts and associated data are deleted within a defined period after account closure or deletion request.':
    'खाता बंद होने या हटाने के अनुरोध के बाद एक परिभाषित अवधि के भीतर उपयोगकर्ता खाते और संबंधित डेटा हटा दिए जाते हैं।',
  'We offer users the ability to download and delete their personal data (data portability and erasure).':
    'हम उपयोगकर्ताओं को उनका व्यक्तिगत डेटा डाउनलोड और हटाने की क्षमता प्रदान करते हैं (डेटा पोर्टेबिलिटी और मिटाव)।',
  'We use automated mechanisms (not manual processes) to enforce our data retention schedule.':
    'हम अपने डेटा प्रतिधारण कार्यक्रम को लागू करने के लिए स्वचालित तंत्र (मैनुअल प्रक्रियाएं नहीं) का उपयोग करते हैं।',

  // ── EDTECH — Children's Data ──────────────────────────────────────────────────
  'Our platform has age verification mechanisms and applies enhanced protections for all users under 18.':
    'हमारे प्लेटफ़ॉर्म में आयु सत्यापन तंत्र हैं और 18 वर्ष से कम आयु के सभी उपयोगकर्ताओं के लिए उन्नत सुरक्षा लागू करते हैं।',
  'We do not use student data for behavioural advertising, profiling, or sale to third parties.':
    'हम छात्र डेटा का उपयोग व्यवहार विज्ञापन, प्रोफाइलिंग या तृतीय पक्षों को बिक्री के लिए नहीं करते।',
  'We obtain verifiable parental consent before creating accounts for children and processing their data.':
    'बच्चों के लिए खाते बनाने और उनका डेटा संसाधित करने से पहले हम सत्यापन योग्य माता-पिता की सहमति प्राप्त करते हैं।',
  "Our platform complies with Section 9's prohibition on tracking and monitoring of children.":
    'हमारा प्लेटफ़ॉर्म बच्चों की ट्रैकिंग और निगरानी पर धारा 9 के प्रतिबंध का पालन करता है।',

  // ── EDTECH — Breach Readiness ─────────────────────────────────────────────────
  'We have an incident response plan covering personal data breaches, including roles, timelines, and notification steps.':
    'हमारे पास एक घटना प्रतिक्रिया योजना है जो व्यक्तिगत डेटा उल्लंघनों को कवर करती है, जिसमें भूमिकाएं, समयसीमाएं और अधिसूचना चरण शामिल हैं।',
  'Our engineering team has runbooks for containing and remediating common breach scenarios.':
    'हमारी इंजीनियरिंग टीम के पास सामान्य उल्लंघन परिदृश्यों को नियंत्रित करने और उपचारित करने के लिए रनबुक हैं।',
  'We can detect a data breach in real time or near real time via monitoring and alerting.':
    'हम निगरानी और अलर्टिंग के माध्यम से वास्तविक समय या निकट वास्तविक समय में डेटा उल्लंघन का पता लगा सकते हैं।',
  'We have practiced our breach response plan through a tabletop exercise in the past 12 months.':
    'हमने पिछले 12 महीनों में टेबलटॉप अभ्यास के माध्यम से अपनी उल्लंघन प्रतिक्रिया योजना का अभ्यास किया है।',

  // ── EDTECH — Cross-Border Transfer ────────────────────────────────────────────
  'We have a data residency policy specifying where user personal data is stored and processed.':
    'हमारे पास एक डेटा अवास्तविकता नीति है जो निर्दिष्ट करती है कि उपयोगकर्ता का व्यक्तिगत डेटा कहां संग्रहित और संसाधित किया जाता है।',
  'We have assessed all cloud infrastructure and third-party services for compliance with Section 16 cross-border transfer rules.':
    'हमने सभी क्लाउड इन्फ्रास्ट्रक्चर और तृतीय पक्ष सेवाओं का धारा 16 सीमापार हस्तांतरण नियमों के अनुपालन के लिए आकलन किया है।',
  'Where we transfer data outside India, legal mechanisms (e.g. standard contractual clauses) are in place.':
    'जहां हम भारत के बाहर डेटा स्थानांतरित करते हैं, वहां कानूनी तंत्र (जैसे मानक संविदात्मक खंड) मौजूद हैं।',
  'We proactively disclose to users which countries their data may be transferred to.':
    'हम सक्रिय रूप से उपयोगकर्ताओं को बताते हैं कि उनका डेटा किन देशों में स्थानांतरित किया जा सकता है।',
  'We have validated that our primary cloud provider\'s India region is a permissible jurisdiction under the DPDP Act.':
    'हमने सत्यापित किया है कि हमारे प्राथमिक क्लाउड प्रदाता का भारत क्षेत्र DPDP अधिनियम के तहत एक अनुमेय क्षेत्राधिकार है।',

  // ── EDTECH — Grievance Redressal ──────────────────────────────────────────────
  'Our platform provides a clear, accessible in-app mechanism for users to raise data protection complaints.':
    'हमारा प्लेटफ़ॉर्म उपयोगकर्ताओं के लिए डेटा संरक्षण शिकायतें उठाने हेतु एक स्पष्ट, सुलभ इन-ऐप तंत्र प्रदान करता है।',
  'We have designated a person responsible for handling DPDP grievances.':
    'हमने DPDP शिकायतों को संभालने के लिए एक जिम्मेदार व्यक्ति नियुक्त किया है।',
  'We have defined SLAs for responding to and resolving data protection grievances.':
    'हमने डेटा संरक्षण शिकायतों का जवाब देने और उन्हें हल करने के लिए SLAs परिभाषित किए हैं।',
  'Our grievance redressal contact details are published in our privacy policy.':
    'हमारे शिकायत निवारण संपर्क विवरण हमारी गोपनीयता नीति में प्रकाशित हैं।',
};
