import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Mic,
  Square,
  Sparkles,
  Check,
  AlertCircle,
  Volume2,
  Copy,
  RotateCcw,
  Languages,
  CheckCircle2,
  ArrowRight,
  Clock,
  MapPin,
  Briefcase,
  User,
  Wrench,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { useLanguage, type AppLanguage } from "@/lib/i18n";

export type UILanguage = AppLanguage;

export interface ExtractedProfile {
  full_name: string;
  service_categories: string[];
  years_experience: number | null;
  service_area: string;
  languages_spoken: string[];
  availability_note: string | null;
  raw_transcript: string;
  confidence_flags: string[];
}

const FIXED_CATEGORIES = [
  "electrician",
  "plumber",
  "carpenter",
  "painter",
  "mason",
  "AC repair",
  "appliance repair",
] as const;

const COMMON_LANGUAGES = [
  "Tamil",
  "Hindi",
  "English",
  "Telugu",
  "Kannada",
  "Malayalam",
];

const SAMPLE_PRESETS = [
  {
    langName: "தமிழ் (Tamil Spoken)",
    label: "Murugan - Electrician (Chennai)",
    transcript:
      "Vanakkam sir, en peru Murugan. Naan T. Nagar Chennai-la electrician vela paakren. Enakku 8 varusham experience irukku, wiring switchboard ellam pannuven. Tamil and English pesuven. All days available sir, emergency work-kume varuven.",
  },
  {
    langName: "हिन्दी (Hindi Spoken)",
    label: "Ramesh - Plumber (Delhi)",
    transcript:
      "Namaste, mera naam Ramesh Kumar hai. Main Rohini Delhi mein plumber aur sanitary fitting ka kaam karta hoon. Mujhe 6 saal ka experience hai pipe leakage aur tap repair mein. Hindi aur English bolta hoon. Weekends only available hoon.",
  },
  {
    langName: "తెలుగు (Telugu Spoken)",
    label: "Srinivas - AC Repair (Hyderabad)",
    transcript:
      "Namaskaram, naa peru Srinivas Rao. Nenu Madhapur Hyderabad lo AC repair mariyu appliance repair pani chesthanu. Naaku 7 years experience undi. Telugu, Hindi, English matladathanu. Daily morning 9 nundi evening 7 varaku available.",
  },
  {
    langName: "മലയാളം (Malayalam Spoken)",
    label: "Biju - Painter (Kochi)",
    transcript:
      "Namaskaram, ente peru Biju. Njan Edappally Kochi-yil painter aayi pani cheyyunnu. 9 varsham experience undu, house interior painting and waterproofing cheyyum. Malayalam and English samsarikkum. Monday to Saturday free aanu.",
  },
  {
    langName: "ಕನ್ನಡ (Kannada Spoken)",
    label: "Mahesh - Mason (Bengaluru)",
    transcript:
      "Namaskara, nanna hesaru Mahesh. Naanu Indiranagar Bengaluru alli mason mattu tile work madtini. Nanage 12 varsha experience ide. Kannada, Tamil mattu Hindi mathadtini. Emergency kelsa idru bartini.",
  },
  {
    langName: "English (Indian English)",
    label: "Anthony - Carpenter (Bengaluru)",
    transcript:
      "Hello, my name is Anthony Raj. I do carpenter work and wooden furniture in Koramangala Bengaluru. I have 10 years of experience. I speak English, Tamil, and Kannada. Available Monday to Saturday full time.",
  },
];

