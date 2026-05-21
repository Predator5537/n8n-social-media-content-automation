const fs = require('fs');
const SHEET_ID = '1djoz4p-YyJ4Pu43-f9dUjWu4VhY6BCt-uUVMVVdK620';
const CRED_SHEETS = 'Google Sheets OAuth2';
const CRED_GEMINI = 'Gemini API';
const CRED_OPENROUTER = 'OpenRouter API';

let nodeId = 0;
const n = (name, type, tv, params, pos, extra) => ({
  id: `node_${++nodeId}`,
  name, type: `n8n-nodes-base.${type}`, typeVersion: tv,
  position: pos, parameters: params, credentials: extra?.creds || undefined,
  ...(extra?.onError ? { onError: extra.onError } : {}),
  ...(extra?.continueOnFail ? { continueOnFail: true } : {})
});

const sheetDoc = { __rl: true, value: SHEET_ID, mode: 'id' };
const sheetTab = (name) => ({ __rl: true, value: name, mode: 'name' });
const sheetCreds = { creds: { [CRED_SHEETS]: { id: 'google_sheets_cred', name: CRED_SHEETS } } };

const gsRead = (name, tab, pos, opts) => n(name, 'googleSheets', 4.5, {
  operation: 'read', documentId: sheetDoc, sheetName: sheetTab(tab), ...opts
}, pos, sheetCreds);

const gsUpdate = (name, tab, cols, pos) => n(name, 'googleSheets', 4.5, {
  operation: 'update', documentId: sheetDoc, sheetName: sheetTab(tab),
  columns: { mappingMode: 'defineBelow', value: cols, matchingColumns: ['Row ID'] }
}, pos, sheetCreds);

const gsAppend = (name, tab, cols, pos) => n(name, 'googleSheets', 4.5, {
  operation: 'append', documentId: sheetDoc, sheetName: sheetTab(tab),
  columns: { mappingMode: 'defineBelow', value: cols }
}, pos, sheetCreds);

const code = (name, js, pos) => n(name, 'code', 2, {
  jsCode: js, mode: 'runOnceForEachItem'
}, pos);

const codeAll = (name, js, pos) => n(name, 'code', 2, {
  jsCode: js, mode: 'runOnceForAllItems'
}, pos);

const ifNode = (name, cond, pos) => n(name, 'if', 2, { conditions: cond }, pos);

// ── NODES ──────────────────────────────────────────────────────────────
const nodes = [];

// 1) Triggers
nodes.push(n('Manual Trigger', 'manualTrigger', 1, {}, [0, 300]));
nodes.push(n('Schedule Trigger', 'scheduleTrigger', 1.2, {
  rule: { interval: [{ triggerAtHour: 9, triggerAtMinute: 0, field: 'cronExpression', expression: '0 9 * * 1' }] }
}, [0, 520]));

// 2) Read Prompt Config
nodes.push(gsRead('Read Prompt Config', 'Prompt Config', [300, 400], {
  options: { range: 'A1:G2' }
}));

// 3) Set Config Variables
nodes.push(codeAll('Set Config Variables', `
const row = $input.all()[0]?.json || {};
const cfg = {
  gemini_model: row['Gemini Model'] || 'gemini-2.0-flash',
  openrouter_model: row['OpenRouter Fallback Model'] || 'google/gemini-2.0-flash-001',
  temperature: parseFloat(row['Temperature']) || 0.6,
  linkedin_word_range: row['LinkedIn Word Range'] || '150-250',
  facebook_word_range: row['Facebook Word Range'] || '80-120',
  instagram_caption_length: row['Instagram Caption Length'] || '40-60',
  run_started_at: new Date().toISOString()
};
const ts = new Date(cfg.run_started_at);
cfg.run_id = 'RUN-' + ts.getFullYear() +
  String(ts.getMonth()+1).padStart(2,'0') +
  String(ts.getDate()).padStart(2,'0') + '-' +
  String(ts.getHours()).padStart(2,'0') +
  String(ts.getMinutes()).padStart(2,'0');
return [{json: cfg}];
`, [560, 400]));

// 4) Read Content Queue
nodes.push(gsRead('Read Content Queue', 'Content Queue', [820, 400]));

