const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();
router.get("/caregiver-patients", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Find the caregiver profile belonging to the logged-in user.
        const [caregivers] = await db.query(
            `SELECT caregiver_id
             FROM caregivers
             WHERE user_id = ?`,
            [userId]
        );

        if (caregivers.length === 0) {
            return res.status(403).json({
                message: "No caregiver profile found for this account."
            });
        }

        const caregiverId = caregivers[0].caregiver_id;

        // Return only patients linked to this caregiver.
        const [patients] = await db.query(
            `SELECT
                p.patient_id,
                u.name AS patient_name,
                p.date_of_birth,
                p.gender,
                p.phone,
                p.address
             FROM caregiver_patient cp
             INNER JOIN patients p
                ON p.patient_id = cp.patient_id
             INNER JOIN users u
                ON u.user_id = p.user_id
             WHERE cp.caregiver_id = ?
             ORDER BY u.name ASC`,
            [caregiverId]
        );

        return res.json({
            patients: patients
        });

    } catch (error) {
        console.error("Caregiver patients error:", error);

        return res.status(500).json({
            message: "Failed to fetch authorized patients."
        });
    }
});

router.get("/caregiver-risk-status", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Find the caregiver profile
        const [caregivers] = await db.query(
            "SELECT caregiver_id FROM caregivers WHERE user_id = ?",
            [userId]
        );

        if (caregivers.length === 0) {
            return res.status(404).json({
                message: "Caregiver profile not found."
            });
        }

        const caregiverId = caregivers[0].caregiver_id;

        // Get the latest risk assessment for a linked patient
        const [risks] = await db.query(
            `SELECT
                p.patient_id,
                u.name AS patient_name,
                ra.risk_id,
                ra.risk_category,
                ra.risk_score,
                ra.assessment_date
             FROM caregiver_patient cp
             INNER JOIN patients p
                ON cp.patient_id = p.patient_id
             INNER JOIN users u
                ON p.user_id = u.user_id
             LEFT JOIN risk_assessments ra
                ON ra.patient_id = p.patient_id
             WHERE cp.caregiver_id = ?
             ORDER BY ra.assessment_date DESC`,
            [caregiverId]
        );

        if (risks.length === 0 || risks[0].risk_id == null) {
            return res.json({
                risk: null,
                message: "No risk assessment found for the linked patient."
            });
        }

        res.json({
            risk: risks[0]
        });

    } catch (error) {
        console.error("Caregiver risk status error:", error);

        res.status(500).json({
            message: "Failed to fetch caregiver risk status."
        });
    }
});

router.get("/caregiver-risk-history", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [caregivers] = await db.query(
            "SELECT caregiver_id FROM caregivers WHERE user_id = ?",
            [userId]
        );

        if (caregivers.length === 0) {
            return res.status(404).json({
                message: "Caregiver profile not found."
            });
        }

        const caregiverId = caregivers[0].caregiver_id;

        const [history] = await db.query(
            `SELECT
                ra.risk_id,
                ra.patient_id,
                u.name AS patient_name,
                ra.record_id,
                ra.risk_score,
                ra.risk_category,
                DATE_FORMAT(
                    ra.assessment_date, '%Y-%m-%d'
                ) AS assessment_date
             FROM caregiver_patient cp
             INNER JOIN risk_assessments ra
                ON ra.patient_id = cp.patient_id
             INNER JOIN patients p
                ON p.patient_id = ra.patient_id
             INNER JOIN users u
                ON u.user_id = p.user_id
             WHERE cp.caregiver_id = ?
             ORDER BY ra.assessment_date DESC, ra.risk_id DESC`,
            [caregiverId]
        );

        res.json({ history });

    } catch (error) {
        console.error("Caregiver risk history error:", error);

        res.status(500).json({
            message: "Failed to fetch risk assessment history."
        });
    }
});



