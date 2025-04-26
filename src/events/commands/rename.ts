import { PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from '../../structures/interactions/SlashCommand';
import { prisma } from '../..';

export default new SlashCommand('rename')
	.setDescription('Rename')
	.set((cmd) => {
		cmd.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
		cmd.addUserOption((user) =>
			user
				.setName('user')
				.setDescription('User to rename')
				.setRequired(true)
		);
		cmd.addStringOption((name) =>
			name.setName('name').setDescription('New name').setRequired(true)
		);
	})
	.onExecute(async (i) => {
		await i.deferReply({ ephemeral: true });

		const user = i.options.getUser('user', true);
		const newName = i.options.getString('name', true);

		if (newName.trim() == '') {
			return i.editReply({ content: 'New name cannot be empty' });
		}

		const updated = await prisma.user.update({
			where: {
				discordId: user.id,
			},
			data: {
				username: newName,
			},
		});

		return i.editReply({
			content: `Successfully renamed to ${updated.username}`,
		});
	});
