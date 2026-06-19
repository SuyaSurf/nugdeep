package expedition

import (
	"encoding/json"
	"time"

	"games.bammby.com/server/internal/store"
)

type destinationSeed struct {
	Code      string
	Name      string
	Region    string
	Flag      string
	Capital   string
	Language  string
	Hello     string
	Thanks    string
	Fact      string
	Challenge ChallengeType
	Colors    []string
}

func SeedDestinations() []Destination {
	rows := []destinationSeed{
		{Code: "JP", Name: "Japan", Region: "East Asia", Flag: "🇯🇵", Capital: "Tokyo", Language: "Japanese", Hello: "konnichiwa", Thanks: "arigato", Fact: "The Shinkansen's average delay is less than one minute across the network.", Challenge: ChallengePalette, Colors: []string{"#bc002d", "#ffffff"}},
		{Code: "BR", Name: "Brazil", Region: "South America", Flag: "🇧🇷", Capital: "Brasília", Language: "Portuguese", Hello: "olá", Thanks: "obrigado", Fact: "Brazil is home to most of the Amazon rainforest, the largest tropical rainforest on Earth.", Challenge: ChallengeButton, Colors: []string{"#009b3a", "#ffdf00", "#002776"}},
		{Code: "EG", Name: "Egypt", Region: "North Africa", Flag: "🇪🇬", Capital: "Cairo", Language: "Arabic", Hello: "salaam", Thanks: "shukran", Fact: "Ancient Egyptians used a toothpaste-like powder made with ingredients such as salt and mint.", Challenge: ChallengeFoodRemedy, Colors: []string{"#ce1126", "#ffffff", "#000000"}},
		{Code: "FR", Name: "France", Region: "Western Europe", Flag: "🇫🇷", Capital: "Paris", Language: "French", Hello: "bonjour", Thanks: "merci", Fact: "France has one of the world's densest networks of roundabouts.", Challenge: ChallengeQuickDraw, Colors: []string{"#0055a4", "#ffffff", "#ef4135"}},
		{Code: "AU", Name: "Australia", Region: "Oceania", Flag: "🇦🇺", Capital: "Canberra", Language: "English", Hello: "hello", Thanks: "thanks", Fact: "Australia has a large wild camel population descended from animals brought for desert transport.", Challenge: ChallengeQuickDraw, Colors: []string{"#00008b", "#ffffff", "#ff0000"}},
		{Code: "IT", Name: "Italy", Region: "Southern Europe", Flag: "🇮🇹", Capital: "Rome", Language: "Italian", Hello: "ciao", Thanks: "grazie", Fact: "Italy has more UNESCO World Heritage Sites than any other country.", Challenge: ChallengeButton, Colors: []string{"#009246", "#ffffff", "#ce2b37"}},
		{Code: "IN", Name: "India", Region: "South Asia", Flag: "🇮🇳", Capital: "New Delhi", Language: "Hindi", Hello: "namaste", Thanks: "dhanyavaad", Fact: "India has a floating post office on Dal Lake in Kashmir.", Challenge: ChallengePalette, Colors: []string{"#ff9933", "#ffffff", "#138808"}},
		{Code: "KR", Name: "South Korea", Region: "East Asia", Flag: "🇰🇷", Capital: "Seoul", Language: "Korean", Hello: "annyeonghaseyo", Thanks: "gamsahamnida", Fact: "Seoul's subway system includes numbered stations and extensive underground shopping corridors.", Challenge: ChallengeQuickDraw, Colors: []string{"#ffffff", "#c60c30", "#003478"}},
		{Code: "MX", Name: "Mexico", Region: "North America", Flag: "🇲🇽", Capital: "Mexico City", Language: "Spanish", Hello: "hola", Thanks: "gracias", Fact: "Mexico City was built on the site of Tenochtitlan, an island city in Lake Texcoco.", Challenge: ChallengeFoodRemedy, Colors: []string{"#006847", "#ffffff", "#ce1126"}},
		{Code: "MA", Name: "Morocco", Region: "North Africa", Flag: "🇲🇦", Capital: "Rabat", Language: "Arabic", Hello: "salaam", Thanks: "shukran", Fact: "Morocco's city of Fez is home to one of the world's oldest continuously operating universities.", Challenge: ChallengePalette, Colors: []string{"#c1272d", "#006233"}},
		{Code: "CA", Name: "Canada", Region: "North America", Flag: "🇨🇦", Capital: "Ottawa", Language: "English and French", Hello: "hello", Thanks: "merci", Fact: "Canada has the longest coastline of any country on Earth.", Challenge: ChallengeButton, Colors: []string{"#ff0000", "#ffffff"}},
		{Code: "GH", Name: "Ghana", Region: "West Africa", Flag: "🇬🇭", Capital: "Accra", Language: "English", Hello: "hello", Thanks: "thank you", Fact: "Ghana's Lake Volta is one of the world's largest artificial lakes by surface area.", Challenge: ChallengeFoodRemedy, Colors: []string{"#ce1126", "#fcd116", "#006b3f"}},
		{Code: "KE", Name: "Kenya", Region: "East Africa", Flag: "🇰🇪", Capital: "Nairobi", Language: "Swahili", Hello: "jambo", Thanks: "asante", Fact: "Kenya's Great Rift Valley contains some of the earliest known human ancestor fossils.", Challenge: ChallengeQuickDraw, Colors: []string{"#000000", "#bb0000", "#006600"}},
		{Code: "NO", Name: "Norway", Region: "Northern Europe", Flag: "🇳🇴", Capital: "Oslo", Language: "Norwegian", Hello: "hei", Thanks: "takk", Fact: "Norway's fjords were carved by glaciers over thousands of years.", Challenge: ChallengePalette, Colors: []string{"#ba0c2f", "#ffffff", "#00205b"}},
		{Code: "PE", Name: "Peru", Region: "South America", Flag: "🇵🇪", Capital: "Lima", Language: "Spanish", Hello: "hola", Thanks: "gracias", Fact: "Peru is home to Machu Picchu, a mountain citadel built by the Inca.", Challenge: ChallengeButton, Colors: []string{"#d91023", "#ffffff"}},
		{Code: "TR", Name: "Turkey", Region: "West Asia", Flag: "🇹🇷", Capital: "Ankara", Language: "Turkish", Hello: "merhaba", Thanks: "teşekkürler", Fact: "Istanbul is the only major city that spans two continents.", Challenge: ChallengeQuickDraw, Colors: []string{"#e30a17", "#ffffff"}},
		{Code: "VN", Name: "Vietnam", Region: "Southeast Asia", Flag: "🇻🇳", Capital: "Hanoi", Language: "Vietnamese", Hello: "xin chào", Thanks: "cảm ơn", Fact: "Vietnam's Sơn Đoòng Cave is among the largest known caves in the world.", Challenge: ChallengePalette, Colors: []string{"#da251d", "#ffcd00"}},
		{Code: "GR", Name: "Greece", Region: "Southern Europe", Flag: "🇬🇷", Capital: "Athens", Language: "Greek", Hello: "yasou", Thanks: "efharisto", Fact: "Greece has thousands of islands, though only a fraction are inhabited.", Challenge: ChallengeFoodRemedy, Colors: []string{"#0d5eaf", "#ffffff"}},
		{Code: "JM", Name: "Jamaica", Region: "Caribbean", Flag: "🇯🇲", Capital: "Kingston", Language: "English", Hello: "hello", Thanks: "thank you", Fact: "Jamaica has won an outsized number of Olympic sprint medals for its population.", Challenge: ChallengeQuickDraw, Colors: []string{"#009b3a", "#fed100", "#000000"}},
		{Code: "NZ", Name: "New Zealand", Region: "Oceania", Flag: "🇳🇿", Capital: "Wellington", Language: "English and Māori", Hello: "kia ora", Thanks: "thank you", Fact: "New Zealand was the first self-governing country to grant women the right to vote.", Challenge: ChallengeButton, Colors: []string{"#00247d", "#ffffff", "#cc142b"}},
		{Code: "PT", Name: "Portugal", Region: "Southern Europe", Flag: "🇵🇹", Capital: "Lisbon", Language: "Portuguese", Hello: "olá", Thanks: "obrigado", Fact: "Portugal's Livraria Bertrand is often cited as the world's oldest operating bookstore.", Challenge: ChallengePalette, Colors: []string{"#006600", "#ff0000"}},
		{Code: "TH", Name: "Thailand", Region: "Southeast Asia", Flag: "🇹🇭", Capital: "Bangkok", Language: "Thai", Hello: "sawasdee", Thanks: "khop khun", Fact: "Bangkok's ceremonial full name is one of the longest place names in the world.", Challenge: ChallengeFoodRemedy, Colors: []string{"#a51931", "#ffffff", "#2d2a4a"}},
		{Code: "AR", Name: "Argentina", Region: "South America", Flag: "🇦🇷", Capital: "Buenos Aires", Language: "Spanish", Hello: "hola", Thanks: "gracias", Fact: "Argentina's Perito Moreno Glacier is one of the few large glaciers that has remained relatively stable in recent decades.", Challenge: ChallengeButton, Colors: []string{"#74acdf", "#ffffff", "#f6b40e"}},
		{Code: "IE", Name: "Ireland", Region: "Northern Europe", Flag: "🇮🇪", Capital: "Dublin", Language: "Irish and English", Hello: "dia dhuit", Thanks: "go raibh maith agat", Fact: "Ireland has no native snakes, a fact wrapped into the legend of Saint Patrick.", Challenge: ChallengeQuickDraw, Colors: []string{"#169b62", "#ffffff", "#ff883e"}},
		{Code: "ID", Name: "Indonesia", Region: "Southeast Asia", Flag: "🇮🇩", Capital: "Jakarta", Language: "Indonesian", Hello: "halo", Thanks: "terima kasih", Fact: "Indonesia is made up of more than 17,000 islands.", Challenge: ChallengePalette, Colors: []string{"#ff0000", "#ffffff"}},
		{Code: "ZA", Name: "South Africa", Region: "Southern Africa", Flag: "🇿🇦", Capital: "Pretoria", Language: "Multiple official languages", Hello: "sawubona", Thanks: "thank you", Fact: "South Africa has 12 official languages, including South African Sign Language.", Challenge: ChallengeFoodRemedy, Colors: []string{"#007a4d", "#ffb612", "#de3831", "#002395"}},
		{Code: "IS", Name: "Iceland", Region: "Northern Europe", Flag: "🇮🇸", Capital: "Reykjavík", Language: "Icelandic", Hello: "halló", Thanks: "takk", Fact: "Iceland sits on the Mid-Atlantic Ridge, where two tectonic plates pull apart.", Challenge: ChallengeButton, Colors: []string{"#02529c", "#ffffff", "#dc1e35"}},
		{Code: "PH", Name: "Philippines", Region: "Southeast Asia", Flag: "🇵🇭", Capital: "Manila", Language: "Filipino and English", Hello: "kumusta", Thanks: "salamat", Fact: "The Philippines has more than 7,000 islands.", Challenge: ChallengeQuickDraw, Colors: []string{"#0038a8", "#ce1126", "#fcd116"}},
		{Code: "ES", Name: "Spain", Region: "Southern Europe", Flag: "🇪🇸", Capital: "Madrid", Language: "Spanish", Hello: "hola", Thanks: "gracias", Fact: "Spain's La Tomatina festival turns a town into a giant tomato fight each year.", Challenge: ChallengePalette, Colors: []string{"#aa151b", "#f1bf00"}},
		{Code: "SN", Name: "Senegal", Region: "West Africa", Flag: "🇸🇳", Capital: "Dakar", Language: "French", Hello: "bonjour", Thanks: "merci", Fact: "Senegal's Lake Retba can appear pink because of salt-loving microorganisms.", Challenge: ChallengeFoodRemedy, Colors: []string{"#00853f", "#fdef42", "#e31b23"}},
	}

	out := make([]Destination, 0, len(rows))
	for _, row := range rows {
		out = append(out, makeDestination(row))
	}
	return out
}

