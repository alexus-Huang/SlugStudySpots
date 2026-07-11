const mapElement = document.getElementById('map');

if (mapElement){
    // Center map on UCSC
    const map = L.map("map").setView([36.99701977123666, -122.05963153125727], 15);

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
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{
        attribution: '&copy; OpenStreetMap contributors'}).addTo(map);

    // Marker
    const studySpots = [
        {
            name: "McHenry Library",
            category: "library",
            rating: 4.8,
            coordinates: [36.995875743537674, -122.05901523332899],
            tags:[
                "Quiet",
                "WiFi",
                "Outlets",
                "Study Rooms"
            ]
        },
        {
            name: "Porter Meadow",
            category: "nature",
            rating: 4.6,
            coordinates: [36.99482501832458, -122.06770300827198],
            tags:["Outdoors"]
        },
        {
            name: "Science & Engineering Library",
            category: "library",
            rating: 4.7,
            coordinates: [36.99915251483445, -122.06074506216467],
            tags:[
                "Quiet",
                "WiFi",
                "Outlets",
                "Study Rooms",
                "Vending Machines"
            ]
        },
        {
            name: "Oakes Cafe",
            category: "cafe",
            rating: 4.5,
            coordinates:[36.989257131680056, -122.06341090148356],
            tags: ["WiFi", "Outlets", "Food","Drinks"]
        },
        {
            name: "Cowell Computer Lab",
            category: "computer lab",
            rating: 4.0,
            coordinates:[36.99694416238935, -122.05509338653381],
            tags: ["WiFi", "Outlets", "Computers", "Printer","Quiet"]
        },
        {
            name: "Global Village Cafe",
            category: "cafe",
            rating: 4.3,
            coordinates:[36.99610086311118, -122.05949219643405],
            tags: ["WiFi", "Food","Drinks"]
        }
    ]


    for (let spot of studySpots){
        let icon = libraryIcon;
        if (spot.category === "cafe"){
            icon = cafeIcon;
        } 
        else if (spot.category === "computer lab"){
            icon = computerLabIcon;
        }
        else if (spot.category === "nature"){
            icon = natureIcon;
        }
        
        L.marker(spot.coordinates, {icon: icon}).addTo(map).bindPopup(`
            <div class="spot-popup">
                <h3>
                    ${spot.name}
                </h3>

                <p>
                    ⭐ ${spot.rating}
                </p>

            <div class="popup-tags">
                ${spot.tags.map(tag => `<span>${tag}</span>`).join("")}
            </div>

            <button class="popup-button">
                    View Details
            </button>
            </div>`);
    }
}