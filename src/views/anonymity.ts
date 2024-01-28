import { AnonymousGroup, getAnonymousProfiles } from '@models/anonymity';
import linkChannel from '@root/events/buttons/anonymity/channels/linkChannel';
import unlinkChannel from '@root/events/buttons/anonymity/channels/unlinkChannel';
import CreateAnonymityGroup from '@root/events/buttons/anonymity/createAnonymityGroup';
import gotoChannels from '@root/events/buttons/anonymity/gotoChannels';
import gotoHome from '@root/events/buttons/anonymity/gotoHome';
import gotoProfiles from '@root/events/buttons/anonymity/gotoProfiles';
import newProfile from '@root/events/buttons/anonymity/profiles/newProfile';
import removeProfile from '@root/events/buttons/anonymity/profiles/removeProfile';
import updateProfile from '@root/events/buttons/anonymity/profiles/updateProfile';
import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, EmbedBuilder } from 'discord.js';

export function embedCreateAnonymousGroup(): BaseMessageOptions {
	const embed = new EmbedBuilder();
	embed.setTitle('Create Anonymous Group');
	embed.setDescription('There is anonymous group in this channel');
	embed.setColor('Red');
	const row = new ActionRowBuilder<ButtonBuilder>();

	row.addComponents(CreateAnonymityGroup.build());

	return {
		embeds: [embed],
		components: [row],
	};
}

async function anonEmbedMainPageRaw(group: AnonymousGroup): Promise<EmbedBuilder> {
	const embed = new EmbedBuilder();
	embed.setTitle('Anonymous Group');
	embed.setColor('White');

	embed.addFields({
		name: `Linked Channels (${group.linkedChannels.length})`,
		value: group.linkedChannels.map((v) => `> <#${v}>`).join('\n'),
	});

	const profiles = await getAnonymousProfiles(group.id);
	if (profiles) {
		const fields: string[] = [];
		const footer = '\n...';
		let isCutOff = false;

		for (const profile of profiles) {
			const value = `> ${fields.length + 1}. ${profile.name ?? 'Unnamed'}`;
			const currentLength = fields.join('\n') + '\n' + value + footer;
			if (currentLength.length < 1024) fields.push(value);
			else isCutOff = true;
		}

		let value = fields.length >= 1 ? fields.join('\n') : '> None';
		if (isCutOff) value += footer;

		embed.addFields({
			name: `Profiles (${profiles.length})`,
			value,
		});
	}
	return embed;
}

export async function anonEmbedMainPage(group: AnonymousGroup): Promise<BaseMessageOptions> {
	const embed = await anonEmbedMainPageRaw(group);
	const row = new ActionRowBuilder<ButtonBuilder>();
	row.addComponents(gotoChannels.build(), gotoProfiles.build());

	return {
		embeds: [embed],
		components: [row],
	};
}

export async function anonEmbedManageChannels(group: AnonymousGroup): Promise<BaseMessageOptions> {
	const embed = await anonEmbedMainPageRaw(group);
	embed.setTitle('Anonymous Group - Manage Channels');

	const row = new ActionRowBuilder<ButtonBuilder>();
	row.addComponents(gotoHome.build(), linkChannel.build(), unlinkChannel.build());

	return {
		embeds: [embed],
		components: [row],
	};
}

export async function anonEmbedManageProfiles(group: AnonymousGroup): Promise<BaseMessageOptions> {
	const embed = await anonEmbedMainPageRaw(group);
	embed.setTitle('Anonymous Group - Manage Profiles');

	const row = new ActionRowBuilder<ButtonBuilder>();
	row.addComponents(gotoHome.build(), newProfile.build(), updateProfile.build(), removeProfile.build());

	return {
		embeds: [embed],
		components: [row],
	};
}
