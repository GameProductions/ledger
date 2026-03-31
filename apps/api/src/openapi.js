export const openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Ledger API',
        version: '1.0.0',
        description: 'API for the Ledger finance project at api.gpnet.dev/ledger'
    },
    servers: [
        {
            url: 'https://api.gpnet.dev/ledger',
            description: 'Production'
        }
    ],
    paths: {
        '/ping': {
            get: {
                summary: 'Health Check',
                responses: {
                    '200': {
                        description: 'Success',
                        content: {
                            'text/plain': {
                                schema: { type: 'string', example: 'PONG - LEDGER IS LIVE' }
                            }
                        }
                    }
                }
            }
        },
        '/api/me': {
            get: {
                summary: 'Get current user profile',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Current user info',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        userId: { type: 'string' },
                                        householdId: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/categories': {
            get: {
                summary: 'List categories',
                security: [{ BearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'List of categories',
                        content: {
                            'application/json': {
                                schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } }
                            }
                        }
                    }
                }
            }
        },
        '/api/transactions': {
            get: {
                summary: 'List transactions',
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                    { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
                ],
                responses: {
                    '200': {
                        description: 'List of transactions',
                        content: {
                            'application/json': {
                                schema: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } }
                            }
                        }
                    }
                }
            },
            post: {
                summary: 'Create a transaction',
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/TransactionCreate' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Success',
                        content: {
                            'application/json': {
                                schema: { type: 'object', properties: { success: { type: 'boolean' }, id: { type: 'string' } } }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            Category: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    household_id: { type: 'string' }
                }
            },
            Transaction: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    description: { type: 'string' },
                    amount_cents: { type: 'integer' },
                    transaction_date: { type: 'string', format: 'date' },
                    account_id: { type: 'string' },
                    category_id: { type: 'string' }
                }
            },
            TransactionCreate: {
                type: 'object',
                required: ['description', 'amount_cents', 'account_id', 'category_id'],
                properties: {
                    description: { type: 'string' },
                    amount_cents: { type: 'integer' },
                    account_id: { type: 'string' },
                    category_id: { type: 'string' },
                    transaction_date: { type: 'string', format: 'date' }
                }
            }
        }
    }
};
