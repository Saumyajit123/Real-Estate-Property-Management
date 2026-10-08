class Validation {
  static validate(schema) {
    return (req, res, next) => {
      console.log("========== BEFORE VALIDATION ==========");
      console.log("BODY:", req.body);
      console.log("FILES:", req.files);

      try {
        // ================= LOCATION =================

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

          delete req.body["location.type"];
          delete req.body["location.coordinates"];
        }

        // ================= AMENITIES =================

        if (req.body.amenities) {
          // Case 1:
          // Already an array
          if (Array.isArray(req.body.amenities)) {
            req.body.amenities = req.body.amenities
              .map((item) => String(item).trim())
              .filter(Boolean);
          }

          // Case 2:
          // JSON string
          // '["Parking","Gym","Swimming Pool"]'
          else if (typeof req.body.amenities === "string") {
            try {
              const parsedAmenities = JSON.parse(
                req.body.amenities
              );

              if (Array.isArray(parsedAmenities)) {
                req.body.amenities = parsedAmenities
                  .map((item) => String(item).trim())
                  .filter(Boolean);
              } else {
                req.body.amenities = req.body.amenities
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean);
              }
            } catch {
              // Case 3:
              // "Parking,Gym,Swimming Pool"

              req.body.amenities = req.body.amenities
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
            }
          }
        } else {
          // No amenities provided
          req.body.amenities = [];
        }

        // ================= DEBUG =================

        console.log(
          "========== AFTER CONVERSION =========="
        );

        console.log("BODY:", req.body);

        // ================= JOI VALIDATION =================

        const { error, value } = schema.validate(
          req.body,
          {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: true,
            convert: true,
          }
        );

        if (error) {
          console.log(
            "========== JOI ERROR =========="
          );

          console.log(error.details);

          return res.status(400).json({
            success: false,
            errors: error.details.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          });
        }

        // ================= VALIDATED DATA =================

        req.body = value;

        console.log(
          "========== VALIDATION SUCCESS =========="
        );

        console.log(req.body);

        next();
      } catch (error) {
        console.log(
          "========== VALIDATION CATCH =========="
        );

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