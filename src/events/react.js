import { Events } from 'discord.js';

export default {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.author.bot) return;
		if (message.content.toLowerCase().includes('derpy')) {
			message.react('❗').catch();
		}
	},
};
