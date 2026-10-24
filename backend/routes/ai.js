
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

        const aiServiceUrl = process.env.AI_SERVICE_URL;

        if (!aiServiceUrl) {
            console.error("AI_SERVICE_URL is not configured");
            return res.status(503).json({
                message: "AI service is not configured"
            });
        }

        const response = await axios.post(
            `${aiServiceUrl.replace(/\/+$/, "")}/predict-risk`,
            {
                heart_rate: Number(heart_rate),
                spo2: Number(spo2),
                systolic_bp: Number(systolic_bp),
                weight: Number(weight)
            },
            { timeout: 20000 }
        );

        return res.json(response.data);

    } catch (error) {
        console.error(
            "AI prediction error:",
            error.response?.data || error.code || error.message
        );

        return res.status(502).json({
            message: "Could not obtain a prediction from the AI service"
        });
    }
});

module.exports = router;
