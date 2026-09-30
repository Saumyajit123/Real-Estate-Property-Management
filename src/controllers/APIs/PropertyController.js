const statuscode = require("../../utils/statuscode");
const Property = require("../../models/property");
const cloudinary = require("../../config/cloudinary.config");
const User = require('../../models/userModel')

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
        location
      } = req.body;

      const user = await User.findById(req.user._id);
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
        approvalStatus: "Pending",
        location: location,
        owner:user._id,
        agent:user._id
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

  async updateProperty(req,res) {
    try {
      const { id } = req.params;
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
        location
      } = req.body;

      const propertyById = await Property.findById(id);

      let images = propertyById.images;

      if (req.files && req.files.length > 0) {
        for (let img of propertyById.images) {
          await cloudinary.uploader.destroy(img.public_id);
        }

        images = req.files.map((file) => ({
          image: file.path,
          public_id: file.filename,
        }));

        const propertydata = await Property.findByIdAndUpdate(
          {
            _id: id,
            isDeleted: false,
          },
          {
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
            location,
            images,
          },
          {
            new:true,
            runValidators:true
          }
        );

        if(!propertydata){
          return res.status(statuscode.NOT_FOUND).json({
            status:false,
            message:"Property is not updated"
          })
        }else{
          return res.status(statuscode.OK).json({
            status:true,
            message:"Property updated succesfully",
            data:propertydata
          })
        }
      }
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async findAllProperty(req,res){
    try {
      const {propertyTitle,minprice,maxprice}= req.query;

      const page = req.query.page || 1;
      const limit = req.query.limit || 5;
      const skip = (page-1)*limit;

      const query = {};


      if(propertyTitle){
        req.title={$rejex:propertyTitle,$options:"i"}
      }

      if(minprice || maxprice){
        query.price={};
        if(minprice){
          query.price.$gt=Number(minprice);
        }
        if(maxprice){
          query.price.$lt = Number(maxprice)
        }
      }

      if(!req.user){
        const propertyData = await Property.find({
          ...query,
          approvalStatus:"Approved",
          isDeleted:false
        }).sort({createdAt:-1}).limit(limit).skip(skip);

        const totalProperty = await Property.countDocuments({
          ...query,
          approvalStatus:"Approved",
          isDeleted:false
        })

        return res.status(statuscode.OK).json({
          status:true,
          message:"Published Property",
          count:totalProperty,
          currentPage:page,
          totalpage:Math.ceil(totalProperty/limit),
          data:propertyData
        })
      }

      const user = await User.findById(req.user._id);

      if(!user){
        return res.status(statuscode.NOT_FOUND).json({
          status:false,
          message:"User not found"
        })
      }

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

      if(user.role ==="owner"){
        const propertyData = await Property.find({
          ...query,
          owner:user._id,
          isDeleted:false
        }).sort({createdAt:-1}).limit(limit).skip(skip)

        const totalProperty = await Property.countDocuments({
          ...query,
          owner:user._id,
          isDeleted:false
        })

        return res.status(statuscode.OK).json({
          status:true,
          message:"Only see ypu property",
          totalProperty:totalProperty,
          currentPage:page,
          totalpage:Math.ceil(totalProperty/limit),
          data:propertyData
        })
      }
      if(user.role ==="admin"){
        const propertyData = await Property.find({
          ...query,
          isDeleted:false
        }).sort({createdAt:-1}).limit(limit).skip(skip)

        const totalProperty = await Property.countDocuments({
          ...query,
          isDeleted:false
        })

        return res.status(statuscode.OK).json({
          status:true,
          message:"Only see ypu property",
          totalProperty:totalProperty,
          currentPage:page,
          totalpage:Math.ceil(totalProperty/limit),
          data:propertyData
        })
      }

      if(user.role ==="customer"){
        const propertyData = await Property.find({
          ...query,
          approvalStatus:"Approved",
          isDeleted:false
        }).sort({createdAt:-1}).limit(limit).skip(skip)

        const totalProperty = await Property.countDocuments({
          ...query,
          approvalStatus:"Approved",
          isDeleted:false
        })

        return res.status(statuscode.OK).json({
          status:true,
          message:"Only see ypu property",
          totalProperty:totalProperty,
          currentPage:page,
          totalpage:Math.ceil(totalProperty/limit),
          data:propertyData
        })
      }     
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async SoftdeleteProperty(req,res){
    try {
      const {id}= req.params;
      const propertyData = await Property.findByIdAndUpdate(
        {
          _id:id,
          isDeleted:false
        },
        {
          $set:{
            isDeleted:true
          }
        },
        {
          new:true
        }
      );

      return res.status(statuscode.OK).json({
        status:true,
        message:"Property deleted succesfully"
      })

      
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
      
    }

    
  }

  async retriveDeletedProperty(req,res){
    try {
      const {id}= req.params
      const propertyData = await Property.findByIdAndUpdate(
        {
          _id:id,
        },
        {
          $set:{
            isDeleted:false
          }
        },
        {
          new:true,
          runValidators:true
        }
      )

      return res.status(statuscode.OK).json({
        status:true,
        message:"Retrive Deleted data succesfully",
        data:propertyData
      })
      
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

  async deletePropertyPermanent(req,res){
    try {
      const {id} = req.params
      const propertyData = await Property.findByIdAndDelete(id)
      return res.status(statuscode.NOT_FOUND).json({
        status:true,
        message:"Your Property deleted succesfully",
        data:propertyData
      })
      
    } catch (error) {
      return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
    }
  }

 async approveProperty(req,res){
   try {
    const {id}= req.body
    const user = await User.findById(req.user._id);

    if(!user){
      return res.status(statuscode.NOT_FOUND).json({
        status:false,
        message:"User is not found"
      })
    }

    if(user.role !=="admin"){
      return res.status(statuscode.NOT_FOUND).json({
        status:false,
        message:"You are not aligable to approve Property"
      })
    }

    const property = await Property.findById(id)

    if (!property) {
      return res.status(statuscode.NOT_FOUND).json({
        status: false,
        message: "Property not found",
      });
    }

    if (property.isDeleted === true) {
      return res.status(statuscode.BAD_REQUEST).json({
        status: false,
        message: "Deleted property cannot be approved",
      });
    }

    if (property.approvalStatus === "Approved") {
      return res.status(statuscode.BAD_REQUEST).json({
        status: false,
        message: "Property is already approved",
      });
    }

    property.approvalStatus="Approved"

    const data = await property.save();

    return res.status(statuscode.OK).json({
        status: true,
        message: "Property published successfully",
        data:data,
      });

   } catch (error) {
    return res.status(statuscode.SERVER_ERROR).json({
        status: false,
        message: error.message,
      });
   }
 }
  

}
module.exports = new PropertyController();
