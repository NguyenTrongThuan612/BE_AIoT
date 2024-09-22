const express = require('express');

const sensorRouter = express.Router();
const pool = require('../db'); // Import pool từ db.js

// API để lấy tất cả dữ liệu từ bảng sensor_data
sensorRouter.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM my_schema.sensor_data');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ statusCode: "500", error: 'Error retrieving data' });
    }
});

// Lấy cảm biến theo IDUser
sensorRouter.get('/user/:idUser', async (req, res) => {
    const idUser = req.params.idUser;
    try {
        const user = await pool.query('SELECT * FROM my_schema.user WHERE idUser = $1', [idUser]);
        if (user.rows.length === 0) {
            return res.status(404).json({ statusCode: "404", error: "User not found!" });
        }

        const sensorsQuery = await pool.query('SELECT * FROM my_schema.sensor WHERE idUser = $1', [idUser]);
        const sensors = await Promise.all(sensorsQuery.rows.map(async (sensor) => {
            const result = await pool.query('SELECT * FROM my_schema.sensor_data WHERE idSensor = $1', [sensor.idsensor]);
            return { ...sensor, sensor_data: result.rows };
        }));

        res.status(200).json({ statusCode: "200", data: { sensors } });
    } catch (err) {
        res.status(500).json({ statusCode: "500", error: 'Error retrieving data' });
    }
});

// Lấy cảm biến theo idSensor
sensorRouter.get('/:idSensor', async (req, res) => {
    const idSensor = req.params.idSensor;
    try {
        const sensor = await pool.query('SELECT * FROM my_schema.sensor WHERE idSensor = $1', [idSensor]);
        if (sensor.rows.length === 0) {
            return res.status(404).json({ statusCode: "404", error: "Sensor not found!" });
        }
        const result = await pool.query('SELECT * FROM my_schema.sensor_data WHERE idSensor = $1', [sensor.rows[0].idsensor]);
        res.status(200).json({ statusCode: "200", data: { sensor: result.rows } });
    } catch (err) {
        res.status(500).json({ statusCode: "500", error: 'Error retrieving data' });
    }
});

// Lấy dữ liệu cảm biến mới nhất theo deviceId
sensorRouter.get('/latest/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM my_schema.sensor_data WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 1', [deviceId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                statusCode: 404,
                error: 'Sensor data not found'
            });
        }
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ statusCode: "500", error: 'Error retrieving data' });
    }
});

// Thêm sensor mới
sensorRouter.post('/', async (req, res) => {
    const { name, idUser, status } = req.body;
    if (!name || !idUser || status === undefined) {
        return res.status(400).json({ error: 'Missing required fields: name, idUser, or status' });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM my_schema.user WHERE idUser = $1', [idUser]);
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ statusCode: 400, error: 'Invalid idUser: User does not exist' });
        }

        const result = await pool.query('INSERT INTO my_schema.sensor (idUser, name, status) VALUES ($1, $2, $3) RETURNING *', [idUser, name, status]);
        res.status(201).json({ statusCode: "201", data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ statusCode: "500", error: 'Error retrieving data' });
    }
});

// Cập nhật thông tin sensor
sensorRouter.put('/:idSensor', async (req, res) => {
    const { idSensor } = req.params;
    const { idUser, status, name } = req.body;

    if (!idUser || status === undefined || !name) {
        return res.status(400).json({ error: 'Missing required fields: idUser, status, or name' });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM my_schema.user WHERE idUser = $1', [idUser]);
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ statusCode: 400, error: 'Invalid idUser: User does not exist' });
        }

        const result = await pool.query('UPDATE my_schema.sensor SET idUser = $1, status = $2, name = $3 WHERE idSensor = $4 RETURNING *', [idUser, status, name, idSensor]);
        if (result.rows.length === 0) {
            return res.status(404).json({ statusCode: 404, error: 'Sensor not found' });
        }

        res.status(200).json({ statusCode: "200", data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ statusCode: "500", error: 'Error retrieving data' });
    }
});

module.exports = sensorRouter;
