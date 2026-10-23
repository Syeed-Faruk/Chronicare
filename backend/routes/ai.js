
const express = require("express");
const axios = require("axios");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.post("/predict-risk", authenticateToken, async (req, res) => {
    try {
        const { heart_rate, spo2, systolic_bp, weight } = req.body;

        if (
            heart_rate == null ||
            spo2 == null ||
            systolic_bp == null ||
            weight == null
        ) {
            return res.status(400).json({
                message: "heart_rate, spo2, systolic_bp and weight are required"
            });
        }

        const response = await axios.post(
            "http://127.0.0.1:8000/predict-risk",
            {
                heart_rate: Number(heart_rate),
                spo2: Number(spo2),
                systolic_bp: Number(systolic_bp),
                weight: Number(weight)
            }
        );

        res.json(response.data);

    } catch (error) {
        console.error(
            "AI prediction error:",
            error.response?.data || error.message
        );

        res.status(502).json({
            message: "Could not obtain a prediction from the AI service"
        });
    }
});

module.exports = router;