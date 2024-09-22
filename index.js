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

        const user = userQuery.rows[0]; // user là đối tượng

        const sensorsQuery = await pool.query(
            'SELECT * FROM my_schema.sensor WHERE idUser = $1',
            [idUser]
        );

        const sensors = []; // Khởi tạo là mảng

        for (const sensor of sensorsQuery.rows) {
            try {
                const result = await pool.query(
                    'SELECT * FROM my_schema.sensor_data WHERE idSensor = $1',
                    [sensor.idsensor]
                );
                // Thêm đối tượng cảm biến với tất cả thuộc tính và dữ liệu cảm biến
                sensors.push({
                    ...sensor, // Thêm toàn bộ thuộc tính của cảm biến
                    sensor_data: result.rows // Thêm dữ liệu cảm biến
                });
            } catch (err) {
                // Có thể ghi log lỗi hoặc xử lý ở đây
            }
        }

        // Gắn sensors vào đối tượng user
        user.sensors = sensors;

        return res.status(200).json({
            statusCode: "200",
            data: {
                user: user // user bây giờ chứa cả sensors
            }
        });

    } catch (error) {
        res.status(500).json({
            statusCode: "500",
            error: 'Error retrieving data'
        });
    }
});

// API để lấy dữ liệu từ bảng sensor_data
app.get('/api/sensors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM my_schema.sensor_data ');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({
            statusCode: "500",
            error: 'Error retrieving data'
        });
    }
});

//http://URI:4000/api/sensors/user/1 -- get sensor by IDUser
app.get('/api/sensors/user/:idUser', async (req, res) => {
    try {
        const idUser = req.params.idUser;
        const user = await pool.query('SELECT * FROM my_schema.user WHERE idUser = $1',
            [idUser]);
        if(user.rows.length ===0){
            return res.status(404).json({
                statusCode:"404",
                error: "User not found!"
            })
        }
        const sensorsQuery = await pool.query(
            'SELECT * FROM my_schema.sensor WHERE idUser = $1',
            [idUser]
        );

        const sensors = []; // Khởi tạo là mảng

        for (const sensor of sensorsQuery.rows) {
            try {
                const result = await pool.query(
                    'SELECT * FROM my_schema.sensor_data WHERE idSensor = $1',
                    [sensor.idsensor]
                );
                // Thêm đối tượng cảm biến với tất cả thuộc tính và dữ liệu cảm biến
                sensors.push({
                    ...sensor, // Thêm toàn bộ thuộc tính của cảm biến
                    sensor_data: result.rows // Thêm dữ liệu cảm biến
                });
            } catch (err) {
                // Có thể ghi log lỗi hoặc xử lý ở đây
            }
        }
        return res.status(200).json({
            statusCode: "200",
            data: {
                sensors:  sensors
            }
        });


    } catch (err) {
        res.status(500).json({
            statusCode: "500",
            error: 'Error retrieving data'
        });
    }
});

app.get('/api/sensors/:idSensor', async (req, res) => {
    try {
        const idSensor = req.params.idSensor;
        const sensor = await pool.query('SELECT * FROM my_schema.sensor WHERE idSensor = $1 ',
            [idSensor]);
        if(sensor.rows.length === 0){
            return res.status(404).json({
                statusCode:"404",
                error: "Sensor not found!"
            })
        }
        const result = await pool.query(
            'SELECT * FROM my_schema.sensor_data WHERE idSensor = $1',
            [sensor.rows[0].idsensor]
        );
        return res.status(200).json({
            statusCode: "200",
            data: {
                sensor:  result.rows
            }
        });

    } catch (err) {
        res.status(500).json({
            statusCode: "500",
            error: 'Error retrieving data'
        });
    }
})

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
        res.status(500).json({
            statusCode: "500",
            error: 'Error retrieving data'
        });
    }
});


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