func DestinationForDate(destinations []Destination, date time.Time) Destination {
	if len(destinations) == 0 {
		return Destination{}
	}
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	days := int(date.UTC().Truncate(24*time.Hour).Sub(start) / (24 * time.Hour))
	if days < 0 {
		days = -days
	}
	return destinations[days%len(destinations)]
}

func StoreSeedDestinations() []store.ExpeditionDestination {
	destinations := SeedDestinations()
	items := make([]store.ExpeditionDestination, 0, len(destinations))
	for _, destination := range destinations {
		deepDiveFacts, _ := json.Marshal(destination.DeepDiveFacts)
		quizCulture, _ := json.Marshal(destination.QuizCulture)
		quizLanguage, _ := json.Marshal(destination.QuizLanguage)
		challengeParams, _ := json.Marshal(destination.ChallengeParams)
		items = append(items, store.ExpeditionDestination{
			CountryCode:     destination.CountryCode,
			CountryName:     destination.CountryName,
			Region:          destination.Region,
			FlagEmoji:       destination.FlagEmoji,
			DailyFact:       destination.DailyFact,
			DeepDiveFacts:   deepDiveFacts,
			QuizCulture:     quizCulture,
			QuizLanguage:    quizLanguage,
			ChallengeType:   string(destination.ChallengeType),
			ChallengeParams: challengeParams,
			ScoreThreshold:  destination.ScoreThreshold,
			Active:          destination.Active,
		})
	}
	return items
}

