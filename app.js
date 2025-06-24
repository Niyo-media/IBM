const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://bmidb_owner:npg_Kd39fWjvGCiX@ep-billowing-lake-a89rsu9d-pooler.eastus2.azure.neon.tech/bmidb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.urlencoded({ extended: false }));

// Utility Functions
async function getSession(sessionId) {
  try {
    const result = await pool.query('SELECT * FROM sessions WHERE session_id = $1', [sessionId]);
    return result.rows[0];
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

async function createSession(sessionId, phoneNumber, serviceCode, language = null) {
  try {
    await pool.query(
      'INSERT INTO sessions (session_id, phone_number, service_code, language) VALUES ($1, $2, $3, $4)',
      [sessionId, phoneNumber, serviceCode, language]
    );
  } catch (error) {
    console.error("Error creating session:", error);
  }
}

async function saveToRecords(sessionId, weight, height, age, bmi, status, tipsRequested) {
  try {
    await pool.query(
      'INSERT INTO bmi_records (session_id, weight, height, age, bmi, status, tips_requested) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [sessionId, weight, height, age, bmi, status, tipsRequested]
    );
  } catch (error) {
    console.error("Error saving record:", error);
  }
}

function bmiCategory(lang, bmi) {
  if (lang === "1") {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  } else if (lang === "2") {
    if (bmi < 18.5) return "Ufite ibiro bike";
    if (bmi < 25) return "Bisanzwe";
    if (bmi < 30) return "Ufite ibiro byinshi";
    return "Ufite umubyibuho ukabije";
  } else {
    if (bmi < 18.5) return "Insuffisance pondérale";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Surpoids";
    return "Obésité";
  }
}

function send(res, message) {
  res.set('Content-Type', 'text/plain');
  res.send(message);
}

// Main USSD logic
app.post('/ussd', async (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;
    const input = text.split("*");
    const level = input.length;
    const lang = input[0];
    let response = "";

    let session = await getSession(sessionId);

    if (!session && text === "") {
      await createSession(sessionId, phoneNumber, serviceCode);
      return send(res, `CON Welcome to BMI Checker / Murakaza neza kuri BMI Checker / Bienvenue sur BMI Checker\n1. English\n2. Kinyarwanda\n3. Français`);
    }

    if (!session) {
      await createSession(sessionId, phoneNumber, serviceCode, lang);
    }

    const weight = parseFloat(input[1]);
    const height = parseFloat(input[2]);
    const age = parseInt(input[3]);

    // Common BMI calculation
    const bmi = weight && height ? weight / ((height / 100) ** 2) : null;
    const category = bmi ? bmiCategory(lang, bmi) : "";

    // Language-based logic
    const langText = {
      "1": {
        weight: "CON Please enter your weight in KGs:",
        height: "CON Please enter your height in CMs:\n0. Back",
        age: "CON Please enter your age:\n0. Back",
        result: `CON Your BMI is ${bmi?.toFixed(1)} (${category}). Age: ${age}\nDo you want health tips?\n1. Yes\n2. No\n0. Back`,
        tip: "END Tip: Eat balanced meals, drink water, and exercise regularly.",
        thanks: "END Thank you for using BMI Checker."
      },
      "2": {
        weight: "CON Injiza ibiro byawe mu kiro:",
        height: "CON Injiza uburebure bwawe mu cm:\n0. Subira inyuma",
        age: "CON Injiza imyaka yawe:\n0. Subira inyuma",
        result: `CON BMI yawe ni ${bmi?.toFixed(1)} (${category}). Imyaka: ${age}\nUshaka inama z’ubuzima?\n1. Yego\n2. Oya\n0. Subira inyuma`,
        tip: "END Inama: Fata indyo yuzuye, unywe amazi kandi ukore imyitozo.",
        thanks: "END Murakoze gukoresha BMI Checker."
      },
      "3": {
        weight: "CON Entrez votre poids en kilogrammes :",
        height: "CON Entrez votre taille en centimètres :\n0. Retour",
        age: "CON Entrez votre âge :\n0. Retour",
        result: `CON Votre IMC est ${bmi?.toFixed(1)} (${category}). Âge : ${age}\nVoulez-vous des conseils santé ?\n1. Oui\n2. Non\n0. Retour`,
        tip: "END Conseil : Mangez sainement, buvez de l’eau, faites de l’exercice.",
        thanks: "END Merci d'avoir utilisé BMI Checker."
      }
    };

    const msg = langText[lang];

    // Handle levels
    if (level === 1) {
      return send(res, msg.weight);
    } else if (level === 2) {
      return input[1] === "0" ? send(res, `CON Welcome to BMI Checker\n1. English\n2. Kinyarwanda\n3. Français`) : send(res, msg.height);
    } else if (level === 3) {
      return input[2] === "0" ? send(res, msg.weight) : send(res, msg.age);
    } else if (level === 4) {
      return input[3] === "0" ? send(res, msg.height) : send(res, msg.result);
    } else if (level === 5) {
      if (input[4] === "0") return send(res, msg.age);
      const tipsRequested = input[4] === "1";
      await saveToRecords(sessionId, weight, height, age, bmi, category, tipsRequested);
      return send(res, tipsRequested ? msg.tip : msg.thanks);
    } else {
      return send(res, `END Invalid input.`);
    }

  } catch (error) {
    console.error("❌ USSD error:", error);
    return send(res, "END Sorry, something went wrong. Please try again later.");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ BMI USSD app running on port ${PORT}`);
});
