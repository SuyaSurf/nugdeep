package lobby

import "time"

func GetTodaysActivity() Activity {
	day := time.Now().YearDay()
	activities := SeedActivities()
	idx := (day - 1) % len(activities)
	return activities[idx]
}

func SeedActivities() []Activity {
	return []Activity{
		{
			ID: 1, DayOfYear: 1,
			Prompt: "Choose a number between 1 and 10",
			Type:   "number_picker",
			Options: []Option{
				{Value: "1", Label: "1"}, {Value: "2", Label: "2"},
				{Value: "3", Label: "3"}, {Value: "4", Label: "4"},
				{Value: "5", Label: "5"}, {Value: "6", Label: "6"},
				{Value: "7", Label: "7"}, {Value: "8", Label: "8"},
				{Value: "9", Label: "9"}, {Value: "10", Label: "10"},
			},
		},
		{
			ID: 2, DayOfYear: 2,
			Prompt: "Choose your color",
			Type:   "color_picker",
			Options: []Option{
				{Value: "red", Label: "Red", Icon: "🔴"},
				{Value: "blue", Label: "Blue", Icon: "🔵"},
				{Value: "green", Label: "Green", Icon: "🟢"},
				{Value: "yellow", Label: "Yellow", Icon: "🟡"},
				{Value: "purple", Label: "Purple", Icon: "🟣"},
				{Value: "orange", Label: "Orange", Icon: "🟠"},
			},
		},
		{
			ID: 3, DayOfYear: 3,
			Prompt: "Choose a seat in the cinema",
			Type:   "seat_selector",
			Options: []Option{
				{Value: "front_left", Label: "Front Left"},
				{Value: "front_right", Label: "Front Right"},
				{Value: "middle_center", Label: "Middle Center"},
				{Value: "back_left", Label: "Back Left"},
				{Value: "back_right", Label: "Back Right"},
			},
		},
		{
			ID: 4, DayOfYear: 4,
			Prompt: "Which one doesn't belong?",
			Type:   "puzzle",
			Options: []Option{
				{Value: "apple", Label: "Apple", Icon: "🍎"},
				{Value: "banana", Label: "Banana", Icon: "🍌"},
				{Value: "carrot", Label: "Carrot", Icon: "🥕"},
				{Value: "dog", Label: "Dog", Icon: "🐕"},
			},
		},
		{
			ID: 5, DayOfYear: 5,
			Prompt: "Find the circle",
			Type:   "spot_diff",
			Options: []Option{
				{Value: "top_left", Label: "Top Left"},
				{Value: "top_right", Label: "Top Right"},
				{Value: "bottom_left", Label: "Bottom Left"},
				{Value: "bottom_right", Label: "Bottom Right"},
			},
		},
		{
			ID: 6, DayOfYear: 6,
			Prompt: "Pick your travel style",
			Type:   "choice_grid",
			Options: []Option{
				{Value: "beach", Label: "Beach Vacation", Icon: "🏖️"},
				{Value: "adventure", Label: "Adventure", Icon: "🏔️"},
				{Value: "city", Label: "City Break", Icon: "🌆"},
				{Value: "nature", Label: "Nature Retreat", Icon: "🌲"},
			},
		},
	}
}
