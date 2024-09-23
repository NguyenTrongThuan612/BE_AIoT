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
        // Kiểm tra xem user có tồn tại hay không
        const user = await pool.query('SELECT * FROM my_schema.user WHERE idUser = $1', [idUser]);
        if (user.rows.length === 0) {
            return res.status(404).json({ statusCode: "404", error: "User not found!" });
        }

        // Lấy tất cả các sensor của user
        const sensorsQuery = await pool.query('SELECT * FROM my_schema.sensor WHERE idUser = $1', [idUser]);
        const sensors = await Promise.all(sensorsQuery.rows.map(async (sensor) => {
            // Lấy sensor_data cho từng sensor
            const result = await pool.query('SELECT * FROM my_schema.sensor_data WHERE idSensor = $1', [sensor.idsensor]);

            // Nếu có sensor_data, cập nhật tất cả các hàng isRead thành true
            if (result.rows.length > 0) {
                await pool.query('UPDATE my_schema.sensor_data SET isRead = true WHERE idSensor = $1', [sensor.idsensor]);
            }
            const age = user.rows[0].age;
            
            // Trả về sensor và dữ liệu sensor_data
            return { ...sensor, sensor_data:  result.rows.map((item)=>{ 
                 let {temp,sp02,heartrate}=item;
                 // ket qua nhiet do
                 item={...item,ketQua:"Nhiệt độ " + (temp >=36 && temp <=38 ?"Bình thường, ":temp<36 ? "Cảm lạnh,":"Sốt ")}
                 //ket qua sp02
                 item={...item,ketQua:item.ketQua + "Chỉ số SpO2 " + (sp02 <=17 && sp02 <=100 ?"Bình thường, ":sp02<=96 && sp02 >=94 ? "Trung bình,":"Nguy hiểm, ")}
                 //ket qua nhip tim
                 if(1 < age <= 3 && 76 < heartrate && heartrate < 142 ||
                    3 < age <= 4 && 70 < heartrate && heartrate < 136 ||
                    4 < age <= 6 && 65 < heartrate && heartrate < 131 ||
                    6 < age <= 8 && 59 < heartrate && heartrate < 123 ||
                    8 < age <= 12 && 55 < heartrate && heartrate < 115 ||
                    12 < age <= 15 && 47 < heartrate && heartrate < 108 ||
                    15 < age <= 18 && 43 < heartrate && heartrate < 104
                 ){
                     return {...item,ketQua:item.ketQua+ "Nhịp tim bình thường"}
                 }




                return {...item,ketQua:item.ketQua+ "Nhịp tim không bình thường"}}) };
        }));

        // Trả về kết quả sau khi lấy và cập nhật dữ liệu
        res.status(200).json({ statusCode: "200", data: { sensors } });
    } catch (err) {
        console.error('Error retrieving data:', err);
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
        
        if(sensor.rows[0].status==true){
            const result = await pool.query('SELECT * FROM my_schema.sensor_data WHERE idSensor = $1', [sensor.rows[0].idsensor]);
            res.status(200).json({ statusCode: "200", data: {...sensor.rows[0],sensor_data:result.rows} });
        }
        else{
            res.status(200).json({ statusCode: "200", data: { ...sensor.rows[0],sensor_data:[] } });
        }
    } catch (err) {
        res.status(500).json({ statusCode: "500", error: 'Error retrieving data' });
    }
});

// Lấy dữ liệu cảm biến mới nhất theo deviceId
sensorRouter.get('/latest/:idsensor', async (req, res) => {
    const { idsensor } = req.params;
    try {
        const result = await pool.query('SELECT * FROM my_schema.sensor_data WHERE idsensor = $1 ORDER BY timestamp DESC LIMIT 1', [idsensor]);
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
    const { status } = req.body;

    if (status === undefined) {
        return res.status(400).json({ error: 'Missing required fields: status' });
    }

    try {
        const result = await pool.query('UPDATE my_schema.sensor SET status = $1 WHERE idSensor = $2 RETURNING *', [ status, idSensor]);
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