router.post("/record", authenticateToken, async (req, res) => {

    try {

        const {
            record_date,
            notes,
            blood_pressure,
            heart_rate,
            spo2,
            weight
        } = req.body;

        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [recordResult] = await db.query(
            `INSERT INTO health_records
            (record_date, notes, patient_id)
            VALUES (?, ?, ?)`,
            [
                record_date,
                notes || null,
                patientId
            ]
        );

        const recordId = recordResult.insertId;

        await db.query(
            `INSERT INTO health_parameters
            (blood_pressure, heart_rate, spo2, weight, record_id)
            VALUES (?, ?, ?, ?, ?)`,
            [
                blood_pressure,
                heart_rate,
                spo2,
                weight,
                recordId
            ]
        );

        res.status(201).json({
            message: "Health record saved successfully.",
            record_id: recordId
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to save health record.",
            error: error.message
        });

    }

});
router.get("/history", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [records] = await db.query(
            `SELECT
                hr.record_id,
                hr.record_date,
                hr.notes,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight,
                hp.recorded_at
            FROM health_records hr
            INNER JOIN health_parameters hp
                ON hr.record_id = hp.record_id
            WHERE hr.patient_id = ?
            ORDER BY hr.record_date DESC, hp.recorded_at DESC`,
            [patientId]
        );

        res.json({
            records: records
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch health history.",
            error: error.message
        });

    }

});
router.get("/trends", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [trends] = await db.query(
            `SELECT
                hr.record_date,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight
            FROM health_records hr
            INNER JOIN health_parameters hp
                ON hr.record_id = hp.record_id
            WHERE hr.patient_id = ?
            ORDER BY hr.record_date ASC, hp.recorded_at ASC`,
            [patientId]
        );

        res.json({
            trends: trends
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch health trends.",
            error: error.message
        });

    }

});
router.post("/assess-risk", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [records] = await db.query(
            `SELECT
                hr.record_id,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight
            FROM health_records hr
            INNER JOIN health_parameters hp
                ON hr.record_id = hp.record_id
            WHERE hr.patient_id = ?
            ORDER BY hp.recorded_at DESC
            LIMIT 1`,
            [patientId]
        );

        if (records.length === 0) {
            return res.status(404).json({
                message: "No health record found."
            });
        }

        const record = records[0];

        let systolicBP = 0;

        if (record.blood_pressure) {
            systolicBP = Number(
                record.blood_pressure.split("/")[0]
            );
        }

        const aiResponse = await fetch(
            "http://127.0.0.1:8000/predict-risk",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    heart_rate: Number(record.heart_rate),
                    spo2: Number(record.spo2),
                    systolic_bp: systolicBP,
                    weight: Number(record.weight)
                })
            }
        );

        const aiResult = await aiResponse.json();

        if (!aiResponse.ok) {
            return res.status(500).json({
                message: "AI risk assessment failed."
            });
        }
        const [riskResult] = await db.query(
    `INSERT INTO risk_assessments
    (record_id, risk_category, risk_score, patient_id)
    VALUES (?, ?, ?, ?)`,
    [
        record.record_id,
        aiResult.risk_category,
        aiResult.risk_score,
        patientId
    ]
);

const riskId = riskResult.insertId;


if (
    aiResult.risk_category === "Moderate" ||
    aiResult.risk_category === "High"
) {

    await db.query(
        `INSERT INTO alerts
        (risk_id, alert_type, alert_message, alert_status, patient_id)
        VALUES (?, ?, ?, ?, ?)`,
        [
            riskId,
            aiResult.risk_category + " Risk",
            "AI risk assessment detected " +
            aiResult.risk_category.toLowerCase() +
            " risk. Please review the patient's health status.",
            "new",
            patientId
        ]
    );

}

        res.json({
            message: "AI risk assessment completed.",
            risk_score: aiResult.risk_score,
            risk_category: aiResult.risk_category,
            health_data: record
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Risk assessment failed.",
            error: error.message
        });

    }

});
router.get("/risk-status", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [risks] = await db.query(
            `SELECT
                ra.risk_id,
                ra.record_id,
                ra.risk_category,
                ra.risk_score,
                ra.assessment_date,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight
            FROM risk_assessments ra
            INNER JOIN health_parameters hp
                ON ra.record_id = hp.record_id
            WHERE ra.patient_id = ?
            ORDER BY ra.assessment_date DESC
            LIMIT 1`,
            [patientId]
        );

        if (risks.length === 0) {
            return res.status(404).json({
                message: "No risk assessment found."
            });
        }

        res.json({
            risk: risks[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch risk status.",
            error: error.message
        });

    }

});
router.get("/alerts", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [alerts] = await db.query(
            `SELECT
                a.alert_id,
                a.risk_id,
                a.alert_type,
                a.alert_message,
                a.alert_status,
                a.created_at,
                ra.risk_category,
                ra.risk_score
            FROM alerts a
            INNER JOIN risk_assessments ra
                ON a.risk_id = ra.risk_id
            WHERE a.patient_id = ?
            ORDER BY a.created_at DESC`,
            [patientId]
        );

        res.json({
            alerts: alerts
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch alerts.",
            error: error.message
        });

    }

});

