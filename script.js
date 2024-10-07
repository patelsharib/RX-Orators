// Variables for speech recognition
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; // Set to Indian English

    recognition.onresult = function(event) {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("Heard:", transcript);
        handleInput(transcript);
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
    };
}

// Variables for field tracking
let medicationList = []; // Store medications with durations here
let currentMedication = null; // Store current medication to wait for duration input
let inputStage = 0; // To keep track of input flow: 0 = name, 1 = age, 2 = gender, 3 = symptoms, 4 = medications

// Start voice recognition
document.getElementById('start-btn').addEventListener('click', () => {
    if (recognition) {
        recognition.start();
        console.log("Voice recognition started...");
    } else {
        console.error("Speech recognition not supported.");
    }
});

// Stop voice recognition
document.getElementById('stop-btn').addEventListener('click', () => {
    if (recognition) {
        recognition.stop();
        console.log("Voice recognition stopped.");
    }
});

// Add event listener for reset button
document.getElementById('reset-btn').addEventListener('click', () => {
    resetFields(); // Call reset fields on reset button click
});

// Predefined medication mapping
const medicationMapping = {
    "saridon": "Saridon - used for headaches",
    "dolo": "Dolo 650 - used for fever",
    "combiflam": "Combiflam - used for pain relief",
    "cetrizine": "Cetrizine - used for allergies",
    "crocin": "Crocin - used for fever",
    "zincovit": "Zincovit - multivitamin tablets"
};

// Duration mappings
const durationMapping = {
    "after breakfast": "After breakfast",
    "after lunch": "After lunch",
    "after dinner": "After dinner"
};

// Handle input from voice recognition
function handleInput(transcript) {
    if (transcript.includes("stop")) {
        if (recognition) {
            recognition.stop();
            console.log("Voice recognition stopped.");
        }
    } else if (transcript.includes("upload")) {
        uploadPDF(); // Call the uploadPDF function
    } else if (transcript.includes("medications")) {
        // Shift focus to the medications field
        document.getElementById('medications').focus();
        console.log("Focused on medications field.");
        inputStage = 4; // Move to medications stage
    } else if (transcript.includes("symptoms")) {
        // Shift focus to the symptoms field
        document.getElementById('symptoms').focus();
        console.log("Focused on symptoms field.");
        inputStage = 3; // Move to symptoms stage
    } else {
        processInput(transcript);
    }
}

// Process input in the correct order: name → age → gender → symptoms → medication
function processInput(transcript) {
    const patientNameInput = document.getElementById('patient-name');
    const ageInput = document.getElementById('age');
    const genderInput = document.getElementById('gender');
    const symptomsInput = document.getElementById('symptoms');
    const medicationsInput = document.getElementById('medications');

    if (inputStage === 0 && !patientNameInput.value) {
        // Fill patient name
        patientNameInput.value = transcript;
        inputStage++;
    } else if (inputStage === 1 && !ageInput.value && /\d+/.test(transcript)) {
        // Fill age if numeric value is detected
        ageInput.value = transcript.match(/\d+/)[0]; // Extract numeric value
        inputStage++;
    } else if (inputStage === 2 && !genderInput.value) {
        // Fill gender
        genderInput.value = transcript;
        inputStage++;
    } else if (inputStage === 3) {
        // Fill symptoms
        if (transcript.trim() !== '') {
            symptomsInput.value += (symptomsInput.value ? ', ' : '') + transcript; // Append to existing symptoms
            console.log(`Updated symptoms: ${symptomsInput.value}`);
        }
        // Keep focus on symptoms until "medications" is said
    } else if (inputStage === 4) {
        // Handle medications input
        if (currentMedication) {
            // Waiting for duration input after a medication has been identified
            const durations = matchDurations(transcript);
            if (durations.length > 0) {
                medicationList.push({ name: currentMedication, timing: durations }); // Store medication with timing
                currentMedication = null; // Reset for the next medication
                updateMedicationsField();
            }
        } else {
            // Check for predefined medications first
            const medication = mapMedication(transcript);

            if (medication) {
                // Found in predefined list
                currentMedication = medication;
                console.log(`Predefined medication detected: ${medication}. Waiting for duration.`);
            } else {
                // No match in predefined list, treat as free-form medication
                currentMedication = transcript; // Use transcript as free-form medication
                console.log(`Free-form medication detected: ${currentMedication}. Waiting for duration.`);
            }
        }
    }
}

