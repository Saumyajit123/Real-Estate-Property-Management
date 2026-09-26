const statuscode = require("../../utils/statuscode");
const Property = require("../../models/property");

class PropertyController {
  async createproperty(req, res) {
    try {
      const {
        title,
        description,
        propertyType,
        purpose,
        price,
        area,
        bedrooms,
        bathrooms,
        furnishingStatus,
        amenities,
        status,
        approvalStatus,
      } = req.body;

      // const user = await User.findById(req.user.id);
      // const secretKey = req.headers["x-secret-key"]
      // if(!secretKey){
      //     return res.status(statuscode.NOT_FOUND).json({
      //         status:false.valueOf,
      //         message:"secret key is required"
      //     })
      // }
      // if(secretKey !== req.user.secretKey){
      //     return res.status(statuscode.NOT_FOUND).json({
      //         status:false.valueOf,
      //         message:"place provide valid secret key"
      //     })
      // }

      const location = {
        type: req.body["location.type"],
        coordinates: JSON.parse(req.body["location.coordinates"]),
      };

      const newProperty = new Property({
        title: title,
        description: description,
        propertyType: propertyType,
        purpose: purpose,
        price: price,
        area: area,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        furnishingStatus: furnishingStatus,
        amenities: amenities,
        status: status,
        approvalStatus: approvalStatus,
        location: location,
      });

      if (req.files && req.files.length > 0) {
        newProperty.images = req.files.map((file) => ({
          image: file.path,
          public_id: file.filename,
        }));
      }

      const propertyData = await newProperty.save();
      if (!propertyData) {
        return res.status(statuscode.NOT_FOUND).json({
          status: false,
          message: "Property is not created",
        });
      } else {
        return res.status(statuscode.OK).json({
          status: true,
          message: "Property is created succesfully",
          data: propertyData,
        });
      }
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }
}
module.exports = new PropertyController();