router.get("/caregiver-alerts", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [caregivers] = await db.query(
            "SELECT caregiver_id FROM caregivers WHERE user_id = ?",
            [userId]
        );

        if (caregivers.length === 0) {
            return res.status(404).json({
                message: "Caregiver profile not found."
            });
        }

        const caregiverId = caregivers[0].caregiver_id;

        const [alerts] = await db.query(
            `SELECT
                a.alert_id,
                a.patient_id,
                u.name AS patient_name,
                a.risk_id,
                a.alert_type,
                a.alert_message,
                a.alert_status,
                a.created_at,
                ra.risk_category,
                ra.risk_score
             FROM caregiver_patient cp
             INNER JOIN alerts a
                ON a.patient_id = cp.patient_id
             INNER JOIN patients p
                ON p.patient_id = cp.patient_id
             INNER JOIN users u
                ON u.user_id = p.user_id
             LEFT JOIN risk_assessments ra
                ON ra.risk_id = a.risk_id
             WHERE cp.caregiver_id = ?
             ORDER BY a.created_at DESC`,
            [caregiverId]
        );

        const activeAlerts = alerts.filter(alert => {
    const status = String(alert.alert_status || "")
        .toLowerCase()
        .trim();

    return ![
        "reviewed",
        "resolved",
        "closed",
        "dismissed"
    ].includes(status);
});

        res.json({
            alerts,
            active_count: activeAlerts.length
        });

    } catch (error) {
        console.error("Caregiver alerts error:", error);

        res.status(500).json({
            message: "Failed to fetch caregiver alerts."
        });
    }
});

router.put("/caregiver-alerts/:id/review", authenticateToken, async (req, res) => {
    try {
        const alertId = Number(req.params.id);
        const userId = req.user.user_id;

        if (!Number.isInteger(alertId) || alertId <= 0) {
            return res.status(400).json({
                message: "Invalid alert ID."
            });
        }

        const [caregivers] = await db.query(
            "SELECT caregiver_id FROM caregivers WHERE user_id = ?",
            [userId]
        );

        if (caregivers.length === 0) {
            return res.status(403).json({
                message: "Caregiver profile not found."
            });
        }

        const caregiverId = caregivers[0].caregiver_id;

        const [result] = await db.query(
            `UPDATE alerts a
             INNER JOIN caregiver_patient cp
                ON cp.patient_id = a.patient_id
             SET a.alert_status = 'reviewed'
             WHERE a.alert_id = ?
               AND cp.caregiver_id = ?`,
            [alertId, caregiverId]
        );

        if (result.affectedRows === 0) {
            const [existing] = await db.query(
                `SELECT a.alert_status
                 FROM alerts a
                 INNER JOIN caregiver_patient cp
                    ON cp.patient_id = a.patient_id
                 WHERE a.alert_id = ?
                   AND cp.caregiver_id = ?`,
                [alertId, caregiverId]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    message: "Alert not found for your linked patients."
                });
            }

            if (String(existing[0].alert_status).toLowerCase() === "reviewed") {
                return res.json({
                    message: "Alert is already reviewed."
                });
            }
        }

        return res.json({
            message: "Alert marked as reviewed.",
            alert_id: alertId,
            alert_status: "reviewed"
        });

    } catch (error) {
        console.error("Review caregiver alert error:", error);

        return res.status(500).json({
            message: "Failed to review alert."
        });
    }
});

router.get("/caregiver-latest-readings", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [caregivers] = await db.query(
            "SELECT caregiver_id FROM caregivers WHERE user_id = ?",
            [userId]
        );

        if (caregivers.length === 0) {
            return res.status(404).json({
                message: "Caregiver profile not found."
            });
        }

        const caregiverId = caregivers[0].caregiver_id;

        const [rows] = await db.query(
            `SELECT
                p.patient_id,
                u.name AS patient_name,
                hr.record_id,
                hr.record_date,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight,
                hp.recorded_at
             FROM caregiver_patient cp
             INNER JOIN patients p
                ON p.patient_id = cp.patient_id
             INNER JOIN users u
                ON u.user_id = p.user_id
             INNER JOIN health_records hr
                ON hr.patient_id = p.patient_id
             INNER JOIN health_parameters hp
                ON hp.record_id = hr.record_id
             WHERE cp.caregiver_id = ?
             ORDER BY hr.record_date DESC, hp.recorded_at DESC`,
            [caregiverId]
        );

        // Keep only the newest reading for each linked patient.
        const latestByPatient = new Map();

        for (const row of rows) {
            if (!latestByPatient.has(row.patient_id)) {
                latestByPatient.set(row.patient_id, row);
            }
        }

        res.json({
            readings: Array.from(latestByPatient.values())
        });

    } catch (error) {
        console.error("Caregiver latest readings error:", error);

        res.status(500).json({
            message: "Failed to fetch caregiver health readings."
        });
    }
});

