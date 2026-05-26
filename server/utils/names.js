const firstNames = [
    'James', 'Emma', 'Oliver', 'Sophia', 'Liam', 'Ava', 'Noah', 'Isabella',
    'William', 'Mia', 'Benjamin', 'Charlotte', 'Lucas', 'Amelia', 'Henry',
    'Harper', 'Alexander', 'Evelyn', 'Sebastian', 'Abigail', 'Jack', 'Emily',
    'Daniel', 'Elizabeth', 'Michael', 'Sofia', 'Owen', 'Avery', 'Ethan', 'Ella',
    'Ryan', 'Madison', 'Nathan', 'Scarlett', 'Caleb', 'Grace', 'Mason', 'Chloe',
    'Logan', 'Victoria', 'Adrian', 'Riley', 'Eli', 'Aria', 'Aiden', 'Lily',
    'Dylan', 'Aurora', 'Leo', 'Zoey', 'Asher', 'Nora', 'Carter', 'Camila',
    'Julian', 'Hannah', 'Mateo', 'Savannah', 'Aaron', 'Luna', 'Isaac', 'Skylar',
    'Thomas', 'Paisley', 'Miles', 'Hazel', 'Samuel', 'Violet', 'Wyatt', 'Penelope',
    'Gabriel', 'Stella', 'Jake', 'Ellie', 'Lincoln', 'Audrey', 'Jayden', 'Leah',
    'Adam', 'Naomi', 'Nolan', 'Aaliyah', 'Cameron', 'Zoe', 'Marcus', 'Claire',
    'Dominic', 'Lucy', 'Steven', 'Anna', 'Patrick', 'Samantha', 'Harrison', 'Ruby',
    'Trevor', 'Eva', 'Gavin', 'Madeline', 'Brooks', 'Maya', 'Austin', 'Piper',
    'Derek', 'Willow', 'Grant', 'Jade', 'Tyler', 'Maria', 'Blake', 'Layla',
    'Connor', 'Alice', 'Spencer', 'Sadie', 'Tristan', 'Allison', 'Kai', 'Hailey'
];

const lastNames = [
    'Anderson', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Lewis',
    'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Hill', 'Scott',
    'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez',
    'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards',
    'Collins', 'Stewart', 'Morris', 'Murphy', 'Cook', 'Rogers', 'Morgan',
    'Peterson', 'Cooper', 'Reed', 'Bailey', 'Bell', 'Howard', 'Ward', 'Torres',
    'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson',
    'Coleman', 'Jenkins', 'Perry', 'Powell', 'Russell', 'Sullivan', 'Fisher',
    'Hamilton', 'Graham', 'Dixon', 'Fox', 'Marshall', 'Owens', 'McDonald',
    'Gibson', 'Ellis', 'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson',
    'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Boyd',
    'Mason', 'Palmer', 'Kelley', 'Lane', 'Hudson', 'Burns', 'Stone', 'Spencer',
    'Knight', 'Rice', 'Hart', 'Chavez', 'Hoffman', 'Dunn', 'Pearson', 'Payne'
];

const adjectives = [
    'Swift', 'Bright', 'Clever', 'Bold', 'Calm', 'Daring', 'Epic', 'Fierce',
    'Grand', 'Happy', 'Jolly', 'Keen', 'Lucky', 'Merry', 'Noble', 'Proud',
    'Quick', 'Royal', 'Sharp', 'True', 'Ultra', 'Vivid', 'Wise', 'Zesty',
    'Cosmic', 'Dream', 'Fresh', 'Golden', 'Icy', 'Jade', 'Lunar', 'Mystic',
    'Ocean', 'Pixel', 'Retro', 'Solar', 'Tiger', 'Velvet', 'Wild', 'Zen',
    'Arctic', 'Blaze', 'Coral', 'Dawn', 'Echo', 'Frost', 'Glow', 'Haze',
    'Iron', 'Jazz', 'Karma', 'Lava', 'Neon', 'Onyx', 'Pulse', 'Storm'
];

