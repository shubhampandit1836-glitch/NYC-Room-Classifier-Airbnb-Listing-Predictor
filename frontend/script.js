document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('predict-form');
    const resultPanel = document.querySelector('.result-panel');
    const errorPanel = document.getElementById('state-error');
    const idlePanel = document.getElementById('state-idle');
    const resultState = document.getElementById('state-result');
    const resetBtn = document.getElementById('reset-btn');
    const errorRetryBtn = document.getElementById('error-retry-btn');
    const errorTitle = document.getElementById('error-title');
    const errorCopy = document.getElementById('error-copy');
    const submitBtn = document.getElementById('submit-btn');
    
    // Result elements
    const resultBadge = document.getElementById('result-badge');
    const entireHomeBar = document.getElementById('bar-entire');
    const privateRoomBar = document.getElementById('bar-private');
    const sharedRoomBar = document.getElementById('bar-shared');
    const entireHomePct = document.getElementById('pct-entire');
    const privateRoomPct = document.getElementById('pct-private');
    const sharedRoomPct = document.getElementById('pct-shared');
    const confidenceVal = document.getElementById('confidence-val');
    const resultInsight = document.getElementById('result-insight');
    
    // Form fields
    const neighbourhoodGroup = document.getElementById('neighbourhood_group');
    const neighbourhood = document.getElementById('neighbourhood');
    const latitude = document.getElementById('latitude');
    const longitude = document.getElementById('longitude');
    const price = document.getElementById('price');
    const minimumNights = document.getElementById('minimum_nights');
    const numberOfReviews = document.getElementById('number_of_reviews');
    const reviewsPerMonth = document.getElementById('reviews_per_month');
    const calculatedHostListingsCount = document.getElementById('calculated_host_listings_count');
    const availability365 = document.getElementById('availability_365');
    
    // Error messages
    const errorMessages = {
        neighbourhood_group: document.querySelector('[data-for="neighbourhood_group"]'),
        neighbourhood: document.querySelector('[data-for="neighbourhood"]'),
        latitude: document.querySelector('[data-for="latitude"]'),
        longitude: document.querySelector('[data-for="longitude"]'),
        price: document.querySelector('[data-for="price"]'),
        minimum_nights: document.querySelector('[data-for="minimum_nights"]'),
        availability_365: document.querySelector('[data-for="availability_365"]'),
        number_of_reviews: document.querySelector('[data-for="number_of_reviews"]'),
        reviews_per_month: document.querySelector('[data-for="reviews_per_month"]'),
        calculated_host_listings_count: document.querySelector('[data-for="calculated_host_listings_count"]')
    };
    
    let isSubmitting = false;
    
    function initForm() {
        form.reset();
        hideErrorPanel();
        clearErrors();
        
        resultState.hidden = true;
        idlePanel.hidden = false;
        
        resultBadge.textContent = '—';
        resultBadge.className = 'result-badge';
        confidenceVal.textContent = '—';
        resultInsight.textContent = '';
        entireHomeBar.style.width = '0%';
        privateRoomBar.style.width = '0%';
        sharedRoomBar.style.width = '0%';
        entireHomePct.textContent = '0%';
        privateRoomPct.textContent = '0%';
        sharedRoomPct.textContent = '0%';
    }
    
    form.addEventListener('submit', handleFormSubmit);
    resetBtn.addEventListener('click', () => {
        initForm();
        form.elements[0].focus();
    });
    errorRetryBtn.addEventListener('click', () => {
        hideErrorPanel();
        form.elements[0].focus();
    });
    
    form.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            validateField(e.target);
        }
    });
    
    async function handleFormSubmit(e) {
        e.preventDefault();
        if (isSubmitting) return;
        if (!validateForm()) return;
        
        isSubmitting = true;
        submitBtn.textContent = 'Classifying...';
        submitBtn.disabled = true;
        hideErrorPanel();
        
        try {
            const formData = {
                neighbourhood_group: neighbourhoodGroup.value,
                neighbourhood: neighbourhood.value,
                latitude: parseFloat(latitude.value),
                longitude: parseFloat(longitude.value),
                price: parseFloat(price.value),
                minimum_nights: parseInt(minimumNights.value),
                number_of_reviews: parseInt(numberOfReviews.value),
                reviews_per_month: parseFloat(reviewsPerMonth.value),
                calculated_host_listings_count: parseInt(calculatedHostListingsCount.value),
                availability_365: parseInt(availability365.value)
            };
            
            const result = await predictRoomType(formData);
            displayResults(result);
            
        } catch (error) {
            console.error('Prediction error:', error);
            showError('Prediction failed', 'Unable to process the request. Ensure the backend is running.');
        } finally {
            isSubmitting = false;
            submitBtn.textContent = 'Classify listing';
            submitBtn.disabled = false;
        }
    }
    
    function validateForm() {
        let isValid = true;
        clearErrors();
        
        const fields = [
            { element: neighbourhoodGroup, message: 'Please select a borough' },
            { element: neighbourhood, message: 'Please enter a neighbourhood' },
            { element: latitude, message: 'Invalid latitude', validate: () => !isNaN(parseFloat(latitude.value)) },
            { element: longitude, message: 'Invalid longitude', validate: () => !isNaN(parseFloat(longitude.value)) },
            { element: price, message: 'Invalid price', validate: () => !isNaN(parseInt(price.value)) },
            { element: minimumNights, message: 'Invalid minimum nights', validate: () => !isNaN(parseInt(minimumNights.value)) },
            { element: availability365, message: 'Invalid availability', validate: () => !isNaN(parseInt(availability365.value)) },
            { element: numberOfReviews, message: 'Invalid reviews count', validate: () => !isNaN(parseInt(numberOfReviews.value)) },
            { element: reviewsPerMonth, message: 'Invalid reviews per month', validate: () => !isNaN(parseFloat(reviewsPerMonth.value)) },
            { element: calculatedHostListingsCount, message: 'Invalid host count', validate: () => !isNaN(parseInt(calculatedHostListingsCount.value)) }
        ];
        
        fields.forEach(field => {
            if (field.element.value === '' || (field.validate && !field.validate())) {
                isValid = false;
                showFieldError(field.element, field.message);
            }
        });
        
        return isValid;
    }
    
    function showFieldError(element, message) {
        const errorMsg = errorMessages[element.id];
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }
        element.classList.add('error');
    }
    
    function clearErrors() {
        Object.values(errorMessages).forEach(msg => {
            if (msg) {
                msg.textContent = '';
                msg.style.display = 'none';
            }
        });
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }
    
    function validateField(element) {
        element.classList.remove('error');
        const errorMsg = errorMessages[element.id];
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
    }
    
    // THIS REPLACES THE PREVIOUS MOCK FUNCTION
    async function predictRoomType(formData) {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        
        // Check if the python API returned an error 
        if(data.error) {
             throw new Error(data.error);
        }

        // Format string into CSS-friendly class names
        const typeClass = data.prediction.toLowerCase().replace(/[\s/]+/g, '-');
        
        return {
            prediction: data.prediction,
            type: typeClass,
            confidence: data.confidence,
            probabilities: data.probabilities,
            insight: data.insight
        };
    }
    
    function displayResults(result) {
        idlePanel.hidden = true;
        resultState.hidden = false;

        resultBadge.textContent = result.prediction;
        resultBadge.className = `result-badge ${result.type}`;
        
        confidenceVal.textContent = result.confidence + '%';
        
        const entirePct = Math.round((result.probabilities['Entire home/apt'] || 0) * 100);
        const privatePct = Math.round((result.probabilities['Private room'] || 0) * 100);
        const sharedPct = Math.round((result.probabilities['Shared room'] || 0) * 100);
        
        entireHomeBar.style.width = entirePct + '%';
        privateRoomBar.style.width = privatePct + '%';
        sharedRoomBar.style.width = sharedPct + '%';
        
        entireHomePct.textContent = entirePct + '%';
        privateRoomPct.textContent = privatePct + '%';
        sharedRoomPct.textContent = sharedPct + '%';
        
        resultInsight.textContent = result.insight || "Prediction successfully generated.";
    }
    
    function showError(title, message) {
        idlePanel.hidden = true;
        resultState.hidden = true;
        errorTitle.textContent = title;
        errorCopy.textContent = message;
        errorPanel.hidden = false;
        errorPanel.style.display = 'block';
    }
    
    function hideErrorPanel() {
        errorPanel.hidden = true;
        errorPanel.style.display = 'none';
    }
    
    initForm();
});