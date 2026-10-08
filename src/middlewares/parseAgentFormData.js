const parseAgentFormData = (req, res, next) => {
  try {
    if (typeof req.body.specialization === "string") {
      req.body.specialization = JSON.parse(req.body.specialization);
    }

    if (typeof req.body.address === "string") {
      req.body.address = JSON.parse(req.body.address);
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format in specialization or address",
    });
  }
};

module.exports = parseAgentFormData;