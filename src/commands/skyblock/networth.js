// Incomplete code snippet for a Discord bot command to fetch SkyBlock networth
// This code is part of a Discord bot command that retrieves a player's SkyBlock networth using the Hypixel API. 
import {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	MessageFlags,
} from 'discord.js';

const num = (x) => (typeof x === 'number' ? x.toLocaleString('en-US') : '0');

export default {
	data: new SlashCommandBuilder()
		.setName('networth')
		.setDescription('Show SkyBlock networth for a player')
		.addStringOption((o) =>
			o
				.setName('username')
				.setDescription('Minecraft IGN (optional if linked)')
				.setRequired(false)
		),

	async execute(interaction) {
		await interaction.deferReply();

		const optIgn = interaction.options.getString('username');
		let uuid, name;

		if (optIgn) {
			const res = await fetch(
				`https://api.mojang.com/users/profiles/minecraft/${optIgn}`
			);
			if (!res.ok) {
				return interaction.editReply({
					content: `❌ Failed to fetch UUID for **${optIgn}**. Is the name correct?`,
				});
			}
			const data = await res.json();
			if (!data || !data.id) {
				return interaction.editReply({
					content: `❌ Failed to fetch UUID for **${optIgn}**. Is the name correct?`,
				});
			}
			uuid = data.id.replace(/-/g, '');
			name = optIgn;
		} else {
			const linked = interaction.user.skyblock?.linked;
			if (!linked || !linked.uuid) {
				return interaction.editReply({
					content: '❌ You must link your Minecraft account first using `/link`.',
					flags: MessageFlags.Ephemeral,
				});
			}
			uuid = linked.uuid;
			name = linked.name || 'Unknown';
		}
		// Calculate networth
		const res = await fetch(
			`https://api.hypixel.net/skyblock/profiles?key=${process.env.HYPIXEL_API_KEY}&uuid=${uuid}`
		);
		if (!res.ok) {
			return interaction.editReply({
				content: `❌ Failed to fetch SkyBlock profiles for **${name}**.
Please try again later.`,
			});
		}
		const data = await res.json();
		if (!data.profiles || data.profiles.length === 0) {
			return interaction.editReply({
				content: `❌ No SkyBlock profiles found for **${name}**. Is
the player active?`,
			});
		}
		const profile = data.profiles.find(
			(p) => p.members[uuid] && p.members[uuid].networth
		);
		if (!profile) {
			return interaction.editReply({
				content: `❌ No networth data found for **${name}**. Is
the player active?`,

			});
		}
		const networth = profile.members[uuid].networth || 0;
		const formattedNetworth = num(networth);
		const embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(`Networth for ${name}`)
			.setDescription(
				`**Profile:** ${profile.profile_name}\n**UUID:** ${uuid}\n**Networth:** $${formattedNetworth}`
			)
			.setTimestamp();
		if (profile.members[uuid].last_save) {
			embed.addFields({
				name: 'Last Save',
				value: new Date(profile.members[uuid].last_save).toLocaleString(),
			});
		}
		if (profile.members[uuid].last_death) {
			embed.addFields({
				name: 'Last Death',
				value: new Date(profile.members[uuid].last_death).toLocaleString(),
			});
		}
		if (profile.members[uuid].last_login) {
			embed.addFields({
				name: 'Last Login',
				value: new Date(profile.members[uuid].last_login).toLocaleString(),
			});
		}
		if (profile.members[uuid].last_logout) {
			embed.addFields({
				name: 'Last Logout',
				value: new Date(profile.members[uuid].last_logout).toLocaleString(),
			});
		}
		if (profile.members[uuid].last_save && profile.members[uuid].last_login) {
			const lastActive = new Date(profile.members[uuid].last_login);
			const lastSave = new Date(profile.members[uuid].last_save);
			const timeSinceLastActive = Math.floor(
				(lastActive - lastSave) / 1000 / 60
			);
			embed.addFields({
				name: 'Time Since Last Active',
				value: `${timeSinceLastActive} minutes`,
			});
		}
		if (profile.members[uuid].last_death && profile.members[uuid].last_login) {
			const lastDeath = new Date(profile.members[uuid].last_death);
			const timeSinceLastDeath = Math.floor(
				(lastDeath - profile.members[uuid].last_login) / 1000 / 60
			);
			embed.addFields({
				name: 'Time Since Last Death',
				value: `${timeSinceLastDeath} minutes`,
			});
		}
		if (profile.members[uuid].last_logout && profile.members[uuid].last_login) {
			const lastLogout = new Date(profile.members[uuid].last_logout);
			const timeSinceLastLogout = Math.floor(
				(lastLogout - profile.members[uuid].last_login) / 1000 / 60
			);
			embed.addFields({
				name: 'Time Since Last Logout',
				value: `${timeSinceLastLogout} minutes`,
			});
		}
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('profile_select')
			.setPlaceholder('Select a profile')
			.setMinValues(1)
			.setMaxValues(1);
		data.profiles.forEach((p) => {
			if (p.members[uuid]) {
				selectMenu.addOptions({
					label: p.profile_name,
					value: p.profile_id,
					description: `Networth: $${num(p.members[uuid].networth || 0)}`,
				});
			}
		}
		);
		const actionRow = new ActionRowBuilder().addComponents(selectMenu);
		await interaction.editReply({
			content: `Networth for **${name}**`,
			embeds: [embed],
			components: [actionRow],
		});
	},
	selectExecute: async (interaction) => {
		const selectedProfileId = interaction.values[0];
		const uuid = interaction.user.skyblock?.linked?.uuid;
		if (!uuid) {
			return interaction.reply({
				content: '❌ You must link your Minecraft account first using `/link`.',
				flags: MessageFlags.Ephemeral,
			});
		}
		const res = await fetch(
			`https://api.hypixel.net/skyblock/profiles?key=${process.env.HYPIXEL_API_KEY}&uuid=${uuid}`
		);
		if (!res.ok) {
			return interaction.reply({
				content: `❌ Failed to fetch SkyBlock profiles for your account. Please try again later.`,
			});
		}
		const data = await res.json();
		const profile = data.profiles.find((p) => p.profile_id === selectedProfileId);
		if (!profile || !profile.members[uuid]) {
			return interaction.reply({
				content: `❌ No profile found with ID **${selectedProfileId}** for your account.`,
			});
		}
		const networth = profile.members[uuid].networth || 0;
		const formattedNetworth = num(networth);
		const embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle(`Networth for ${profile.profile_name}`)
			.setDescription(`**UUID:** ${uuid}\n**Networth:** $${formattedNetworth}`)
			.setTimestamp();
		
		await interaction.update({ embeds: [embed], components: [] });
	}

};
