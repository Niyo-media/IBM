const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// Neon PostgreSQL connection
const pool = new Pool({
  connectionString: 'YOUR_NEON_DATABASE_URL', // replace this with actual URL
  ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/ussd', async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  const input = text.split("*");
  const level = input.length;
  const lang = input[0];
  let response = "";

  let session = await getSession(sessionId);

  if (!session && text === "") {
    await createSession(sessionId, phoneNumber, serviceCode);
    response = `CON Welcome to BMI Checker / Murakaza neza kuri BMI Checker / Bienvenue sur BMI Checker
1. English
2. Kinyarwanda
3. Français`;
    return send(res, response);
  }

  if (!session) {
    await createSession(sessionId, phoneNumber, serviceCode);
    session = await getSession(sessionId);
  }

  // === ENGLISH ===
  if (lang === "1") {
    if (level === 1) {
      response = `CON Please enter your weight in KGs:`;
    } else if (level === 2) {
      response = `CON Please enter your height in CMs:`;
      await updateSession(sessionId, { language: "English", weight: parseFloat(input[1]) });
    } else if (level === 3) {
      response = `CON Please enter your age:`;
      await updateSession(sessionId, { height: parseFloat(input[2]) });
    } else if (level === 4) {
      const weight = parseFloat(input[1]);
      const height = parseFloat(input[2]) / 100;
      const age = parseInt(input[3]);
      const bmi = weight / (height * height);
      const category = bmiCategoryEN(bmi);
      await updateSession(sessionId, { age: age });
      await saveToRecords(phoneNumber, "English", weight, height * 100, age, bmi, category);
      response = `CON Your BMI is ${bmi.toFixed(1)} (${category}). Age: ${age}\nDo you want health tips?\n1. Yes\n2. No`;
    } else if (level === 5) {
      response = input[4] === "1"
        ? `END Tip: Eat balanced meals, drink water, and exercise regularly.`
        : `END Thank you for using BMI Checker.`;
      await deleteSession(sessionId);
    }
  }

  // === KINYARWANDA ===
  else if (lang === "2") {
    if (level === 1) {
      response = `CON Injiza ibiro byawe mu kiro:`;
    } else if (level === 2) {
      response = `CON Injiza uburebure bwawe mu cm:`;
      await updateSession(sessionId, { language: "Kinyarwanda", weight: parseFloat(input[1]) });
    } else if (level === 3) {
      response = `CON Injiza imyaka yawe:`;
      await updateSession(sessionId, { height: parseFloat(input[2]) });
    } else if (level === 4) {
      const weight = parseFloat(input[1]);
      const height = parseFloat(input[2]) / 100;
      const age = parseInt(input[3]);
      const bmi = weight / (height * height);
      const category = bmiCategoryRW(bmi);
      await updateSession(sessionId, { age });
      await saveToRecords(phoneNumber, "Kinyarwanda", weight, height * 100, age, bmi, category);
      response = `CON BMI yawe ni ${bmi.toFixed(1)} (${category}). Imyaka: ${age}\nUshaka inama z’ubuzima?\n1. Yego\n2. Oya`;
    } else if (level === 5) {
      response = input[4] === "1"
        ? `END Inama: Fata ifunguro rizira amavuta menshi, unywe amazi kandi ukore imyitozo.`
        : `END Murakoze gukoresha BMI Checker.`;
      await deleteSession(sessionId);
    }
  }

  // === FRENCH ===
  else if (lang === "3") {
    if (level === 1) {
      response = `CON Entrez votre poids en kilogrammes :`;
    } else if (level === 2) {
      response = `CON Entrez votre taille en centimètres :`;
      await updateSession(sessionId, { language: "Français", weight: parseFloat(input[1]) });
    } else if (level === 3) {
      response = `CON Entrez votre âge :`;
      await updateSession(sessionId, { height: parseFloat(input[2]) });
    } else if (level === 4) {
      const weight = parseFloat(input[1]);
      const height = parseFloat(input[2]) / 100;
      const age = parseInt(input[3]);
      const bmi = weight / (height * height);
      const category = bmiCategoryFR(bmi);
      await updateSession(sessionId, { age });
      await saveToRecords(phoneNumber, "Français", weight, height * 100, age, bmi, category);
      response = `CON Votre IMC est ${bmi.toFixed(1)} (${category}). Âge : ${age}\nVoulez-vous des conseils santé ?\n1. Oui\n2. Non`;
    } else if (level === 5) {
      response = input[4] === "1"
        ? `END Conseil : Mangez sainement, buvez de l'eau et faites de l'exercice régulièrement.`
        : `END Merci d'avoir utilisé BMI Checker.`;
      await deleteSession(sessionId);
    }
  }

  else {
    response = `END Invalid input.`;
  }

  send(res, response);
});
