const Joi = require("joi");


// UPDATE AGENT
const updateAgentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),

  email: Joi.string().trim().email().optional(),

  phone: Joi.string()
    .trim()
    .pattern(/^[1-9]\d{9}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must contain 10 digits",
    }),
}).min(1);

// UPDATE AGENT ROLE
const updateAgentRoleSchema = Joi.object({
  role: Joi.string().valid("agent", "owner", "customer").required().messages({
    "any.only": "Role must be agent, owner or customer",
    "any.required": "Role is required",
  }),
});

// UPDATE AGENT STATUS
const updateAgentStatusSchema = Joi.object({
  status: Joi.string()
    .valid("active", "inactive", "blocked")
    .required()
    .messages({
      "any.only": "Invalid agent status",
      "any.required": "Status is required",
    }),
});

// AGENT ID
const agentIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid agent ID",
      "any.required": "Agent ID is required",
    }),
});

// GET ALL AGENTS
const getAllAgentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  search: Joi.string().trim().allow("").optional(),

  status: Joi.string().valid("active", "inactive", "blocked").optional(),

  isEmailVerified: Joi.boolean().optional(),

  sortBy: Joi.string()
    .valid("name", "email", "createdAt", "updatedAt", "status")
    .default("createdAt"),

  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

module.exports = {
  updateAgentSchema,
  updateAgentRoleSchema,
  updateAgentStatusSchema,
  agentIdSchema,
  getAllAgentsSchema,
};
