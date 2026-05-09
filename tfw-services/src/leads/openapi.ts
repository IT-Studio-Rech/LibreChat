export const leadsOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'Lead Memory Service',
    version: '0.1.0',
  },
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
        responses: {
          '200': { description: 'Paginated lead list with nextCursor' },
        },
      },
    },
    '/leads': {
      post: {
        operationId: 'add_lead',
        summary: 'Create a new lead',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateLead' },
            },
          },
        },
        responses: {
          '201': { description: 'Created lead' },
        },
      },
    },
    '/leads/single/{leadId}': {
      get: {
        operationId: 'get_lead',
        summary: 'Get a single lead by ID',
        parameters: [
          { name: 'leadId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Lead document' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        operationId: 'update_lead',
        summary: 'Update a lead',
        parameters: [
          { name: 'leadId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateLead' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated lead' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        operationId: 'delete_lead',
        summary: 'Delete a lead (DSGVO §17)',
        parameters: [
          { name: 'leadId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '204': { description: 'Deleted' },
          '404': { description: 'Not found' },
        },
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
