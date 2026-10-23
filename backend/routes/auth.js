const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// ========================================
// REGISTER
// ========================================

router.post("/register", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        // Check required fields
        if (!name || !email || !password || !role) {

            return res.status(400).json({
                message: "All fields are required"
            });

        }


        // Check valid role
        const allowedRoles = [
            "patient",
            "doctor",
            "caregiver"
        ];

        if (!allowedRoles.includes(role)) {

            return res.status(400).json({
                message: "Invalid role"
            });

        }


        // Check whether email already exists
        const [existingUsers] = await db.query(
            "SELECT user_id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {

            return res.status(409).json({
                message: "Email already registered"
            });

        }


        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);


        // Start transaction
        await connection.beginTransaction();


        // Insert user
        const [userResult] = await connection.query(
            `INSERT INTO users
            (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)`,
            [
                name,
                email,
                passwordHash,
                role
            ]
        );


        const userId = userResult.insertId;


        // Create role-specific record
        if (role === "patient") {

            await connection.query(
                `INSERT INTO patients (user_id)
                 VALUES (?)`,
                [userId]
            );

        }


        else if (role === "doctor") {

            await connection.query(
                `INSERT INTO doctors (user_id)
                 VALUES (?)`,
                [userId]
            );

        }


        else if (role === "caregiver") {

            await connection.query(
                `INSERT INTO caregivers (user_id)
                 VALUES (?)`,
                [userId]
            );

        }


        // Save everything
        await connection.commit();


        // Create JWT token
        const token = jwt.sign(
            {
                user_id: userId,
                name: name,
                email: email,
                role: role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );


        // Send response
        res.status(201).json({

            message: "Registration successful",

            token: token,

            user: {
                user_id: userId,
                name: name,
                email: email,
                role: role
            }

        });


    } catch (error) {

        await connection.rollback();

        console.error("Registration error:", error);

        res.status(500).json({

            message: "Registration failed",
            error: error.message

        });

    } finally {

        connection.release();

    }

});


// ========================================
// LOGIN
// ========================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({
                message: "Email and password are required"
            });

        }


        // Find user
        const [users] = await db.query(
            `SELECT
                user_id,
                name,
                email,
                password_hash,
                role
             FROM users
             WHERE email = ?`,
            [email]
        );


        if (users.length === 0) {

            return res.status(401).json({
                message: "Invalid email or password"
            });

        }


        const user = users[0];


        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );


        if (!passwordMatch) {

            return res.status(401).json({
                message: "Invalid email or password"
            });

        }


        // Create JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );


        res.json({

            message: "Login successful",

            token: token,

            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }

        });


    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({

            message: "Login failed",
            error: error.message

        });

    }

});
router.get("/doctor-profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [rows] = await db.query(
            `SELECT
                u.user_id,
                u.name,
                u.email,
                u.role,
                d.doctor_id,
                d.specialization,
                d.phone
             FROM users u
             INNER JOIN doctors d
                 ON u.user_id = d.user_id
             WHERE u.user_id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Doctor profile not found."
            });
        }

        res.json({
            doctor: rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctor profile.",
            error: error.message
        });
    }
});
router.put("/doctor-profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const {
            name,
            phone,
            specialization
        } = req.body;

        await db.query(
            `UPDATE users
             SET name = ?
             WHERE user_id = ?`,
            [name, userId]
        );

        await db.query(
            `UPDATE doctors
             SET phone = ?,
                 specialization = ?
             WHERE user_id = ?`,
            [phone, specialization, userId]
        );

        res.json({
            message: "Doctor profile updated successfully."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update doctor profile.",
            error: error.message
        });
    }
});
module.exports = router;