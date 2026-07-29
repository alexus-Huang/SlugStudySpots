function showSpotSubmissionAlert(message, isError = true) {
        const alertBox = document.getElementById("spot-submission-alert");
        alertBox.textContent = message;
        alertBox.classList.toggle("error", isError);
        alertBox.classList.toggle("success", !isError);
        alertBox.classList.add("show");

        setTimeout(() => {
            alertBox.classList.remove("show");
        }, 3000);
    }

const mapElement = document.getElementById('map');
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute("content");
if (mapElement){
    // Center map on UCSC
    const ucscBounds = L.latLngBounds(
        [36.985, -122.075],  // southwest corner
        [37.005, -122.045]   // northeast corner
    );

    const map = L.map("map", {
        minZoom: 14,
        maxZoom: 19,
        maxBounds: ucscBounds,
        maxBoundsViscosity: 1.0
    }).setView(
        [36.99701977123666, -122.05963153125727],
        15
    );

    // Icons
    const libraryIcon = L.icon({
        iconUrl: "/static/images/icons/library.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    const cafeIcon = L.icon({
        iconUrl: "/static/images/icons/coffee.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    const computerLabIcon = L.icon({
        iconUrl: "/static/images/icons/laptop.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    const natureIcon = L.icon({
        iconUrl: "/static/images/icons/tree.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    const loungeIcon = L.icon({
        iconUrl: "/static/images/icons/lounge.png",
        iconSize: [30,30],
        iconAnchor: [15,30],
        popupAnchor: [0,-40]
    });

    const otherIcon = L.icon({
        iconUrl: "/static/images/icons/other.jpg",
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
    let currentImages = [];
    let currentImageIndex = 0;
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
            tagsContainer.innerHTML +=`<span class="study-spot-tag">${escapeHtml(tag)}</span>`;
        });

        // Images
        const imagesContainer = document.getElementById("spot-images");
        imagesContainer.innerHTML = "";
        currentImages = spot.images || [];

        if(spot.images){
            spot.images.forEach((image, index) =>{
                imagesContainer.innerHTML += `<img src="${escapeHtml(image)}" alt="${escapeHtml(spot.name)} image" class="study-spot-image" data-index="${index}">`;
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

    const lightbox = document.getElementById("image-lightbox");
    const lightboxImage = document.getElementById("lightbox-image");

    function openLightbox(index){
        currentImageIndex = index;
        lightboxImage.style.transition = "none";
        lightboxImage.style.transform = "translateX(0)";
        lightboxImage.style.opacity = "1";
        lightboxImage.src = currentImages[currentImageIndex];
        lightbox.classList.add("show");
    }

    function slideToImage(newIndex, direction){
        const exitX = direction === "left" ? "-100%" : "100%";
        const enterStartX = direction === "left" ? "100%" : "-100%";

        lightboxImage.style.transition = "transform 0.25s ease, opacity 0.25s ease";
        lightboxImage.style.transform = `translateX(${exitX})`;
        lightboxImage.style.opacity = "0";

        setTimeout(() => {
            currentImageIndex = newIndex;
            lightboxImage.src = currentImages[currentImageIndex];
            lightboxImage.style.transition = "none";
            lightboxImage.style.transform = `translateX(${enterStartX})`;
            void lightboxImage.offsetWidth;
            lightboxImage.style.transition = "transform 0.25s ease, opacity 0.25s ease";
            lightboxImage.style.transform = "translateX(0)";
            lightboxImage.style.opacity = "1";
        }, 250);
    }

    document.getElementById("spot-images").addEventListener("click", function(event){
        if(event.target.tagName === "IMG"){
            const index = Number(event.target.dataset.index);
            openLightbox(index);
        }
    });

    document.getElementById("lightbox-close").addEventListener("click", function(){
        lightbox.classList.remove("show");
    });

    document.getElementById("lightbox-prev").addEventListener("click", function(){
        const newIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
        slideToImage(newIndex, "right");
    });

    document.getElementById("lightbox-next").addEventListener("click", function(){
        const newIndex = (currentImageIndex + 1) % currentImages.length;
        slideToImage(newIndex, "left");
    });

    lightbox.addEventListener("click", function(event){
        if(event.target === lightbox){
            lightbox.classList.remove("show");
        }
    });

    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener("touchstart", function(event){
        touchStartX = event.changedTouches[0].screenX;
    });

    lightbox.addEventListener("touchend", function(event){
        touchEndX = event.changedTouches[0].screenX;
        handleSwipeGesture();
    });

    function handleSwipeGesture(){
        const swipeThreshold = 50;
        const swipeDistance = touchEndX - touchStartX;

        if(Math.abs(swipeDistance) < swipeThreshold){
            return;
        }

        if(swipeDistance < 0){
            // swiped left -> next image
            const newIndex = (currentImageIndex + 1) % currentImages.length;
            slideToImage(newIndex, "left");
        } else {
            // swiped right -> previous image
            const newIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
            slideToImage(newIndex, "right");
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
                    const editedLabel = review.edited ? '<span class="edited-label">(edited)</span>' : '';
                    const ownerButtons = review.is_owner
                        ? `<div class="review-owner-actions">
                            <button class="edit-review-btn" data-id="${review.id}" data-rating="${review.rating}">✏️ Edit</button>
                            <button class="delete-review-btn" data-id="${review.id}">🗑️ Delete</button>
                        </div>`
                        : '';

                    reviewsContainer.innerHTML += `
                    <div class="review-card" id="review-${review.id}" data-comment="${escapeHtml(review.comment)}">
                        <strong>${escapeHtml(review.username)}</strong> ${editedLabel}
                        <p>${"⭐".repeat(review.rating)}</p>
                        <p class="review-comment-text">${escapeHtml(review.comment)}</p>
                        ${ownerButtons}
                    </div>
                    `;
                });
            })
            .catch(err => {
                console.error("Failed to load reviews:", err);
            });
    }

    function refreshCurrentSpotData(){
        if(!currentSpot || currentSpot.id === null) return;

        fetch("/api/spots")
            .then(response => response.json())
            .then(data => {
                studySpots = data;
                const updatedSpot = studySpots.find(spot => spot.id === currentSpot.id);
                if(updatedSpot){
                    currentSpot = updatedSpot;
                    document.getElementById("spot-rating").textContent = `⭐ ${currentSpot.rating}`;
                    document.getElementById("spot-likes").textContent = `👍 ${currentSpot.likes} Likes`;
                }
            })
            .catch(err => {
                console.error("Failed to refresh spot data:", err);
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

    function escapeHtml(text){
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
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
        else if (spot.category === "lounge") {
            icon = loungeIcon;
        }
        else if (spot.category === "other") {
            icon = otherIcon;
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

        fetch(`/like_spot/${currentSpot.id}`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken }
        })
            .then(response => {
                if(response.status === 401){
                    window.location.href = "/login";
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if(!data) return;
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
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
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
                if(!result) return;

                if(result.status === 409){
                    showReviewAlert(result.data.error); // "You've already reviewed this spot."
                    return;
                }
                if(result.status === 400){
                    showReviewAlert(result.data.error);
                    return;
                }

                // Success — reload reviews from the database and close the modal
                loadReviews(currentSpot.id);
                refreshCurrentSpotData();
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

        const coordsAtSubmit = selectedCoordinates;
        const tagsAtSubmit = [...suggestedTags];

        const formData = new FormData();
        formData.append("name", name);
        formData.append("category", category.toLowerCase());
        formData.append("latitude", coordsAtSubmit[0]);
        formData.append("longitude", coordsAtSubmit[1]);
        formData.append("description", description);
        formData.append("tags", tagsAtSubmit.join(","));

        Array.from(imageUpload.files).forEach(file => {
            formData.append("images", file);
        });

        fetch("/submit_spot", {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken },
            body: formData
        })
        .then(response => {
            if(response.status === 401){
                window.location.href = "/login";
                return null;
            }
            return response.json();
        })
        .then(data => {
            if(!data) return; // redirected above

            showSpotSubmissionAlert(data.message, false);
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

    document.getElementById("add-photo-btn").addEventListener("click", function(){
        if(!currentSpot || currentSpot.id === null){
            showSpotSubmissionAlert("This spot isn't available for photo uploads yet.");
            return;
        }
        document.getElementById("spot-photo-upload").click();
    });

    document.getElementById("spot-photo-upload").addEventListener("change", function(){
        const file = this.files[0];
        if(!file) return;

        const formData = new FormData();
        formData.append("image", file);

        fetch(`/submit_spot_image/${currentSpot.id}`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken },
            body: formData
        })
            .then(response => {
                if(response.status === 401){
                    window.location.href = "/login";
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if(!data) return;
                if(data.error){
                    showSpotSubmissionAlert(data.error);
                } else {
                    showSpotSubmissionAlert(data.message, false);
                }
                this.value = "";
            })
            .catch(err => {
                console.error("Failed to upload photo:", err);
                showSpotSubmissionAlert("Something went wrong uploading your photo.");
            });
    });

    // Edit Review
    let editingReviewId = null;
    const editReviewModal = document.getElementById("edit-review-modal");

    document.getElementById("spot-reviews").addEventListener("click", function(event){
        if(event.target.classList.contains("edit-review-btn")){
            editingReviewId = event.target.dataset.id;
            const currentRating = event.target.dataset.rating;
            const card = document.getElementById(`review-${editingReviewId}`);
            const currentComment = card.dataset.comment;

            document.getElementById("edit-review-rating").value = currentRating;
            document.getElementById("edit-review-comment").value = currentComment;
            editReviewModal.classList.add("show");
        }

        if(event.target.classList.contains("delete-review-btn")){
            pendingDeleteReviewId = event.target.dataset.id;
            deleteReviewConfirmModal.classList.add("show");
        }
    });

    document.getElementById("close-edit-review-modal").addEventListener("click", function(){
        editReviewModal.classList.remove("show");
        editingReviewId = null;
    });

    document.getElementById("submit-edit-review").addEventListener("click", function(){
        if(!editingReviewId) return;

        const rating = Number(document.getElementById("edit-review-rating").value);
        const comment = document.getElementById("edit-review-comment").value;
        const alertBox = document.getElementById("edit-review-alert");

        if(comment.trim() === ""){
            alertBox.textContent = "Review cannot be empty.";
            alertBox.classList.add("show");
            return;
        }

        fetch(`/edit_review/${editingReviewId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({ rating: rating, comment: comment })
        })
            .then(response => response.json())
            .then(data => {
                if(data.error){
                    alertBox.textContent = data.error;
                    alertBox.classList.add("show");
                    return;
                }
                editReviewModal.classList.remove("show");
                alertBox.classList.remove("show");
                editingReviewId = null;
                loadReviews(currentSpot.id);
                refreshCurrentSpotData();
            })
            .catch(err => {
                console.error("Failed to edit review:", err);
            });
    });
    // Delete Review
    let pendingDeleteReviewId = null;
    const deleteReviewConfirmModal = document.getElementById("delete-review-confirm-modal");

    document.getElementById("cancel-delete-review-btn").addEventListener("click", function(){
        pendingDeleteReviewId = null;
        deleteReviewConfirmModal.classList.remove("show");
    });

    document.getElementById("confirm-delete-review-btn").addEventListener("click", function(){
        if(!pendingDeleteReviewId) return;

        fetch(`/delete_review/${pendingDeleteReviewId}`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken }
        })
            .then(response => response.json())
            .then(data => {
                deleteReviewConfirmModal.classList.remove("show");
                pendingDeleteReviewId = null;
                loadReviews(currentSpot.id);
                refreshCurrentSpotData();
                showSpotSubmissionAlert("Review deleted", false);
            })
            .catch(err => {
                console.error("Failed to delete review:", err);
            });
    });
}

// Admin review page — approve/reject buttons
document.querySelectorAll(".approve-btn").forEach(button => {
    button.addEventListener("click", function(){
        const id = this.dataset.id;
        fetch(`/admin/approve/${id}`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken }
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById(`pending-${id}`).remove();
            })
            .catch(err => {
                console.error("Failed to approve spot:", err);
            });
    });
});

// Reject confirmation flow
let pendingRejectId = null;
const rejectConfirmModal = document.getElementById("reject-confirm-modal");

document.querySelectorAll(".pending-card .reject-btn").forEach(button => {
    button.addEventListener("click", function(){
        pendingRejectId = this.dataset.id;
        rejectConfirmModal.classList.add("show");
    });
});

if (rejectConfirmModal) {
    document.getElementById("cancel-reject-btn").addEventListener("click", function(){
        pendingRejectId = null;
        rejectConfirmModal.classList.remove("show");
    });

    document.getElementById("confirm-reject-btn").addEventListener("click", function(){
        if(!pendingRejectId) return;

        fetch(`/admin/reject/${pendingRejectId}`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken }
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById(`pending-${pendingRejectId}`).remove();
                rejectConfirmModal.classList.remove("show");
                pendingRejectId = null;
            })
            .catch(err => {
                console.error("Failed to reject spot:", err);
            });
    });
}

document.querySelectorAll(".delete-feedback-btn").forEach(button => {
    button.addEventListener("click", function(){
        const id = this.dataset.id;
        fetch(`/admin/feedback/delete/${id}`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken }
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById(`feedback-${id}`).remove();
            })
            .catch(err => {
                console.error("Failed to delete feedback:", err);
            });
    });
});

document.querySelectorAll(".approve-image-btn").forEach(button => {
    button.addEventListener("click", function(){
        const id = this.dataset.id;
        fetch(`/admin/images/approve/${id}`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken }
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById(`pending-image-${id}`).remove();
            })
            .catch(err => {
                console.error("Failed to approve image:", err);
            });
    });
});

document.querySelectorAll(".reject-image-btn").forEach(button => {
    button.addEventListener("click", function(){
        const id = this.dataset.id;
        fetch(`/admin/images/reject/${id}`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken }
        })
            .then(response => response.json())
            .then(data => {
                document.getElementById(`pending-image-${id}`).remove();
            })
            .catch(err => {
                console.error("Failed to reject image:", err);
            });
    });
});

// Nav dropdown (Hi, username menu)
const navDropdownToggle = document.getElementById("nav-dropdown-toggle");
const navDropdownMenu = document.getElementById("nav-dropdown-menu");

if (navDropdownToggle) {
    navDropdownToggle.addEventListener("click", function(event){
        event.stopPropagation();
        navDropdownMenu.classList.toggle("show");
    });

    document.addEventListener("click", function(){
        navDropdownMenu.classList.remove("show");
    });
}

document.querySelectorAll(".admin-filter-btn").forEach(button => {
    button.addEventListener("click", function(){
        const category = this.dataset.category;

        document.querySelectorAll(".admin-filter-btn").forEach(btn => {
            btn.classList.remove("active");
        });
        this.classList.add("active");

        document.querySelectorAll(".pending-card").forEach(card => {
            if(category === "all" || card.dataset.category === category){
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }
        });
    });
});

const navHamburger = document.getElementById("nav-hamburger");
const navLinksContainer = document.querySelector(".nav-links");

if (navHamburger) {
    navHamburger.addEventListener("click", function(event){
        event.stopPropagation();
        navLinksContainer.classList.toggle("show");
    });
}

function enableDragToScroll(selector){
    document.querySelectorAll(selector).forEach(el => {
        let isDown = false;
        let startX;
        let scrollLeft;

        el.addEventListener("mousedown", function(e){
            isDown = true;
            el.classList.add("dragging");
            startX = e.pageX - el.offsetLeft;
            scrollLeft = el.scrollLeft;
        });

        el.addEventListener("mouseleave", function(){
            isDown = false;
            el.classList.remove("dragging");
        });

        el.addEventListener("mouseup", function(){
            isDown = false;
            el.classList.remove("dragging");
        });

        el.addEventListener("mousemove", function(e){
            if(!isDown) return;
            e.preventDefault();
            const x = e.pageX - el.offsetLeft;
            const walk = x - startX;
            el.scrollLeft = scrollLeft - walk;
        });
    });
}

const feedbackModal = document.getElementById("feedback-modal");
const feedbackLink = document.getElementById("feedback-link");

if (feedbackLink) {
    feedbackLink.addEventListener("click", function(event){
        event.preventDefault();
        feedbackModal.classList.add("show");
    });

    document.getElementById("close-feedback-modal").addEventListener("click", function(){
        feedbackModal.classList.remove("show");
        document.getElementById("feedback-message").value = "";
        document.getElementById("feedback-alert").classList.remove("show");
    });

    document.getElementById("submit-feedback-btn").addEventListener("click", function(){
        const message = document.getElementById("feedback-message").value;
        const alertBox = document.getElementById("feedback-alert");

        if(message.trim() === ""){
            alertBox.textContent = "Please write something before submitting.";
            alertBox.classList.add("show");
            return;
        }

        fetch("/submit_feedback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({ message: message })
        })
            .then(response => {
                if(response.status === 401){
                    window.location.href = "/login";
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if(!data) return;
                feedbackModal.classList.remove("show");
                document.getElementById("feedback-message").value = "";
                alertBox.classList.remove("show");
                showSpotSubmissionAlert("Thanks for the feedback!", false);
            })
            .catch(err => {
                console.error("Failed to submit feedback:", err);
            });
    });
}

enableDragToScroll(".filter-bar");
enableDragToScroll(".tag-filter-bar");