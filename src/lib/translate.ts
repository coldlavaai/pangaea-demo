import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  pl: 'Polish',
  ro: 'Romanian',
  bg: 'Bulgarian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  sk: 'Slovak',
  pt: 'Portuguese',
  pa: 'Punjabi',
  ur: 'Urdu',
  hi: 'Hindi',
}

/**
 * Translate text to a target language using Claude Haiku.
 * Returns the original text if targetLang is 'en' or not supported.
 * Non-fatal — returns original text on any error.
 */
export async function translateText(
  text: string,
  targetLang: string,
): Promise<{ translated: string; wasTranslated: boolean }> {
  if (!text || targetLang === 'en' || !LANGUAGE_NAMES[targetLang]) {
    return { translated: text, wasTranslated: false }
  }

  const langName = LANGUAGE_NAMES[targetLang]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Translate this WhatsApp message to ${langName}. Return ONLY the translation, nothing else. Keep any URLs, phone numbers, names, and the company name "Pangaea" unchanged. Keep emoji if present.\n\n${text}`,
      }],
    })

    const translated = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : text

    return { translated, wasTranslated: true }
  } catch (e) {
    console.error('[translate] failed:', e instanceof Error ? e.message : e)
    return { translated: text, wasTranslated: false }
  }
}

/**
 * Translate non-English text to English for staff to read.
 * Returns the original text if it's already English.
 */
export async function translateToEnglish(
  text: string,
  sourceLang: string,
): Promise<{ translated: string; wasTranslated: boolean }> {
  if (!text || sourceLang === 'en' || !LANGUAGE_NAMES[sourceLang]) {
    return { translated: text, wasTranslated: false }
  }

  const langName = LANGUAGE_NAMES[sourceLang]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `This WhatsApp message is in ${langName}. Translate it to English. Return ONLY the translation, nothing else.\n\n${text}`,
      }],
    })

    const translated = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : text

    return { translated, wasTranslated: true }
  } catch (e) {
    console.error('[translate] to-english failed:', e instanceof Error ? e.message : e)
    return { translated: text, wasTranslated: false }
  }
}
