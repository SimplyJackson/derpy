import { ActivityType, Status } from 'discord.js';

const statuses = [
	{ name: 'SkyBlock', type: ActivityType.Playing },
	{ name: "Melody's Harp", type: ActivityType.Listening },
	{ name: 'my minions work', type: ActivityType.Watching },
	{ name: 'auction bids rise', type: ActivityType.Watching },
	{ name: 'Floor 7 Dungeons', type: ActivityType.Playing },
	{ name: 'the Dark Auction', type: ActivityType.Competing },
	{ name: 'SkyBlock Events', type: ActivityType.Competing },
	{ name: 'the Bazaar chatter', type: ActivityType.Listening },
];

export const statusRotator = (client, interval = 10000) => {
	let currentIndex = 0;
	const rotateStatus = () => {
		const status = statuses[currentIndex];
		client.user.setPresence({
			status: 'online',
			activities: [{ name: status.name, type: status.type }],
		});
		currentIndex = (currentIndex + 1) % statuses.length;
	};
	rotateStatus();
	setInterval(rotateStatus, interval);
};
