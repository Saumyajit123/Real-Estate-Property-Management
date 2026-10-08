const express = require('express');
const router = express.Router();
const AgentController= require('../../controllers/APIs/AgentController');
const Validation = require('../../validations/validation');
const {changePasswordSchema} = require('../../validations/OwnerSchemaValidation');
const upload = require('../../utils/multer');
const {agentRegisterSchema, updateAgentProfileSchema} = require('../../validations/agentSchema')
const { authorizeRoles, authMiddleware } = require('../../middlewares/authMiddleware');
const { updateOwnerStatusSchema } = require('../../validations/ownerSchema');
const parseAgentFormData = require('../../middlewares/parseAgentFormData');

router.post("/createagent",upload.single('image'),parseAgentFormData,Validation.validate(agentRegisterSchema),AgentController.createAgent);
router.get("/logout",authMiddleware,AgentController.logout);
router.get("/getprofile",authMiddleware,AgentController.getProfile);
router.put("/profile/update",authMiddleware,upload.single('image'),Validation.validate(updateAgentProfileSchema),AgentController.updateProfile,);
router.post("/change-password",authMiddleware,Validation.validate(changePasswordSchema),AgentController.changePassword);
router.all("/admin/agents/allagents",authMiddleware,authorizeRoles("admin"),AgentController.getAllAgents);

router.all(
  "/admin/agents/:id",
  authMiddleware,
  authorizeRoles("admin"),
  AgentController.getAgentById,
);



router.all(
  "/admin/agents/update/:id/status",
  authMiddleware,
  authorizeRoles("admin"),
  Validation.validate(updateOwnerStatusSchema),
  AgentController.updateAgentStatus,
);

router.all(
  "/admin/agents/delete/:id",
  authMiddleware,
  authorizeRoles("admin"),
  AgentController.deleteAgent,
);



module.exports=router