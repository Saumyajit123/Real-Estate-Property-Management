class Validation {
  static validate(schema) {
    return (req, res, next) => {
      console.log("========== BEFORE VALIDATION ==========");
      console.log("BODY:", req.body);
      console.log("FILES:", req.files);

      try {
        if (
          req.body["location.type"] &&
          req.body["location.coordinates"]
        ) {
          req.body.location = {
            type: req.body["location.type"],
            coordinates: JSON.parse(
              req.body["location.coordinates"]
            ),
          };
        }
        if (req.body.amenities) {
          req.body.amenities = req.body.amenities
            .split(",")
            .map((item) => item.trim());
        }

        console.log("========== AFTER CONVERSION ==========");
        console.log("BODY:", req.body);

        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          allowUnknown: true,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          console.log("========== JOI ERROR ==========");
          console.log(error.details);

          return res.status(400).json({
            success: false,
            errors: error.details.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          });
        }

        req.body = value;

        console.log("========== VALIDATION SUCCESS ==========");
        console.log(req.body);

        next();

      } catch (error) {
        console.log("========== VALIDATION CATCH ==========");
        console.log(error);

        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    };
  }
}

module.exports = Validation;