/**
 * Translations for the /apply/[token] page (document upload & data collection forms).
 * Supported languages: English (en), Polish (pl), Romanian (ro)
 */

export type ApplyLang = 'en' | 'pl' | 'ro'

const translations = {
  // Page headers
  'company_name': {
    en: 'Pangaea',
    pl: 'Pangaea',
    ro: 'Pangaea',
  },
  'link_expired': {
    en: 'This upload link has expired. Message us on WhatsApp to get a new one.',
    pl: 'Ten link do przesyłania wygasł. Napisz do nas na WhatsApp, aby otrzymać nowy.',
    ro: 'Acest link de încărcare a expirat. Trimite-ne un mesaj pe WhatsApp pentru a primi unul nou.',
  },

  // Document upload subtitles
  'passport_upload': {
    en: 'Passport Upload',
    pl: 'Przesyłanie paszportu',
    ro: 'Încărcare pașaport',
  },
  'right_to_work_upload': {
    en: 'Right to Work Upload',
    pl: 'Przesyłanie dokumentu prawa do pracy',
    ro: 'Încărcare document drept de muncă',
  },
  'cscs_card_upload': {
    en: 'CSCS Card Upload',
    pl: 'Przesyłanie karty CSCS',
    ro: 'Încărcare card CSCS',
  },
  'photo_id_upload': {
    en: 'Photo ID Upload',
    pl: 'Przesyłanie dokumentu tożsamości ze zdjęciem',
    ro: 'Încărcare act de identitate cu fotografie',
  },
  'document_upload': {
    en: 'Document Upload',
    pl: 'Przesyłanie dokumentu',
    ro: 'Încărcare document',
  },

  // Instructions
  'instruction_single_field': {
    en: 'Please fill in the field below so we can keep your record current.',
    pl: 'Proszę wypełnić poniższe pole, abyśmy mogli zaktualizować Twoje dane.',
    ro: 'Vă rugăm completați câmpul de mai jos pentru a vă menține datele actualizate.',
  },
  'instruction_multiple_fields': {
    en: 'Please fill in the details below so we can keep your record current.',
    pl: 'Proszę wypełnić poniższe dane, abyśmy mogli zaktualizować Twoje dane.',
    ro: 'Vă rugăm completați detaliile de mai jos pentru a vă menține datele actualizate.',
  },
  'instruction_document': {
    en: 'Please upload the document below so we can keep your record current.',
    pl: 'Proszę przesłać poniższy dokument, abyśmy mogli zaktualizować Twoje dane.',
    ro: 'Vă rugăm încărcați documentul de mai jos pentru a vă menține datele actualizate.',
  },
  'instruction_id_cscs': {
    en: 'Upload your ID and CSCS card below to complete your registration.',
    pl: 'Prześlij swój dokument tożsamości i kartę CSCS poniżej, aby zakończyć rejestrację.',
    ro: 'Încărcați actul de identitate și cardul CSCS mai jos pentru a finaliza înregistrarea.',
  },
  'instruction_id': {
    en: 'Upload your ID document below to complete your registration.',
    pl: 'Prześlij swój dokument tożsamości poniżej, aby zakończyć rejestrację.',
    ro: 'Încărcați actul de identitate mai jos pentru a finaliza înregistrarea.',
  },

  // Form fields
  'submit': {
    en: 'Submit',
    pl: 'Wyślij',
    ro: 'Trimite',
  },
  'submitting': {
    en: 'Submitting...',
    pl: 'Wysyłanie...',
    ro: 'Se trimite...',
  },
  'upload': {
    en: 'Upload',
    pl: 'Prześlij',
    ro: 'Încarcă',
  },
  'uploading': {
    en: 'Uploading...',
    pl: 'Przesyłanie...',
    ro: 'Se încarcă...',
  },
  'choose_file': {
    en: 'Choose a file or take a photo',
    pl: 'Wybierz plik lub zrób zdjęcie',
    ro: 'Alegeți un fișier sau faceți o fotografie',
  },
  'file_selected': {
    en: 'File selected',
    pl: 'Plik wybrany',
    ro: 'Fișier selectat',
  },
  'success': {
    en: 'Thank you! Your submission has been received.',
    pl: 'Dziękujemy! Twoje zgłoszenie zostało przyjęte.',
    ro: 'Mulțumim! Trimiterea dvs. a fost primită.',
  },
  'error': {
    en: 'Something went wrong. Please try again.',
    pl: 'Coś poszło nie tak. Proszę spróbować ponownie.',
    ro: 'Ceva nu a funcționat. Vă rugăm încercați din nou.',
  },

  // Data field labels
  'field_email': {
    en: 'Email address',
    pl: 'Adres e-mail',
    ro: 'Adresă de email',
  },
  'field_phone': {
    en: 'Phone number',
    pl: 'Numer telefonu',
    ro: 'Număr de telefon',
  },
  'field_address': {
    en: 'Address',
    pl: 'Adres',
    ro: 'Adresă',
  },
  'field_bank_details': {
    en: 'Bank account details',
    pl: 'Dane konta bankowego',
    ro: 'Detalii cont bancar',
  },
  'field_ni_number': {
    en: 'National Insurance number',
    pl: 'Numer National Insurance',
    ro: 'Număr National Insurance',
  },
  'field_utr': {
    en: 'UTR number',
    pl: 'Numer UTR',
    ro: 'Număr UTR',
  },
  'field_nok_name': {
    en: "Next of kin's name",
    pl: 'Imię i nazwisko osoby kontaktowej',
    ro: 'Numele persoanei de contact',
  },
  'field_nok_phone': {
    en: "Next of kin's phone number",
    pl: 'Numer telefonu osoby kontaktowej',
    ro: 'Numărul de telefon al persoanei de contact',
  },
  'field_date_of_birth': {
    en: 'Date of birth',
    pl: 'Data urodzenia',
    ro: 'Data nașterii',
  },
} as const

type TranslationKey = keyof typeof translations

/**
 * Get a translated string for the apply page.
 * Falls back to English if the key or language doesn't exist.
 */
export function t(key: TranslationKey, lang: string = 'en'): string {
  const entry = translations[key]
  if (!entry) return key
  return (entry as Record<string, string>)[lang] ?? entry.en
}

/**
 * Get the translated label for a data field key.
 */
export function fieldLabel(field: string, lang: string = 'en'): string {
  const key = `field_${field}` as TranslationKey
  const entry = translations[key]
  if (!entry) return field.replace(/_/g, ' ')
  return (entry as Record<string, string>)[lang] ?? entry.en
}
