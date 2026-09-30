const Favorite = require('../../models/favouriteModel')
const statuscode = require('../../utils/statuscode')
const Property = require('../../models/property')
class FavoriteController{
    async addFavorite(req,res){
        try {
            const {PropertyId} = req.params;
            const userId = req.user._id;

            const PropertyById =  await Property.findById(PropertyId)

            if(!PropertyById){
                return res.status(statuscode.NOT_FOUND).json({
                    status:false,
                    message:"Property not found"
                })
            }

            const existingFavorite = await Favorite.findOne({
                user:userId,
                property:PropertyId
            });


            if(existingFavorite){
                return res.status(statuscode.NOT_FOUND).json({
                    status:false,
                    message:"Property already added to favorite"
                })
            }

            const favorite = await Favorite.create({
                user:userId,
                property:PropertyId
            });

            return res.status(statuscode.OK).json({
                status:true,
                message:"Property Added to Favorite",
                data:favorite
            })
            
        } catch (error) {
            return res.status(statuscode.SERVER_ERROR).json({
                status:false,
                message:error.message
            })
        }
    } 

    async removeFavorite(req,res){
        try {
            const {PropertyId}= req.params;
            const userId = req.user._id;

            const favorite = await Favorite.findOneAndDelete({
                user:userId,
                property:PropertyId
            })

            if(!favorite){
                return res.status(statuscode.NOT_FOUND).json({
                    status:false,
                    message:"Favorite not found"
                })
            }
            return res.status(statuscode.OK).json({
                status:true,
                message:"Property remove form Favorite"
            })
            
        } catch (error) {
            return res.status(statuscode.SERVER_ERROR).json({
                status:false,
                message:error.message
            })
        }
    }

    async findMyFavorite (req,res){
        try {
            const userId = req.user._id;

            const favorite = await Favorite.find({
                user:userId
            }).populate({
                path:"property",
                populate:{
                    path:"owner",
                    populate:"name email phone"
                }
            })

            return res.status(statuscode.OK).json({
                status:true,
                message:"Find All Favorite Succesfully",
                count:favorite.length,
                data:favorite
            })
            
        } catch (error) {
            return res.status(statuscode.SERVER_ERROR).json({
                status:false,
                message:error.message
            })
        }
    }

}

module.exports= new FavoriteController()