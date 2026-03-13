import { createClient } from '@/lib/supabase/server'
import type { AssistantFeature } from './types'
import { FEATURE_DEFINITIONS } from './features'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

export async function getAssistantFeatures(): Promise<AssistantFeature[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data } = await db
    .from('assistant_settings')
    .select('feature_key, enabled, description, category')
    .eq('organization_id', ORG_ID)

  if (!data || data.length === 0) {
    // Return defaults if DB not seeded yet
    return FEATURE_DEFINITIONS.map(f => ({
      key: f.key,
      enabled: f.defaultEnabled,
      description: f.description,
      category: f.category,
    }))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    key: row.feature_key,
    enabled: row.enabled,
    description: row.description,
    category: row.category,
  }))
}

export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
  const features = await getAssistantFeatures()
  const feature = features.find(f => f.key === featureKey)
  return feature?.enabled ?? false
}

export async function updateAssistantFeature(featureKey: string, enabled: boolean): Promise<void> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db
    .from('assistant_settings')
    .upsert({
      organization_id: ORG_ID,
      feature_key: featureKey,
      enabled,
      description: FEATURE_DEFINITIONS.find(f => f.key === featureKey)?.description ?? featureKey,
      category: FEATURE_DEFINITIONS.find(f => f.key === featureKey)?.category ?? 'Other',
    })
}
