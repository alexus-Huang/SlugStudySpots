const mapElement = document.getElementById('map');

if (mapElement){
    // Center map on UCSC
    const map = L.map("map").setView(
        [36.99701977123666, -122.05963153125727],
        15
    );

    // Icons
    const libraryIcon = L.icon({
        iconUrl: "/static/images/library.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    const cafeIcon = L.icon({
        iconUrl: "/static/images/coffee.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    const computerLabIcon = L.icon({
        iconUrl: "/static/images/laptop.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    const natureIcon = L.icon({
        iconUrl: "/static/images/tree.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    // Add map tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{attribution: '&copy; OpenStreetMap contributors'}).addTo(map);

    // Let user select location on map
    map.on("click", function(e){

    if(selectingLocation){
        selectedCoordinates = [
            e.latlng.lat,
            e.latlng.lng
        ];

        if(tempMarker){
            map.removeLayer(tempMarker);
        }
        tempMarker = L.marker(selectedCoordinates).addTo(map);

        document.getElementById("selected-location").textContent =`📍 Selected: ${selectedCoordinates[0].toFixed(5)}, ${selectedCoordinates[1].toFixed(5)}`;

        selectingLocation = false;

        document.getElementById("suggest-modal").classList.add("show");
    }
});

    // Study spots now come from the database via /api/spots, not hardcoded data
    let studySpots = [];

    function loadSpots() {
        fetch("/api/spots")
            .then(response => response.json())
            .then(data => {
                studySpots = data;
                studySpots.forEach(addStudySpotToMap);
            })
            .catch(err => {
                console.error("Failed to load spots:", err);
            });
    }

    let selectedTags = [];
    let selectedCategory = "all";
    let currentSpot = null;
    let suggestedTags = [];
    let selectingLocation = false;
    let selectedCoordinates = null;
    let tempMarker = null;
    // Open bottom sheet
    function openStudySpot(spot){
        currentSpot = spot;
        document.getElementById("spot-sheet").classList.remove("hidden");
        document.getElementById("spot-title") .textContent = spot.name;
        document.getElementById("spot-rating").textContent = `⭐ ${spot.rating}`;
        document.getElementById("spot-likes").textContent = `👍 ${spot.likes} Likes`;
        document.getElementById("spot-description").textContent = spot.description || "No description available.";
        updateLikeButtonStyle();

        const tagsContainer =document.getElementById("spot-tags");
        tagsContainer.innerHTML = "";
        spot.tags.forEach(tag => {
            tagsContainer.innerHTML +=`<span class="study-spot-tag">${tag}</span>`;
        });

        // Images
        const imagesContainer = document.getElementById("spot-images");
        imagesContainer.innerHTML = "";

        if(spot.images){
            spot.images.forEach(image =>{
                imagesContainer.innerHTML += `<img src="${image}" alt="${spot.name} image" class="study-spot-image">`;
            })
        }

        // Reviews
        loadReviews(spot.id);
    }

    function updateLikeButtonStyle(){
        const likeButton = document.getElementById("like-button");
        if(currentSpot && currentSpot.user_has_liked){
            likeButton.classList.add("liked");
            likeButton.textContent = "👎 Unlike";
        } else {
            likeButton.classList.remove("liked");
            likeButton.textContent = "👍 Like";
        }
    }

    function loadReviews(spotId){
        const reviewsContainer = document.getElementById("spot-reviews");
        reviewsContainer.innerHTML = "";

        if(spotId === null){
            return;
        }

        fetch(`/api/spots/${spotId}/reviews`)
            .then(response => response.json())
            .then(reviews => {
                reviews.forEach(review => {
                    reviewsContainer.innerHTML += `
                    <div class="review-card">
                        <strong>${review.username}</strong>
                        <p>${"⭐".repeat(review.rating)}</p>
                        <p>${review.comment}</p>
                    </div>
                    `;
                });
            })
            .catch(err => {
                console.error("Failed to load reviews:", err);
            });
    }

    function showReviewAlert(message){
        const alertBox = document.getElementById("review-alert");
        alertBox.textContent = message;
        alertBox.classList.add("show");
    }

    function hideReviewAlert(){
        const alertBox = document.getElementById("review-alert");
        alertBox.classList.remove("show");
    }

    function showSpotSubmissionAlert(message) {
        const alertBox = document.getElementById("spot-submission-alert");
        alertBox.textContent = message;
        alertBox.classList.add("show");

        setTimeout(() => {
            alertBox.classList.remove("show");
        }, 3000);
    }

    
    const markers = [];
    // Add one marker to map
    function addStudySpotToMap(spot) {

        let icon = libraryIcon;

        if (spot.category === "cafe") {
            icon = cafeIcon;
        }
        else if (spot.category === "computer lab") {
            icon = computerLabIcon;
        }
        else if (spot.category === "nature") {
            icon = natureIcon;
        }

        const marker = L.marker([spot.latitude, spot.longitude], {icon: icon}).addTo(map);

        marker.on("click", function () {
            openStudySpot(spot);
        });

        markers.push({
            marker: marker,
            category: spot.category,
            tags: spot.tags
        });

    }
    // Close bottom sheet
    document.getElementById("close-info").addEventListener("click", function(){
    document.getElementById("spot-sheet").classList.add("hidden");
    });


    function applyFilters(){
        markers.forEach(item =>{
            let categoryMatch = true;
            let tagsMatch = true;

            // Check category
            if(selectedCategory !== "all"){
                categoryMatch = item.category === selectedCategory;
            }

            // Check the tags
            if(selectedTags.length > 0){
                tagsMatch = selectedTags.every(tag =>{
                    return item.tags.includes(tag)
                });
            }

            // Show spot on map if its a match
            if(categoryMatch && tagsMatch){
                item.marker.addTo(map);
            }
            else{
                map.removeLayer(item.marker);
            }
        });
    }

    // Filter Btn Detector
    document.querySelectorAll(".filter-btn").forEach(button =>{
        button.addEventListener("click",function(){
            const category = this.dataset.category;
            selectedCategory = category;
            applyFilters();

            document.querySelectorAll(".filter-btn").forEach(btn => {
                    btn.classList.remove("active");
                });

            this.classList.add("active")
        });
    });

    // Tag Btn Detector
    document.querySelectorAll(".tag-btn").forEach(button => {
        button.addEventListener("click", function(){
            const tag = this.dataset.tag;
            if(selectedTags.includes(tag)){
                selectedTags = selectedTags.filter(t => t !== tag);
                this.classList.remove("active");
            }
            else{
                selectedTags.push(tag);
                this.classList.add("active");
            }
            applyFilters();
        });
    });
    
    document.getElementById("clear-filters").addEventListener("click", function(){
        // Reset category
        selectedCategory = "all";

        // Reset tags
        selectedTags = [];

        // Show all spots on map
        applyFilters();

        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        document.querySelector('.filter-btn[data-category="all"]').classList.add("active");

        document.querySelectorAll(".tag-btn").forEach(btn => {
            btn.classList.remove("active");
        });
    });

    document.getElementById("like-button").addEventListener("click", function(){
        if(!currentSpot || currentSpot.id === null){
            return;
        }

        fetch(`/like_spot/${currentSpot.id}`, { method: "POST" })
            .then(response => {
                if(response.status === 401){
                    window.location.href = "/login";
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if(!data) return; // we redirected above, nothing else to do
                currentSpot.likes = data.likes;
                currentSpot.user_has_liked = data.liked;

                document.getElementById("spot-likes").textContent = `👍 ${currentSpot.likes} Likes`;
                updateLikeButtonStyle();
            })
            .catch(err => {
                console.error("Failed to like spot:", err);
            });
    });

    document.getElementById("directions-button").addEventListener("click", function(){
        if(currentSpot){
            const lat = currentSpot.latitude;
            const lng = currentSpot.longitude;
            const url =
            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            window.open(url, "_blank");
        }

    });

    // Spot Suggestion
    const suggestModal = document.getElementById("suggest-modal");
    document.getElementById("suggest-spot-btn").addEventListener("click", function () {
        suggestModal.classList.add("show");
    });

    // User Review
    const reviewModal = document.getElementById("review-modal");
    document.getElementById("write-review-btn").addEventListener("click", function(){
        if(currentSpot){
            reviewModal.classList.add("show");
            hideReviewAlert();
        }
    });

    // Close review modal
    document.getElementById("close-review-modal").addEventListener("click", function(){
        reviewModal.classList.remove("show");
        hideReviewAlert();

        document.getElementById("review-comment").value = "";
        document.getElementById("review-rating").selectedIndex = 0;

    });

    // User Review Submission
    document.getElementById("submit-review").addEventListener("click", function(){
        if(!currentSpot || currentSpot.id === null){
            return;
        }

        const rating = Number(document.getElementById("review-rating").value);
        const comment = document.getElementById("review-comment").value;

        if(comment.trim() === ""){
            showReviewAlert("Please write a review before submitting.");
            return;
        }

        fetch(`/submit_review/${currentSpot.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: rating, comment: comment })
        })
            .then(response => {
                if(response.status === 401){
                    window.location.href = "/login";
                    return null;
                }
                return response.json().then(data => ({ status: response.status, data: data }));
            })
            .then(result => {
                if(!result) return; // redirected above

                if(result.status === 409){
                    showReviewAlert(result.data.error); // "You've already reviewed this spot."
                    return;
                }
                if(result.status === 400){
                    alert(result.data.error);
                    return;
                }

                // Success — reload reviews from the database and close the modal
                loadReviews(currentSpot.id);
                reviewModal.classList.remove("show");
                hideReviewAlert();
                document.getElementById("review-comment").value = "";
                document.getElementById("review-rating").selectedIndex = 0;
            })
            .catch(err => {
                console.error("Failed to submit review:", err);
            });
    });

    document.getElementById("close-modal").addEventListener("click", function () {
        suggestModal.classList.remove("show");

        // Reset form fields
        document.querySelector(".modal-content input").value = "";
        document.querySelector(".modal-content select").selectedIndex = 0;
        descriptionBox.value = "";
        descriptionBox.style.height = "120px";
        imageUpload.value = "";
        imagePreview.innerHTML = "";
        imagePreview.style.display = "none";
        document.querySelectorAll(".modal-tag-btn").forEach(btn => {
            btn.classList.remove("active");
        });
    });

    // Modal Description text box
    const descriptionBox = document.getElementById("spot-description-input");
    descriptionBox.addEventListener("input", function(){
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
    });

    // Image Preview
    const imageUpload = document.getElementById("spot-images-upload");
    const imagePreview = document.getElementById("image-preview")

    imageUpload.addEventListener("change", function(){
        imagePreview.innerHTML = "";
        imagePreview.style.display = "flex";
        Array.from(this.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event){
                const img = document.createElement("img");
                img.src = event.target.result;
                img.classList.add("preview-image")
                imagePreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });

    document.getElementById("select-location-btn").addEventListener("click", function(){
        selectingLocation = true;
        document.getElementById("suggest-modal").classList.remove("show");
    });

    // Selectable Tags in modal
    document.querySelectorAll(".modal-tag-btn").forEach(button => {
        button.addEventListener("click", function(){
            const tag = this.dataset.tag;
            if(suggestedTags.includes(tag)){
                suggestedTags = suggestedTags.filter(t => t !== tag);
                this.classList.remove("active");
            }
            else{
                suggestedTags.push(tag);
                this.classList.add("active");
            }
        });
    });

    // 
    document.getElementById("modal-submit-btn").addEventListener("click", function(){
        const name = document.getElementById("spot-name-input").value;
        const category = document.getElementById("spot-category-input").value;
        const description = document.getElementById("spot-description-input").value;

        if(name === ""){
            alert("Please enter a spot name");
            return;
        }

        if(!selectedCoordinates){
            alert("Please select a location on the map");
            return;
        }

        // snapshot these BEFORE the async call, since they'll get reset
        // before the fetch response comes back
        const coordsAtSubmit = selectedCoordinates;
        const tagsAtSubmit = [...suggestedTags];

        fetch("/submit_spot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name,
                category: category.toLowerCase(),
                latitude: coordsAtSubmit[0],
                longitude: coordsAtSubmit[1],
                description: description,
                tags: tagsAtSubmit
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);

            const newSpot = {
                id: null,   // real database id isn't known until the page reloads from /api/spots
                name: name,
                category: category.toLowerCase(),
                rating: 0,
                latitude: coordsAtSubmit[0],   // <-- use the snapshot, not the live variable
                longitude: coordsAtSubmit[1],  // <-- same here
                description: description,
                tags: tagsAtSubmit,
                images: [],
                likes: 0,
                user_has_liked: false
            };

            studySpots.push(newSpot);

            const marker = L.marker([newSpot.latitude, newSpot.longitude]).addTo(map);
            marker.on("click", function(){
                openStudySpot(newSpot);
            });

            markers.push({
                marker: marker,
                category: newSpot.category,
                tags: newSpot.tags
            });
        })
        .catch(err => {
            console.error("Failed to submit spot:", err);
            showSpotSubmissionAlert("Something went wrong submitting your spot.");
        });

        // Close Modal
        suggestModal.classList.remove("show");

        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }

        document.getElementById("spot-name-input").value = "";
        document.getElementById("spot-category-input").selectedIndex = 0;
        descriptionBox.value = "";
        descriptionBox.style.height = "120px";

        imageUpload.value = "";
        imagePreview.innerHTML = "";
        imagePreview.style.display = "none";

        document.getElementById("selected-location").textContent = "No location selected";

        suggestedTags = [];
        document.querySelectorAll(".modal-tag-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        selectedCoordinates = null;
    });

    // Load real spots from the database and place them on the map
    loadSpots();
}