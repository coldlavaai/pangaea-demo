'use client'

import { useState } from 'react'

const MEDICAL_QUESTIONS = [
  { id: 'epilepsy', label: 'Do you suffer from epilepsy or recurring fits?' },
  { id: 'diabetes_insulin', label: 'Are you a diabetic needing insulin?' },
  { id: 'blackouts', label: 'Do you suffer from sudden blackouts, recurrent dizziness or any condition that may cause sudden collapse or incapacity?' },
  { id: 'chest_pain', label: 'Do you suffer from chest pain or shortness of breath, e.g. when climbing a single flight of stairs?' },
  { id: 'heart_condition', label: 'Do you suffer or have previously suffered from any heart condition such as Heart Attack, Angina etc.?' },
  { id: 'hearing_difficulty', label: 'Do you have difficulty hearing normal conversations?' },
  { id: 'musculoskeletal', label: 'Do you suffer from musculoskeletal conditions such as back pain, sciatica, arthritic conditions, carpal tunnel syndrome etc.?' },
  { id: 'allergies', label: 'Do you suffer from serious allergies likely to cause anaphylactic shock or swelling of the airways?' },
  { id: 'other_conditions', label: 'Are you suffering from any other condition or taking prescribed medication for a medical condition not mentioned above?' },
  { id: 'fit_for_work', label: 'To the best of your knowledge, do you consider yourself fit and well enough to undertake the tasks you have been assigned on this contract?' },
] as const

const DECLARATIONS = [
  { id: 'no_unqualified_equipment', text: 'I understand that I must not operate any item of plant or equipment for which I have not received the relevant training.' },
  { id: 'drug_alcohol_testing', text: 'I understand that I may be asked to complete drug and alcohol testing and that I must comply. I also understand I may be requested to submit to further random tests.' },
  { id: 'security_searches', text: 'I understand that I may be asked to submit to random security searches that may include my vehicle and personal belongings.' },
  { id: 'attended_induction', text: 'I confirm that I have attended and understood the full contents of the company induction.' },
  { id: 'method_statement', text: 'I understand that I will not undertake any duties until I have received, read, understood and signed the appropriate Method Statement and Risk Assessment for the task I am undertaking.' },
  { id: 'site_rules', text: 'I understand that failing to follow the site rules will result in disciplinary action being taken.' },
  { id: 'daily_briefing', text: 'I understand that I must attend the Daily Activity Briefing for each day and sign to confirm I have understood it.' },
] as const

type MedicalId = typeof MEDICAL_QUESTIONS[number]['id']
type DeclarationId = typeof DECLARATIONS[number]['id']

interface Props {
  token: string
  firstName: string
  allocationId: string
}

export default function InductionForm({ token, firstName }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [medical, setMedical] = useState<Partial<Record<MedicalId, boolean>>>({})
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [declarations, setDeclarations] = useState<Partial<Record<DeclarationId, boolean>>>({})
  const [fullName, setFullName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const medicalComplete = MEDICAL_QUESTIONS.every(q => medical[q.id] !== undefined)
  const anyMedicalYes = MEDICAL_QUESTIONS.slice(0, 9).some(q => medical[q.id] === true)
  const declarationsComplete = DECLARATIONS.every(d => declarations[d.id] === true)
  const canSubmit = fullName.trim().length >= 2 && confirmed && !submitting

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/induction/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medical: { ...medical, additional_notes: additionalNotes },
          declarations,
          signature: { full_name: fullName.trim(), signed_at: new Date().toISOString() },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Submission failed')
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-6 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold text-white">Induction Complete</h2>
        <p className="text-slate-400 text-sm">
          Thank you {firstName}. Your induction has been recorded. You are all set for your first day.
        </p>
        <p className="text-slate-500 text-xs">You will receive a WhatsApp confirmation shortly.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {([1, 2, 3] as const).map(s => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors
              ${step === s ? 'bg-[#D4AF37] text-black' : step > s ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-500'}`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`h-px flex-1 transition-colors ${step > s ? 'bg-emerald-700' : 'bg-slate-800'}`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-500 px-0.5 -mt-1">
        <span>Medical</span>
        <span>Declarations</span>
        <span>Sign</span>
      </div>

      {/* Step 1: Medical */}
      {step === 1 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-100 mb-1">Medical Questionnaire</h3>
            <p className="text-xs text-slate-500">Please answer all questions honestly. Any yes answers are treated confidentially.</p>
          </div>

          <div className="space-y-4">
            {MEDICAL_QUESTIONS.map(q => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm text-slate-300 leading-snug">{q.label}</p>
                <div className="flex gap-2">
                  {(['YES', 'NO'] as const).map(opt => {
                    const val = opt === 'YES'
                    const isSelected = medical[q.id] === val
                    const isWarning = q.id === 'fit_for_work' ? !val : val
                    return (
                      <button
                        key={opt}
                        onClick={() => setMedical(prev => ({ ...prev, [q.id]: val }))}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all
                          ${isSelected
                            ? isWarning
                              ? 'bg-amber-700/80 border-amber-600 text-white'
                              : 'bg-emerald-700 border-emerald-600 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                          }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {anyMedicalYes && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Please provide details for any YES answers above:
              </label>
              <textarea
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="Describe your condition(s)..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
              />
            </div>
          )}

          {medical.fit_for_work === false && (
            <div className="rounded-lg bg-amber-950/50 border border-amber-800/50 p-3 text-xs text-amber-300">
              If you do not feel fit for work, please contact Pangaea before your start date.
            </div>
          )}

          <button
            disabled={!medicalComplete}
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-lg text-sm font-semibold bg-[#D4AF37] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c4a030] transition-colors"
          >
            Continue to Declarations
          </button>
        </div>
      )}

      {/* Step 2: Declarations */}
      {step === 2 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-100 mb-1">Declarations</h3>
            <p className="text-xs text-slate-500">Read each statement carefully and tick to confirm your understanding.</p>
          </div>

          <div className="space-y-4">
            {DECLARATIONS.map(d => (
              <label key={d.id} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={declarations[d.id] ?? false}
                  onChange={e => setDeclarations(prev => ({ ...prev, [d.id]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4AF37]"
                />
                <span className="text-sm text-slate-300 leading-snug group-hover:text-slate-100 transition-colors">
                  {d.text}
                </span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-lg text-sm font-semibold border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              disabled={!declarationsComplete}
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-[#D4AF37] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c4a030] transition-colors"
            >
              Continue to Sign
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Signature */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-100 mb-1">Sign &amp; Submit</h3>
          </div>

          <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-300">Data Protection</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pangaea may use the information in this form for health &amp; safety and security purposes, to comply with current legislation, to fulfil statutory requirements, and for statistical analysis of hours worked. By signing below you consent to Pangaea taking and holding a copy of your skills certificates.
            </p>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Your full name (as signature)</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4AF37]"
            />
            <span className="text-sm text-slate-300 leading-snug">
              I confirm that to the best of my knowledge the answers and information I have provided are accurate and truthful.
            </span>
          </label>

          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800/50 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 rounded-lg text-sm font-semibold border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-lg text-sm font-semibold bg-[#D4AF37] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c4a030] transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Induction'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
