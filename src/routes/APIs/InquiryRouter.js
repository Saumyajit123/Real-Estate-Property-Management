const express = require('express');
const router = express.Router();
const InquiryController = require('../../controllers/APIs/InquiryController');
const { authMiddleware, authorizeRoles } = require('../../middlewares/authMiddleware');

router.post("/createInquiry",authMiddleware,authorizeRoles('customer'),InquiryController.createInquiry);
router.get("/getInquiry",authMiddleware,authorizeRoles('customer'),InquiryController.getMyInquiries);
router.get("/getInquiryById/:id",authMiddleware,authorizeRoles('customer','admin','owner','agent'),InquiryController.getInquiryById);
router.get("/getAgentInquiries",authMiddleware,authorizeRoles('agent'),InquiryController.getAgentInquiries);
router.get("/getAllInquiry",authMiddleware,authorizeRoles('admin'),InquiryController.getAllInquiries);
router.put("/updateInquiryStatus",authMiddleware,authorizeRoles('agent'),InquiryController.updateInquiryStatus);
router.patch("/replyToInquiry",authMiddleware,authorizeRoles('agent'),InquiryController.replyToInquiry);
router.delete("/deleteInquiry",authMiddleware,InquiryController.deleteInquiry);



module.exports = router