// 5) Filter Eligible Rows
nodes.push(codeAll('Filter Eligible Rows', `
const now = new Date();
const in14 = new Date(now.getTime() + 14*24*60*60*1000);
const config = $('Set Config Variables').first().json;
const rows = $input.all().filter(item => {
  const s = (item.json['Status'] || '').toString().trim().toUpperCase();
  if (s !== 'BRIEFREADY') return false;
  const pd = item.json['Publish Date'];
  if (!pd) return false;
  const d = new Date(pd);
  return d >= now && d <= in14;
});
if (rows.length === 0) {
  return [{json: { _no_rows: true, ...config }}];
}
return rows.map(r => ({json: { ...r.json, _no_rows: false, _config: config }}));
`, [1080, 400]));

// 6) IF No Eligible Rows
nodes.push(ifNode('IF No Eligible Rows', {
  options: { combinator: 'and' },
  conditions: [{ id: 'c1', leftValue: '={{ $json._no_rows }}', rightValue: true,
    operator: { type: 'boolean', operation: 'equals' } }]
}, [1340, 400]));

// 7) Run Log — No Rows
nodes.push(gsAppend('Run Log — No Rows', 'Run Log', {
  'Run ID': '={{ $json.run_id }}',
  'Workflow Name': 'Workflow A — Draft Generator',
  'Started At': '={{ $json.run_started_at }}',
  'Finished At': '={{ new Date().toISOString() }}',
  'Success Count': '0',
  'Failure Count': '0',
  'Notes': 'No eligible rows found'
}, [1620, 240]));

// 8) Init Counters
nodes.push(codeAll('Init Counters', `
const staticData = $getWorkflowStaticData('global');
staticData.success_count = 0;
staticData.failure_count = 0;
staticData.failed_row_ids = [];
return $input.all();
`, [1620, 520]));

// 9) Loop Over Items
nodes.push(n('Loop Over Items', 'splitInBatches', 3, {
  batchSize: 1, options: {}
}, [1880, 520]));

// 10) Validate Input
nodes.push(code('Validate Input', `
const row = $json;
const required = ['Theme','Content Pillar','Objective','Audience','CTA'];
const missing = required.filter(f => !row[f] || String(row[f]).trim() === '');
if (missing.length > 0) {
  return {json: {...row, _valid: false, _missing: missing.join(', ')}};
}
return {json: {...row, _valid: true}};
`, [2140, 520]));

// 11) IF Valid Input
nodes.push(ifNode('IF Valid Input', {
  options: { combinator: 'and' },
  conditions: [{ id: 'v1', leftValue: '={{ $json._valid }}', rightValue: true,
    operator: { type: 'boolean', operation: 'equals' } }]
}, [2400, 520]));

// 12) Update Missing Input
nodes.push(gsUpdate('Update Missing Input', 'Content Queue', {
  'Row ID': '={{ $json["Row ID"] }}',
  'Status': 'FAILEDGENERATION',
  'Error Code': 'MISSINGINPUT',
  'Last Updated At': '={{ new Date().toISOString() }}',
  'Retry Count': '={{ (parseInt($json["Retry Count"]) || 0) + 1 }}'
}, [2660, 720]));

// 13) Track Failure — Missing
nodes.push(code('Track Failure — Missing', `
const s = $getWorkflowStaticData('global');
s.failure_count = (s.failure_count || 0) + 1;
s.failed_row_ids = s.failed_row_ids || [];
s.failed_row_ids.push($json['Row ID'] || 'unknown');
return {json: $json};
`, [2920, 720]));

// 14) Mark In Progress
nodes.push(gsUpdate('Mark In Progress', 'Content Queue', {
  'Row ID': '={{ $json["Row ID"] }}',
  'Status': 'DRAFTGENERATING',
  'Last Updated At': '={{ new Date().toISOString() }}'
}, [2660, 400]));

