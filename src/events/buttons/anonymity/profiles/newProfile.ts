import { getAnonymousGroup } from '@models/anonymity';
import { CustomButtonBuilder } from '../../../../structures/interactions/Button';
import { InteractionError } from '../../../../structures/interactions/_Interaction';
import { anonEmbedMainPage, embedCreateAnonymousGroup } from '@views/anonymity';

export default new CustomButtonBuilder('manage-anonymity-profile-new')
	.onGenerate((builder) => builder.setLabel('Add Profile'))
	.onExecute(async (i) => {
		if (!i.guild) throw new InteractionError('This command can only be used in a server');
		const group = await getAnonymousGroup(i.channelId);
		const payload = group ? await anonEmbedMainPage(group) : embedCreateAnonymousGroup();
		return await i.update(payload);
	});
