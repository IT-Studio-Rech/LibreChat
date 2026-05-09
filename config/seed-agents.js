const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { AccessRoleIds, ResourceType, PrincipalType } = require('librechat-data-provider');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });

const connect = require('./connect');
const { Agent, User, Action } = require('~/db/models');
const { grantPermission } = require('~/server/services/PermissionService');

const DEFAULT_MODEL = process.env.TFW_DEFAULT_MODEL || 'claude-sonnet-4-6';
const DEFAULT_PROVIDER = process.env.TFW_DEFAULT_PROVIDER || 'anthropic';
const TFW_SERVICES_BASE_URL = process.env.TFW_SERVICES_BASE_URL || 'http://localhost:3001';

function loadInstructions(promptFile) {
  const basePath = path.join(__dirname, '..', 'prompts', 'base.md');
  const agentPath = path.join(__dirname, '..', 'prompts', promptFile);
  const base = fs.readFileSync(basePath, 'utf8');
  const agent = fs.readFileSync(agentPath, 'utf8');
  return `${base}\n\n---\n\n${agent}`;
}

// ICP OpenAPI spec — subset for Nische & Angebot agent
const ICP_SPEC = {
  openapi: '3.0.3',
  info: { title: 'TFW User Context (ICP) Service', version: '0.1.0' },
  servers: [{ url: TFW_SERVICES_BASE_URL }],
  paths: {
    '/icp/{userId}': {
      get: {
        operationId: 'get_icp',
        summary: 'Get user ICP profile',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'ICP profile' }, '404': { description: 'Not found' } },
      },
      put: {
        operationId: 'update_icp',
        summary: 'Partially update ICP profile',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateICP' } } },
        },
        responses: { '200': { description: 'Updated ICP profile' }, '404': { description: 'Not found' } },
      },
    },
    '/icp': {
      post: {
        operationId: 'save_icp',
        summary: 'Upsert user ICP profile',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateICP' } } },
        },
        responses: { '200': { description: 'Upserted ICP profile' } },
      },
    },
  },
  components: {
    schemas: {
      CreateICP: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'string' },
          icp_json: { type: 'object', additionalProperties: true },
          coaching_step: { type: 'string' },
          onboarding: { type: 'object', additionalProperties: true },
        },
      },
      UpdateICP: {
        type: 'object',
        properties: {
          icp_json: { type: 'object', additionalProperties: true },
          coaching_step: { type: 'string' },
          onboarding: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
};

// Leads OpenAPI spec — subset for Sales Assistent agent
const LEADS_SPEC = {
  openapi: '3.0.3',
  info: { title: 'TFW Lead Memory Service', version: '0.1.0' },
  servers: [{ url: TFW_SERVICES_BASE_URL }],
  paths: {
    '/leads/{userId}': {
      get: {
        operationId: 'list_leads',
        summary: 'List leads for a user',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'filter', in: 'query', schema: { type: 'string', enum: ['due'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['cold', 'warm', 'hot', 'closed'] } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { '200': { description: 'Paginated lead list with nextCursor' } },
      },
    },
    '/leads': {
      post: {
        operationId: 'add_lead',
        summary: 'Create a new lead',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateLead' } } },
        },
        responses: { '201': { description: 'Created lead' } },
      },
    },
    '/leads/single/{leadId}': {
      get: {
        operationId: 'get_lead',
        summary: 'Get a single lead by ID',
        parameters: [{ name: 'leadId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Lead document' }, '404': { description: 'Not found' } },
      },
      patch: {
        operationId: 'update_lead',
        summary: 'Update a lead',
        parameters: [{ name: 'leadId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateLead' } } },
        },
        responses: { '200': { description: 'Updated lead' }, '404': { description: 'Not found' } },
      },
      delete: {
        operationId: 'delete_lead',
        summary: 'Delete a lead (DSGVO §17)',
        parameters: [{ name: 'leadId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
  },
  components: {
    schemas: {
      CreateLead: {
        type: 'object',
        required: ['user_id', 'lead_name'],
        properties: {
          user_id: { type: 'string' },
          lead_name: { type: 'string' },
          platform: { type: 'string', enum: ['linkedin', 'instagram', 'other'] },
          status: { type: 'string', enum: ['cold', 'warm', 'hot', 'closed'] },
          notes: { type: 'string' },
          next_action: { type: 'string' },
          next_action_date: { type: 'string', format: 'date-time' },
          chat_snippets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                snippet: { type: 'string' },
                date: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      UpdateLead: {
        type: 'object',
        properties: {
          lead_name: { type: 'string' },
          platform: { type: 'string', enum: ['linkedin', 'instagram', 'other'] },
          status: { type: 'string', enum: ['cold', 'warm', 'hot', 'closed'] },
          notes: { type: 'string' },
          next_action: { type: 'string' },
          next_action_date: { type: 'string', format: 'date-time' },
          chat_snippets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                snippet: { type: 'string' },
                date: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  },
};

const agentDefs = [
  {
    name: 'Nische & Angebot',
    description: 'Hilft dir deinen Kundenavatar zu finden und dein Angebot zu schärfen.',
    promptFile: 'nische-angebot.md',
    actionSpec: ICP_SPEC,
    actionTag: 'tfw-icp-action',
  },
  {
    name: 'Sales Assistent',
    description: 'Schreibt mit dir personalisierte Outreach-Drafts und hält deine Leads im Blick.',
    promptFile: 'sales-assistant.md',
    actionSpec: LEADS_SPEC,
    actionTag: 'tfw-leads-action',
  },
  {
    name: 'Tara Wiki',
    description:
      'Antwortet auf deine Fragen mit Inhalten aus Taras Coaching-Material — mit Quellenangaben.',
    promptFile: 'tara-wiki.md',
    actionSpec: null, // MCP-only — no REST action
  },
  {
    name: 'Webseiten-Feedback',
    description:
      'Schaut sich deine Webseite an und gibt dir konkretes Feedback zu Design, UX und Conversion.',
    promptFile: 'webseiten-feedback.md',
    actionSpec: null, // MCP-only — no REST action
  },
];

const GLOBAL_PROJECT_NAME = 'instance';

/**
 * Adds an agent to the global project and grants PUBLIC viewer + author owner ACL.
 * Uses $addToSet (projects collection) and upsert-based grantPermission — fully idempotent.
 * @param {import('mongoose')} mongoose
 * @param {{ _id: import('mongoose').Types.ObjectId, id: string, author: import('mongoose').Types.ObjectId }} agent
 */
async function grantGlobalPermissions(mongoose, agent) {
  const db = mongoose.connection.db;

  await db
    .collection('projects')
    .updateOne(
      { name: GLOBAL_PROJECT_NAME },
      { $addToSet: { agentIds: agent.id } },
      { upsert: true },
    );

  await grantPermission({
    principalType: PrincipalType.USER,
    principalId: agent.author,
    resourceType: ResourceType.AGENT,
    resourceId: agent._id,
    accessRoleId: AccessRoleIds.AGENT_OWNER,
    grantedBy: agent.author,
  });

  await grantPermission({
    principalType: PrincipalType.PUBLIC,
    principalId: null,
    resourceType: ResourceType.AGENT,
    resourceId: agent._id,
    accessRoleId: AccessRoleIds.AGENT_VIEWER,
    grantedBy: agent.author,
  });
}

/**
 * Derives the domain from TFW_SERVICES_BASE_URL (required by Action.metadata.domain).
 * Example: "http://localhost:3001" → "localhost"
 */
function deriveDomain(baseUrl) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return 'localhost';
  }
}

/**
 * Upserts a LibreChat Action document for a given agent.
 * Returns { action_id, created } where created=false means it was found existing.
 */
async function upsertAction(agentDef, adminUserId) {
  const { actionSpec, actionTag, name } = agentDef;

  // Idempotency: find by tag stored in type field
  const existing = await Action.findOne({ type: actionTag, user: adminUserId }).lean();
  if (existing) {
    return { action_id: existing.action_id, created: false };
  }

  const action_id = uuidv4();
  const sharedSecret = process.env.TFW_SERVICES_SHARED_SECRET || '';

  await Action.create({
    user: adminUserId,
    action_id,
    type: actionTag,
    agent_id: null, // linked via agent.actions array, not this field
    metadata: {
      domain: deriveDomain(TFW_SERVICES_BASE_URL),
      raw_spec: JSON.stringify(actionSpec),
      // Bearer auth via custom header — tfw-services uses X-TFW-Secret + X-User-Id
      auth: {
        type: 'service_http',
        authorization_type: 'custom',
        custom_auth_header: 'X-TFW-Secret',
      },
      // api_key stores the shared secret for service_http/custom auth
      api_key: sharedSecret,
    },
    settings: {},
  });

  return { action_id, created: true };
}

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
  let actionsWired = 0;
  let actionsSkipped = 0;

  for (const agentDef of agentDefs) {
    const existing = await Agent.findOne({ name: agentDef.name }).lean();

    let agentId;
    if (existing) {
      console.log(`skipped: ${agentDef.name}`);
      skipped++;
      agentId = existing.id;
    } else {
      const instructions = loadInstructions(agentDef.promptFile);
      const newAgent = await Agent.create({
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
      agentId = newAgent.id;

      try {
        await grantGlobalPermissions(mongoose, newAgent);
        console.log(`  → global ACL granted: ${agentDef.name}`);
      } catch (err) {
        console.error(`  ! Failed to grant global ACL for ${agentDef.name}: ${err.message}`);
      }
    }

    // Wire REST action if this agent has a spec
    if (!agentDef.actionSpec) {
      continue;
    }

    try {
      const { action_id, created: actionCreated } = await upsertAction(agentDef, adminUser._id);

      // Link action_id to agent.actions (idempotent via $addToSet)
      await Agent.updateOne(
        { id: agentId },
        { $addToSet: { actions: action_id } },
      );

      if (actionCreated) {
        console.log(`  → action wired: ${agentDef.actionTag} (${action_id})`);
        actionsWired++;
      } else {
        console.log(`  → action already exists: ${agentDef.actionTag}`);
        actionsSkipped++;
      }
    } catch (err) {
      console.error(`  ! Failed to wire action for ${agentDef.name}: ${err.message}`);
      console.error('    Manual fallback: import the OpenAPI spec via Agent Builder UI');
    }
  }

  console.log(`\nCreated: ${created}, Skipped: ${skipped}, Total: ${agentDefs.length}`);
  console.log(`Actions wired: ${actionsWired} | Skipped (already exist): ${actionsSkipped} | MCP-only agents (Tara Wiki, Webseiten-Feedback): manual MCP-server registration in librechat.yaml needed`);

  if (actionsWired > 0 || actionsSkipped > 0) {
    console.log('\nNote: Actions use X-TFW-Secret header auth (shared secret from TFW_SERVICES_SHARED_SECRET).');
    console.log('The agent also needs to pass X-User-Id per request — this is handled by the agent instructions.');
  }

  process.exit(0);
}

seedAgents().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
