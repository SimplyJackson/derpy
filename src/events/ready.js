import { Events } from 'discord.js';
import { statusRotator } from '../utils/playing.js';

export default {
	once: true,
	name: Events.ClientReady,
	async execute(c) {
		console.log(`✅ Logged in as ${c.user.tag}`);
		statusRotator(c);
	},
};
