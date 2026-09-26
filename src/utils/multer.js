const multer = require("multer");
const Cloudinary = require("../config/cloudinary.config");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: Cloudinary,
  params: {
    folder: "uploads",
    allowed_format: ["jpg", "png", "jpeg", "gif"],
    public_id: (req, file) => {
      return `${Date.now()}-${file.originalname.split(".")[0]}`;
    },
  },
});

const upload = multer({ storage: storage });
module.exports = upload;