// Map recognized speech to predefined medications
function mapMedication(transcript) {
    for (let key in medicationMapping) {
        if (transcript.includes(key)) {
            return medicationMapping[key];
        }
    }
    return null;  // If no match, return null for free-form handling
}

// Match recognized speech to known durations
function matchDurations(transcript) {
    let matchedDurations = [];
    for (let key in durationMapping) {
        if (transcript.includes(key)) {
            matchedDurations.push(durationMapping[key]);
        }
    }
    return matchedDurations;
}

// Update medications field
function updateMedicationsField() {
    let medicationsText = medicationList.map((med, index) => `${index + 1}. ${med.name} (${med.timing.join(', ')})`).join("\n");
    document.getElementById('medications').value = medicationsText;
}

// Reset fields
function resetFields() {
    document.getElementById('patient-name').value = '';
    document.getElementById('age').value = '';
    document.getElementById('gender').value = '';
    document.getElementById('symptoms').value = '';
    document.getElementById('medications').value = '';
    medicationList = []; // Clear the medication list
    currentMedication = null; // Reset current medication
    inputStage = 0; // Reset input stage
    console.log("Fields reset for next input.");
}

// Upload PDF functionality
function uploadPDF() {
    const { jsPDF } = window.jspdf; // Access jsPDF from window.jspdf

    const patientName = document.getElementById('patient-name').value.trim();
    const age = document.getElementById('age').value.trim();
    const gender = document.getElementById('gender').value.trim();
    const symptoms = document.getElementById('symptoms').value.trim();
    const medicationsText = document.getElementById('medications').value.trim();

    if (!patientName || !age || !medicationsText) {
        alert('Please enter the patient\'s name, age, and list medications.');
        return;
    }

    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold'); // Switch to Helvetica (a standard jsPDF font)
    doc.setFontSize(11); // Set font size

    // Load and add the logo image
    const img = new Image();
    img.src = 'RX-Orator.png'; // Ensure this is the correct path to the image
    img.onload = function() {
        doc.addImage(img, 'PNG', 10, 10, 80, 30); // Logo placement

        // Add the business name and info aligned to the right
        doc.text('Clinic Name', 160, 25, { align: 'right' });
        doc.text('Agripada, Mumbai, Maharashtra', 160, 30, { align: 'right' });
        doc.text('(+91) 909090909', 160, 35, { align: 'right' });
        doc.text('email@example.com', 160, 40, { align: 'right' });

        doc.text("Patient Report", 105, 65, { align: 'center' });

        // Add patient data
        doc.text(`Patient Name: ${patientName}`, 20, 80);
        doc.text(`Age: ${age}`, 20, 85);
        doc.text(`Gender: ${gender}`, 20, 90);
        doc.text(`Symptoms: ${symptoms}`, 20, 95);

        // Medications in tabular format
        const tableData = medicationList.map((med, index) => [index + 1, med.name, med.timing.join(', ')]);
        doc.autoTable({
            startY: 120,
            head: [['Sr', 'Medication', 'Duration']],
            body: tableData,
        });

        // Add doctor's name and address
        doc.text('Doctor\'s Name: Dr. Shara', 20, 240);
        doc.text('Clinic Address: Agripada, Mumbai, Maharashtra', 20, 245);

        // Add doctor's signature image
        const signatureImg = new Image();
        signatureImg.src = 'docsign.png'; // Ensure this is the correct path to the image
        signatureImg.onload = function() {
            doc.addImage(signatureImg, 'PNG', 20, 250, 50, 20); // Adjust size and position as needed

            // Save the PDF
            const currentDate = new Date().toLocaleDateString('en-IN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).replace(/\//g, '-'); // Format date as DD-MM-YYYY
            doc.save(`${patientName}_${currentDate}.pdf`);

            // Reset fields after PDF generation
            resetFields();
        };
    };
}
