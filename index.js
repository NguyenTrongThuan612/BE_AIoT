const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
const port = 4000;

// Cấu hình kết nối PostgreSQL
const pool = new Pool({
    user: 'b1d72ac3-a069-4182-825b-809fe72df8c9',         // Thay bằng tên người dùng của bạn
    host: '52.163.226.41',              // Địa chỉ máy chủ PostgreSQL
    database: 'e4f1625f-498b-457f-8718-8d8f03cc9ce0',      // Thay bằng tên cơ sở dữ liệu của bạn
    password: 'JSi3MYRL2gkAt8yYuoUoh9Ssu',      // Thay bằng mật khẩu của bạn
    port: 5432,                     // Cổng PostgreSQL
});



// API để lấy dữ liệu từ bảng sensor_Data
app.get('/api/sensors/latest', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM my_schema.sensor_data ORDER BY timestamp DESC LIMIT 1');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving data');
    }
});

app.get('/api/sensors/latest/:deviceId', async (req, res) => {
    const { deviceId } = req.params; // Lấy device_id từ URL

    try {
        const result = await pool.query(
            'SELECT * FROM my_schema.sensor_data WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 1',
            [deviceId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving data');
    }
});


// Khởi động server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
