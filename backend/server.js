const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

dotenv.config();

const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health route for quick testing.
app.get("/", (req, res) => {
  res.send("Auth API is running");
});

// Auth API routes
app.use("/", authRoutes);
app.use("/", expenseRoutes);

// Global fallback error handler.
app.use((err, req, res, next) => {
  console.error(err.stack);
  return res.status(500).json({ message: "Unexpected server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
