# What We Built Today — 11 March 2026
## For JJ — Aztec BOS Session Summary

## The Big Picture

ALF (the AI assistant we built for the client) can now chase operatives for missing information automatically. When Liam (the client's labour manager) asks ALF "what's missing from Oliver's profile?", it shows him exactly what's outstanding — NI number, bank details, passport, right to work, whatever it is. He ticks the items he wants to chase, hits one button, and ALF sends the operative a single WhatsApp message with a link to a secure form. The operative fills in their details and uploads their documents through that link, and the system updates their record automatically.

**One button. One WhatsApp. One link. Everything collected in one go.**

---

## What Works Now

- **Ask ALF what's missing** from any operative's profile — it shows a card with checkboxes for every missing item (data fields and documents)
- **Select what you want to chase** — tick NI number, untick bank details, tick passport — your choice
- **Hit "Action selected"** — ALF asks you to confirm, then sends ONE WhatsApp to the operative
- **The operative receives a link** to a secure page where they fill in their details and upload documents
- **Data saves automatically** — NI number, UTR, bank details, address, next of kin, date of birth all update on their profile immediately
- **Documents upload and go to verification** — passport, right to work, CSCS card etc. are uploaded and queued for review
- **WhatsApp confirmations** — the operative gets a message confirming their data was received, and another when documents are uploaded
- **Progress tracking** — ALF shows a live progress card that updates as the operative completes each item
- **Error reporting** — if something goes wrong (WhatsApp can't send, data doesn't save), you see the actual error instead of a false "all good"

---

## What Changed from Before

Previously, chasing an operative for missing info meant:
- Manually checking what's missing
- Sending separate WhatsApp messages for each thing
- No tracking of whether they responded
- No link to a form — just "can you send us your NI number?"
- If they didn't reply, you had to remember to chase again

Now it's all automated through ALF with tracking, reminders, and a proper self-service form.

---

## WhatsApp Templates

We set up templates in Twilio (the WhatsApp service provider) so that messages can be sent even when the operative hasn't messaged us recently. WhatsApp has a rule: you can only send free-text messages within 24 hours of the operative's last message. Outside that window, you need pre-approved templates. We now have templates for:

- Profile completion requests (the main one we use)
- Document chasing
- Job offers and reminders
- A "re-engage" message for dormant operatives
- Data collection requests

All signed off as **Aztec Construction**.

---

## What's Next

- **Real-time progress** — the progress card in ALF updates every 5 seconds, but we want it even more responsive
- **Document review queue** — when operatives upload documents, you'll see a task list to review and verify them one by one
- **Notification bell** — get pinged in the BOS when an operative uploads something
- **Address collection improvement** — currently collects address as one block of text; needs separate fields for street, city, postcode
- **"Fully verified" logic** — the system currently says "you're fully verified" when documents are done, even if data fields are still missing. Needs tightening up.
