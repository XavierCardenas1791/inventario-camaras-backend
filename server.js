// server.js - Sistema de Inventario de Cámaras con MySQL
require('dotenv').config(); // Para variables de entorno
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise'); // MySQL

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Configuración de MySQL (usa variables de entorno o modifica estos valores)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'tu_usuario',
  password: process.env.DB_PASSWORD || 'tu_contraseña',
  database: process.env.DB_NAME || 'inventario_camaras',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Crear tabla si no existe (ejecuta solo una vez)
async function createTable() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS camaras (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        modelo VARCHAR(100),
        serie VARCHAR(100) NOT NULL UNIQUE,
        ubicacion VARCHAR(100) NOT NULL,
        estado ENUM('Disponible', 'En uso', 'Mantenimiento', 'Dañada') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    connection.release();
    console.log('Tabla "camaras" verificada/creada');
  } catch (error) {
    console.error('Error al crear tabla:', error);
  }
}

// Llamar a la función para crear la tabla al iniciar
createTable();

// ========== ENDPOINTS DE LA API ========== //

// Obtener todas las cámaras
app.get('/camaras', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM camaras');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener cámaras:', error);
    res.status(500).json({ error: 'Error al obtener cámaras' });
  }
});

// Agregar nueva cámara
app.post('/camaras', async (req, res) => {
  const { nombre, modelo, serie, ubicacion, estado } = req.body;
  
  if (!nombre || !serie || !ubicacion || !estado) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO camaras (nombre, modelo, serie, ubicacion, estado) VALUES (?, ?, ?, ?, ?)',
      [nombre, modelo, serie, ubicacion, estado]
    );
    
    const [newCamera] = await pool.query('SELECT * FROM camaras WHERE id = ?', [result.insertId]);
    res.status(201).json(newCamera[0]);
  } catch (error) {
    console.error('Error al agregar cámara:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'El número de serie ya existe' });
    } else {
      res.status(500).json({ error: 'Error al agregar cámara' });
    }
  }
});

// Actualizar cámara
app.put('/camaras/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, modelo, serie, ubicacion, estado } = req.body;

  try {
    await pool.query(
      'UPDATE camaras SET nombre = ?, modelo = ?, serie = ?, ubicacion = ?, estado = ? WHERE id = ?',
      [nombre, modelo, serie, ubicacion, estado, id]
    );
    
    const [updatedCamera] = await pool.query('SELECT * FROM camaras WHERE id = ?', [id]);
    
    if (updatedCamera.length === 0) {
      return res.status(404).json({ error: 'Cámara no encontrada' });
    }
    
    res.json(updatedCamera[0]);
  } catch (error) {
    console.error('Error al actualizar cámara:', error);
    res.status(500).json({ error: 'Error al actualizar cámara' });
  }
});

// Eliminar cámara
app.delete('/camaras/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM camaras WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cámara no encontrada' });
    }
    
    res.json({ message: 'Cámara eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar cámara:', error);
    res.status(500).json({ error: 'Error al eliminar cámara' });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Accesible en la red local usando la IP de tu PC`);
});