const express = require('express');
const router = express.Router();
const InquiryController = require('../../controllers/APIs/InquiryController');
const { authMiddleware, authorizeRoles } = require('../../middlewares/authMiddleware');

router.post("/createInquiry",authMiddleware,authorizeRoles('customer'),InquiryController.createInquiry);
router.put("/updateInquiry/:id",authMiddleware,authorizeRoles('customer'),InquiryController.updateInquiry);
router.get("/getInquiry",authMiddleware,authorizeRoles('customer'),InquiryController.getMyInquiries);
router.get("/getInquiryById/:id",authMiddleware,InquiryController.getInquiryById);
router.get("/getAgentInquiries",authMiddleware,authorizeRoles('agent'),InquiryController.getAgentInquiries);
router.get("/getAllInquiry",authMiddleware,authorizeRoles('admin'),InquiryController.getAllInquiries);
router.put("/updateInquiryStatus/:id",authMiddleware,authorizeRoles('agent','owner'),InquiryController.updateInquiryStatus);
router.patch("/replyToInquiry/:id",authMiddleware,authorizeRoles('agent','owner'),InquiryController.replyToInquiry);
router.delete("/deleteInquiry/:id",authMiddleware,InquiryController.deleteInquiry);
router.get("/owner/inquiries",authMiddleware,authorizeRoles("owner"),InquiryController.getOwnerInquiries)



module.exports = router

