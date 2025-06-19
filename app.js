const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/ussd', (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  console.log("Session ID:", sessionId);
  console.log("Service Code:", serviceCode);
  console.log("Phone Number:", phoneNumber);
  console.log("USSD Text:", text);

  const input = text.split("*");
  const level = input.length;
  const lang = input[0];
  let response = "";

  // === Start Screen ===
  if (text === "") {
    response = `CON Welcome to BMI Checker / Murakaza neza kuri BMI Checker / Bienvenue sur BMI Checker
1. English
2. Kinyarwanda
3. Français`;
  }

  // === ENGLISH FLOW ===
  else if (lang === "1") {
    if (level === 1) {
      response = `CON Please enter your weight in KGs:`;
    } else if (level === 2) {
      response = `CON Please enter your height in CMs:`;
    } else if (level === 3) {
      const weight = parseFloat(input[1]);
      const height = parseFloat(input[2]) / 100;
      const bmi = weight / (height * height);
      const category = bmiCategoryEN(bmi);
      response = `CON Your BMI is ${bmi.toFixed(1)} (${category}). Do you want health tips?\n1. Yes\n2. No`;
    } else if (level === 4) {
      response = input[3] === "1"
        ? `END Tip: Eat balanced meals, drink water, and exercise regularly.`
        : `END Thank you for using BMI Checker.`;
    }
  }

  // === KINYARWANDA FLOW ===
  else if (lang === "2") {
    if (level === 1) {
      response = `CON Injiza ibiro byawe mu kiro:`;
    } else if (level === 2) {
      response = `CON Injiza uburebure bwawe mu cm:`;
    } else if (level === 3) {
      const weight = parseFloat(input[1]);
      const height = parseFloat(input[2]) / 100;
      const bmi = weight / (height * height);
      const category = bmiCategoryRW(bmi);
      response = `CON BMI yawe ni ${bmi.toFixed(1)} (${category}). Ushaka inama z’ubuzima?\n1. Yego\n2. Oya`;
    } else if (level === 4) {
      response = input[3] === "1"
        ? `END Inama: Fata ifunguro rizira amavuta menshi, unywe amazi kandi ukore imyitozo.`
        : `END Murakoze gukoresha BMI Checker.`;
    }
  }

  // === FRENCH FLOW ===
  else if (lang === "3") {
    if (level === 1) {
      response = `CON Entrez votre poids en kilogrammes :`;
    } else if (level === 2) {
      response = `CON Entrez votre taille en centimètres :`;
    } else if (level === 3) {
      const weight = parseFloat(input[1]);
      const height = parseFloat(input[2]) / 100;
      const bmi = weight / (height * height);
      const category = bmiCategoryFR(bmi);
      response = `CON Votre IMC est ${bmi.toFixed(1)} (${category}). Voulez-vous des conseils santé ?\n1. Oui\n2. Non`;
    } else if (level === 4) {
      response = input[3] === "1"
        ? `END Conseil : Mangez sainement, buvez de l'eau et faites de l'exercice régulièrement.`
        : `END Merci d'avoir utilisé BMI Checker.`;
    }
  }

  // === INVALID ENTRY ===
  else {
    response = `END Invalid input.`;
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

// === BMI CATEGORY HELPERS ===
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

app.listen(PORT, () => {
  console.log(`✅ BMI USSD app running on port ${PORT}`);
});