router.get("/caregiver-health-trends", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [caregivers] = await db.query(
            "SELECT caregiver_id FROM caregivers WHERE user_id = ?",
            [userId]
        );

        if (caregivers.length === 0) {
            return res.status(404).json({
                message: "Caregiver profile not found."
            });
        }

        const caregiverId = caregivers[0].caregiver_id;

        const [records] = await db.query(
            `SELECT
                p.patient_id,
                u.name AS patient_name,
                hr.record_id,
                DATE_FORMAT(hr.record_date, '%Y-%m-%d') AS record_date,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight,
                hp.recorded_at
             FROM caregiver_patient cp
             INNER JOIN patients p
                ON p.patient_id = cp.patient_id
             INNER JOIN users u
                ON u.user_id = p.user_id
             INNER JOIN health_records hr
                ON hr.patient_id = p.patient_id
             INNER JOIN health_parameters hp
                ON hp.record_id = hr.record_id
             WHERE cp.caregiver_id = ?
             ORDER BY hr.record_date ASC, hp.recorded_at ASC`,
            [caregiverId]
        );

        res.json({ records });

    } catch (error) {
        console.error("Caregiver health trends error:", error);

        res.status(500).json({
            message: "Failed to fetch health trends."
        });
    }
});



router.get("/caregiver-appointments", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [caregivers] = await db.query(
            "SELECT caregiver_id FROM caregivers WHERE user_id = ?",
            [userId]
        );

        if (caregivers.length === 0) {
            return res.status(404).json({
                message: "Caregiver profile not found."
            });
        }

        const caregiverId = caregivers[0].caregiver_id;

        const [appointments] = await db.query(
            `SELECT
                a.appointment_id,
                a.patient_id,
                pu.name AS patient_name,
                DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
                a.appointment_time,
                a.status,
                a.notes,
                du.name AS doctor_name,
                d.specialization
             FROM caregiver_patient cp
             INNER JOIN appointments a
                ON a.patient_id = cp.patient_id
             INNER JOIN patients p
                ON p.patient_id = cp.patient_id
             INNER JOIN users pu
                ON pu.user_id = p.user_id
             INNER JOIN doctors d
                ON d.doctor_id = a.doctor_id
             INNER JOIN users du
                ON du.user_id = d.user_id
             WHERE cp.caregiver_id = ?
             ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
            [caregiverId]
        );

        // Compare appointment dates without timezone conversion.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = appointments.filter(appointment => {
            const status = String(appointment.status || "")
                .toLowerCase()
                .trim();

            const dateText = String(appointment.appointment_date).slice(0, 10);
            const [year, month, day] = dateText.split("-").map(Number);
            const appointmentDate = new Date(year, month - 1, day);

            return appointmentDate >= today &&
                !["cancelled", "canceled", "completed"].includes(status);
        });

        res.json({
            appointments,
            next_appointment: upcoming[0] || null
        });

    } catch (error) {
        console.error("Caregiver appointments error:", error);

        res.status(500).json({
            message: "Failed to fetch caregiver appointments."
        });
    }
});



router.get("/history", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [history] = await db.query(
            `SELECT
                hr.record_id,
                hr.record_date,
                hr.notes,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight,
                hp.recorded_at
            FROM health_records hr
            INNER JOIN health_parameters hp
                ON hr.record_id = hp.record_id
            WHERE hr.patient_id = ?
            ORDER BY hr.record_date DESC, hp.recorded_at DESC`,
            [patientId]
        );

        res.json({
            history: history
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch health history.",
            error: error.message
        });
    }
});
router.get("/trends", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [trends] = await db.query(
            `SELECT
                hr.record_date,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight
            FROM health_records hr
            INNER JOIN health_parameters hp
                ON hr.record_id = hp.record_id
            WHERE hr.patient_id = ?
            ORDER BY hr.record_date ASC, hp.recorded_at ASC`,
            [patientId]
        );

        res.json({
            trends: trends
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch health trends.",
            error: error.message
        });

    }

});
router.get("/analytics", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient profile not found."
            });
        }

        const patientId = patients[0].patient_id;

        const [records] = await db.query(
            `SELECT
                hr.record_id,
                hr.record_date,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight
            FROM health_records hr
            INNER JOIN health_parameters hp
                ON hr.record_id = hp.record_id
            WHERE hr.patient_id = ?
            ORDER BY hr.record_date DESC, hp.recorded_at DESC`,
            [patientId]
        );

        const [risks] = await db.query(
            `SELECT
                risk_category,
                risk_score,
                assessment_date
            FROM risk_assessments
            WHERE patient_id = ?
            ORDER BY assessment_date DESC
            LIMIT 1`,
            [patientId]
        );

        res.json({
            records: records,
            latestRisk: risks.length > 0 ? risks[0] : null
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch analytics data.",
            error: error.message
        });

    }

});
router.get("/doctors", authenticateToken, async (req, res) => {

    try {

        const [doctors] = await db.query(
            `SELECT
                d.doctor_id,
                u.name,
                d.specialization
            FROM doctors d
            INNER JOIN users u
                ON d.user_id = u.user_id
            ORDER BY u.name ASC`
        );

        res.json({
            doctors: doctors
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctors.",
            error: error.message
        });

    }

});
router.post("/appointments", authenticateToken, async (req, res) => {

    try {

        const {
            doctor_id,
            appointment_date,
            appointment_time,
            notes
        } = req.body;


        if (!doctor_id || !appointment_date || !appointment_time) {

            return res.status(400).json({
                message: "Doctor, date and time are required."
            });

        }


        const userId = req.user.user_id;


        // Find the patient linked to the logged-in user
        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );


        if (patients.length === 0) {

            return res.status(404).json({
                message: "Patient profile not found."
            });

        }


        const patientId = patients[0].patient_id;


        // Check whether the doctor exists
        const [doctors] = await db.query(
            "SELECT doctor_id FROM doctors WHERE doctor_id = ?",
            [doctor_id]
        );


        if (doctors.length === 0) {

            return res.status(404).json({
                message: "Doctor not found."
            });

        }


        // Save appointment
        const [result] = await db.query(
            `INSERT INTO appointments
            (patient_id, doctor_id, appointment_date, appointment_time, status, notes)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                doctor_id,
                appointment_date,
                appointment_time,
                "Pending",
                notes || null
            ]
        );


        res.status(201).json({
            message: "Appointment request submitted successfully.",
            appointment_id: result.insertId
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to create appointment.",
            error: error.message
        });

    }

});
router.get("/appointments", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;


        // Find the patient linked to the logged-in user
        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE user_id = ?",
            [userId]
        );


        if (patients.length === 0) {

            return res.status(404).json({
                message: "Patient profile not found."
            });

        }


        const patientId = patients[0].patient_id;


        // Get patient appointments
        const [appointments] = await db.query(
            `SELECT
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.notes,
                u.name AS doctor_name,
                d.specialization
            FROM appointments a
            INNER JOIN doctors d
                ON a.doctor_id = d.doctor_id
            INNER JOIN users u
                ON d.user_id = u.user_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [patientId]
        );


        res.json({
            appointments: appointments
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch appointments.",
            error: error.message
        });

    }

});
router.get("/doctor-appointments", authenticateToken, async (req, res) => {

    try {

        const userId = req.user.user_id;

        const [doctors] = await db.query(
            "SELECT doctor_id FROM doctors WHERE user_id = ?",
            [userId]
        );

        if (doctors.length === 0) {

            return res.status(404).json({
                message: "Doctor profile not found."
            });

        }

        const doctorId = doctors[0].doctor_id;

        const [appointments] = await db.query(
            `SELECT
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.notes,
                u.name AS patient_name
            FROM appointments a
            INNER JOIN patients p
                ON a.patient_id = p.patient_id
            INNER JOIN users u
                ON p.user_id = u.user_id
            WHERE a.doctor_id = ?
            ORDER BY
                a.appointment_date ASC,
                a.appointment_time ASC`,
            [doctorId]
        );

        res.json({
            appointments: appointments
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctor appointments.",
            error: error.message
        });

    }

});
router.put("/doctor-appointments/:id/status", authenticateToken, async (req, res) => {

    try {

        const appointmentId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                message: "Appointment status is required."
            });
        }

        const userId = req.user.user_id;

        const [doctors] = await db.query(
            "SELECT doctor_id FROM doctors WHERE user_id = ?",
            [userId]
        );

        if (doctors.length === 0) {
            return res.status(404).json({
                message: "Doctor profile not found."
            });
        }

        const doctorId = doctors[0].doctor_id;

        const [appointments] = await db.query(
            `SELECT appointment_id
             FROM appointments
             WHERE appointment_id = ?
             AND doctor_id = ?`,
            [appointmentId, doctorId]
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                message: "Appointment not found."
            });
        }

        await db.query(
            `UPDATE appointments
             SET status = ?
             WHERE appointment_id = ?
             AND doctor_id = ?`,
            [status, appointmentId, doctorId]
        );

        res.json({
            message: "Appointment status updated successfully.",
            appointment_id: appointmentId,
            status: status
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to update appointment status.",
            error: error.message
        });

    }

});
/* =========================
   DOCTOR PATIENTS
========================= */

router.get("/doctor-patients", authenticateToken, async (req, res) => {
    try {

        // Find doctor profile
        const [doctorRows] = await db.query(
            "SELECT doctor_id FROM doctors WHERE user_id = ?",
            [req.user.user_id]
        );

        if (doctorRows.length === 0) {
            return res.status(404).json({
                message: "Doctor profile not found"
            });
        }

        const doctorId = doctorRows[0].doctor_id;


        // Get patients who have appointments with this doctor
        const [patients] = await db.query(
            `
            SELECT DISTINCT
                p.patient_id,
                u.name AS patient_name,
                p.date_of_birth,
                p.gender,

                latest_health.heart_rate,
                latest_health.blood_pressure,
                latest_health.spo2,
                latest_health.weight,

                latest_risk.risk_category,
                latest_risk.risk_score

            FROM patients p

            INNER JOIN users u
                ON p.user_id = u.user_id

            INNER JOIN appointments a
                ON p.patient_id = a.patient_id
                AND a.doctor_id = ?

            LEFT JOIN (
                SELECT
                    hr.patient_id,
                    hp.heart_rate,
                    hp.blood_pressure,
                    hp.spo2,
                    hp.weight
                FROM health_records hr
                INNER JOIN health_parameters hp
                    ON hr.record_id = hp.record_id

                INNER JOIN (
                    SELECT
                        hr2.patient_id,
                        MAX(hp2.recorded_at) AS latest_time
                    FROM health_records hr2
                    INNER JOIN health_parameters hp2
                        ON hr2.record_id = hp2.record_id
                    GROUP BY hr2.patient_id
                ) latest
                    ON hr.patient_id = latest.patient_id
                    AND hp.recorded_at = latest.latest_time
            ) latest_health
                ON p.patient_id = latest_health.patient_id

            LEFT JOIN (
                SELECT
                    r.patient_id,
                    r.risk_category,
                    r.risk_score
                FROM risk_assessments r

                INNER JOIN (
                    SELECT
                        patient_id,
                        MAX(assessment_date) AS latest_date
                    FROM risk_assessments
                    GROUP BY patient_id
                ) latest_risk_date
                    ON r.patient_id = latest_risk_date.patient_id
                    AND r.assessment_date = latest_risk_date.latest_date
            ) latest_risk
                ON p.patient_id = latest_risk.patient_id

            ORDER BY u.name
            `,
            [doctorId]
        );


        res.json({
            patients: patients
        });

    } catch (error) {

        console.error("Doctor patients error:", error);

        res.status(500).json({
            message: "Failed to fetch doctor patients",
            error: error.message
        });

    }
});
/* =========================
   DOCTOR ALERTS
========================= */

router.get("/doctor-alerts", authenticateToken, async (req, res) => {
    try {

        // Find doctor profile
        const [doctorRows] = await db.query(
            "SELECT doctor_id FROM doctors WHERE user_id = ?",
            [req.user.user_id]
        );

        if (doctorRows.length === 0) {
            return res.status(404).json({
                message: "Doctor profile not found"
            });
        }

        const doctorId = doctorRows[0].doctor_id;


        // Get alerts for patients connected to this doctor
        const [alerts] = await db.query(
            `
            SELECT
                a.alert_id,
                a.alert_type,
                a.alert_message,
                a.alert_status,
                a.created_at,
                p.patient_id,
                u.name AS patient_name,
                r.risk_category,
                r.risk_score

            FROM alerts a

            INNER JOIN patients p
                ON a.patient_id = p.patient_id

            INNER JOIN users u
                ON p.user_id = u.user_id

            INNER JOIN appointments ap
                ON p.patient_id = ap.patient_id
                AND ap.doctor_id = ?

            LEFT JOIN risk_assessments r
                ON a.risk_id = r.risk_id

            GROUP BY
                a.alert_id,
                a.alert_type,
                a.alert_message,
                a.alert_status,
                a.created_at,
                p.patient_id,
                u.name,
                r.risk_category,
                r.risk_score

            ORDER BY a.created_at DESC
            `,
            [doctorId]
        );


        res.json({
            alerts: alerts
        });

    } catch (error) {

        console.error("Doctor alerts error:", error);

        res.status(500).json({
            message: "Failed to fetch doctor alerts",
            error: error.message
        });

    }
});
router.get("/doctor-patient-trends/:patientId", authenticateToken, async (req, res) => {
    try {

        const patientId = req.params.patientId;


        // Find doctor profile
        const [doctorRows] = await db.query(
            "SELECT doctor_id FROM doctors WHERE user_id = ?",
            [req.user.user_id]
        );


        if (doctorRows.length === 0) {
            return res.status(404).json({
                message: "Doctor profile not found"
            });
        }


        const doctorId = doctorRows[0].doctor_id;


        // Check that this patient is connected to this doctor
        const [connectionRows] = await db.query(
            `
            SELECT appointment_id
            FROM appointments
            WHERE doctor_id = ?
            AND patient_id = ?
            LIMIT 1
            `,
            [doctorId, patientId]
        );


        if (connectionRows.length === 0) {
            return res.status(403).json({
                message: "Patient is not associated with this doctor"
            });
        }


        // Get patient information
        const [patientRows] = await db.query(
            `
            SELECT
                p.patient_id,
                u.name AS patient_name,
                r.risk_category,
                r.risk_score

            FROM patients p

            INNER JOIN users u
                ON p.user_id = u.user_id

            LEFT JOIN (
                SELECT
                    r1.patient_id,
                    r1.risk_category,
                    r1.risk_score
                FROM risk_assessments r1

                INNER JOIN (
                    SELECT
                        patient_id,
                        MAX(assessment_date) AS latest_date
                    FROM risk_assessments
                    WHERE patient_id = ?
                    GROUP BY patient_id
                ) latest
                    ON r1.patient_id = latest.patient_id
                    AND r1.assessment_date = latest.latest_date

            ) r
                ON p.patient_id = r.patient_id

            WHERE p.patient_id = ?
            `,
            [patientId, patientId]
        );


        if (patientRows.length === 0) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }


        // Get health trend records
        const [trends] = await db.query(
            `
            SELECT
                hr.record_date,
                hp.recorded_at,
                hp.heart_rate,
                hp.blood_pressure,
                hp.spo2,
                hp.weight

            FROM health_records hr

            INNER JOIN health_parameters hp
                ON hr.record_id = hp.record_id

            WHERE hr.patient_id = ?

            ORDER BY hp.recorded_at ASC
            `,
            [patientId]
        );


        res.json({
            patient: patientRows[0],
            trends: trends
        });


    } catch (error) {

        console.error(
            "Doctor patient trends error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch patient trends",
            error: error.message
        });

    }
});
router.get("/doctor-risk/:patientId", authenticateToken, async (req, res) => {
    try {
        const doctorUserId = req.user.user_id;
        const patientId = req.params.patientId;

        // Find the doctor's doctor_id
        const [doctors] = await db.query(
            "SELECT doctor_id FROM doctors WHERE user_id = ?",
            [doctorUserId]
        );

        if (doctors.length === 0) {
            return res.status(403).json({
                message: "Doctor profile not found."
            });
        }

        const doctorId = doctors[0].doctor_id;

        // Check that this patient is connected to this doctor
        const [connections] = await db.query(
            `SELECT appointment_id
             FROM appointments
             WHERE doctor_id = ?
             AND patient_id = ?
             LIMIT 1`,
            [doctorId, patientId]
        );

        if (connections.length === 0) {
            return res.status(403).json({
                message: "Patient is not assigned to this doctor."
            });
        }

        // Get latest risk assessment and health values
        const [risks] = await db.query(
            `SELECT
                ra.risk_id,
                ra.record_id,
                ra.risk_category,
                ra.risk_score,
                ra.assessment_date,
                hp.blood_pressure,
                hp.heart_rate,
                hp.spo2,
                hp.weight
             FROM risk_assessments ra
             INNER JOIN health_parameters hp
                 ON ra.record_id = hp.record_id
             WHERE ra.patient_id = ?
             ORDER BY ra.assessment_date DESC
             LIMIT 1`,
            [patientId]
        );

        if (risks.length === 0) {
            return res.json({
                risk: null
            });
        }

        res.json({
            risk: risks[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctor risk status.",
            error: error.message
        });
    }
});
router.get("/doctor-risk-history/:patientId", authenticateToken, async (req, res) => {
    try {
        const doctorUserId = req.user.user_id;
        const patientId = req.params.patientId;

        const [doctors] = await db.query(
            "SELECT doctor_id FROM doctors WHERE user_id = ?",
            [doctorUserId]
        );

        if (doctors.length === 0) {
            return res.status(403).json({
                message: "Doctor profile not found."
            });
        }

        const doctorId = doctors[0].doctor_id;

        const [connections] = await db.query(
            `SELECT appointment_id
             FROM appointments
             WHERE doctor_id = ?
             AND patient_id = ?
             LIMIT 1`,
            [doctorId, patientId]
        );

        if (connections.length === 0) {
            return res.status(403).json({
                message: "Patient is not assigned to this doctor."
            });
        }

        const [history] = await db.query(
            `SELECT
                risk_id,
                record_id,
                risk_category,
                risk_score,
                assessment_date
             FROM risk_assessments
             WHERE patient_id = ?
             ORDER BY assessment_date DESC`,
            [patientId]
        );

        res.json({
            history: history
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch risk assessment history.",
            error: error.message
        });
    }
});
router.get("/doctor-statistics", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [doctors] = await db.query(
            `SELECT doctor_id
             FROM doctors
             WHERE user_id = ?`,
            [userId]
        );

        if (doctors.length === 0) {
            return res.status(404).json({
                message: "Doctor profile not found."
            });
        }

        const doctorId = doctors[0].doctor_id;

        const [assignedPatients] = await db.query(
            `SELECT COUNT(DISTINCT patient_id) AS count
             FROM appointments
             WHERE doctor_id = ?`,
            [doctorId]
        );

        const [todayAppointments] = await db.query(
            `SELECT COUNT(*) AS count
             FROM appointments
             WHERE doctor_id = ?
             AND appointment_date = CURDATE()`,
            [doctorId]
        );

        const [completedConsultations] = await db.query(
            `SELECT COUNT(*) AS count
             FROM appointments
             WHERE doctor_id = ?
             AND status = 'Completed'`,
            [doctorId]
        );

        res.json({
            assignedPatients: assignedPatients[0].count,
            todayAppointments: todayAppointments[0].count,
            completedConsultations: completedConsultations[0].count
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctor statistics.",
            error: error.message
        });
    }
});

router.get("/caregiver-profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [rows] = await db.query(
            `SELECT
                u.user_id,
                u.name,
                u.email,
                u.role,
                u.created_at,
                c.caregiver_id,
                c.phone,
                c.relationship_to_patient,
                (
                    SELECT COUNT(*)
                    FROM caregiver_patient cp
                    WHERE cp.caregiver_id = c.caregiver_id
                ) AS linked_patients,
                (
                    SELECT COUNT(*)
                    FROM alerts a
                    INNER JOIN caregiver_patient cp
                        ON cp.patient_id = a.patient_id
                    WHERE cp.caregiver_id = c.caregiver_id
                ) AS total_alerts,
                (
                    SELECT COUNT(*)
                    FROM alerts a
                    INNER JOIN caregiver_patient cp
                        ON cp.patient_id = a.patient_id
                    WHERE cp.caregiver_id = c.caregiver_id
                      AND LOWER(COALESCE(a.alert_status, 'new'))
                          NOT IN ('reviewed', 'resolved', 'closed', 'dismissed')
                ) AS active_alerts,
                (
    SELECT COUNT(*)
    FROM appointments a
    INNER JOIN caregiver_patient cp
        ON cp.patient_id = a.patient_id
    WHERE cp.caregiver_id = c.caregiver_id
      AND a.appointment_date >= CURDATE()
      AND LOWER(a.status) NOT IN ('cancelled', 'canceled', 'completed')
) AS total_appointments
             FROM users u
             INNER JOIN caregivers c ON c.user_id = u.user_id
             WHERE u.user_id = ?
               AND u.role = 'caregiver'`,
            [userId]
        );

        if (!rows.length) {
            return res.status(404).json({
                message: "Caregiver profile not found."
            });
        }

        res.json({ profile: rows[0] });

    } catch (error) {
        console.error("Caregiver profile fetch error:", error);
        res.status(500).json({
            message: "Failed to load caregiver profile."
        });
    }
});


router.put("/caregiver-profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { name, email, phone, relationship_to_patient } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof phone !== "string" ||
            typeof relationship_to_patient !== "string"
        ) {
            return res.status(400).json({
                message: "Name, email, phone, and relationship are required."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();
        const cleanRelationship = relationship_to_patient.trim();

        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({
                message: "Name must be between 2 and 100 characters."
            });
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
            cleanEmail.length > 150
        ) {
            return res.status(400).json({
                message: "Enter a valid email address."
            });
        }

        if (cleanPhone.length > 20 || cleanRelationship.length > 100) {
            return res.status(400).json({
                message: "Phone or relationship exceeds the allowed length."
            });
        }

        const [caregivers] = await db.query(
            `SELECT c.caregiver_id
             FROM caregivers c
             INNER JOIN users u ON u.user_id = c.user_id
             WHERE c.user_id = ? AND u.role = 'caregiver'`,
            [userId]
        );

        if (!caregivers.length) {
            return res.status(404).json({
                message: "Caregiver profile not found."
            });
        }

        const [emailOwner] = await db.query(
            "SELECT user_id FROM users WHERE email = ? AND user_id <> ?",
            [cleanEmail, userId]
        );

        if (emailOwner.length) {
            return res.status(409).json({
                message: "That email address is already in use."
            });
        }

        await db.query(
            "UPDATE users SET name = ?, email = ? WHERE user_id = ?",
            [cleanName, cleanEmail, userId]
        );

        await db.query(
            `UPDATE caregivers
             SET phone = ?, relationship_to_patient = ?
             WHERE user_id = ?`,
            [cleanPhone || null, cleanRelationship || null, userId]
        );

        res.json({
            message: "Caregiver profile updated successfully."
        });

    } catch (error) {
        console.error("Caregiver profile update error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "That email address is already in use."
            });
        }

        res.status(500).json({
            message: "Failed to update caregiver profile."
        });
    }
});

module.exports = router;