// 15) Assemble Prompt
nodes.push(code('Assemble Prompt', `
const row = $json;
const cfg = row._config || $('Set Config Variables').first().json;
const prompt = \`You are a social media content writer for Carematix, a healthcare technology company.
Core message: Scale care with data, not staff.
Tone: Clear, confident, human, data-informed.
Brand personality: Trustworthy, practical, forward-thinking, accessible.
Key differentiators:
- Cellular-First: No app, no Bluetooth, no home internet required
- FDA-cleared device manufacturer, not importer or reseller
- Scale Without Staff: Manage 1000 patients without adding 10 FTEs
- Reimbursement-aligned: RPM 99453/99454, APCM G0557/G0558
- Works where others fail: rural, elderly, low-tech, limited connectivity environments

NEVER use these phrases in any output: improving patient engagement, revolutionary, game-changer, best-in-class, industry-leading, generic RPM definitions, feature-heavy posts without outcomes.
NEVER make unsupported clinical claims.
NEVER mention competitors (ThoroughCare, Prevounce, Tenovi) directly.
NEVER give patient-specific medical advice.
ALWAYS use active voice.
ALWAYS be direct and get to the point in the first sentence.
ALWAYS tie features to a real outcome or business impact.

LinkedIn: \${cfg.linkedin_word_range} words, professional B2B tone.
Required LinkedIn hashtags: #RPM #APCM #RemotePatientMonitoring #CareManagement #HealthcareLeaders

Facebook: \${cfg.facebook_word_range} words, simple and human tone.
Required Facebook hashtags: #HeartHealth #DiabetesAwareness #RPM #Carematix

Instagram: \${cfg.instagram_caption_length} words, short and punchy.
Required Instagram hashtags: #RPM #Carematix #RemotePatientMonitoring #HealthTech #ChronicCare

APPROVED SAMPLE POSTS (style reference only — do not copy):
LinkedIn example 1: Care plans are important. But without real patient data, they are still reactive. RPM turns care management into something continuous and actionable.
LinkedIn example 2: RPM does not fail because of technology. It fails because patients cannot use it. That is why connectivity has to be invisible.
Instagram example: Data is only the first step. What matters is what happens next. RPM should drive action — not just dashboards.

Now write content for the following row:
Theme: \${row['Theme']}
Content Pillar: \${row['Content Pillar']}
Objective: \${row['Objective']}
Audience: \${row['Audience']}
Suggested CTA: \${row['CTA']}

Return your response in this EXACT JSON format with no text outside the JSON block:
{
  "linkedin_draft": "...",
  "facebook_draft": "...",
  "instagram_caption": "...",
  "image_brief": "Brief description of what the Canva visual should show for this post",
  "suggested_cta": "..."
}\`;
return {json: {...row, _prompt: prompt, _temperature: cfg.temperature, _gemini_model: cfg.gemini_model, _openrouter_model: cfg.openrouter_model}};
`, [2920, 400]));

// 16) Call Gemini
nodes.push(n('Call Gemini', 'httpRequest', 4.2, {
  method: 'POST',
  url: '=https://generativelanguage.googleapis.com/v1beta/models/{{ $json._gemini_model }}:generateContent',
  authentication: 'genericCredentialType',
  genericAuthType: 'httpQueryAuth',
  sendBody: true,
  specifyBody: 'json',
  jsonBody: '={{ JSON.stringify({ contents: [{ parts: [{ text: $json._prompt }] }], generationConfig: { temperature: $json._temperature } }) }}',
  options: { timeout: 30000, allowUnauthorizedCerts: false, response: { response: { fullResponse: true } } }
}, [3180, 400], {
  creds: { httpQueryAuth: { id: 'gemini_cred', name: CRED_GEMINI } },
  continueOnFail: true
}));

// 17) Check Gemini Response
nodes.push(code('Check Gemini Response', `
const resp = $json;
let success = false;
let aiText = '';
try {
  const statusCode = resp.statusCode || resp.$response?.statusCode || 0;
  if (statusCode === 200 || resp.candidates) {
    const candidates = resp.candidates || resp.data?.candidates;
    if (candidates && candidates[0]?.content?.parts?.[0]?.text) {
      aiText = candidates[0].content.parts[0].text;
      success = true;
    }
  }
} catch(e) { /* fail silently, will fallback */ }
const prev = $('Assemble Prompt').first().json;
return {json: {...prev, _gemini_success: success, _ai_text: aiText, _raw_gemini: JSON.stringify(resp).substring(0,2000)}};
`, [3440, 400]));

