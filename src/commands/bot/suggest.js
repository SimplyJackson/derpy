const SuggestionChannelId = '1405724010599420056';
const SuggestionAcceptedChannelId = '1405726405911642274';
const SuggestionRejectedChannelId = '1405726433422217236';

import {
	EmbedBuilder,
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	MessageFlags,
} from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('suggest')
		.setDescription('Submit a suggestion!'),

	async execute(interaction) {
		// Create a modal
		const modal = new ModalBuilder()
			.setCustomId('derpy:suggest')
			.setTitle('Submit a Suggestion');

		const suggestionInput = new TextInputBuilder()
			.setCustomId('input')
			.setLabel('Your suggestion')
			.setStyle(TextInputStyle.Paragraph)
			.setPlaceholder('Type your suggestion here...')
			.setRequired(true);

		// Add the input to an ActionRow
		const firstActionRow = new ActionRowBuilder().addComponents(
			suggestionInput
		);

		// Add the ActionRow to the modal
		modal.addComponents(firstActionRow);

		// Show the modal to the user
		await interaction.showModal(modal);
	},

	async modalExecute(interaction) {
		const suggestion = interaction.fields.getTextInputValue('input');

		if (!suggestion || suggestion.trim().length === 0) {
			await interaction.reply({
				content: 'Suggestion cannot be empty.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		if (suggestion.length > 2000) {
			await interaction.reply({
				content:
					'Suggestion is too long. Please keep it under 2000 characters.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await interaction.reply({
			content: `Thank you for your suggestion: "${suggestion}"`,
			flags: MessageFlags.Ephemeral,
		});

		// Optionally, you can log the suggestion or handle it further
		console.log(`New suggestion from ${interaction.user.tag}: ${suggestion}`);
		const channel = interaction.client.channels.cache.get(SuggestionChannelId);
		// Send the suggestion to the designated channel in a embed with 2 buttons that accept or reject the suggestion.
		if (channel) {
			await channel.send({
				// content: `New suggestion from ${interaction.user.tag}: ${suggestion}`,
				embeds: [
					new EmbedBuilder()
						.setTitle('New Suggestion')
						.setDescription(suggestion)
						.setColor(0xffff00)
						.setFooter({
							text: `Suggested by ${interaction.user.tag}`,
							iconURL: interaction.user.displayAvatarURL(),
						}),
				],
				components: [
					new ActionRowBuilder().addComponents(
						new ButtonBuilder()
							.setCustomId(`derpy:suggest:accept:${interaction.user.id}`)
							.setLabel('Accept')
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(`derpy:suggest:reject:${interaction.user.id}`)
							.setLabel('Reject')
							.setStyle(ButtonStyle.Danger)
					),
				],
			});
		}
	},

	async buttonExecute(interaction, action, userId) {
		const embed = EmbedBuilder.from(interaction.message.embeds[0]);

		let moveChannel;
		if (action === 'accept') {
			embed.setColor(0x57f287);
			moveChannel = interaction.client.channels.cache.get(
				SuggestionAcceptedChannelId
			);
		} else if (action === 'reject') {
			embed.setColor(0xed4245);
			moveChannel = interaction.client.channels.cache.get(
				SuggestionRejectedChannelId
			);
		}
		if (moveChannel) {
			await moveChannel.send({
				embeds: [embed],
				content: `Suggestion ${action}ed by ${interaction.user}`,
			});
		}
		await interaction.message.delete();
		// await interaction.update({
		// 	content: `Suggestion ${action}ed by ${interaction.user.tag}`,
		// 	embeds: [embed],
		// 	components: [],
		// });
	},
};