func makeDestination(seed destinationSeed) Destination {
	return Destination{
		CountryCode: seed.Code,
		CountryName: seed.Name,
		Region:      seed.Region,
		FlagEmoji:   seed.Flag,
		DailyFact:   seed.Fact,
		DeepDiveFacts: []string{
			seed.Fact,
			seed.Name + " is in " + seed.Region + ".",
			seed.Capital + " is the capital of " + seed.Name + ".",
			seed.Language + " is one of the languages connected to " + seed.Name + ".",
			"A greeting to remember: " + seed.Hello + ".",
			"A thank-you phrase to remember: " + seed.Thanks + ".",
		},
		QuizCulture: []QuizQuestion{
			question("What is the capital of "+seed.Name+"?", []string{seed.Capital, "Tokyo", "Cairo", "Lima"}, 0),
			question(seed.Name+" is in which region?", []string{seed.Region, "East Asia", "West Africa", "Oceania"}, 0),
			question("Which country did today's fact unlock?", []string{seed.Name, "France", "Kenya", "Mexico"}, 0),
		},
		QuizLanguage: []QuizQuestion{
			question("In "+seed.Name+", what does this greeting mean: "+seed.Hello+"?", []string{"Hello", "Goodbye", "Water", "Night"}, 0),
			question("In "+seed.Name+", what does this phrase mean: "+seed.Thanks+"?", []string{"Thank you", "Please", "Left", "Tomorrow"}, 0),
			question("Which language is connected to "+seed.Name+" in today's card?", []string{seed.Language, "Japanese", "Portuguese", "Swahili"}, 0),
		},
		ChallengeType:   seed.Challenge,
		ChallengeParams: map[string]any{"theme": "country_unlock", "colors": seed.Colors, "prompt": "Unlock " + seed.Name + " for today's atlas."},
		ScoreThreshold:  700,
		Active:          true,
	}
}

func question(text string, options []string, correct int) QuizQuestion {
	return QuizQuestion{Question: text, Options: options, CorrectIndex: correct}
}