// 18) IF Gemini OK
nodes.push(ifNode('IF Gemini OK', {
  options: { combinator: 'and' },
  conditions: [{ id: 'g1', leftValue: '={{ $json._gemini_success }}', rightValue: true,
    operator: { type: 'boolean', operation: 'equals' } }]
}, [3700, 400]));

// 19) Call OpenRouter
nodes.push(n('Call OpenRouter', 'httpRequest', 4.2, {
  method: 'POST',
  url: 'https://openrouter.ai/api/v1/chat/completions',
  authentication: 'genericCredentialType',
  genericAuthType: 'httpHeaderAuth',
  sendBody: true,
  specifyBody: 'json',
  jsonBody: '={{ JSON.stringify({ model: $json._openrouter_model, messages: [{ role: "user", content: $json._prompt }], temperature: $json._temperature }) }}',
  options: { timeout: 30000, allowUnauthorizedCerts: false, response: { response: { fullResponse: true } } }
}, [3960, 600], {
  creds: { httpHeaderAuth: { id: 'openrouter_cred', name: CRED_OPENROUTER } },
  continueOnFail: true
}));

// 20) Check OpenRouter Response
nodes.push(code('Check OpenRouter Response', `
const resp = $json;
let success = false;
let aiText = '';
try {
  const statusCode = resp.statusCode || resp.$response?.statusCode || 0;
  if (statusCode === 200 || resp.choices) {
    const choices = resp.choices || resp.data?.choices;
    if (choices && choices[0]?.message?.content) {
      aiText = choices[0].message.content;
      success = true;
    }
  }
} catch(e) {}
const prev = $('Assemble Prompt').first().json;
return {json: {...prev, _openrouter_success: success, _ai_text: aiText, _raw_openrouter: JSON.stringify(resp).substring(0,2000)}};
`, [4220, 600]));

// 21) IF OpenRouter OK
nodes.push(ifNode('IF OpenRouter OK', {
  options: { combinator: 'and' },
  conditions: [{ id: 'o1', leftValue: '={{ $json._openrouter_success }}', rightValue: true,
    operator: { type: 'boolean', operation: 'equals' } }]
}, [4480, 600]));

// 22) Handle API Failure
nodes.push(code('Handle API Failure', `
const row = $json;
return {json: {
  'Row ID': row['Row ID'],
  'Status': 'FAILEDGENERATION',
  'Error Code': 'APIFAILURE',
  'Review Notes': 'AI call failed — no response. Gemini: ' + (row._raw_gemini || 'N/A').substring(0,500) + ' | OpenRouter: ' + (row._raw_openrouter || 'N/A').substring(0,500),
  'Last Updated At': new Date().toISOString(),
  'Retry Count': (parseInt(row['Retry Count']) || 0) + 1,
  _original: row
}};
`, [4740, 780]));

// 23) Update API Failure
nodes.push(gsUpdate('Update API Failure', 'Content Queue', {
  'Row ID': '={{ $json["Row ID"] }}',
  'Status': '={{ $json.Status }}',
  'Error Code': '={{ $json["Error Code"] }}',
  'Review Notes': '={{ $json["Review Notes"] }}',
  'Last Updated At': '={{ $json["Last Updated At"] }}',
  'Retry Count': '={{ $json["Retry Count"] }}'
}, [5000, 780]));

// 24) Track Failure — API
nodes.push(code('Track Failure — API', `
const s = $getWorkflowStaticData('global');
s.failure_count = (s.failure_count || 0) + 1;
s.failed_row_ids = s.failed_row_ids || [];
s.failed_row_ids.push($json['Row ID'] || $json._original?.['Row ID'] || 'unknown');
return {json: $json};
`, [5260, 780]));

// 25) Parse Response (shared by both Gemini and OpenRouter success paths)
nodes.push(code('Parse Response', `
const row = $json;
const aiText = row._ai_text || '';
let parsed = null;
let parseOk = false;
try {
  const jsonMatch = aiText.match(/\\{[\\s\\S]*\\}/);
  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[0]);
    const fields = ['linkedin_draft','facebook_draft','instagram_caption','image_brief','suggested_cta'];
    parseOk = fields.every(f => parsed[f] && String(parsed[f]).trim() !== '');
  }
} catch(e) {}
return {json: {...row, _parsed: parsed, _parse_ok: parseOk, _raw_ai: aiText.substring(0,2000)}};
`, [4220, 300]));

