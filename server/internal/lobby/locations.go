package lobby

import "math/rand"

var LocationPool = []Location{
	{ID: "mountain_peak", Name: "Mountain Peak", ImageURL: "/locations/mountain-peak.jpg"},
	{ID: "deep_ocean", Name: "Deep Ocean", ImageURL: "/locations/deep-ocean.jpg"},
	{ID: "space_station", Name: "Space Station", ImageURL: "/locations/space-station.jpg"},
	{ID: "tropical_beach", Name: "Tropical Beach", ImageURL: "/locations/tropical-beach.jpg"},
	{ID: "ancient_temple", Name: "Ancient Temple", ImageURL: "/locations/ancient-temple.jpg"},
	{ID: "neon_city", Name: "Neon City", ImageURL: "/locations/neon-city.jpg"},
	{ID: "sahara_desert", Name: "Sahara Desert", ImageURL: "/locations/sahara-desert.jpg"},
	{ID: "arctic_base", Name: "Arctic Base", ImageURL: "/locations/arctic-base.jpg"},
	{ID: "volcano_rim", Name: "Volcano Rim", ImageURL: "/locations/volcano-rim.jpg"},
	{ID: "underwater_ruins", Name: "Underwater Ruins", ImageURL: "/locations/underwater-ruins.jpg"},
	{ID: "cherry_blossom", Name: "Cherry Blossom Garden", ImageURL: "/locations/cherry-blossom.jpg"},
	{ID: "savanna_sunset", Name: "Savanna Sunset", ImageURL: "/locations/savanna-sunset.jpg"},
	{ID: "aurora_sky", Name: "Northern Lights", ImageURL: "/locations/aurora.jpg"},
	{ID: "rainforest", Name: "Rainforest Canopy", ImageURL: "/locations/rainforest.jpg"},
	{ID: "medieval_castle", Name: "Medieval Castle", ImageURL: "/locations/castle.jpg"},
	{ID: "coral_reef", Name: "Coral Reef", ImageURL: "/locations/coral-reef.jpg"},
	{ID: "desert_oasis", Name: "Desert Oasis", ImageURL: "/locations/oasis.jpg"},
	{ID: "floating_islands", Name: "Floating Islands", ImageURL: "/locations/floating-islands.jpg"},
	{ID: "lavender_fields", Name: "Lavender Fields", ImageURL: "/locations/lavender.jpg"},
	{ID: "cyberpunk_alley", Name: "Cyberpunk Alley", ImageURL: "/locations/cyberpunk.jpg"},
}

func RandomLocations(n int) []Location {
	pool := make([]Location, len(LocationPool))
	copy(pool, LocationPool)
	rand.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	if n > len(pool) {
		n = len(pool)
	}
	return pool[:n]
}
