const express = require('express');
const router = express.Router();
const FavoriteController = require('../../controllers/APIs/FavoriteController');
const { authMiddleware, authorizeRoles } = require('../../middlewares/authMiddleware');

router.post("/addFavorite/:PropertyId",authMiddleware,authorizeRoles('customer'),FavoriteController.addFavorite);
router.delete("/removeFavorite/:PropertyId",authMiddleware,authorizeRoles('customer'),FavoriteController.removeFavorite);
router.get("/findFavorite",authMiddleware,authorizeRoles('customer'),FavoriteController.findMyFavorite);


module.exports=router