const { date } = require('joi');
const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user', required: true
    },
    otp: { 
        type: String, 
        required: true
    },
    createdAt: {
        type: Date, 
        default: Date.now, 
        expires: '10m'}
});

const OtpModel = mongoose.model("otp", OtpSchema);


module.exports = OtpModel;