// Client-side JavaScript for the Medical Ethics Dilemma Simulator

// DOM Element References
const dilemmaSection = document.getElementById('dilemma-section');
const caseDescriptionEl = document.getElementById('case-description');
const ethicalQuestionHeadingEl = document.getElementById('ethical-question-heading');
const ethicalQuestionEl = document.getElementById('ethical-question');
const optionsContainerEl = document.getElementById('options-container');
const analysisSectionEl = document.getElementById('analysis-section');
const analysisTextEl = document.getElementById('analysis-text');
const newDilemmaBtn = document.getElementById('new-dilemma-btn');
const loadingIndicatorEl = document.getElementById('loading-indicator');
const disclaimerEl = document.getElementById('disclaimer'); // Although static, might be useful

// Event Listeners
newDilemmaBtn.addEventListener('click', fetchDilemma);
optionsContainerEl.addEventListener('click', handleOptionSelect);

// --- Function Definitions ---

// Function to fetch a new dilemma from the serverless function
async function fetchDilemma() {
    console.log("Fetching new dilemma..."); // Log for debugging
    loadingIndicatorEl.style.display = 'block';
    newDilemmaBtn.disabled = true; // Disable button while loading
    analysisSectionEl.style.display = 'none'; // Hide previous analysis
    analysisTextEl.textContent = ''; // Clear previous analysis text
    optionsContainerEl.innerHTML = ''; // Clear previous options
    ethicalQuestionEl.textContent = ''; // Clear previous question
    ethicalQuestionHeadingEl.style.display = 'none'; // Hide question heading
    caseDescriptionEl.innerHTML = ''; // Clear previous case description

    try {
        // In development, you might use 'http://localhost:3000/api/generateDilemma' if using Vercel CLI
        // For deployment, '/api/generateDilemma' is correct.
        const response = await fetch('/api/generateDilemma', {
             method: 'GET', // Or 'POST' if you prefer, adjust serverless function accordingly
             headers: {
                 'Accept': 'application/json'
             }
         });

        if (!response.ok) {
            // Attempt to read error message from server, otherwise use default
            let errorMsg = `Error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = `Error: ${errorData.error || 'Failed to fetch dilemma.'}`;
            } catch (e) {
                // Ignore if response body isn't JSON
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("Dilemma data received:", data); // Log for debugging
        displayDilemma(data);

    } catch (error) {
        console.error("Error fetching dilemma:", error);
        caseDescriptionEl.innerHTML = `<p style="color: red;">Lo sentimos, ocurrió un error al generar el dilema: ${error.message}. Por favor, intenta de nuevo.</p>`;
        // Ensure question/options are cleared/hidden on error
        ethicalQuestionEl.textContent = '';
        ethicalQuestionHeadingEl.style.display = 'none';
        optionsContainerEl.innerHTML = '';
    } finally {
        loadingIndicatorEl.style.display = 'none';
        newDilemmaBtn.disabled = false; // Re-enable button
        console.log("Fetching complete."); // Log for debugging
    }
}

// Function to display the fetched dilemma data in the UI
function displayDilemma(data) {
    // Basic validation of received data structure
    if (!data || typeof data !== 'object' || !data.case_description || !data.ethical_question || !Array.isArray(data.options) || typeof data.analysis_mapping !== 'object') {
        console.error("Invalid data structure received:", data);
        caseDescriptionEl.innerHTML = `<p style="color: red;">Error: Formato de datos inválido recibido del servidor.</p>`;
        ethicalQuestionEl.textContent = '';
        ethicalQuestionHeadingEl.style.display = 'none';
        optionsContainerEl.innerHTML = '';
        return; // Stop execution if data is invalid
    }

    console.log("Displaying dilemma:", data); // Log for debugging

    // Populate case description and ethical question
    // Using innerHTML for description in case Gemini includes basic formatting like paragraphs
    caseDescriptionEl.innerHTML = `<p>${data.case_description.replace(/\n/g, '<br>')}</p>`; // Replace newlines with <br> for display
    ethicalQuestionEl.textContent = data.ethical_question;
    ethicalQuestionHeadingEl.style.display = 'block'; // Show the heading

    // Clear previous options before adding new ones
    optionsContainerEl.innerHTML = '';

    // Create and append option buttons
    data.options.forEach((optionText, index) => {
        const optionButton = document.createElement('button');
        optionButton.classList.add('option-btn');
        optionButton.textContent = optionText;
        optionButton.dataset.optionIndex = index; // Store index

        // Retrieve analysis using the index key from the mapping
        const analysis = data.analysis_mapping[index];
        if (analysis) {
            optionButton.dataset.analysis = analysis; // Store analysis text directly
        } else {
            console.warn(`Analysis not found for option index ${index}`);
            optionButton.dataset.analysis = "Análisis no disponible para esta opción."; // Fallback
        }

        optionsContainerEl.appendChild(optionButton);
    });
}

// Function to handle the selection of an option
function handleOptionSelect(event) {
    // Use event delegation - check if the clicked element is an option button
    const clickedOption = event.target.closest('.option-btn');

    if (!clickedOption) {
        return; // Click was not on an option button
    }

    console.log("Option selected:", clickedOption.dataset.optionIndex); // Log for debugging

    // Remove 'selected' class from any previously selected option
    const previouslySelected = optionsContainerEl.querySelector('.option-btn.selected');
    if (previouslySelected) {
        previouslySelected.classList.remove('selected');
    }

    // Add 'selected' class to the clicked option
    clickedOption.classList.add('selected');

    // Retrieve the analysis from the data attribute
    const analysis = clickedOption.dataset.analysis;

    if (analysis) {
        // Display the analysis - replace newlines for HTML display
        analysisTextEl.innerHTML = `<p>${analysis.replace(/\n/g, '<br>')}</p>`;
        analysisSectionEl.style.display = 'block'; // Show the analysis section
    } else {
        console.error("Analysis data attribute missing on selected option:", clickedOption);
        analysisTextEl.textContent = 'Error: No se pudo encontrar el análisis para esta opción.';
        analysisSectionEl.style.display = 'block'; // Still show section, but with error
    }
}

// --- Initial Setup ---
// We can uncomment the line below if we want a dilemma to load automatically on page load
// document.addEventListener('DOMContentLoaded', fetchDilemma);