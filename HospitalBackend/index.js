require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

// ✅ Route imports
const patientRoutes = require('./routes/patientRoutes');  // Now handles patients + timeline + notifications
const userRoutes = require('./routes/usersRoutes');       // Your existing login/register routes

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use('/api/patients', patientRoutes);
app.use('/api/users', userRoutes);

// ✅ Root route (optional)
app.get('/', (req, res) => {
  res.send('🚀 ER App API is running');
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
