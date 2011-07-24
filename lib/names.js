var cjbutil = require('cjbutil');

var prefix = [
	"Abandoned", "Aberrant", "Accident-prone", "Aggressive", "Aimless", "Alien",
	"All", "Angry", "Appropriate", "Bad", "Barbaric", "Bare", "Beacon", "Big",
	"Birmingham", "Bitter", "Black", "Blue", "Boston", "Brave", "Brutal",
	"Cheerful", "Crispy", "Crunchy", "Dancing", "Dangerous", "DaVinci's", "Dead",
	"Defiant", "Deserted", "Devout", "Digital", "Dirty", "Disappointed",
	"Discarded", "Dismal", "Downcast", "Dreaded", "Einstein's", "Elastic", "Empty",
	"Endless", "Essential", "Eternal", "Everyday", "Fast", "Fierce", "Flaming",
	"Flying", "Forgotten", "Forsaken", "Freaky", "Frozen", "Full", "Furious",
	"Gandhi's", "Gaseous", "Ghastly", "Global", "Gloomy", "Green", "Grim",
	"Gruesome", "Gutsy", "Intrepid", "Headless", "Heavy", "Helpless", "Hidden",
	"Hideous", "Homeless", "Hungry", "Impure", "Insane", "Intense", "Inventive",
	"Itchy", "Jagged", "Kentucky", "Left-Handed", "Liquid", "Lone", "Lost",
	"Lurid", "Marooned", "Massive", "Meaningful", "Meaty", "Medieval", "Mellow",
	"Misspent", "Modern", "Monday's", "Morbid", "Moving", "Napoleon's", "Nasty",
	"Needless", "Nervous", "New", "Next", "Ninth", "Nocturnal", "Nonskid",
	"Northernmost", "Old", "Official", "Permanent", "Persistent", "Picasso's",
	"Pointless", "Pure", "Queasy", "Rampant", "Random", "Rare", "Raw", "Reborn",
	"Remote", "Restless", "Rich", "Risky", "Robotic", "Rocky", "Rotary", "Rough",
	"Running", "Rusty", "Ruthless", "Sad", "Saturday's", "Screaming", "Serious",
	"Severe", "Silly", "Skilled", "Sleepy", "Sliding", "Small", "Solid",
	"Solitary", "Stale", "Steamy", "Stony", "Stormy", "Strange", "Strawberry",
	"Stray", "Streaming", "Strong", "Subtle", "Supersonic", "Surreal", "Tainted",
	"Temporary", "Third", "Thrifty", "Tidy", "Timely", "Tired", "Toiling", "Tough",
	"Treacherous", "Unhappy", "Unidentified", "Unique", "Unpreventable", "Unsafe",
	"Untidy", "Vicious", "Vital", "Wanton", "White", "Wild", "Wooden", "Worthy",
	"Young", "Alarm", "Albatross", "Anaconda", "Antique", "Artificial", "Autopsy",
	"Autumn", "Avenue", "Backpack", "Bakery", "Balcony", "Barbershop", "Barnacle",
	"Barnyard", "Boomerang", "Bulldozer", "Butter", "Canal", "Careless", "Casket",
	"Chalk", "Cloud", "Clown", "Coffin", "Coke", "Cold", "Comic", "Compass",
	"Confined", "Corduroy", "Corrupt", "Cosmic", "Crayon", "Creek", "Crossbow",
	"Crude", "Cutlery", "Dagger", "Desolate", "Dinosaur", "Disturbed", "Dog",
	"Donut", "Door", "Doorstop", "Eardrum", "Electrical", "Electron", "Excessive",
	"Eyelid", "False", "Fault", "Filament", "Firecracker", "Fish", "Flagpole",
	"Flannel", "Flea", "Foghorn", "Forbidden", "Forklift", "French", "Fried",
	"Frostbite", "Funeral", "Gangrene", "Gargoyle", "Gasket", "Gravel", "Grenade",
	"Grindstone", "Haystack", "Helium", "Homicide", "Humidity", "Insurance",
	"Invader", "Jazz", "Junkyard", "Kangaroo", "Kneecap", "Lantern", "Leather",
	"Lemonade", "Lightning", "Limousine", "Liposuction", "Lipstick", "Lobster",
	"Lockbox", "Locomotive", "Longitude", "Love", "Lust", "Messenger", "Metaphor",
	"Microphone", "Mildew", "Milk", "Minefield", "Miserable", "Monkey", "Moose",
	"Morning", "Mountain", "Mustard", "Naked", "Neutron", "Nitrogen", "Notorius",
	"Obscure", "Ostrich", "Oyster", "Parachute", "Peasant", "Pepsi", "Pineapple",
	"Plastic", "Postal", "Pottery", "Prehistoric", "Propellor", "Proton",
	"Psychotic", "Puppet", "Railroad", "Red", "Rhinestone", "Roadrunner", "Rubber",
	"Scarecrow", "Scoreboard", "Scorpion", "Sex", "Shaggy", "Shower", "Sinister",
	"Skunk", "Slime", "Smoke", "Sound", "Soybean", "Speedy", "Stagecoach",
	"Street", "Subdivision", "Summer", "Sunshine", "Surfing", "Swollen",
	"Sycamore", "Toboggan", "Tea", "Temple", "Test", "Tire", "Tollbooth",
	"Tombstone", "Toothbrush", "Torpedo", "Toupee", "Trendy", "Trombone", "Tuba",
	"Tuna", "Tugboat", "Tungsten", "Unpleasant", "Vegetable", "Venom", "Vigilence",
	"Vulture", "Waffle", "Warehouse", "Waterbed", "Weather", "Weeknight",
	"Windchill", "Windshield", "Winter", "Wrench", "Xylophone", "Yellow"
];

