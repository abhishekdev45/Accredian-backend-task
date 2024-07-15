const express = require("express");
const bodyParser = require("body-parser");
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

console.log("DATABASE_URL:", process.env.DATABASE_URL);

app.use(cors());
app.use(bodyParser.json());

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

app.post("/api/referrals", async (req, res) => {
  const { referrerName, referrerEmail, refereeName, refereeEmail } = req.body;


  if (!referrerName || !referrerEmail || !refereeName || !refereeEmail) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(referrerEmail) || !emailRegex.test(refereeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const nameRegex = /^[a-zA-Z\s]*$/;
  if (!nameRegex.test(referrerName) || !nameRegex.test(refereeName)) {
    return res.status(400).json({ error: "Names should not contain numbers" });
  }

  try {
    
    const referral = await prisma.referral.create({
      data: { referrerName, referrerEmail, refereeName, refereeEmail },
    });

    
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