// 26) IF Parse OK
nodes.push(ifNode('IF Parse OK', {
  options: { combinator: 'and' },
  conditions: [{ id: 'p1', leftValue: '={{ $json._parse_ok }}', rightValue: true,
    operator: { type: 'boolean', operation: 'equals' } }]
}, [4480, 300]));

// 27) Write Drafts
nodes.push(gsUpdate('Write Drafts', 'Content Queue', {
  'Row ID': '={{ $json["Row ID"] }}',
  'LinkedIn Draft': '={{ $json._parsed.linkedin_draft }}',
  'Facebook Draft': '={{ $json._parsed.facebook_draft }}',
  'Instagram Caption': '={{ $json._parsed.instagram_caption }}',
  'Image Brief': '={{ $json._parsed.image_brief }}',
  'CTA': '={{ $json._parsed.suggested_cta }}',
  'Status': 'DRAFTREADY',
  'Last Updated At': '={{ new Date().toISOString() }}'
}, [4740, 200]));

// 28) Track Success
nodes.push(code('Track Success', `
const s = $getWorkflowStaticData('global');
s.success_count = (s.success_count || 0) + 1;
return {json: $json};
`, [5000, 200]));

// 29) Handle Parse Failure
nodes.push(code('Handle Parse Failure', `
const row = $json;
return {json: {
  'Row ID': row['Row ID'],
  'Status': 'FAILEDGENERATION',
  'Error Code': 'PARSEFAILURE',
  'Review Notes': (row._raw_ai || row._ai_text || 'No AI response text').substring(0,1500),
  'Last Updated At': new Date().toISOString(),
  'Retry Count': (parseInt(row['Retry Count']) || 0) + 1,
  _original: row
}};
`, [4740, 480]));

// 30) Update Parse Failure
nodes.push(gsUpdate('Update Parse Failure', 'Content Queue', {
  'Row ID': '={{ $json["Row ID"] }}',
  'Status': '={{ $json.Status }}',
  'Error Code': '={{ $json["Error Code"] }}',
  'Review Notes': '={{ $json["Review Notes"] }}',
  'Last Updated At': '={{ $json["Last Updated At"] }}',
  'Retry Count': '={{ $json["Retry Count"] }}'
}, [5000, 480]));

// 31) Track Failure — Parse
nodes.push(code('Track Failure — Parse', `
const s = $getWorkflowStaticData('global');
s.failure_count = (s.failure_count || 0) + 1;
s.failed_row_ids = s.failed_row_ids || [];
s.failed_row_ids.push($json['Row ID'] || $json._original?.['Row ID'] || 'unknown');
return {json: $json};
`, [5260, 480]));

// 32) Prepare Run Log
nodes.push(codeAll('Prepare Run Log', `
const s = $getWorkflowStaticData('global');
const cfg = $('Set Config Variables').first().json;
const sc = s.success_count || 0;
const fc = s.failure_count || 0;
const failed = s.failed_row_ids || [];
const notes = fc > 0 ? 'Failed Row IDs: ' + failed.join(', ') : 'All rows processed successfully';
return [{json: {
  'Run ID': cfg.run_id,
  'Workflow Name': 'Workflow A — Draft Generator',
  'Started At': cfg.run_started_at,
  'Finished At': new Date().toISOString(),
  'Success Count': String(sc),
  'Failure Count': String(fc),
  'Notes': notes
}}];
`, [5520, 520]));

// 33) Write Run Log
nodes.push(gsAppend('Write Run Log', 'Run Log', {
  'Run ID': '={{ $json["Run ID"] }}',
  'Workflow Name': '={{ $json["Workflow Name"] }}',
  'Started At': '={{ $json["Started At"] }}',
  'Finished At': '={{ $json["Finished At"] }}',
  'Success Count': '={{ $json["Success Count"] }}',
  'Failure Count': '={{ $json["Failure Count"] }}',
  'Notes': '={{ $json.Notes }}'
}, [5780, 520]));

