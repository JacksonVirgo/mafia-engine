import {
	EmbedBuilder,
	Colors,
	RestOrArray,
	APIEmbedField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';
import { HydratedSignup } from '../db/signups';
import { createCustomId } from '../utils/customId';
import { leaveCategoryBtn } from '../interactions/signups/buttons/categoryLeave';

export function formatSignupEmbed(signup: HydratedSignup) {
	const embed = new EmbedBuilder();
	embed.setTitle(signup.name);

	let description = 'Click the appropriate buttons to join a category';
	if (signup.isAnonymous)
		description += '\n **__This signup is anonymous__**';

	embed.setDescription(description);
	embed.setColor(Colors.Blurple);

	const hoistedFields: RestOrArray<APIEmbedField> = [];
	const otherFields: RestOrArray<APIEmbedField> = [];

	signup.categories.sort((a, b) => a.id - b.id);

	for (const category of signup.categories) {
		const users_str: string[] = [];
		for (const user of category.users) {
			const illegal_chars = ['*', '_', '~'];
			let does_contain = false;
			for (const char of illegal_chars) {
				if (user.username.includes(char)) {
					does_contain = true;
					break;
				}
			}

			if (signup.isAnonymous && !category.isHoisted)
				users_str.push('> Anonymous User');
			else if (does_contain) users_str.push(`> \`${user.username}\``);
			else users_str.push(`> ${user.username}`);
		}
		if (users_str.length === 0) users_str.push('> None');

		let categoryName = category.name;
		if (category.limit)
			categoryName += ` [${category.users.length}/${category.limit}]`;

		const field = {
			name: categoryName,
			value: users_str.join('\n'),
			inline: true,
		};

		if (category.isHoisted) hoistedFields.push(field);
		else otherFields.push(field);
	}

	embed.addFields(hoistedFields);
	embed.addFields({
		name: '\u200B',
		value: '**__[ SIGNED UP ]__**',
	});
	embed.addFields(otherFields);

	return embed;
}

export function formatSignupComponents(signup: HydratedSignup) {
	const row = new ActionRowBuilder<ButtonBuilder>();

	const buttons: ButtonBuilder[] = [];

	signup.categories.forEach((category) => {
		if (category.isHoisted) return;
		const btn = new ButtonBuilder();
		const customId = createCustomId('signup-join', category.id.toString());
		btn.setCustomId(customId);

		let label = category.buttonName ?? category.name;
		if (!category.buttonName && label.charAt(label.length - 1) === 's')
			label = label.substring(0, label.length - 1);

		btn.setLabel(label);
		btn.setStyle(
			category.isFocused ? ButtonStyle.Primary : ButtonStyle.Secondary
		);
		buttons.push(btn);
	});

	row.setComponents(buttons);
	row.addComponents(leaveCategoryBtn.build());
	return row;
}