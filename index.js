const express = require("express");
const bodyParser = require("body-parser");
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // Enable Prisma logging
});
const PORT = process.env.PORT || 3000;

console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper function to send email using Google Mail Service API
async function sendReferralEmail(referral) {
  console.log(referral);
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS,
    },
  });

  let mailOptions = {
    from: process.env.GMAIL_USER,
    to: referral.refereeEmail,
    subject: "You have been referred!",
    text: `Hi ${referral.refereeName},\n\n${referral.referrerName} has referred you. Contact them at ${referral.referrerEmail}.\n\nBest regards,\nReferral Team`,
  };

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

// REST API endpoints
app.post("/api/referrals", async (req, res) => {
  const { referrerName, referrerEmail, refereeName, refereeEmail } = req.body;
  console.log("Request received with data:", req.body);

  // Validate input
  if (!referrerName || !referrerEmail || !refereeName || !refereeEmail) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(referrerEmail) || !emailRegex.test(refereeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Basic name validation (no numbers)
  const nameRegex = /^[a-zA-Z\s]*$/;
  if (!nameRegex.test(referrerName) || !nameRegex.test(refereeName)) {
    return res.status(400).json({ error: "Names should not contain numbers" });
  }

  try {
    console.log("Creating referral with data:", { referrerName, referrerEmail, refereeName, refereeEmail });
    const referral = await prisma.referral.create({
      data: { referrerName, referrerEmail, refereeName, refereeEmail },
    });

    console.log("Referral created successfully:", referral);

    // Send referral email
    await sendReferralEmail(referral);

    res.status(201).json(referral);
  } catch (error) {
    console.error("Error creating referral:", error);

    if (error.code === "P2002") {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "An error occurred while creating the referral" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
