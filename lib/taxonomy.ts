export interface TaxonomyEntry {
  category: string;
  subCategories: string[];
  isFinancial: boolean;
  requiresPlatform: boolean;
}

export const CYBERCRIME_TAXONOMY: TaxonomyEntry[] = [
  {
    category: 'Financial Fraud',
    isFinancial: true,
    requiresPlatform: false,
    subCategories: [
      'UPI / Payment App Fraud',
      'Net Banking Fraud',
      'Debit / Credit Card Fraud',
      'ATM Card Cloning / Skimming',
      'OTP Fraud',
      'Investment / Trading Scam',
      'Job / Employment Fraud',
      'Loan App Fraud',
      'KYC Update Fraud',
      'Fake Customer Care Fraud',
      'Lottery / Prize Fraud',
      'Aadhaar-Enabled Payment Fraud',
      'SIM Swap Fraud',
      'Business Email Compromise',
      'Cryptocurrency Fraud',
    ],
  },
  {
    category: 'Social Media Crime',
    isFinancial: false,
    requiresPlatform: true,
    subCategories: [
      'Cyberbullying / Harassment',
      'Morphed Images / Deepfake',
      'Fake Profile / Impersonation',
      'Online Defamation',
      'Sextortion',
      'Revenge Porn / Non-Consensual Intimate Images',
      'Hate Speech / Communal Content',
      'Fake News / Misinformation',
    ],
  },
  {
    category: 'Cyber Stalking / Threats',
    isFinancial: false,
    requiresPlatform: true,
    subCategories: [
      'Stalking via Social Media',
      'Threatening Messages / Emails',
      'Extortion / Blackmail',
      'Online Grooming',
    ],
  },
  {
    category: 'Hacking / Data Breach',
    isFinancial: false,
    requiresPlatform: false,
    subCategories: [
      'Unauthorized Account Access',
      'Email Hacking',
      'Social Media Account Hacking',
      'Website Defacement',
      'Data Theft / Breach',
      'Ransomware Attack',
    ],
  },
  {
    category: 'Malware / Spyware',
    isFinancial: false,
    requiresPlatform: false,
    subCategories: [
      'Virus / Trojan Attack',
      'Ransomware',
      'Spyware / Stalkerware',
      'Phishing Link / APK',
      'Fake App Installation',
    ],
  },
  {
    category: 'Child Exploitation',
    isFinancial: false,
    requiresPlatform: true,
    subCategories: [
      'Child Pornography / CSAM',
      'Online Child Grooming',
      'Child Trafficking',
    ],
  },
  {
    category: 'E-Commerce Fraud',
    isFinancial: true,
    requiresPlatform: true,
    subCategories: [
      'Online Shopping Fraud',
      'Fake Seller / Buyer Fraud',
      'Parcel / Delivery Scam',
      'Refund Fraud',
    ],
  },
  {
    category: 'Matrimonial / Romance Fraud',
    isFinancial: true,
    requiresPlatform: false,
    subCategories: [
      'Matrimonial Site Fraud',
      'Romance Scam',
      'Honey Trap',
    ],
  },
  {
    category: 'Cyber Terrorism',
    isFinancial: false,
    requiresPlatform: false,
    subCategories: [
      'Propaganda / Radicalization',
      'Critical Infrastructure Attack Threat',
    ],
  },
  {
    category: 'Intellectual Property Crime',
    isFinancial: false,
    requiresPlatform: true,
    subCategories: [
      'Copyright Infringement',
      'Trademark Violation',
      'Piracy',
    ],
  },
  {
    category: 'Other Cyber Crime',
    isFinancial: false,
    requiresPlatform: false,
    subCategories: [
      'Fake Government / Authority Impersonation',
      'Tech Support Scam',
      'Identity Theft',
      'Dark Web Activity',
      'Other',
    ],
  },
];

export const FINANCIAL_CATEGORIES = CYBERCRIME_TAXONOMY.filter((t) => t.isFinancial).map(
  (t) => t.category
);

export const SOCIAL_MEDIA_PLATFORMS = [
  'WhatsApp',
  'Instagram',
  'Facebook',
  'Telegram',
  'Twitter / X',
  'YouTube',
  'Snapchat',
  'LinkedIn',
  'TikTok',
  'ShareChat',
  'Koo',
  'Discord',
  'Reddit',
  'Email',
  'Dating App',
  'Matrimonial Site',
  'E-Commerce Platform',
  'Other',
];

export const MAHARASHTRA_DISTRICTS = [
  'Mumbai City', 'Mumbai Suburban', 'Thane', 'Pune', 'Nashik', 'Nagpur', 'Aurangabad',
  'Solapur', 'Kolhapur', 'Satara', 'Sangli', 'Raigad', 'Ratnagiri', 'Sindhudurg',
  'Dhule', 'Nandurbar', 'Jalgaon', 'Ahmednagar', 'Beed', 'Latur', 'Osmanabad',
  'Nanded', 'Yavatmal', 'Amravati', 'Wardha', 'Akola', 'Washim', 'Buldhana',
  'Chandrapur', 'Gadchiroli', 'Gondia', 'Bhandara',
];

export function getCategoryDetails(categoryName: string): TaxonomyEntry | undefined {
  return CYBERCRIME_TAXONOMY.find((t) => t.category === categoryName);
}

export function isFinancialCategory(categoryName: string): boolean {
  return FINANCIAL_CATEGORIES.includes(categoryName);
}
