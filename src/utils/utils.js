import { EmbedBuilder } from 'discord.js';

export async function getPlayerStatus(uuid, apiKey) {
	const res = await fetch(`https://api.hypixel.net/v2/status?uuid=${uuid}`, {
		headers: { 'API-Key': apiKey },
	});
	const data = await res.json().catch(() => ({}));
	return data?.session || null;
}

export async function fetchHypixelAPI(url, options = {}) {
	if (!process.env.api_hypixel) {
		throw new Error('Hypixel API key is not set in environment variables.');
	}
	if (!options.headers) options.headers = {};
	options.headers['User-Agent'] = 'Hypixel Skyblock Discord Bot';
	options.headers['Content-Type'] = 'application/json';
	if (!options.headers['API-Key'])
		options.headers['API-Key'] = process.env.api_hypixel;

	const response = await fetch(`https://api.hypixel.net/v2/${url}`, options);
	if (!response.ok) {
		throw new Error(`Hypixel API request failed: ${response.statusText}`);
	}
	return response.json();
}

export function buildEmbedFromJson({ json = {} }) {
	const embed = new EmbedBuilder()
		.setColor('0x57F287')
		.setFooter({ text: '• Derpy', iconURL: 'attachment://derpy.webp' });

	// Apply JSON properties
	if (json.color) embed.setColor(json.color);
	if (json.title) embed.setTitle(json.title);
	if (json.description) embed.setDescription(json.description);
	if (json.fields && Array.isArray(json.fields)) embed.addFields(json.fields);
	if (json.thumbnail) embed.setThumbnail(json.thumbnail);
	if (json.image) embed.setImage(json.image);
	if (json.timestamp) embed.setTimestamp(json.timestamp);
	if (json.url) embed.setURL(json.url);
	if (json.author) {
		embed.setAuthor({
			name: json.author.name,
			iconURL: json.author.iconURL,
			url: json.author.url,
		});
	}
	if (json.footer) {
		embed.setFooter({
			text: json.footer.text,
			iconURL: json.footer.iconURL || 'attachment://derpy.webp',
		});
	}
	return embed;
}
