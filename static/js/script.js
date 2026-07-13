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

    // Create study spot object
    function createStudySpot(
        name,
        category,
        rating,
        coordinates,
        tags,
        description,
        images
    ){
        return {
            name,
            category,
            rating,
            coordinates,
            tags,
            description,
            images
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
            ]
        ),
        createStudySpot(
            "Porter Meadow",
            "nature",
            4.6,
            [36.99482501832458, -122.06770300827198],
            [
                "Outdoors"
            ]
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
            ]
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
            ]
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
            ]
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
            ]
        )
    ];

    // Open bottom sheet
    function openStudySpot(spot){
        document.getElementById("spot-sheet").classList.remove("hidden");
        document.getElementById("spot-title") .textContent = spot.name;
        document.getElementById("spot-rating").textContent = `⭐ ${spot.rating}`;
        document.getElementById("spot-description").textContent = spot.description || "No description available.";

        const tagsContainer =document.getElementById("spot-tags");
        tagsContainer.innerHTML = "";
        spot.tags.forEach(tag => {
            tagsContainer.innerHTML +=`<span class="study-spot-tag">${tag}</span>`;
        });

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

    let selectedTags = [];
    let selectedCategory = "all";

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
}