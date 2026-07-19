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

    // Create study spot object
    function createStudySpot(
        name,
        category,
        rating,
        coordinates,
        tags,
        description,
        images,
        likes,
        reviews
    ){
        return {
            name,
            category,
            rating,
            coordinates,
            tags,
            description,
            images,
            likes,
            reviews
        };
    }

    // Study spot data
    const studySpots = [
        createStudySpot(
            "McHenry Library",
            "library",
            4.8,
            [36.995875743537674, -122.05901523332899],
            [
                "Quiet",
                "WiFi",
                "Outlets",
                "Study Rooms"
            ],
            "Large library with plenty of study spaces, including quiet areas and group study rooms. Offers WiFi and outlets throughout the building.",
            [
                "/static/images/mchenry1.jpg",
                "/static/images/mchenry2.jpg"
            ],
            128,
            [
                {
                    name: "Alex",
                    rating : 5,
                    comment: "Great place to study, very quiet and has all the resources I need."
                    
                },
                {
                    name: "Jordan",
                    rating: 4,
                    comment: "Good library, but can get crowded during finals week."
                },
                {
                    name: "Taylor",
                    rating: 5,
                    comment: "Love the study rooms, very helpful for group projects."
                }
            ]
        ),
        createStudySpot(
            "Porter Meadow",
            "nature",
            4.6,
            [36.99482501832458, -122.06770300827198],
            [
                "Outdoors"
            ],
            "A beautiful outdoor space with plenty of seating. Perfect for studying on a sunny day.",
            [
                "/static/images/porter1.jpg",
                "/static/images/porter2.jpg"
            ],
            120,
            []
        ),
        createStudySpot(
            "Science & Engineering Library",
            "library",
            4.7,
            [36.99915251483445, -122.06074506216467],
            [
                "Quiet",
                "WiFi",
                "Outlets",
                "Study Rooms",
                "Vending Machines"
            ],
            "Offers a quiet environment with WiFi, outlets, and study rooms. Vending machines are available for snacks and drinks on the second floor.",
            [
                "/static/images/sne1.jpg",
                "/static/images/sne2.jpg"
            ],
            115,
            []
        ),
        createStudySpot(
            "Oakes Cafe",
            "cafe",
            4.5,
            [36.989257131680056, -122.06341090148356],
            [
                "WiFi",
                "Outlets",
                "Food",
                "Drinks"
            ],
            "A cozy cafe located in Oakes College, offering WiFi, outlets, and a variety of food and drinks. Great for studying or taking a break.",
            [
                "/static/images/oakes1.jpg",
                "/static/images/oakes2.jpg"
            ],
            100,
            []
        ),
        createStudySpot(
            "Cowell Computer Lab",
            "computer lab",
            4.0,
            [36.99694416238935, -122.05509338653381],
            [
                "WiFi",
                "Outlets",
                "Computers",
                "Printer",
                "Quiet"
            ],
            "A computer lab located in Cowell College, offering WiFi, outlets, computers, and a printer. A quiet space for focused work.",
            [
                "/static/images/cowell1.jpg",
                "/static/images/cowell2.jpg"
            ],
            80,
            []
        ),
        createStudySpot(
            "Global Village Cafe",
            "cafe",
            4.3,
            [36.99610086311118, -122.05949219643405],
            [
                "WiFi",
                "Food",
                "Drinks"
            ],
            "A cafe located in McHenry Library, offering WiFi, food, and drinks. A great spot for studying or socializing.",
            [
                "/static/images/globalvillage1.jpg",
                "/static/images/globalvillage2.jpg"
            ],
            120,
            []
        )
    ];

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
        const reviewsContainer = document.getElementById("spot-reviews");
        reviewsContainer.innerHTML = "";

        if(spot.reviews){
            spot.reviews.forEach(review =>{
                reviewsContainer.innerHTML += `
                <div class ="review-card">
                    <strong>${review.name}</strong>
                    <p>${"⭐".repeat(review.rating)}</p>
                    <p>${review.comment}</p>
                </div>
                `
            })
        }
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

        const marker = L.marker(spot.coordinates,{icon: icon}).addTo(map);

        marker.on("click", function () {
            openStudySpot(spot);
        });

        markers.push({
            marker: marker,
            category: spot.category,
            tags: spot.tags
        });

    }
    // Create all markers
    studySpots.forEach(addStudySpotToMap);
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
        if(currentSpot){
            currentSpot.likes++;
            document.getElementById("spot-likes").textContent =`👍 ${currentSpot.likes} Likes`;
        }
    });

    document.getElementById("directions-button").addEventListener("click", function(){
        if(currentSpot){
            const lat = currentSpot.coordinates[0];
            const lng = currentSpot.coordinates[1];
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
        }
    });

    // Close review modal
    document.getElementById("close-review-modal").addEventListener("click", function(){
        reviewModal.classList.remove("show");

        document.getElementById("review-comment").value = "";
        document.getElementById("review-rating").selectedIndex = 0;

    });

    // User Review Submission
    document.getElementById("submit-review").addEventListener("click", function(){
        if(!currentSpot){
            return;
        }

        const rating = Number(
            document.getElementById("review-rating").value
        );

        const comment =
            document.getElementById("review-comment").value;

        if(comment.trim() === ""){
            alert("Please write a review before submitting.");
            return;
        }

        const newReview = {
            name: "Guest User",
            rating: rating,
            comment: comment
        };

        // Add review to current spot
        if(!currentSpot.reviews){
            currentSpot.reviews = [];
        }

        currentSpot.reviews.push(newReview);

        // Refresh reviews
        const reviewsContainer = document.getElementById("spot-reviews");
        reviewsContainer.innerHTML = "";
        currentSpot.reviews.forEach(review => {
            reviewsContainer.innerHTML += `
                <div class="review-card">

                    <strong>${review.name}</strong>

                    <p>${"⭐".repeat(review.rating)}</p>

                    <p>${review.comment}</p>

                </div>`;
        });
        // Close modal
        reviewModal.classList.remove("show");
        // Reset fields
        document.getElementById("review-comment").value = "";
        document.getElementById("review-rating").selectedIndex = 0;
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

        const newSpot = createStudySpot(
            name,
            category.toLowerCase(),
            0,
            selectedCoordinates,
            suggestedTags,
            description,
            [],
            0,
            []
        );

        studySpots.push(newSpot);
        
        const marker = L.marker(newSpot.coordinates).addTo(map);
        marker.on("click", function(){
            openStudySpot(newSpot);
        });

        markers.push({
            marker: marker,
            category: newSpot.category,
            tags: newSpot.tags
        });
        
        // Close Modal
        suggestModal.classList.remove("show");

        // Remove the temporary location marker
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }

        // Reset form
        document.getElementById("spot-name-input").value = "";
        document.getElementById("spot-category-input").selectedIndex = 0;
        descriptionBox.value = "";
        descriptionBox.style.height = "120px";

        imageUpload.value = "";
        imagePreview.innerHTML = "";
        imagePreview.style.display = "none";

        document.getElementById("selected-location").textContent = "No location selected";

        // Reset selected tags
        suggestedTags = [];
        document.querySelectorAll(".modal-tag-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        // Reset coordinates
        selectedCoordinates = null;
    });
}