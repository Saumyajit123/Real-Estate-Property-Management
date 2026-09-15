const cloudinary = require("../config/cloudinary");

const deleteImage = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return result;
  } catch (error) {
    throw error;
  }
};

module.exports = deleteImage;
