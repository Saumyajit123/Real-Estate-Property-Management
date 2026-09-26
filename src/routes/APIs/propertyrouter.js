const express = require('express');
const router = express.Router();
const PropertyController = require('../../controllers/APIs/PropertyController')
const upload = require('../../utils/multer')
// const Validation = require()

router.post("/create-property",upload.array('images',5),PropertyController.createproperty)


module.exports=router