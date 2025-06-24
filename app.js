const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// Neon PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgresql://bmidb_owner:npg_Kd39fWjvGCiX@ep-billowing-lake-a89rsu9d-pooler.eastus2.azure.neon.tech/bmidb?sslmode=requireYOUR_NEON_DATABASE_URL', // replace with your actual URL
  ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.urlencoded({ extended: false }));

// === Utility Functions ===
async function getSession(sessionId) {
  const result = await pool.query('SELECT * FROM sessions WHERE session_id = $1', [sessionId]);
  return result.rows[0];
}

async function createSession(sessionId, phoneNumber, serviceCode) {
  await pool.query(
    'INSERT INTO sessions (session_id, phone_number, service_code,language) VALUES ($1, $2, $3,$4)',
    [sessionId, phoneNumber, serviceCode]
  );
}

async function saveToRecords(sessionId, weight, height, age, bmi, status, tipsRequested) {
  await pool.query(
    'INSERT INTO bmi_records (session_id, weight, height, age, bmi, status, tips_requested) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [sessionId, weight, height, age, bmi, status, tipsRequested]
  );
}

function bmiCategoryEN(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function bmiCategoryRW(bmi) {
  if (bmi < 18.5) return "Ufite ibiro bike";
  if (bmi < 25) return "Bisanzwe";
  if (bmi < 30) return "Ufite ibiro byinshi";
  return "Ufite umubyibuho ukabije";
}

function bmiCategoryFR(bmi) {
  if (bmi < 18.5) return "Insuffisance pondérale";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Surpoids";
  return "Obésité";
}

function send(res, response) {
  console.log("Sending response:", response);
  res.set('Content-Type', 'text/plain');
  res.send(response);
}

// === USSD Logic ===
app.post('/ussd', async (req, res) => {
  console.log("USSD Request:", req.body);
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  const input = text.split("*");
  const level = input.length;
  const lang = input[0];
  let response = "";

  let session = await getSession(sessionId);

  if (!session && text === "") {
    await createSession(sessionId, phoneNumber, serviceCode);
    response = `CON Welcome to BMI Checker / Murakaza neza kuri BMI Checker / Bienvenue sur BMI Checker\n1. English\n2. Kinyarwanda\n3. Français`;
    return send(res, response);
  }

  if (!session) {
    await createSession(sessionId, phoneNumber, serviceCode);
    session = await getSession(sessionId);
  }

  if (lang === "1") { // English
    if (level === 1) {
      response = `CON Please enter your weight in KGs:`;
    } else if (level === 2) {
      if (input[1] === "0") {
        response = `CON Welcome to BMI Checker\n1. English\n2. Kinyarwanda\n3. Français`;
      } else {
        response = `CON Please enter your height in CMs:\n0. Back`;
      }
    } else if (level === 3) {
      if (input[2] === "0") {
        response = `CON Please enter your weight in KGs:`;
      } else {
        response = `CON Please enter your age:\n0. Back`;
      }
    } else if (level === 4) {
      if (input[3] === "0") {
        response = `CON Please enter your height in CMs:\n0. Back`;
      } else {
        const weight = parseFloat(input[1]);
        const height = parseFloat(input[2]);
        const age = parseInt(input[3]);
        const bmi = weight / ((height / 100) * (height / 100));
        const category = bmiCategoryEN(bmi);
        response = `CON Your BMI is ${bmi.toFixed(1)} (${category}). Age: ${age}\nDo you want health tips?\n1. Yes\n2. No\n0. Back`;
      }
    } else if (level === 5) {
      if (input[4] === "0") {
        response = `CON Please enter your age:\n0. Back`;
      } else {
        const weight = parseFloat(input[1]);
        const height = parseFloat(input[2]);
        const age = parseInt(input[3]);
        const bmi = weight / ((height / 100) * (height / 100));
        const category = bmiCategoryEN(bmi);
        const tipsRequested = input[4] === "1";
        await saveToRecords(sessionId, weight, height, age, bmi, category, tipsRequested);
        response = tipsRequested
          ? `END Tip: Eat balanced meals, drink water, and exercise regularly.`
          : `END Thank you for using BMI Checker.`;
      }
    }
  } else {
    response = `END Invalid input.`;
  }

  send(res, response);
});

app.listen(PORT, () => {
  console.log(`✅ BMI USSD app running on port ${PORT}`);
});
