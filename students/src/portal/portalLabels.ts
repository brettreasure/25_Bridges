// English/Burmese strings for the student portal (register-page notice,
// claim flow, portal login, dashboard empty state).
//
// Same rule as src/labels.ts: `my` stays empty (nothing renders) until a
// native speaker confirms it — this is instructional copy for a form
// beginners use to set up their own login, not a place to guess.
//
// `myDraft` is a machine-translated starting point ONLY — never rendered.
// To go live: have a native speaker (e.g. Christalin) review `myDraft`,
// then copy the confirmed wording into `my` and flip `status` to
// "confirmed". Nothing else needs to change.

export interface PortalLabel {
  en: string;
  my: string;
  myDraft: string;
  status: "confirmed" | "placeholder";
}

export const portalLabels = {
  returningNoticeHeading: {
    en: "Already attended a 25 Bridges class before?",
    my: "",
    myDraft: "25 Bridges အတန်းတက်ဖူးပါသလား?",
    status: "placeholder",
  },
  returningNoticeBody: {
    en: "Don't register again, just claim your account.",
    my: "",
    myDraft: "ထပ်မံမှတ်ပုံမတင်ပါနှင့်၊ သင့်အကောင့်ကိုသာ ရယူပါ။",
    status: "placeholder",
  },
  claimIntro: {
    en: "Find your name, then set up a password and add your details.",
    my: "",
    myDraft: "သင့်အမည်ကိုရှာပါ၊ ထို့နောက် စကားဝှက်သတ်မှတ်ပြီး အသေးစိတ်အချက်အလက်များထည့်ပါ။",
    status: "placeholder",
  },
  claimNameLabel: {
    en: "Your name",
    my: "",
    myDraft: "သင့်အမည်",
    status: "placeholder",
  },
  claimNameSearchPlaceholder: {
    en: "Start typing your name...",
    my: "",
    myDraft: "သင့်အမည်ကို စတင်ရိုက်ထည့်ပါ...",
    status: "placeholder",
  },
  claimNoMatch: {
    en: "No match found — check the spelling, or ask an admin for help.",
    my: "",
    myDraft: "ရလဒ်မတွေ့ပါ — စာလုံးပေါင်းစစ်ကြည့်ပါ၊ သို့မဟုတ် အက်ဒမင်ကို အကူအညီတောင်းပါ။",
    status: "placeholder",
  },
  claimNotYou: {
    en: "(not you?)",
    my: "",
    myDraft: "(မင်းမဟုတ်ဘူးလား?)",
    status: "placeholder",
  },
  claimOwnEmailButton: {
    en: "I have my own email",
    my: "",
    myDraft: "ကိုယ်ပိုင်အီးမေးလ်ရှိပါတယ်",
    status: "placeholder",
  },
  claimSharedEmailButton: {
    en: "I share an email with another student",
    my: "",
    myDraft: "တခြားကျောင်းသားနဲ့ အီးမေးလ်တွဲသုံးပါတယ်",
    status: "placeholder",
  },
  claimOwnEmailLabel: {
    en: "Your email address",
    my: "",
    myDraft: "သင့်အီးမေးလ်လိပ်စာ",
    status: "placeholder",
  },
  claimSharedEmailLabel: {
    en: "The shared email address",
    my: "",
    myDraft: "တွဲသုံးသည့် အီးမေးလ်လိပ်စာ",
    status: "placeholder",
  },
  claimSharedEmailHint: {
    en: "Enter the email you already share with another student. If there is no password yet, make one now.",
    my: "",
    myDraft: "တခြားကျောင်းသားနဲ့ တွဲသုံးနေတဲ့ အီးမေးလ်ကို ထည့်ပါ။ စကားဝှက်မရှိသေးရင် အခုပဲသတ်မှတ်ပါ။",
    status: "placeholder",
  },
  claimChangeAnswer: {
    en: "Change answer",
    my: "",
    myDraft: "အဖြေပြောင်းရန်",
    status: "placeholder",
  },
  claimMismatchWarning: {
    en: "There's already a password. Enter it or use a different email.",
    my: "",
    myDraft: "စကားဝှက်ရှိပြီးသားပါ။ ၎င်းကိုရိုက်ထည့်ပါ သို့မဟုတ် တခြားအီးမေးလ်သုံးပါ။",
    status: "placeholder",
  },
  claimFirstToShare: {
    en: "Nobody's set a password for this email yet — you'll be the first. Share the password you choose with whoever else uses this email.",
    my: "",
    myDraft:
      "ဒီအီးမေးလ်အတွက် ဘယ်သူမှ စကားဝှက်မသတ်မှတ်ရသေးပါဘူး — သင်ကပထမဆုံးလူပါ။ ဒီအီးမေးလ်ကို တွဲသုံးမည့်သူနှင့် သင်ရွေးချယ်သောစကားဝှက်ကို မျှဝေပါ။",
    status: "placeholder",
  },
  claimExistingPasswordLabel: {
    en: "Enter the password already set for this email",
    my: "",
    myDraft: "ဒီအီးမေးလ်အတွက် သတ်မှတ်ပြီးသားစကားဝှက်ကို ထည့်ပါ",
    status: "placeholder",
  },
  claimCreatePasswordLabel: {
    en: "Create a password",
    my: "",
    myDraft: "စကားဝှက်သတ်မှတ်ပါ",
    status: "placeholder",
  },
  claimPasswordRuleHint: {
    en: 'Use a word you like (6+ letters) followed by your favorite 4-digit number — e.g. "sunshine4821".',
    my: "",
    myDraft:
      'သင်ကြိုက်တဲ့ စကားလုံး (အက္ခရာ ၆ လုံးနှင့်အထက်) နောက်မှာ သင်အကြိုက်ဆုံးဂဏန်း ၄ လုံးကို ပေါင်းရိုက်ပါ — ဥပမာ "sunshine4821"။',
    status: "placeholder",
  },
  claimContinueButton: {
    en: "Continue with this email",
    my: "",
    myDraft: "ဒီအီးမေးလ်နဲ့ ဆက်လုပ်ပါ",
    status: "placeholder",
  },
  claimCreateLoginButton: {
    en: "Create my login",
    my: "",
    myDraft: "အကောင့်ဝင်ရန်ကို ဖန်တီးပါ",
    status: "placeholder",
  },
  portalTitle: {
    en: "25 Bridges Student Portal",
    my: "",
    myDraft: "25 Bridges ကျောင်းသားပေါ်တယ်",
    status: "placeholder",
  },
  loginEmailLabel: {
    en: "Email",
    my: "",
    myDraft: "အီးမေးလ်",
    status: "placeholder",
  },
  loginPasswordLabel: {
    en: "Password",
    my: "",
    myDraft: "စကားဝှက်",
    status: "placeholder",
  },
  loginSignInButton: {
    en: "Sign in",
    my: "",
    myDraft: "အကောင့်ဝင်ပါ",
    status: "placeholder",
  },
  portalNoLoginYet: {
    en: "Haven't set up your login yet?",
    my: "",
    myDraft: "အကောင့်ဝင်ရန် မသတ်မှတ်ရသေးဘူးလား?",
    status: "placeholder",
  },
  portalClaimLink: {
    en: "Claim your account",
    my: "",
    myDraft: "သင့်အကောင့်ကို ရယူပါ",
    status: "placeholder",
  },
  dashboardEmpty: {
    en: "No student records are linked to this email yet. If that's unexpected, ask an admin for help.",
    my: "",
    myDraft: "ဒီအီးမေးလ်နှင့် ချိတ်ဆက်ထားသော ကျောင်းသားမှတ်တမ်း မရှိသေးပါ။ မမျှော်လင့်ထားပါက အက်ဒမင်ကို အကူအညီတောင်းပါ။",
    status: "placeholder",
  },
} as const satisfies Record<string, PortalLabel>;

export type PortalLabelKey = keyof typeof portalLabels;