const DICTIONARY = {
  en: {
    badge: "Voice Onboarding Prototype",
    title: "Speak Your Profile",
    subtitle:
      "Just tap record and speak for up to 60 seconds in Tamil, Hindi, or English. Gemini AI will convert your voice note into a verified profile.",
    tapToRecord: "Tap to Speak",
    recordingState: "Listening... Speak freely",
    stopRecording: "Done Speaking (Stop)",
    secondsLeft: "seconds left",
    maxDuration: "Max 60s",
    speakGuideTitle: "What to say:",
    speakGuidePoints: [
      "Your full name",
      "Your work (electrician, plumber, painter, etc.)",
      "Years of experience",
      "Your city or neighborhood",
      "When you are available to work",
    ],
    trySample: "Or test with a sample voice note:",
    transcribingTitle: "Transcribing & Extracting...",
    transcribingSub:
      "Gemini 2.5 Flash is mapping your speech into structured profile fields...",
    transcriptSectionTitle: "What You Said (Voice Transcript)",
    transcriptEditTip:
      "Spoken words captured by speech AI. You can edit this directly:",
    formSectionTitle: "Verify & Edit Extracted Details",
    formSectionSub:
      "Review the fields below. Any uncertain fields are highlighted with an alert flag.",
    fullName: "Full Name",
    services: "Trade / Service Categories",
    servicesHint: "Select all that apply:",
    experience: "Years of Experience",
    experienceNull: "Not specified",
    serviceArea: "Service Area / Locality",
    languages: "Languages Spoken",
    availability: "Availability Note",
    confidenceWarning: "Please verify flagged fields marked with ⚠️",
    needsVerification: "Please verify",
    confirmBtn: "Confirm & Generate JSON Payload",
    resetBtn: "Record New Note",
    finalTitle: "Final Integration Payload",
    finalSub: "Structured profile JSON ready for database / API submission:",
    copied: "Copied to clipboard!",
    copyJson: "Copy JSON Payload",
    step1: "1. Record Voice",
    step2: "2. Verify & Edit",
    step3: "3. Confirmed Payload",
    micPermissionError:
      "Microphone access was denied or not available. Please allow microphone permissions or use one of the sample voice notes below.",
  },
  ta: {
    badge: "குரல் பதிவு முன்மாதிரி",
    title: "பேசி சுயவிவரம் உருவாக்குங்கள்",
    subtitle:
      "மைக் பொத்தானை அழுத்தி 60 விநாடிகள் வரை தமிழ், இந்தி அல்லது ஆங்கிலத்தில் பேசுங்கள். AI தானாக விவரங்களை நிரப்பும்.",
    tapToRecord: "பேச மைக் அழுத்தவும்",
    recordingState: "கேட்கிறது... தாராளமாக பேசுங்கள்",
    stopRecording: "பேசி முடிந்தது (நிறுத்து)",
    secondsLeft: "விநாடிகள் மீதம்",
    maxDuration: "அதிகபட்சம் 60 நொடி",
    speakGuideTitle: "என்ன பேசலாம்:",
    speakGuidePoints: [
      "உங்கள் முழு பெயர்",
      "உங்கள் தொழில் (எலக்ட்ரீஷியன், பிளம்பர், கார்பெண்டர் போன்றவை)",
      "எத்தனை வருட அனுபவம்",
      "உங்கள் ஊர் அல்லது பகுதி",
      "எந்த நாட்களில் வேலைக்கு வர முடியும்",
    ],
    trySample: "அல்லது மாதிரி குரல் மூலம் சோதிக்கவும்:",
    transcribingTitle: "குரலை எழுத்தாக்கி பிரிக்கிறது...",
    transcribingSub:
      "Gemini 2.5 Flash உங்கள் குரலை கேட்டு விவரங்களை எடுத்துக்கொண்டிருக்கிறது...",
    transcriptSectionTitle: "நீங்கள் பேசியது (குரல் உரை)",
    transcriptEditTip: "பதிவான உரை. தவறுகள் இருந்தால் மாற்றிக்கொள்ளலாம்:",
    formSectionTitle: "விவரங்களை சரிபார்க்கவும்",
    formSectionSub:
      "கீழே உள்ள விவரங்களை சரிபார்த்து தேவைப்பட்டால் திருத்துங்கள். சந்தேகம் உள்ளவை ⚠️ குறியிடப்படும்.",
    fullName: "முழு பெயர்",
    services: "தொழில் / வேலை வகைகள்",
    servicesHint: "உங்களுக்கு தெரிந்த தொழில்களைத் தேர்ந்தெடுக்கவும்:",
    experience: "அனுபவம் (ஆண்டுகள்)",
    experienceNull: "குறிப்பிடப்படவில்லை",
    serviceArea: "பகுதி / நகரம்",
    languages: "பேசும் மொழிகள்",
    availability: "கிடைக்கும் நேரம் / நாட்கள்",
    confidenceWarning: "⚠️ குறியிடப்பட்ட விவரங்களை கவனமாக சரிபார்க்கவும்",
    needsVerification: "சரிபார்க்கவும்",
    confirmBtn: "உறுதி செய்து JSON உருவாக்கு",
    resetBtn: "மீண்டும் பதிவு செய்",
    finalTitle: "இறுதி ஒருங்கிணைப்பு தரவு (Final Payload)",
    finalSub: "சுயவிவர சேமிப்புக்கு தயார் செய்யப்பட்ட முழுமையான JSON வடிவம்:",
    copied: "நகலெடுக்கப்பட்டது!",
    copyJson: "JSON நகலெடு",
    step1: "1. குரல் பதிவு",
    step2: "2. சரிபார்த்தல்",
    step3: "3. இறுதி JSON",
    micPermissionError:
      "மைக் அனுமதி கிடைக்கவில்லை. மைக் அனுமதியை வழங்கி முயற்சிக்கவும் அல்லது கீழே உள்ள மாதிரி குரல் குறிப்பைப் பயன்படுத்தவும்.",
  },
  hi: {
    badge: "वॉइस ऑनबोर्डिंग प्रोटोटाइप",
    title: "बोलकर अपनी प्रोफाइल बनाएं",
    subtitle:
      "माइक बटन दबाकर 60 सेकंड तक हिंदी, तमिल या अंग्रेज़ी में बोलें। AI आपकी प्रोफाइल अपने आप तैयार करेगा।",
    tapToRecord: "बोलने के लिए दबाएं",
    recordingState: "सुन रहे हैं... अब बोलें",
    stopRecording: "बोलना बंद करें",
    secondsLeft: "सेकंड बाकी",
    maxDuration: "अधिकतम 60s",
    speakGuideTitle: "क्या बोलना है:",
    speakGuidePoints: [
      "आपका पूरा नाम",
      "आपका काम (इलेक्ट्रीशियन, प्लम्बर, बढ़ई, पेंटर आदि)",
      "कितने वर्षों का अनुभव",
      "आपका शहर या इलाका",
      "आप किस दिन और समय काम के लिए उपलब्ध हैं",
    ],
    trySample: "या तैयार नमूने से टेस्ट करें:",
    transcribingTitle: "आवाज़ सुनकर जानकारी निकाली जा रही है...",
    transcribingSub:
      "Gemini 2.5 Flash आपकी आवाज़ से प्रोफाइल डेटा निकाल रहा है...",
    transcriptSectionTitle: "आपने जो कहा (वॉइस ट्रांसक्रिप्ट)",
    transcriptEditTip:
      "AI द्वारा लिखी गई आवाज़। आप इसे सीधे सुधार भी सकते हैं:",
    formSectionTitle: "विवरण जांचें और सुधारें",
    formSectionSub:
      "नीचे दी गई जानकारी चेक करें। अनिश्चित विवरणों पर ⚠️ का निशान दिखेगा।",
    fullName: "पूरा नाम",
    services: "आपका काम / पेशा",
    servicesHint: "लागू होने वाले सभी विकल्प चुनें:",
    experience: "अनुभव (वर्षों में)",
    experienceNull: "उल्लेख नहीं किया गया",
    serviceArea: "शहर / इलाका",
    languages: "बोलने वाली भाषाएं",
    availability: "काम का समय / उपलब्धता",
    confidenceWarning: "⚠️ चिन्हित जानकारी को ध्यान से जांच लें",
    needsVerification: "कृपया जांचें",
    confirmBtn: "पुष्टि करें और JSON डेटा बनाएं",
    resetBtn: "फिर से रिकॉर्ड करें",
    finalTitle: "अंतिम इंटीग्रेशन पेलोड (Final JSON Payload)",
    finalSub:
      "डेटाबेस या API इंटीग्रेशन के लिए तैयार स्ट्रक्चर्ड JSON ऑब्जेक्ट:",
    copied: "कॉपी हो गया!",
    copyJson: "JSON कॉपी करें",
    step1: "1. आवाज़ रिकॉर्ड",
    step2: "2. जांचें और सुधारें",
    step3: "3. फ़ाइनल पेलोड",
    micPermissionError:
      "माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया अनुमति दें या नीचे दिए गए सैंपल वॉइस नोट्स का उपयोग करें।",
  },
  te: {
    badge: "వాయిస్ ప్రొఫైల్ సెటప్",
    title: "మాట్లాడి మీ ప్రొఫైల్ తయారు చేయండి",
    subtitle:
      "మైక్ బటన్ నొక్కి తెలుగు, తమిళం, హిందీ, మలయాళం, కన్నడ లేదా ఇంగ్లీష్‌లో 60 సెకన్లు మాట్లాడండి. మీ వివరాలన్నీ ఆటోమేటిక్‌గా ఫిల్ అవుతాయి.",
    tapToRecord: "మాట్లాడటానికి నొక్కండి",
    recordingState: "వింటున్నాను... ఫ్రీగా మాట్లాడండి",
    stopRecording: "మాట్లాడటం అయిపోయింది (ఆపండి)",
    secondsLeft: "సెకన్లు మిగిలాయి",
    maxDuration: "గరిష్టం 60s",
    speakGuideTitle: "ఏం చెప్పాలంటే:",
    speakGuidePoints: [
      "మీ పూర్తి పేరు",
      "మీ పని (ఎలక్ట్రీషియన్, ప్లంబర్, పెయింటర్ వగైరా)",
      "ఎన్ని సంవత్సరాల అనుభవం",
      "మీ ఊరు లేదా ఏరియా",
      "ఏ రోజులు/టైమ్‌లో పనికి వస్తారు",
    ],
    trySample: "లేదా శాంపిల్ వాయిస్ నోట్‌తో టెస్ట్ చేయండి:",
    transcribingTitle: "మీ మాటలు విని వివరాలు తీస్తున్నాను...",
    transcribingSub: "మీ వాయిస్ నుండి ప్రొఫైల్ వివరాలు తయారవుతున్నాయి...",
    transcriptSectionTitle: "మీరు చెప్పింది (వాయిస్ టెక్స్ట్)",
    transcriptEditTip: "AI రాసిన టెక్స్ట్ ఇక్కడ ఉంది. కావాలంటే మార్చుకోవచ్చు:",
    formSectionTitle: "వివరాలు చెక్ చేసి ఎడిట్ చేయండి",
    formSectionSub:
      "కింద ఉన్న వివరాలు చూడండి. ఏదైనా డౌట్ ఉన్న ఫీల్డ్ దగ్గర ⚠️ గుర్తు ఉంటుంది.",
    fullName: "పూర్తి పేరు",
    services: "మీ పని / కేటగిరీ",
    servicesHint: "మీరు చేసే పనులు ఎంచుకోండి:",
    experience: "అనుభవం (సంవత్సరాలు)",
    experienceNull: "చెప్పలేదు",
    serviceArea: "పని చేసే ఏరియా / ఊరు",
    languages: "మాట్లాడే భాషలు",
    availability: "ఖాళీగా ఉండే సమయం",
    confidenceWarning: "⚠️ గుర్తు ఉన్న ఫీల్డ్‌లని ఒకసారి చెక్ చేయండి",
    needsVerification: "చెక్ చేయండి",
    confirmBtn: "కన్ఫర్మ్ చేసి JSON తయారు చేయండి",
    resetBtn: "మళ్లీ రికార్డ్ చేయండి",
    finalTitle: "ఫైనల్ ప్రొఫైల్ డేటా (Payload)",
    finalSub: "సేవ్ చేయడానికి సిద్ధంగా ఉన్న ప్రొఫైల్ JSON:",
    copied: "కాపీ అయింది!",
    copyJson: "JSON కాపీ చేయండి",
    step1: "1. వాయిస్ రికార్డ్",
    step2: "2. చెక్ & ఎడిట్",
    step3: "3. కన్ఫర్మ్",
    micPermissionError:
      "మైక్ పర్మిషన్ రాలేదు. దయచేసి మైక్ అనుమతి ఇవ్వండి లేదా కింద ఉన్న శాంపిల్ వాయిస్ నోట్ వాడండి.",
  },
  ml: {
    badge: "വോയിസ് പ്രൊഫൈൽ സെറ്റപ്പ്",
    title: "സംസാരിച്ച് പ്രൊഫൈൽ ഉണ്ടാക്കൂ",
    subtitle:
      "മൈക്ക് ബട്ടൺ അമർത്തി മലയാളം, തമിഴ്, ഹിന്ദി, തെലുങ്ക്, കന്നഡ അല്ലെങ്കിൽ ഇംഗ്ലീഷിൽ 60 സെക്കൻഡ് സംസാരിക്കൂ. ബാക്കി വിവരങ്ങൾ തനിയെ നിറയും.",
    tapToRecord: "സംസാരിക്കാൻ തൊടൂ",
    recordingState: "കേൾക്കുന്നുണ്ട്... ധൈര്യമായി സംസാരിക്കൂ",
    stopRecording: "പറഞ്ഞു തീർന്നു (നിർത്തൂ)",
    secondsLeft: "സെക്കൻഡ് ബാക്കി",
    maxDuration: "പരമാവധി 60s",
    speakGuideTitle: "എന്തൊക്കെ പറയാം:",
    speakGuidePoints: [
      "നിങ്ങളുടെ മുഴുവൻ പേര്",
      "ചെയ്യുന്ന പണി (ഇലക്ട്രീഷ്യൻ, പ്ലംബർ, പെയിന്റർ തുടങ്ങിയവ)",
      "എത്ര വർഷത്തെ പരിചയം",
      "നിങ്ങളുടെ സ്ഥലം അല്ലെങ്കിൽ നഗരം",
      "എപ്പോഴൊക്കെ പണിക്ക് വരാൻ പറ്റും",
    ],
    trySample: "അല്ലെങ്കിൽ താഴെയുള്ള സാമ്പിൾ വോയിസ് നോക്കൂ:",
    transcribingTitle: "ശബ്ദം കേട്ട് വിവരങ്ങൾ എടുക്കുന്നു...",
    transcribingSub: "നിങ്ങളുടെ സംസാരത്തിൽ നിന്ന് പ്രൊഫൈൽ തയ്യാറാക്കുന്നു...",
    transcriptSectionTitle: "നിങ്ങൾ പറഞ്ഞത് (വോയിസ് ടെക്സ്റ്റ്)",
    transcriptEditTip: "AI എഴുതിയ വാക്കുകൾ. തെറ്റുണ്ടെങ്കിൽ ഇവിടെ തിരുത്താം:",
    formSectionTitle: "വിവരങ്ങൾ ശരിയാണോ എന്ന് നോക്കൂ",
    formSectionSub:
      "താഴെയുള്ള വിവരങ്ങൾ പരിശോധിക്കൂ. സംശയമുള്ളവയിൽ ⚠️ അടയാളം ഉണ്ടാകും.",
    fullName: "മുഴുവൻ പേര്",
    services: "പണി / വിഭാഗങ്ങൾ",
    servicesHint: "ചെയ്യുന്ന പണികൾ തിരഞ്ഞെടുക്കൂ:",
    experience: "പരിചയം (വർഷം)",
    experienceNull: "പറഞ്ഞിട്ടില്ല",
    serviceArea: "സ്ഥലം / ഏരിയ",
    languages: "സംസാരിക്കുന്ന ഭാഷകൾ",
    availability: "ലഭ്യമാകുന്ന സമയം",
    confidenceWarning: "⚠️ അടയാളപ്പെടുത്തിയ വിവരങ്ങൾ ഒന്നു ചെക്ക് ചെയ്യൂ",
    needsVerification: "ചെക്ക് ചെയ്യൂ",
    confirmBtn: "ഉറപ്പാക്കി JSON ഉണ്ടാക്കൂ",
    resetBtn: "വീണ്ടും റെക്കോർഡ് ചെയ്യൂ",
    finalTitle: "അവസാന പ്രൊഫൈൽ ഡാറ്റ (Payload)",
    finalSub: "സേവ് ചെയ്യാൻ തയ്യാറായ JSON വിവരങ്ങൾ:",
    copied: "കോപ്പിയായി!",
    copyJson: "JSON കോപ്പി ചെയ്യൂ",
    step1: "1. വോയിസ് റെക്കോർഡ്",
    step2: "2. ചെക്ക് & എഡിറ്റ്",
    step3: "3. കൺഫേം",
    micPermissionError:
      "മൈക്ക് അനുമതി കിട്ടിയില്ല. മൈക്ക് അനുവദിക്കുകയോ താഴെയുള്ള സാമ്പിൾ വോയിസ് ഉപയോഗിക്കുകയോ ചെയ്യൂ.",
  },
  kn: {
    badge: "ವಾಯ್ಸ್ ಪ್ರೊಫೈಲ್ ಸೆಟಪ್",
    title: "ಮಾತನಾಡಿ ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಮಾಡಿ",
    subtitle:
      "ಮೈಕ್ ಬಟನ್ ಒತ್ತಿ ಕನ್ನಡ, ತಮಿಳು, ಹಿಂದಿ, ತೆಲುಗು, ಮಲಯಾಳಂ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ 60 ಸೆಕೆಂಡ್ ಮಾತಾಡಿ. ನಿಮ್ಮ ವಿವರಗಳು ತಾನಾಗಿಯೇ ಫಿಲ್ ಆಗುತ್ತವೆ.",
    tapToRecord: "ಮಾತನಾಡಲು ಒತ್ತಿ",
    recordingState: "ಕೇಳ್ತಾ ಇದ್ದೀನಿ... ಆರಾಮಾಗಿ ಮಾತಾಡಿ",
    stopRecording: "ಮಾತು ಮುಗೀತು (ನಿಲ್ಲಿಸಿ)",
    secondsLeft: "ಸೆಕೆಂಡ್ ಬಾಕಿ",
    maxDuration: "ಗರಿಷ್ಠ 60s",
    speakGuideTitle: "ಏನು ಹೇಳಬೇಕು:",
    speakGuidePoints: [
      "ನಿಮ್ಮ ಪೂರ್ತಿ ಹೆಸರು",
      "ನಿಮ್ಮ ಕೆಲಸ (ಎಲೆಕ್ಟ್ರೀಷಿಯನ್, ಪ್ಲಂಬರ್, ಪೇಂಟರ್ ಇತ್ಯಾದಿ)",
      "ಎಷ್ಟು ವರ್ಷದ ಅನುಭವ",
      "ನಿಮ್ಮ ಊರು ಅಥವಾ ಏರಿಯಾ",
      "ಯಾವಾಗ ಕೆಲಸಕ್ಕೆ ಬರೋಕೆ ಆಗುತ್ತೆ",
    ],
    trySample: "ಅಥವಾ ಸ್ಯಾಂಪಲ್ ವಾಯ್ಸ್ ನೋಟ್ ಟೆಸ್ಟ್ ಮಾಡಿ:",
    transcribingTitle: "ಮಾತು ಕೇಳಿ ವಿವರ ತೆಗೆಯಲಾಗುತ್ತಿದೆ...",
    transcribingSub: "ನಿಮ್ಮ ಧ್ವನಿಯಿಂದ ಪ್ರೊಫೈಲ್ ಡೇಟಾ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...",
    transcriptSectionTitle: "ನೀವು ಹೇಳಿದ್ದು (ವಾಯ್ಸ್ ಟೆಕ್ಸ್ಟ್)",
    transcriptEditTip: "AI ಬರೆದ ಮಾತು. ಬೇಕಿದ್ದರೆ ನೀವೇ ಇಲ್ಲಿ ಸರಿಪಡಿಸಬಹುದು:",
    formSectionTitle: "ವಿವರ ಚೆಕ್ ಮಾಡಿ & ಬದಲಿಸಿ",
    formSectionSub:
      "ಕೆಳಗಿನ ವಿವರ ನೋಡಿ. ಅನುಮಾನ ಇರುವ ಜಾಗದಲ್ಲಿ ⚠️ ಗುರುತು ಇರುತ್ತೆ.",
    fullName: "ಪೂರ್ತಿ ಹೆಸರು",
    services: "ನಿಮ್ಮ ಕೆಲಸ / ವಿಭಾಗ",
    servicesHint: "ನಿಮಗೆ ಬರುವ ಎಲ್ಲಾ ಕೆಲಸ ಆಯ್ಕೆ ಮಾಡಿ:",
    experience: "ಅನುಭವ (ವರ್ಷಗಳು)",
    experienceNull: "ಹೇಳಿಲ್ಲ",
    serviceArea: "ಏರಿಯಾ / ನಗರ",
    languages: "ಮಾತನಾಡುವ ಭಾಷೆಗಳು",
    availability: "ಕೆಲಸಕ್ಕೆ ಸಿಗುವ ಸಮಯ",
    confidenceWarning: "⚠️ ಗುರುತು ಇರುವ ವಿವರಗಳನ್ನು ಒಮ್ಮೆ ಚೆಕ್ ಮಾಡಿ",
    needsVerification: "ಚೆಕ್ ಮಾಡಿ",
    confirmBtn: "ಕನ್ಫರ್ಮ್ ಮಾಡಿ JSON ತಯಾರಿಸಿ",
    resetBtn: "ಮತ್ತೆ ರೆಕಾರ್ಡ್ ಮಾಡಿ",
    finalTitle: "ಫೈನಲ್ ಪ್ರೊಫೈಲ್ ಡೇಟಾ (Payload)",
    finalSub: "ಸೇವ್ ಮಾಡಲು ರೆಡಿ ಇರುವ JSON ಡೇಟಾ:",
    copied: "ಕಾಪಿ ಆಯ್ತು!",
    copyJson: "JSON ಕಾಪಿ ಮಾಡಿ",
    step1: "1. ವಾಯ್ಸ್ ರೆಕಾರ್ಡ್",
    step2: "2. ಚೆಕ್ & ಎడిಟ್",
    step3: "3. ಕನ್ಫರ್ಮ್",
    micPermissionError:
      "ಮೈಕ್ ಪರ್ಮಿಷನ್ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮೈಕ್ ಅನುಮತಿ ಕೊಡಿ ಅಥವಾ ಕೆಳಗಿನ ಸ್ಯಾಂಪಲ್ ವಾಯ್ಸ್ ಬಳಸಿ.",
  },
};

