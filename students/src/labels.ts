// English/Burmese field labels for the public registration form.
//
// `status: "confirmed"` labels were supplied directly by Bret.
// `status: "placeholder"` labels are NOT yet verified by a native speaker —
// they're kept empty (falling back to English-only display) rather than
// guessed, per the project's rule against shipping unverified translations
// to a form beginners fill in themselves. Fill in `my` once verified.

export interface FieldLabel {
  en: string;
  my: string; // Burmese (Myanmar script)
  hintEn: string;
  status: "confirmed" | "placeholder";
}

export const labels = {
  name: {
    en: "Name",
    my: "အမည်",
    hintEn: "Your full name",
    status: "confirmed",
  },
  nameBurmese: {
    en: "Your name in Burmese",
    my: "ဗမာအမည်",
    hintEn: "Write it the way you'd spell it in Burmese",
    status: "confirmed",
  },
  nickname: {
    en: "English nickname (optional)",
    my: "အင်္ဂလိပ်အမည်ပြောင်",
    hintEn: "A short name your teachers can call you — must be different from everyone else's",
    status: "confirmed",
  },
  email: {
    en: "Email (optional)",
    my: "အီးမေးလ်",
    hintEn: "Only if you have one",
    status: "confirmed",
  },
  camp: {
    en: "Camp (optional)",
    my: "ဒုက္ခသည်စခန်း",
    hintEn: "The camp you live in, if any",
    status: "confirmed",
  },
  town: {
    en: "Town",
    my: "မြို့",
    hintEn: "Where you live now",
    status: "confirmed",
  },
  region: {
    en: "Region",
    my: "ဒေသ",
    hintEn: "State or region, if you know it",
    status: "confirmed",
  },
  country: {
    en: "Country",
    my: "နိုင်ငံ",
    hintEn: "Where you live now",
    status: "confirmed",
  },
  birthdate: {
    en: "Date of birth (optional)",
    my: "မွေးနေ့",
    hintEn: "If you know it",
    status: "confirmed",
  },
  ambition: {
    en: "What do you want to be? (optional)",
    my: "ရည်မှန်းချက်",
    hintEn: "Your dream job or goal",
    status: "confirmed",
  },
  school: {
    en: "School (optional)",
    my: "ကျောင်း",
    hintEn: "Name of your school, if you go to one",
    status: "confirmed",
  },
  interests: {
    en: "Other interests (optional)",
    my: "စိတ်ဝင်စားမှုများ",
    hintEn: "Things you enjoy — sport, music, art...",
    status: "confirmed",
  },
  submit: {
    en: "Submit",
    my: "တင်သွင်းရန်",
    hintEn: "",
    status: "confirmed",
  },
} as const satisfies Record<string, FieldLabel>;

export type LabelKey = keyof typeof labels;