var suffix = [
	"Activity", "Adventure", "Advantage", "Advisors", "Affiliation", "Agenda",
	"Airmen", "Alliance", "Almanac", "Ambiguity", "Amusement", "Analogy",
	"Anarchy", "Angels", "Announcement", "Antics", "Apparatus", "Arsenal",
	"Assassination", "Assassins", "Assembly", "Atmosphere", "Authority", "Baggage",
	"Band", "Bandits", "Beast", "Believers", "Betrayal", "Blockade", "Bodybags",
	"Brigade", "Bunch", "Bureaucracy", "Burial", "Business", "Cadets", "Calamity",
	"Caper", "Carnival", "Ceremony", "Chaos", "Challenge", "Charmers",
	"Cheerleaders", "Choice", "Choir", "Chorus", "Circus", "Civilization",
	"Coalition", "College", "Collision", "Colony", "Combo", "Commanders",
	"Committee", "Community", "Company", "Conclave", "Conclusion", "Conductors",
	"Confederacy", "Conference", "Confession", "Confusion", "Congregation",
	"Conjecture", "Connection", "Conspiracy", "Consultants", "Contest",
	"Convention", "Corporation", "Council", "Craziness", "Crew", "Crisis",
	"Culprits", "Cult", "Damage", "Dance", "Dancers", "Death", "Debacle", "Deceit",
	"Deduction", "Democracy", "Demons", "Demonstration", "Departure", "Design",
	"Desire", "Detectives", "Devils", "Difference", "Dilemma", "Directory",
	"Disadvantage", "Disappearance", "Dispute", "Dominion", "Downfall", "Dummies",
	"Dungeon", "Edict", "Effigy", "Emergency", "Empire", "Encounter", "Endeavor",
	"Endorsement", "Engineers", "Enigma", "Ensemble", "Evidence", "Examiners",
	"Executioners", "Executives", "Exhibit", "Exhibition", "Exit", "Expedition",
	"Experience", "Experiment", "Explosion", "Express", "Extinction", "Facility",
	"Factory", "Federation", "Festival", "Fever", "Fiends", "Fishermen", "Five",
	"Force", "Formation", "Foundation", "Fragment", "Freaks", "Freedom", "Frolic",
	"Gangsters", "Gazette", "Genius", "Gladiators", "Glee Club", "Goldfish",
	"Gravy", "Growth", "Hammer", "Harmony", "Highway", "Honesty", "Hypocrisy",
	"Hypothesis", "Incident", "Inequality", "Influence", "Information",
	"Institute", "Intensity", "Interference", "Inversion", "Jamboree", "Jesters",
	"Jockeys", "Journey", "Judgment", "Jugglers", "Justification", "Kingdom",
	"Ladies", "League", "Leverage", "Lighthouse", "Lords", "Mansion", "Maze",
	"Memorial", "Menu", "Miracle", "Mischief", "Monument", "Motel", "Motion",
	"Motive", "Museum", "Mutants", "Mutiny", "Mystery", "Nation", "Navigators",
	"Neighborhood", "Network", "Orbit", "Origin", "Outcome", "Overview", "Paradox",
	"Parents", "Party", "Patrol", "Penalty", "Performers", "Phantoms",
	"Philharmonic", "Pilots", "Pioneers", "Pirates", "Plan", "Planet", "Platoon",
	"Platform", "Police", "Position", "Posse", "Power", "Prank", "Premise",
	"Pressure", "Principle", "Prisoners", "Problem", "Procedure", "Process",
	"Professors", "Project", "Property", "Prophecy", "Proposition", "Pursuit",
	"Quality", "Quartet", "Question", "Quotient", "Rangers", "Reaction",
	"Rebellion", "Reform", "Regime", "Relics", "Remedy", "Republic", "Requirement",
	"Resentment", "Response", "Resources", "Result", "Revision", "Revival",
	"Rodeo", "Romp", "Saboteurs", "Saints", "Sanction", "Sandwich", "Scheme",
	"Scoundrels", "Service", "Shadow", "Shift", "Significance", "Sinners",
	"Society", "Solution", "Soul", "Space", "Specimen", "Squad", "Stain",
	"Standard", "Statement", "Station", "Stockbrokers", "Strategy", "Students",
	"Substances", "Substitute", "Subterfuge", "Subway", "Supervisors", "Switch",
	"Symphony", "Syndicate", "Syndrome", "System", "Tactics", "Testament",
	"Theory", "Thieves", "Titans", "Tragedy", "Transfer", "Transformation",
	"Trance", "Trick", "Trilogy", "Trio", "Troopers", "Trustees", "Tunnel",
	"Turmoil", "Twilight", "Understatement", "Union", "Universe", "University",
	"Uprising", "Uproar", "Velocity", "Vengeance", "Venture", "Villains",
	"Violation", "Volunteers", "Voyage", "Warheads", "Warriors", "Workshop",
	"Worship", "Yankees", "Yodelers", "Zealots"
];

exports.generate = function() {
	return 'The '+prefix[Math.floor(Math.random(prefix.length)*prefix.length)]+' '+suffix[Math.floor(Math.random(suffix.length)*suffix.length)];
}

exports.sanitize = function(name) {
	if(name === null) {
		return this.generate();
        }

	var sanitized = cjbutil.escapeHtml(name.trim());
	if(sanitized == '') {
		return this.generate();
	}

        return sanitized;
}

