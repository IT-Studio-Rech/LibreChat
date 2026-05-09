export const userContextOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'User Context (ICP) Service',
    version: '0.1.0',
  },
  paths: {
    '/icp/{userId}': {
      get: {
        operationId: 'get_icp',
        summary: 'Get user ICP profile',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'ICP profile' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        operationId: 'update_icp',
        summary: 'Partially update ICP profile',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateICP' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated ICP profile' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        operationId: 'delete_icp',
        summary: 'Delete ICP profile (DSGVO §17)',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '204': { description: 'Deleted' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/icp': {
      post: {
        operationId: 'save_icp',
        summary: 'Upsert user ICP profile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateICP' },
            },
          },
        },
        responses: {
          '200': { description: 'Upserted ICP profile' },
        },
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