// ── CONNECTIONS ────────────────────────────────────────────────────────
const conn = (from, to, fromOut = 0, toIn = 0) => ({ from, to, fromOut, toIn });

const connectionDefs = [
  conn('Manual Trigger', 'Read Prompt Config'),
  conn('Schedule Trigger', 'Read Prompt Config'),
  conn('Read Prompt Config', 'Set Config Variables'),
  conn('Set Config Variables', 'Read Content Queue'),
  conn('Read Content Queue', 'Filter Eligible Rows'),
  conn('Filter Eligible Rows', 'IF No Eligible Rows'),
  conn('IF No Eligible Rows', 'Run Log — No Rows', 0),       // true = no rows
  conn('IF No Eligible Rows', 'Init Counters', 1),            // false = has rows
  conn('Init Counters', 'Loop Over Items'),
  conn('Loop Over Items', 'Prepare Run Log', 0),              // done output
  conn('Loop Over Items', 'Validate Input', 1),               // each item
  conn('Validate Input', 'IF Valid Input'),
  conn('IF Valid Input', 'Mark In Progress', 0),               // true = valid
  conn('IF Valid Input', 'Update Missing Input', 1),           // false = invalid
  conn('Update Missing Input', 'Track Failure — Missing'),
  conn('Track Failure — Missing', 'Loop Over Items'),          // loop back
  conn('Mark In Progress', 'Assemble Prompt'),
  conn('Assemble Prompt', 'Call Gemini'),
  conn('Call Gemini', 'Check Gemini Response'),
  conn('Check Gemini Response', 'IF Gemini OK'),
  conn('IF Gemini OK', 'Parse Response', 0),                   // true = gemini ok
  conn('IF Gemini OK', 'Call OpenRouter', 1),                  // false = try openrouter
  conn('Call OpenRouter', 'Check OpenRouter Response'),
  conn('Check OpenRouter Response', 'IF OpenRouter OK'),
  conn('IF OpenRouter OK', 'Parse Response', 0),               // true = openrouter ok
  conn('IF OpenRouter OK', 'Handle API Failure', 1),           // false = both failed
  conn('Handle API Failure', 'Update API Failure'),
  conn('Update API Failure', 'Track Failure — API'),
  conn('Track Failure — API', 'Loop Over Items'),              // loop back
  conn('Parse Response', 'IF Parse OK'),
  conn('IF Parse OK', 'Write Drafts', 0),                      // true = parse ok
  conn('IF Parse OK', 'Handle Parse Failure', 1),              // false = parse failed
  conn('Write Drafts', 'Track Success'),
  conn('Track Success', 'Loop Over Items'),                    // loop back
  conn('Handle Parse Failure', 'Update Parse Failure'),
  conn('Update Parse Failure', 'Track Failure — Parse'),
  conn('Track Failure — Parse', 'Loop Over Items'),            // loop back
  conn('Prepare Run Log', 'Write Run Log')
];

// Build connections object
const connections = {};
for (const c of connectionDefs) {
  if (!connections[c.from]) connections[c.from] = { main: [] };
  const main = connections[c.from].main;
  while (main.length <= c.fromOut) main.push([]);
  main[c.fromOut].push({ node: c.to, type: 'main', index: c.toIn });
}

// ── WORKFLOW ───────────────────────────────────────────────────────────
const workflow = {
  name: 'Carematix — Workflow A — Weekly Draft Generator',
  nodes,
  connections,
  active: false,
  settings: {
    executionOrder: 'v1',
    saveManualExecutions: true,
    callerPolicy: 'workflowsFromSameOwner',
    timezone: 'America/New_York'
  },
  versionId: '1',
  meta: {
    instanceId: 'carematix-social-media',
    templateCredsSetupCompleted: true
  },
  tags: [{ name: 'Carematix' }, { name: 'Social Media' }, { name: 'Content Generation' }]
};

const outPath = __dirname + '/carematix-workflow-a-draft-generator.json';
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Workflow JSON written to: ' + outPath);
console.log('Total nodes: ' + nodes.length);
console.log('Total connections: ' + connectionDefs.length);
