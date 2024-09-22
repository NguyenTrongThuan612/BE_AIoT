const express = require('express');
const dotenv = require('dotenv');
const sensorsRouter = require('./routers/sensors.router'); // Import router cho sensors
const pool = require('./db'); // Import pool từ db.js
const port = process.env.PORT;

dotenv.config(); // Load environment variables từ file .env

const app = express();
app.use(express.json());

// Sử dụng router cho sensors
app.use('/api/sensors', sensorsRouter);

// API đăng nhập
app.post('/api/login', async (req, res) => {
    try {
        const { idUser, password } = req.body;
        if (!idUser || !password) {
            return res.status(400).json({ error: 'Invalid parameters: {idUser: "", password: ""}' });
        }

        const userQuery = await pool.query(
            'SELECT * FROM my_schema.user WHERE idUser = $1 AND password = $2',
            [idUser, password]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ 
                statusCode: "404",
                error: 'Login failed!' 
            });
        }

        const user = userQuery.rows[0];

        const sensorsQuery = await pool.query(
            'SELECT * FROM my_schema.sensor WHERE idUser = $1',
            [idUser]
        );

        const sensors = [];

        for (const sensor of sensorsQuery.rows) {
            const result = await pool.query(
                'SELECT * FROM my_schema.sensor_data WHERE idSensor = $1',
                [sensor.idsensor]
            );
            sensors.push({
                ...sensor,
                sensor_data: result.rows
            });
        }

        user.sensors = sensors;

        return res.status(200).json({
            statusCode: "200",
            data: {
                user: user
            }
        });

    } catch (error) {
        res.status(500).json({
            statusCode: "500",
            error: 'Error retrieving data'
        });
    }
});

// Health check API
app.get('/api/health', async (req, res) => {
    try {
        res.status(200).json();
    } catch (err) {
        res.status(500).json({
            statusCode: "500",
            error: 'Error retrieving data'
        });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});