const nouns = [
    'Wolf', 'Eagle', 'Lion', 'Hawk', 'Bear', 'Fox', 'Raven', 'Tiger',
    'Phoenix', 'Dragon', 'Falcon', 'Viper', 'Cobra', 'Panda', 'Storm',
    'Thunder', 'Shadow', 'Flame', 'Frost', 'Blaze', 'Ace', 'Star',
    'Knight', 'Rider', 'Hunter', 'Archer', 'Scout', 'Pilot', 'Chief',
    'Rebel', 'Titan', 'Spark', 'Flash', 'Bolt', 'Wave', 'Reef',
    'Peak', 'Ridge', 'Cliff', 'Brook', 'Lake', 'River', 'Stone',
    'Blade', 'Sage', 'Rune', 'Drift', 'Ember', 'Crest', 'Vale', 'Nova'
];

const emailDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'protonmail.com',
    'icloud.com', 'mail.com', 'aol.com', 'zoho.com', 'yandex.com'
];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFullName() {
    return {
        first: pickRandom(firstNames),
        last: pickRandom(lastNames)
    };
}

function generateUsername() {
    const patterns = [
        () => {
            const name = generateFullName();
            return name.first.toLowerCase() + name.last.toLowerCase() + randomNumber(1, 9999);
        },
        () => {
            const name = generateFullName();
            return name.first.toLowerCase() + '_' + name.last.toLowerCase() + randomNumber(10, 99);
        },
        () => {
            const name = generateFullName();
            return name.first.toLowerCase() + '.' + name.last.toLowerCase() + randomNumber(1, 999);
        },
        () => {
            return pickRandom(adjectives).toLowerCase() + pickRandom(nouns).toLowerCase() + randomNumber(1, 9999);
        },
        () => {
            const name = generateFullName();
            return name.first.toLowerCase() + randomNumber(100, 9999);
        },
        () => {
            return pickRandom(adjectives).toLowerCase() + '_' + pickRandom(nouns).toLowerCase() + randomNumber(1, 99);
        },
        () => {
            const name = generateFullName();
            return name.first.charAt(0).toLowerCase() + name.last.toLowerCase() + randomNumber(10, 999);
        },
        () => {
            const name = generateFullName();
            const year = randomNumber(1990, 2006);
            return name.first.toLowerCase() + year;
        }
    ];

    return pickRandom(patterns)();
}

function generateEmail(username) {
    return username + '@' + pickRandom(emailDomains);
}

function generatePassword() {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%&*';

    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += upper[Math.floor(Math.random() * upper.length)];
    
    for (let i = 0; i < 6; i++) {
        password += lower[Math.floor(Math.random() * lower.length)];
    }
    
    for (let i = 0; i < 3; i++) {
        password += digits[Math.floor(Math.random() * digits.length)];
    }
    
    password += special[Math.floor(Math.random() * special.length)];

    return password.split('').sort(() => Math.random() - 0.5).join('');
}

function generateBirthday() {
    const year = randomNumber(1990, 2004);
    const month = randomNumber(1, 12);
    const day = randomNumber(1, 28);
    return { year, month, day };
}

function generateDisplayName() {
    const name = generateFullName();
    const styles = [
        () => name.first + ' ' + name.last,
        () => name.first + ' ' + name.last.charAt(0) + '.',
        () => name.first,
        () => pickRandom(adjectives) + ' ' + pickRandom(nouns)
    ];
    return pickRandom(styles)();
}

function generateBio() {
    const bios = [
        'Just living life',
        'Love music and travel',
        'Coffee addict',
        'Photography enthusiast',
        'Digital creator',
        'Student life',
        'Adventure seeker',
        'Following my dreams',
        'Work hard play harder',
        'Making memories',
        'Life is beautiful',
        'Stay positive',
        'Keep it simple',
        'One day at a time',
        'Living my best life',
        'Be yourself',
        'Never stop dreaming',
        'Enjoying every moment',
        'Grateful for everything',
        'Chasing sunsets'
    ];
    return pickRandom(bios);
}

function generateCompleteIdentity() {
    const fullName = generateFullName();
    const username = generateUsername();
    const email = generateEmail(username);
    const password = generatePassword();
    const birthday = generateBirthday();
    const displayName = generateDisplayName();
    const bio = generateBio();

    return {
        firstName: fullName.first,
        lastName: fullName.last,
        username: username,
        email: email,
        password: password,
        birthday: birthday,
        displayName: displayName,
        bio: bio
    };
}

module.exports = {
    generateFullName,
    generateUsername,
    generateEmail,
    generatePassword,
    generateBirthday,
    generateDisplayName,
    generateBio,
    generateCompleteIdentity,
    pickRandom,
    randomNumber
};
