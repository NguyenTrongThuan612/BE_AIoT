const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT;

// Cấu hình kết nối PostgreSQL bằng biến môi trường từ .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// API để lấy dữ liệu từ bảng sensor_data
app.get('/api/sensors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM my_schema.sensor_data ');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json('Error retrieving data');
    }
});

app.get('/api/sensors/latest/:deviceId', async (req, res) => {
    const { deviceId } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM my_schema.sensor_data WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 1',
            [deviceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json('Sensor data not found');
        }
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json('Error retrieving data');
    }
});


app.get('/api/health', async (req, res) => {
    try {
        res.status(200).json();
    } catch (err) {
        console.error(err);
        res.status(500).json('Error retrieving data');
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