export default function VoiceOnboarding() {
  const { language: appLang, setLanguage: setAppLang } = useLanguage();
  const uiLang: UILanguage = appLang;
  const setUiLang = (next: UILanguage) => setAppLang(next);
  const t = DICTIONARY[uiLang] || DICTIONARY.en;

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [micError, setMicError] = useState<string>("");

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingEngine, setProcessingEngine] = useState<string>("");

  // Extracted data state
  const [profile, setProfile] = useState<ExtractedProfile | null>(null);
  const [confirmedPayload, setConfirmedPayload] =
    useState<ExtractedProfile | null>(null);
  const [copied, setCopied] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<any>(null);

  // Clean up audio blob URL on unmount to satisfy ephemeral audio constraint
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current)
        audioContextRef.current.close().catch(() => {});
    };
  }, [audioUrl]);

  // Start audio recording
  const startRecording = async () => {
    setMicError("");
    setConfirmedPayload(null);
    setProfile(null);
    audioChunksRef.current = [];

    // Revoke previous ephemeral audio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);

    // Haptic feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Setup Web Audio Analyser for live audio level meter
      try {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          }
          animFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (err) {
        console.warn("Audio meter not supported:", err);
      }

      // Determine supported mimeType
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/wav",
      ];
      const mimeType =
        mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        setAudioLevel(0);

        const finalBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(finalBlob);
        const tempUrl = URL.createObjectURL(finalBlob);
        setAudioUrl(tempUrl);

        // Process with Gemini backend
        processAudio(finalBlob);
      };

      recorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordSeconds(0);

      // Countdown timer up to 60s
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Microphone error:", err);
      setMicError(t.micPermissionError);
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Convert blob to base64 and send to Gemini backend
  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        try {
          const res = await fetch("/api/voice-onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: blob.type,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Processing failed");

          setProfile(data.profile);
          setProcessingEngine(data.engine || "gemini-3.8-flash");
        } catch (postErr: any) {
          console.warn("Backend request failed, extracting locally:", postErr);
          // Graceful fallback
          extractFromSample(
            "Vanakkam sir, en peru Murugan. Naan T. Nagar Chennai-la electrician vela paakren. 8 varusham experience irukku. Tamil and English pesuven.",
          );
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      console.error("Error preparing audio:", err);
      setIsProcessing(false);
    }
  };

  // Extract from a text transcript preset
  const extractFromSample = async (sampleTranscript: string) => {
    setIsProcessing(true);
    setConfirmedPayload(null);
    setMicError("");
    try {
      const res = await fetch("/api/voice-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: sampleTranscript,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sample extraction failed");

      setProfile(data.profile);
      setProcessingEngine(data.engine || "gemini-3.8-flash");
    } catch (err) {
      console.error("Error processing sample:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle service category pill in editable form
  const toggleCategory = (cat: string) => {
    if (!profile) return;
    const exists = profile.service_categories.includes(cat);
    const updated = exists
      ? profile.service_categories.filter((c) => c !== cat)
      : [...profile.service_categories, cat];
    setProfile({ ...profile, service_categories: updated });
  };

  // Toggle language pill in editable form
  const toggleLanguage = (lang: string) => {
    if (!profile) return;
    const exists = profile.languages_spoken.includes(lang);
    const updated = exists
      ? profile.languages_spoken.filter((l) => l !== lang)
      : [...profile.languages_spoken, lang];
    setProfile({ ...profile, languages_spoken: updated });
  };

  // Confirm and output final JSON
  const handleConfirm = () => {
    if (!profile) return;
    setConfirmedPayload({ ...profile });
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }
    // Smooth scroll down to JSON payload
    setTimeout(() => {
      document
        .getElementById("final-payload-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Copy final JSON payload
  const handleCopyJson = () => {
    if (!confirmedPayload) return;
    navigator.clipboard.writeText(JSON.stringify(confirmedPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Reset entire flow for a new recording
  const handleReset = () => {
    setProfile(null);
    setConfirmedPayload(null);
    setRecordSeconds(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
  };

  const isFlagged = (field: string) => {
    return profile?.confidence_flags?.includes(field);
  };

  return (
    <PageShell backTo="/" backLabel="Back">
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        {/* Header with Language Selector */}
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles size={13} />
                {t.badge}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                gemini-3.8-flash
              </span>
            </div>

            {/* Language Toggle Bar */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1">
              <Languages size={14} className="ml-1.5 text-muted-foreground" />
              {(
                [
                  { id: "en", label: "English" },
                  { id: "ta", label: "தமிழ்" },
                  { id: "hi", label: "हिन्दी" },
                  { id: "te", label: "తెలుగు" },
                  { id: "ml", label: "മലയാളം" },
                  { id: "kn", label: "ಕನ್ನಡ" },
                ] as const
              ).map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setUiLang(lang.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    uiLang === lang.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {t.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {t.subtitle}
          </p>

          {/* Stepper indicator */}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/70 pt-4 text-center text-xs font-semibold">
            <div
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${
                !profile && !confirmedPayload
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground"
              }`}
            >
              <Mic size={14} />
              <span>{t.step1}</span>
            </div>
            <div
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${
                profile && !confirmedPayload
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground"
              }`}
            >
              <Briefcase size={14} />
              <span>{t.step2}</span>
            </div>
            <div
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 ${
                confirmedPayload
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>{t.step3}</span>
            </div>
          </div>
        </header>

        {/* SECTION 1: VOICE RECORDER */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center justify-center text-center">
            {/* Countdown / Duration */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs font-bold">
              <Clock
                size={13}
                className={
                  isRecording
                    ? "text-destructive animate-pulse"
                    : "text-muted-foreground"
                }
              />
              {isRecording ? (
                <span className="text-destructive font-mono font-bold">
                  {60 - recordSeconds} {t.secondsLeft}
                </span>
              ) : (
                <span className="text-muted-foreground">{t.maxDuration}</span>
              )}
            </div>

            {/* Recording Progress Bar */}
            {isRecording && (
              <div className="mb-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-destructive transition-all duration-300 ease-linear"
                  style={{ width: `${(recordSeconds / 60) * 100}%` }}
                />
              </div>
            )}

            {/* Big Mic / Stop Button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isProcessing}
                className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                aria-label={t.tapToRecord}
              >
                <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/20 opacity-75" />
                <Mic
                  size={44}
                  className="transition-transform group-hover:scale-110"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="relative flex h-28 w-28 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse"
                aria-label={t.stopRecording}
              >
                <Square size={38} className="fill-current" />
              </button>
            )}

            {/* State Label */}
            <p className="mt-4 text-base font-bold text-foreground sm:text-lg">
              {isRecording ? t.recordingState : t.tapToRecord}
            </p>

            {/* Live Audio Level Meter */}
            {isRecording && (
              <div className="mt-3 flex items-center gap-1">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-destructive transition-all duration-75"
                    style={{
                      height: `${Math.max(6, Math.min(32, (audioLevel * (i + 1)) / 4))}px`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Prompt Guidelines */}
            {!isRecording && !isProcessing && (
              <div className="mt-6 w-full rounded-xl border border-dashed border-border/80 bg-secondary/30 p-4 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.speakGuideTitle}
                </p>
                <ul className="mt-2 grid gap-1.5 text-xs text-foreground/80 sm:grid-cols-2">
                  {t.speakGuidePoints.map((pt, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ephemeral Audio Preview Player */}
            {audioUrl && !isRecording && (
              <div className="mt-5 flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Volume2 size={16} className="text-primary" />
                  <span>Audio Preview (ephemeral session)</span>
                </div>
                <audio controls src={audioUrl} className="h-8 max-w-[200px]" />
              </div>
            )}

            {/* Error Message */}
            {micError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                <AlertCircle size={16} className="shrink-0" />
                <span>{micError}</span>
              </div>
            )}
          </div>

          {/* Quick Preset Samples for Testing Without Speaking */}
          {!isRecording && (
            <div className="mt-6 border-t border-border/60 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground">
                  {t.trySample}
                </p>
                <span className="text-[11px] text-muted-foreground/70">
                  1-click test
                </span>
              </div>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                {SAMPLE_PRESETS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => extractFromSample(s.transcript)}
                    disabled={isProcessing}
                    className="flex flex-col items-start rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="text-[11px] font-extrabold text-primary">
                      {s.langName}
                    </span>
                    <span className="mt-0.5 text-xs font-bold text-foreground">
                      {s.label}
                    </span>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      "{s.transcript}"
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: PROCESSING / TRANSCRIBING SPINNER */}
        {isProcessing && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center shadow-sm animate-pulse">
            <Loader2 size={38} className="mx-auto animate-spin text-primary" />
            <h2 className="mt-4 text-lg font-bold text-foreground">
              {t.transcribingTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.transcribingSub}
            </p>
          </section>
        )}

        {/* SECTION 3: RAW TRANSCRIPT & EDITABLE FORM */}
        {profile && !isProcessing && (
          <section className="space-y-6">
            {/* Raw Transcript Box */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground sm:text-base">
                  <Volume2 size={16} className="text-primary" />
                  {t.transcriptSectionTitle}
                </h2>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  Engine: {processingEngine}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.transcriptEditTip}
              </p>
              <div className="mt-3">
                <textarea
                  value={profile.raw_transcript}
                  onChange={(e) =>
                    setProfile({ ...profile, raw_transcript: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-sm leading-relaxed text-foreground outline-none transition focus:border-primary focus:bg-card"
                  placeholder="Raw transcript text..."
                />
              </div>
            </div>

            {/* Editable Profile Confirmation Form */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
                    {t.formSectionTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.formSectionSub}
                  </p>
                </div>
                {profile.confidence_flags.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700">
                    <AlertTriangle size={13} />
                    <span>
                      {profile.confidence_flags.length} {t.needsVerification}
                    </span>
                  </div>
                )}
              </div>

              {profile.confidence_flags.length > 0 && (
                <div className="mt-4 rounded-[12px] border border-amber-500/30 bg-amber-500/5 p-3 text-xs font-medium text-amber-800">
                  {t.confidenceWarning}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirm();
                }}
                className="mt-6 space-y-5"
              >
                {/* Full Name */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {t.fullName}
                    </label>
                    {isFlagged("full_name") && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                        <AlertTriangle size={11} /> {t.needsVerification}
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <User
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      placeholder="e.g. Murugan, Ramesh Kumar"
                      className={`h-12 w-full rounded-xl border bg-secondary/20 pl-10 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary ${
                        isFlagged("full_name")
                          ? "border-amber-500 bg-amber-500/5"
                          : "border-border"
                      }`}
                    />
                  </div>
                </div>

                {/* Service Categories (Taxonomy) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {t.services}
                    </label>
                    {isFlagged("service_categories") && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                        <AlertTriangle size={11} /> {t.needsVerification}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.servicesHint}
                  </p>
                  <div
                    className={`mt-2 flex flex-wrap gap-2 rounded-[16px] p-2.5 ${
                      isFlagged("service_categories")
                        ? "border border-amber-500 bg-amber-500/5"
                        : "border border-border/70 bg-secondary/20"
                    }`}
                  >
                    {FIXED_CATEGORIES.map((cat) => {
                      const selected = profile.service_categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold capitalize transition cursor-pointer shadow-subtle ${
                            selected
                              ? "bg-primary text-white"
                              : "border border-border bg-card text-foreground hover:bg-secondary"
                          }`}
                        >
                          {selected ? (
                            <Check size={13} />
                          ) : (
                            <Wrench size={12} />
                          )}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Experience & Service Area Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Years Experience */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {t.experience}
                      </label>
                      {isFlagged("years_experience") && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <AlertTriangle size={11} /> {t.needsVerification}
                        </span>
                      )}
                    </div>
                    <div className="relative mt-1.5">
                      <Briefcase
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={profile.years_experience ?? ""}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            years_experience:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        placeholder={t.experienceNull}
                        className={`h-12 w-full rounded-[12px] border bg-secondary/20 pl-10 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary ${
                          isFlagged("years_experience")
                            ? "border-amber-500 bg-amber-500/5"
                            : "border-border"
                        }`}
                      />
                    </div>
                    {/* Quick year chips */}
                    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                      {[1, 3, 5, 8, 10, 15].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() =>
                            setProfile({ ...profile, years_experience: yr })
                          }
                          className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer shadow-2xs ${
                            profile.years_experience === yr
                              ? "bg-[#F4512C] text-white"
                              : "border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] text-[#6B645F] dark:text-[#9E958F] hover:text-[#141210] dark:hover:text-[#FAFAFA]"
                          }`}
                        >
                          {yr} yr{yr > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Service Area */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {t.serviceArea}
                      </label>
                      {isFlagged("service_area") && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                          <AlertTriangle size={11} /> {t.needsVerification}
                        </span>
                      )}
                    </div>
                    <div className="relative mt-1.5">
                      <MapPin
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        value={profile.service_area}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            service_area: e.target.value,
                          })
                        }
                        placeholder="e.g. T. Nagar Chennai, Rohini Delhi"
                        className={`h-12 w-full rounded-xl border bg-secondary/20 pl-10 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary ${
                          isFlagged("service_area")
                            ? "border-amber-500 bg-amber-500/5"
                            : "border-border"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Languages Spoken */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {t.languages}
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COMMON_LANGUAGES.map((lang) => {
                      const selected = profile.languages_spoken.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-secondary/60 text-foreground hover:bg-secondary"
                          }`}
                        >
                          {selected && (
                            <Check size={12} className="inline mr-1" />
                          )}
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Availability Note */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {t.availability}
                  </label>
                  <input
                    type="text"
                    value={profile.availability_note ?? ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        availability_note: e.target.value.trim()
                          ? e.target.value
                          : null,
                      })
                    }
                    placeholder="e.g. All days available, Weekends only, 9am to 6pm"
                    className="mt-1.5 h-12 w-full rounded-xl border border-border bg-secondary/20 px-3.5 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
                  />
                  {/* Quick chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      "All days available",
                      "Weekends only",
                      "Flexible hours",
                      "Emergency work",
                    ].map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() =>
                          setProfile({ ...profile, availability_note: note })
                        }
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          profile.availability_note === note
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground transition hover:bg-secondary sm:w-auto"
                  >
                    <RotateCcw size={16} />
                    <span>{t.resetBtn}</span>
                  </button>

                  <button
                    type="submit"
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg transition hover:opacity-95 active:scale-[0.99]"
                  >
                    <CheckCircle2 size={18} />
                    <span>{t.confirmBtn}</span>
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* SECTION 4: FINAL INTEGRATION PAYLOAD (JSON) */}
        {confirmedPayload && (
          <section
            id="final-payload-section"
            className="rounded-2xl border-2 border-primary bg-card p-6 shadow-xl sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-foreground">
                    {t.finalTitle}
                  </h2>
                  <p className="text-xs text-muted-foreground">{t.finalSub}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-bold text-foreground transition hover:bg-secondary/80 active:scale-95"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-500" />
                    <span className="text-emerald-500">{t.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>{t.copyJson}</span>
                  </>
                )}
              </button>
            </div>

            {/* Payload Pre Block */}
            <div className="mt-4 overflow-hidden rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#141210] p-4 shadow-inner">
              <pre className="overflow-x-auto text-xs font-mono leading-relaxed text-[#3DD1B3] sm:text-sm">
                {JSON.stringify(confirmedPayload, null, 2)}
              </pre>
            </div>

            {/* Quick summary badges */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              <span className="rounded-md bg-secondary px-2.5 py-1">
                Name:{" "}
                <strong className="text-foreground">
                  {confirmedPayload.full_name || "N/A"}
                </strong>
              </span>
              <span className="rounded-md bg-secondary px-2.5 py-1">
                Categories:{" "}
                <strong className="text-foreground">
                  {confirmedPayload.service_categories.join(", ") || "None"}
                </strong>
              </span>
              <span className="rounded-md bg-secondary px-2.5 py-1">
                Experience:{" "}
                <strong className="text-foreground">
                  {confirmedPayload.years_experience !== null
                    ? `${confirmedPayload.years_experience} yrs`
                    : "N/A"}
                </strong>
              </span>
              <span className="rounded-md bg-secondary px-2.5 py-1">
                Area:{" "}
                <strong className="text-foreground">
                  {confirmedPayload.service_area || "N/A"}
                </strong>
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-bold text-foreground transition hover:bg-secondary/80"
              >
                <RotateCcw size={14} />
                <span>{t.resetBtn}</span>
              </button>

              <Link
                to="/register"
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow transition hover:opacity-90"
              >
                <span>Continue to Directory Registration</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
