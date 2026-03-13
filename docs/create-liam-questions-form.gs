/**
 * Aztec BOS — Liam Questions Form Generator
 *
 * HOW TO USE:
 * 1. Go to https://script.google.com
 * 2. Click "New project"
 * 3. Paste this entire file into the editor (replace the default code)
 * 4. Click Run → createLiamQuestionsForm
 * 5. Approve permissions when prompted
 * 6. The form URL will appear in the Execution Log (View → Logs)
 * 7. Send the form URL to Liam
 *
 * Responses will appear in your Google Drive as a linked Spreadsheet.
 */

function createLiamQuestionsForm() {

  var form = FormApp.create('Aztec BOS — Questions for Liam');

  form.setDescription(
    'These questions are needed to finish building the Aztec BOS system correctly. ' +
    'There are no trick questions — if you don\'t know an answer, just say so and we\'ll work it out together. ' +
    'You don\'t need to answer everything in one go.'
  );

  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Thanks Liam — answers saved. Oliver will be in touch shortly.');


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: PAY RATES & GRADES
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 1: Pay Rates & Grades')
    .setHelpText(
      'We need to know the correct pay rates for the new grade types found in the workers spreadsheet. ' +
      'Without these we\'ll have to guess, which we don\'t want to do.'
    );

  form.addParagraphTextItem()
    .setTitle('Q1 — What does the "Rate" column in the workers spreadsheet represent?')
    .setHelpText(
      'The spreadsheet has three rate columns: "Rate" (e.g. 21.95, 26.59), "Daily Rate" (e.g. 190.00), and "Hourly Rate" (e.g. 21.11). ' +
      'What does each one mean? For example: is "Rate" what Aztec pays the operative per hour, what the client is charged, or something else?'
    )
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Q2 — Pay rates: Groundworker')
    .setHelpText(
      'What is the hourly pay rate range for a Groundworker? ' +
      'If it\'s a flat rate (same for everyone), just give one number. ' +
      'If it varies by experience, give a min and max (e.g. £18–£24/hr). ' +
      'The spreadsheet shows £21.95 consistently — is that hourly or daily?'
    )
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Q3 — Pay rates: Skilled Landscaper')
    .setHelpText('Flat rate or range? The spreadsheet shows £26.59 consistently.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Q4 — Pay rates: Site Supervisor')
    .setHelpText('Flat rate or range? The spreadsheet shows £37.40 consistently.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Q5 — Pay rates: Plant Operator')
    .setHelpText('Flat rate or range? The spreadsheet shows £26.59 — same as Skilled Landscaper. Is that correct?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Q6 — Pay rates: Site Manager')
    .setHelpText('Flat rate or range? The spreadsheet shows £41.52 consistently.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Q7 — Pay rates: Operative, Mobile Crew, Agency Labour')
    .setHelpText(
      'These three grades appear in the spreadsheet with rates around £20. ' +
      'Are they all paid the same rate, or are they different? ' +
      'What is the correct rate for each?'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Q8 — Are grades like "Groundworker" and "Skilled Landscaper" job titles, or skill levels?')
    .setHelpText(
      'We have two types of grade in the system now: ' +
      'skill bands (Skilled → Highly Skilled → Exceptional Skill, etc.) and ' +
      'job titles (Groundworker, Skilled Landscaper, Plant Operator, etc.). ' +
      'Does a person have one grade that describes both their job AND their skill level, ' +
      'or do they have a job title AND a separate skill level?'
    )
    .setChoiceValues([
      'One grade only — the job title IS the grade (e.g. a person is "Groundworker", not also "Skilled")',
      'Both — a Groundworker could also be graded as Skilled or Highly Skilled separately',
      'Not sure — needs discussion',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q9 — "Semi-Skilled": is this a real grade or just an informal label?')
    .setHelpText('34 operatives in the spreadsheet are listed as "Semi Skilled" or "Semiskilled". Should this be a proper grade in the system with its own pay rate, or should it map to Skilled?')
    .setChoiceValues([
      'Real grade — give it its own pay rate',
      'Map it to Skilled',
      'Map it to something else (please explain in comments at end)',
      'Not sure',
    ])
    .setRequired(true);


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: TRADES
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 2: Trades')
    .setHelpText('Questions about how trades work in the system.');

  form.addMultipleChoiceItem()
    .setTitle('Q10 — Slinger and Signaller: one trade or two?')
    .setHelpText('Many operatives are listed as "Slinger/Signaller" together. Can someone be a Slinger but not a Signaller, or are they always the same person?')
    .setChoiceValues([
      'Always combined — one person does both (keep as one trade: Slinger/Signaller)',
      'Can be separate — some people only do one (keep as two separate trades)',
      'Not sure',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q11 — 360 Excavator Operator, Digger Driver, Machine Operator: same or different?')
    .setHelpText('The spreadsheet uses all three terms. Are these the same trade with different names, or genuinely different roles?')
    .setChoiceValues([
      'Same trade — consolidate into one (360 Excavator Operator)',
      'Different — a digger driver might not be able to operate all plant',
      'Sub-categories of Plant Operator',
      'Not sure',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q12 — Paver vs Block Paver: same or different?')
    .setHelpText('"Paver", "Block Paver", "Paving" all appear in the data. Is block paving a specialist higher-skill trade, or the same as general paving?')
    .setChoiceValues([
      'Same — consolidate into one (Paver)',
      'Different — Block Paver is a specialist skill with different pay',
      'Not sure',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q13 — Supervisor / Site Manager as a trade: should these appear in the trade list?')
    .setHelpText('"Supervisor" and "Site Manager" appear in both the Grade column and the Trade column in the spreadsheet. When we allocate an operative to a site, should "Site Manager" be a selectable trade (type of work), or is it grade-only?')
    .setChoiceValues([
      'Trade AND grade — someone can be allocated specifically as a Site Manager',
      'Grade only — it\'s a seniority level, not a type of work',
      'Not sure',
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Q14 — Any trades missing from this list?')
    .setHelpText(
      'We\'ve added these trades to the system: Labourer, Paver, Groundworker, Landscaper, Traffic Marshal, Banksman, ' +
      'Forklift Driver, Dumper Driver, Plant Operator, Slinger, Signaller, 360 Excavator Operator, Carpenter, ' +
      'Shuttering Carpenter, Telehandler, Bricklayer, Machine Operator, Cladding, Site Engineer, Semi-Skilled Labour. ' +
      'Are there any trades Aztec uses that are missing from this list?'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Q15 — Skill level per trade: how should we record how good someone is at each trade?')
    .setHelpText(
      'An operative can now have multiple trades (e.g. Groundworker + Paver). ' +
      'For each trade, we can record a skill level. Which scale makes most sense to you?'
    )
    .setChoiceValues([
      'Trainee / Competent / Skilled / Advanced / Expert',
      'CSCS card colour (Green / Blue / Gold / Black)',
      'NVQ level (Level 1 / 2 / 3 / 4)',
      'Just record the trade, no skill level needed',
      'Other (please explain in comments at end)',
    ])
    .setRequired(true);


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: CSCS CARDS
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 3: CSCS Cards & Certification')
    .setHelpText('Questions about how CSCS cards are handled in the system.');

  form.addMultipleChoiceItem()
    .setTitle('Q16 — CPCS, GQA, NPORS, EUSR cards: do you accept these the same as CSCS?')
    .setHelpText(
      'Some operatives hold cards from other schemes: CPCS (plant operators), GQA (groundworks/paving), ' +
      'NPORS, or EUSR — these are different certification bodies but cover similar competencies. ' +
      'Does Aztec accept all of these as valid proof of competency, or does the scheme matter?'
    )
    .setChoiceValues([
      'All accepted equally — any recognised scheme is fine',
      'Depends on the trade — e.g. CPCS required for plant, CSCS for groundworks',
      'CSCS only — we don\'t accept other schemes',
      'Not sure — needs checking',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q17 — If someone has two CSCS cards (e.g. white + green), which one matters for compliance?')
    .setHelpText('About 60 operatives in the database have two cards. The compliance system checks card expiry to decide if someone can be allocated.')
    .setChoiceValues([
      'The highest colour card (white > gold > blue > green)',
      'The one most relevant to the job they\'re being allocated to',
      'Both must be valid',
      'Either one valid is sufficient',
      'Not sure',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q18 — Expired CSCS card: block allocation or just warn?')
    .setHelpText('Currently the system blocks an operative from being allocated if their CSCS card is expired. Is that the right behaviour, or should it be a warning Liam can override?')
    .setChoiceValues([
      'Block — never allocate someone with an expired CSCS',
      'Warn only — Liam can override if needed (e.g. renewal in progress)',
      'Depends on the card type / trade',
    ])
    .setRequired(true);


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4: WORKFLOWS
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 4: Workflows — Labour Transfer & Offer Approval')
    .setHelpText('How certain processes should work end-to-end.');

  form.addMultipleChoiceItem()
    .setTitle('Q19 — Labour transfer: who starts the request?')
    .setHelpText('If Operative X needs to move from Site A to Site B, who initiates that in the system?')
    .setChoiceValues([
      'Site Manager at the current site (SM A)',
      'Site Manager at the new site (SM B)',
      'Liam only — site managers don\'t request transfers',
      'Either site manager can request it',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q20 — Labour transfer: does every transfer need Liam\'s approval?')
    .setChoiceValues([
      'Yes — Liam approves every transfer',
      'No — site managers can transfer freely within their sites',
      'Only if it crosses certain criteria (e.g. different client, rate change)',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Q21 — Labour transfer: what happens once approved? (tick all that apply)')
    .setChoiceValues([
      'System automatically updates the allocation',
      'Operative is sent a new offer to accept/decline',
      'Site managers are notified automatically',
      'Liam manually reassigns after approving',
      'New paperwork / induction required',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q22 — Can a site manager request a transfer via the Telegram bot (@AztecSiteBot)?')
    .setChoiceValues([
      'Yes — add it to the Telegram bot',
      'No — this should be web only (in the BOS system)',
      'No preference',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q23 — Offer dispatch: should there be an approval step before offers go to operatives?')
    .setHelpText(
      'Currently, when a labour request is created and operatives are selected, offers are sent out automatically. ' +
      'The plan was to add a step where Liam reviews and approves before the offers go out. Is that what you want?'
    )
    .setChoiceValues([
      'Yes — Liam must approve before any offer is sent',
      'No — send offers automatically as soon as operatives are selected',
      'Depends — only require approval above a certain rate or for certain clients',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q24 — Offer approval: how should it work if Liam is unavailable?')
    .setHelpText('If offers need Liam\'s approval but he\'s away for a weekend or holiday, what happens?')
    .setChoiceValues([
      'Offers wait — nothing goes out without Liam',
      'There\'s a backup approver (who?)',
      'Auto-approve after a time limit (e.g. 4 hours)',
      'Not sure',
    ])
    .setRequired(false);


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5: MESSAGING & COMMUNICATION
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 5: Messaging — WhatsApp vs Telegram')
    .setHelpText('One decision needed about how site managers communicate with the system.');

  form.addMultipleChoiceItem()
    .setTitle('Q25 — Site managers: Telegram bot or WhatsApp?')
    .setHelpText(
      'The Telegram bot (@AztecSiteBot) is currently live and working — Jacob has tested it. ' +
      'The previous call mentioned potentially using WhatsApp instead for site managers. ' +
      'Has a decision been made?'
    )
    .setChoiceValues([
      'Telegram — keep @AztecSiteBot as-is',
      'WhatsApp — rebuild the bot as a WhatsApp flow',
      'Both — give site managers the choice',
      'Not decided yet',
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Q26 — What is your (Liam\'s) WhatsApp number?')
    .setHelpText('The system sends WhatsApp alerts to Liam for compliance issues and staff alerts. We need your real number to update this.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q27 — Telegram group notifications: is there an existing Aztec group?')
    .setHelpText('The plan is to broadcast certain events (arrivals, NCRs, etc.) to a Telegram group. Is there an existing Aztec Landscapes Telegram group, or should one be created?')
    .setChoiceValues([
      'Yes — there\'s an existing group (please share the group name or link in comments)',
      'No — create a new one',
      'Not needed — DMs to Liam only is fine',
    ])
    .setRequired(true);


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 6: SOPHIE & OPERATIVE INTAKE
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 6: Sophie — Operative Intake')
    .setHelpText('Sophie is the WhatsApp AI that handles initial contact from operatives.');

  form.addCheckboxItem()
    .setTitle('Q28 — Stage 1 intake (first contact with operative): what should Sophie collect?')
    .setHelpText('Tick everything Sophie should ask for when an operative first makes contact.')
    .setChoiceValues([
      'Full name',
      'Phone number (already have this — it\'s how they contact us)',
      'Trade / type of work',
      'Location / area they can work in',
      'Day rate expectation',
      'NI number',
      'CSCS card colour',
      'Right to work status (UK citizen / visa type)',
      'Date of birth',
      'Email address',
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Q29 — Stage 2 intake (on placement): what should be collected then?')
    .setHelpText('Tick everything that should be collected when an operative is placed / offered their first job.')
    .setChoiceValues([
      'Bank details (sort code + account number)',
      'Proof of right to work (passport / visa)',
      'CSCS card photo',
      'Address',
      'Emergency contact',
      'UTR number (self-employed tax)',
      'Induction completion',
      'Photo ID',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q30 — Stage 2: how is it triggered?')
    .setChoiceValues([
      'Automatically when an offer is accepted',
      'Manually by Liam when he decides the person is ready',
      'When the operative reports for their first day',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q31 — Stage 2: how is it delivered?')
    .setChoiceValues([
      'Sophie continues the WhatsApp conversation',
      'A document upload link is sent (current system)',
      'Both — Sophie first, then upload link for documents',
      'Not sure',
    ])
    .setRequired(true);


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 7: RAP IMPORT
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 7: RAP Score Import')
    .setHelpText('RAP = Risk Assessment Profile (Attitude, Reliability, Punctuality). Liam scores operatives on these.');

  form.addParagraphTextItem()
    .setTitle('Q32 — What columns will the RAP Excel file have?')
    .setHelpText(
      'When you\'re ready to upload RAP scores, what will each row contain? ' +
      'For example: NI number, first name, last name, A score (1-10), R score (1-10), P score (1-10), date, notes? ' +
      'Please describe the columns so we can build the import to match exactly.'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Q33 — RAP scores: are they one score per operative, or multiple over time?')
    .setHelpText('Does each operative have a single current RAP score that gets updated, or do you keep a history of scores over time?')
    .setChoiceValues([
      'Single current score — just update it when it changes',
      'History of scores over time — keep every assessment as a separate record',
      'Not sure yet',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q34 — Who can see RAP scores?')
    .setHelpText('Currently RAP scores are only visible to admin and staff (Liam, Donna, Jacob). Should site managers ever see them?')
    .setChoiceValues([
      'Admin and staff only — site managers should not see RAP scores',
      'Site managers can see RAP for their currently allocated operatives',
      'Site managers can see all RAP scores',
    ])
    .setRequired(true);


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 8: USER ACCOUNTS & DATA
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 8: User Accounts & Data');

  form.addParagraphTextItem()
    .setTitle('Q35 — Who else needs a BOS account?')
    .setHelpText(
      'Current accounts: Oliver, Liam, Donna, Jacob (Cold Lava), JJ (site manager — needs re-inviting). ' +
      'Are there other site managers or back-office staff who need accounts before go-live?'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Q36 — Donna\'s role: what should she be able to do in BOS?')
    .setChoiceValues([
      'Full admin access — same as Liam',
      'Staff access — can see everything, can\'t change system settings',
      'View only — can see reports and operatives but not edit',
      'Not sure',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q37 — The 154 operatives with invalid NI numbers: what to do?')
    .setHelpText('154 imported operatives have NI numbers in non-standard formats (e.g. "ANAMI1240", "UKR006"). They\'re in the system with the incorrect NI stored in their notes. What should happen?')
    .setChoiceValues([
      'Leave them as-is — I\'ll manually update the NI numbers in BOS when I have correct info',
      'I\'ll get the correct NI numbers and send an updated spreadsheet to re-import',
      'These people should be deleted — if the NI is wrong I can\'t use them',
      'Not sure',
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q38 — Agencies: how much do you want to manage agency information in BOS?')
    .setHelpText('The system now records which agency each operative came from. Do you want a full agencies directory (with contact details, account managers, payment tracking), or just a simple label on the operative record?')
    .setChoiceValues([
      'Full directory — I want to manage agency contacts and track payments through BOS',
      'Simple label only — just know which agency an operative came from',
      'Not needed right now',
    ])
    .setRequired(true);


  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 9: GO-LIVE
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Section 9: Go-Live & Timeline');

  form.addTextItem()
    .setTitle('Q39 — Target go-live date')
    .setHelpText('When do you want to start using BOS live? The original target was before the summer labour shortage (July/August). Is that still the goal, or is there a specific date?')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Q40 — What is the minimum you need working before go-live?')
    .setHelpText(
      'Of everything we\'ve discussed, what are the absolute must-haves before you switch to BOS for real? ' +
      '(e.g. "I need the database of all operatives, the Telegram bot, and the offer flow working — everything else can come later")'
    )
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Q41 — Will you run BOS alongside the spreadsheet, or switch fully on a given date?')
    .setChoiceValues([
      'Full cutover on a set date — stop using spreadsheets, use BOS only',
      'Run both in parallel for a period while I get comfortable',
      'Not sure',
    ])
    .setRequired(true);


  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL — ANYTHING ELSE
  // ─────────────────────────────────────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('Anything Else');

  form.addParagraphTextItem()
    .setTitle('Q42 — Is there anything the system currently does that you\'d change or remove?')
    .setHelpText('Anything that feels wrong, unnecessary, or confusing.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Q43 — Is there anything you need that we haven\'t asked about?')
    .setHelpText('Anything missing from the system that you\'d expect to be there.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Additional comments')
    .setRequired(false);


  // ─────────────────────────────────────────────────────────────────────────────
  // OUTPUT THE URL
  // ─────────────────────────────────────────────────────────────────────────────

  var formUrl = form.getPublishedUrl();
  var editUrl = form.getEditUrl();

  Logger.log('===========================================');
  Logger.log('FORM CREATED SUCCESSFULLY');
  Logger.log('===========================================');
  Logger.log('Share this URL with Liam:');
  Logger.log(formUrl);
  Logger.log('');
  Logger.log('Edit the form yourself here:');
  Logger.log(editUrl);
  Logger.log('===========================================');

  // Also create a linked response spreadsheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET,
    SpreadsheetApp.create('Aztec BOS — Liam Answers').getId()
  );

  Logger.log('Responses will appear in: Aztec BOS — Liam Answers (Google Sheets in your Drive)');
}
