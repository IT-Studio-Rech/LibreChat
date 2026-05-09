const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });

const connect = require('./connect');
const { Agent, User } = require('~/db/models');

const DEFAULT_MODEL = process.env.TFW_DEFAULT_MODEL || 'claude-sonnet-4-6';
const DEFAULT_PROVIDER = process.env.TFW_DEFAULT_PROVIDER || 'anthropic';

function loadInstructions(promptFile) {
  const basePath = path.join(__dirname, '..', 'prompts', 'base.md');
  const agentPath = path.join(__dirname, '..', 'prompts', promptFile);
  const base = fs.readFileSync(basePath, 'utf8');
  const agent = fs.readFileSync(agentPath, 'utf8');
  return `${base}\n\n---\n\n${agent}`;
}

const agentDefs = [
  {
    name: 'Nische & Angebot',
    description: 'Hilft dir deinen Kundenavatar zu finden und dein Angebot zu schärfen.',
    promptFile: 'nische-angebot.md',
    requiredActions: ['save_icp', 'update_icp', 'get_icp'],
  },
  {
    name: 'Sales Assistent',
    description: 'Schreibt mit dir personalisierte Outreach-Drafts und hält deine Leads im Blick.',
    promptFile: 'sales-assistant.md',
    requiredActions: ['list_leads', 'add_lead', 'update_lead', 'get_lead', 'delete_lead'],
  },
  {
    name: 'Tara Wiki',
    description:
      'Antwortet auf deine Fragen mit Inhalten aus Taras Coaching-Material — mit Quellenangaben.',
    promptFile: 'tara-wiki.md',
    requiredActions: ['search_vault', 'get_note'],
  },
  {
    name: 'Webseiten-Feedback',
    description:
      'Schaut sich deine Webseite an und gibt dir konkretes Feedback zu Design, UX und Conversion.',
    promptFile: 'webseiten-feedback.md',
    requiredActions: ['fetch_website'],
  },
];

async function seedAgents() {
  await connect();

  const adminUser = await User.findOne({ role: 'ADMIN' }).lean();
  if (!adminUser) {
    console.error(
      'No ADMIN user found. Please register a user and set their role to ADMIN before seeding agents.',
    );
    process.exit(1);
  }

  console.log(`Found admin user: ${adminUser.email}`);

  let created = 0;
  let skipped = 0;

  for (const agentDef of agentDefs) {
    const existing = await Agent.findOne({ name: agentDef.name }).lean();
    if (existing) {
      console.log(`skipped: ${agentDef.name}`);
      skipped++;
      continue;
    }

    const instructions = loadInstructions(agentDef.promptFile);

    await Agent.create({
      id: `agent_${uuidv4()}`,
      name: agentDef.name,
      description: agentDef.description,
      instructions,
      model: DEFAULT_MODEL,
      provider: DEFAULT_PROVIDER,
      is_promoted: true,
      author: adminUser._id,
      authorName: adminUser.name || adminUser.username || adminUser.email,
      avatar: { filepath: '/assets/agent-placeholder.svg', source: 'local' },
      tools: [],
      actions: [],
      conversation_starters: [],
      edges: [],
      versions: [],
      tool_resources: {},
    });

    console.log(`created: ${agentDef.name}`);
    created++;
  }

  console.log(`\nCreated: ${created}, Skipped: ${skipped}, Total: ${agentDefs.length}`);

  console.log('\nNote: Tool/Action attachments must be configured manually via the Agent Builder UI in the admin dashboard.');
  console.log('Required actions per agent:');
  for (const agentDef of agentDefs) {
    console.log(`  - ${agentDef.name}: ${agentDef.requiredActions.join(', ')}`);
  }

  process.exit(0);
}

seedAgents().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
